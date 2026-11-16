#!/usr/bin/env bash
# Restaura um backup de /backups/<pasta> (feito por backup.sh).
# Chamado pelos scripts restaurar.sh/.ps1 DEPOIS de parar app, auth, rest,
# realtime, storage, kong e caddy (só o banco fica no ar).
#
# Banco: restaura num banco novo "wl_restauracao", copia as permissões e
# configurações do banco atual e troca os nomes. O banco anterior fica guardado
# como "postgres_antes_<data>" (apague depois de conferir:
#   docker compose exec db psql -U supabase_admin -d template1 -c 'drop database "postgres_antes_..."').
# Arquivos: substitui o conteúdo do volume do Storage pelo do backup.
set -euo pipefail

pasta="${1:?informe a pasta do backup (ex.: 2026-11-16_1230)}"
origem="/backups/$pasta"
[[ -f "$origem/banco.dump" ]] || { echo "Backup não encontrado: backups/$pasta/banco.dump" >&2; exit 1; }

if [[ -f "$origem/SHA256SUMS" ]]; then
  echo "[restaurar] conferindo integridade"
  (cd "$origem" && sha256sum -c --quiet SHA256SUMS)
fi

PSQL=(psql -X -v ON_ERROR_STOP=1 -d template1)
carimbo=$(date +%Y%m%d_%H%M)
antigo="postgres_antes_$carimbo"

echo "[restaurar] criando banco temporário wl_restauracao"
"${PSQL[@]}" -q -c "drop database if exists wl_restauracao" -c "create database wl_restauracao"

echo "[restaurar] restaurando o banco (pode levar alguns minutos)"
log=/tmp/pg_restore.log
if ! pg_restore -d wl_restauracao --no-password "$origem/banco.dump" 2>"$log"; then
  erros=$(grep -c '^pg_restore: error' "$log" || true)
  echo "[restaurar] aviso: pg_restore terminou com $erros erro(s) (normalmente objetos internos do Supabase que já existem):"
  grep '^pg_restore: error' "$log" | head -20
fi

# Confere se os dados principais vieram.
empresas=$(psql -X -Atq -d wl_restauracao -c "select count(*) from public.empresas" 2>/dev/null || echo "ERRO")
usuarios=$(psql -X -Atq -d wl_restauracao -c "select count(*) from auth.users" 2>/dev/null || echo "ERRO")
if [[ "$empresas" == "ERRO" || "$usuarios" == "ERRO" ]]; then
  echo "[restaurar] ERRO: o banco restaurado não tem public.empresas/auth.users. Nada foi trocado." >&2
  echo "            Log completo: $log (dentro do container)" >&2
  exit 1
fi
echo "[restaurar] banco restaurado: $empresas empresa(s), $usuarios usuário(s)"

echo "[restaurar] copiando dono, permissões e configurações do banco atual"
"${PSQL[@]}" -q <<'SQL'
do $$
declare
  r record;
  kv text;
begin
  execute format('alter database wl_restauracao owner to %I',
    (select pg_get_userbyid(datdba) from pg_database where datname = 'postgres'));
  -- GRANTs no banco
  for r in
    select a.privilege_type, a.grantee
      from pg_database d, aclexplode(d.datacl) a
     where d.datname = 'postgres'
  loop
    if r.grantee = 0 then
      execute format('grant %s on database wl_restauracao to public', r.privilege_type);
    else
      execute format('grant %s on database wl_restauracao to %I', r.privilege_type, pg_get_userbyid(r.grantee));
    end if;
  end loop;
  -- ALTER DATABASE ... SET e ALTER ROLE ... IN DATABASE ... SET
  for r in
    select s.setrole, s.setconfig
      from pg_db_role_setting s
      join pg_database d on d.oid = s.setdatabase
     where d.datname = 'postgres'
  loop
    foreach kv in array r.setconfig loop
      if r.setrole = 0 then
        execute format('alter database wl_restauracao set %I = %L', split_part(kv, '=', 1), substr(kv, strpos(kv, '=') + 1));
      else
        execute format('alter role %I in database wl_restauracao set %I = %L', pg_get_userbyid(r.setrole),
          split_part(kv, '=', 1), substr(kv, strpos(kv, '=') + 1));
      end if;
    end loop;
  end loop;
end;
$$;
SQL

echo "[restaurar] trocando os bancos (o atual vira $antigo)"
# Workers internos (ex.: pg_net) podem reconectar: tenta algumas vezes.
trocou=0
for _ in 1 2 3 4 5; do
  if "${PSQL[@]}" -q \
    -c "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('postgres', 'wl_restauracao') and pid <> pg_backend_pid()" \
    -c "alter database postgres rename to \"$antigo\"" >/dev/null 2>&1; then
    trocou=1
    break
  fi
  sleep 2
done
[[ "$trocou" == 1 ]] || { echo "[restaurar] ERRO: não consegui renomear o banco atual (ainda em uso). Nada foi trocado." >&2; exit 1; }
"${PSQL[@]}" -q -c "alter database wl_restauracao rename to postgres" >/dev/null

if [[ -f "$origem/arquivos.tar.gz" ]]; then
  echo "[restaurar] restaurando fotos e documentos"
  find /var/lib/storage -mindepth 1 -delete
  tar -xzf "$origem/arquivos.tar.gz" -C /var/lib/storage
fi

echo "[restaurar] concluído. Banco anterior guardado como \"$antigo\"."
