#!/usr/bin/env bash
# Gera src/lib/supabase/types.ts a partir do banco de teste local (rode
# `pnpm test:db` antes para garantir que o banco wl_test está atualizado).
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="${DB_URL:-postgresql://postgres@127.0.0.1:54322/${TEST_DB:-wl_test}}"
pnpm dlx supabase@3.1.0 gen types typescript --db-url "$DB_URL" --schema public \
  > src/lib/supabase/types.ts
pnpm exec prettier --write src/lib/supabase/types.ts >/dev/null
echo "Tipos gerados em src/lib/supabase/types.ts"
