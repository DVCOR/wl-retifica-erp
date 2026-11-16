#!/usr/bin/env bash
# Recria o banco wl_test, aplica shim do Supabase + migrations + seed e roda os
# testes SQL de supabase/tests/. Falha no primeiro erro.
# Variáveis: PGHOST (127.0.0.1) PGPORT (54322) PGUSER (postgres) TEST_DB (wl_test)
set -euo pipefail

cd "$(dirname "$0")/.."

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-54322}"
export PGUSER="${PGUSER:-postgres}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
DB="${TEST_DB:-wl_test}"

if ! psql -d postgres -Atqc "select 1" >/dev/null 2>&1; then
  echo "Postgres não está no ar em $PGHOST:$PGPORT — tentando ./scripts/db-local.sh"
  ./scripts/db-local.sh >/dev/null 2>&1 || true
fi

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

echo "→ recriando banco $DB"
psql -X -q -d postgres -v ON_ERROR_STOP=1 \
  -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$DB' and pid <> pg_backend_pid();" >/dev/null
psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $DB;" -c "create database $DB;"

echo "→ shim do Supabase"
"${PSQL[@]}" -f supabase/tests/00_shim_supabase.sql

tem_storage=$("${PSQL[@]}" -Atc "select count(*) from pg_namespace where nspname = 'storage'")

echo "→ migrations"
for f in supabase/migrations/*.sql; do
  if [[ "$f" == *_storage.sql && "$tem_storage" == "0" ]]; then
    echo "   (pulando $(basename "$f"): schema storage não existe no shim)"
    continue
  fi
  echo "   $(basename "$f")"
  "${PSQL[@]}" -1 -f "$f"
done

echo "→ seed"
"${PSQL[@]}" -1 -f supabase/seed.sql >/dev/null

echo "→ helpers de teste"
for f in supabase/tests/01_*.sql; do
  "${PSQL[@]}" -1 -f "$f"
done

echo "→ testes"
falhas=0
for f in supabase/tests/*.sql; do
  [[ "$(basename "$f")" == 0[01]_* ]] && continue
  if "${PSQL[@]}" -c "begin;" -f "$f" -c "rollback;" >/tmp/wl_test_out.txt 2>&1; then
    echo "   ✓ $(basename "$f")"
  else
    echo "   ✗ $(basename "$f")"
    sed 's/^/      /' /tmp/wl_test_out.txt
    falhas=$((falhas + 1))
  fi
done

if [[ $falhas -gt 0 ]]; then
  echo "$falhas arquivo(s) de teste falharam"
  exit 1
fi
echo "Banco OK"
