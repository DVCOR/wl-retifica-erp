#!/usr/bin/env bash
# Aplica supabase/migrations/*.sql (montado em /migracoes) em ordem, uma vez
# cada, registrando em supabase_migrations.schema_migrations (mesma tabela da
# Supabase CLI). Roda no serviço `migracoes` do docker-compose a cada `up`.
# Cada arquivo roda numa transação junto com o registro: ou entra inteiro, ou
# nada muda. NUNCA roda supabase/seed.sql (usuários de teste).
set -euo pipefail

export PGHOST=db PGPORT=5432 PGDATABASE=postgres
export PGUSER="${MIGRACOES_USUARIO:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD não definido}"
export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

echo "[migracoes] aguardando o banco"
for _ in $(seq 1 90); do
  psql -X -Atqc "select 1" >/dev/null 2>&1 && break
  sleep 2
done

# auth.users (GoTrue) e storage.buckets (Storage) são criados pelos próprios
# serviços na primeira vez que sobem; as migrations do app dependem deles.
echo "[migracoes] aguardando schemas auth e storage"
for _ in $(seq 1 150); do
  ok=$(psql -X -Atqc "select (to_regclass('auth.users') is not null and to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null)::int" 2>/dev/null || echo 0)
  [[ "$ok" == "1" ]] && break
  sleep 2
done
if [[ "${ok:-0}" != "1" ]]; then
  echo "[migracoes] ERRO: auth.users/storage.buckets não apareceram. Veja: docker compose logs auth storage" >&2
  exit 1
fi

"${PSQL[@]}" <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;
SQL

aplicadas=0
shopt -s nullglob
for arq in /migracoes/*.sql; do
  base=$(basename "$arq" .sql)
  versao=${base%%_*}
  nome=${base#*_}
  if [[ ! "$versao" =~ ^[0-9]+$ ]]; then
    echo "[migracoes] ignorando $base (nome fora do padrão <versão>_<nome>.sql)"
    continue
  fi
  ja=$(psql -X -Atqc "select 1 from supabase_migrations.schema_migrations where version = '$versao'")
  [[ "$ja" == "1" ]] && continue
  echo "[migracoes] aplicando $base"
  "${PSQL[@]}" --single-transaction \
    -f "$arq" \
    -c "insert into supabase_migrations.schema_migrations (version, name) values ('$versao', '$nome')"
  aplicadas=$((aplicadas + 1))
done

# PostgREST relê o schema (novas tabelas/funções).
psql -X -q -c "notify pgrst, 'reload schema'" >/dev/null || true

total=$(psql -X -Atqc "select count(*) from supabase_migrations.schema_migrations")
echo "[migracoes] ok: $aplicadas nova(s), $total no total"
