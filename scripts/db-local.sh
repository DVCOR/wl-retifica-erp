#!/usr/bin/env bash
# Sobe o Postgres local de desenvolvimento (porta 54322) se não estiver rodando.
B=/usr/lib/postgresql/16/bin
if ! psql -h 127.0.0.1 -p 54322 -U postgres -Atc "select 1" >/dev/null 2>&1; then
  su postgres -s /bin/bash -c "$B/pg_ctl -D /home/claude/pgdata -o '-p 54322 -k /tmp -c listen_addresses=127.0.0.1' -l /home/claude/pg.log start" >/dev/null
  sleep 2
fi
psql -h 127.0.0.1 -p 54322 -U postgres -Atc "select 'postgres ok'"
