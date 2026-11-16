#!/bin/sh
# Entrypoint do container `app` (ver Dockerfile na raiz).
# Copia /app-modelo para /app trocando os marcadores do build pelos valores do
# .env (WL_HOST e ANON_KEY). Só refaz a cópia quando os valores mudam.
set -eu

: "${WL_HOST:?WL_HOST não definido (deploy/local/.env)}"
: "${ANON_KEY:?ANON_KEY não definido (deploy/local/.env)}"

MARCA_HOST="wl-host-marcador.invalid"
MARCA_ANON="wl-anon-key-marcador"
ASSINATURA="$WL_HOST|$ANON_KEY"

if [ ! -f /app/.wl-config ] || [ "$(cat /app/.wl-config)" != "$ASSINATURA" ]; then
  echo "[app] aplicando endereço https://$WL_HOST na cópia do app"
  find /app -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a /app-modelo/. /app/
  # Só arquivos de texto que contêm algum marcador.
  grep -rlF -e "$MARCA_HOST" -e "$MARCA_ANON" /app/server.js /app/.next 2>/dev/null \
    | while IFS= read -r arq; do
        sed -i -e "s|$MARCA_HOST|$WL_HOST|g" -e "s|$MARCA_ANON|$ANON_KEY|g" "$arq"
      done
  printf '%s' "$ASSINATURA" > /app/.wl-config
fi

# O app chama o Supabase em https://$WL_HOST também pelo servidor; confia na
# CA local do Caddy (volume caddy-data montado só leitura).
if [ -n "${NODE_EXTRA_CA_CERTS:-}" ] && [ ! -f "$NODE_EXTRA_CA_CERTS" ]; then
  echo "[app] aviso: certificado raiz do Caddy ainda não existe em $NODE_EXTRA_CA_CERTS"
fi

exec "$@"
