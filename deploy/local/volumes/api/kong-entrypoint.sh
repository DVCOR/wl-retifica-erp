#!/bin/sh
# Entrypoint do Kong — adaptado do docker/volumes/api/kong-entrypoint.sh oficial
# do Supabase, só com as chaves JWT legadas (ANON_KEY / SERVICE_ROLE_KEY).

# Authorization: mantém o JWT do usuário; senão usa a apikey (anon/service).
export LUA_AUTH_EXPR="\$((headers.authorization ~= nil and headers.authorization:sub(1, 10) ~= 'Bearer sb_' and headers.authorization) or headers.apikey)"
# Realtime: supabase-js manda a apikey na query string.
export LUA_RT_WS_EXPR="\$(query_params.apikey)"

# Troca $VARIAVEIS do kong.yml pelos valores do ambiente (awk preserva as aspas).
awk '{
  result = ""
  rest = $0
  while (match(rest, /\$[A-Za-z_][A-Za-z_0-9]*/)) {
    varname = substr(rest, RSTART + 1, RLENGTH - 1)
    if (varname in ENVIRON) {
      result = result substr(rest, 1, RSTART - 1) ENVIRON[varname]
    } else {
      result = result substr(rest, 1, RSTART + RLENGTH - 1)
    }
    rest = substr(rest, RSTART + RLENGTH)
  }
  print result rest
}' /home/kong/temp.yml > "$KONG_DECLARATIVE_CONFIG"

exec /entrypoint.sh kong docker-start
