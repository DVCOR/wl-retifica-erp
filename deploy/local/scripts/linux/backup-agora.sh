#!/usr/bin/env bash
# Faz um backup agora em deploy/local/backups/AAAA-MM-DD_HHMM/.
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env
info "Fazendo backup"
if [[ -n "$(compose ps -q --status running backup 2>/dev/null)" ]]; then
  compose exec -T backup bash /ferramentas/backup.sh
else
  compose run --rm --entrypoint bash backup /ferramentas/backup.sh
fi
info "Backups em: $DIR_LOCAL/backups"
echo "    Copie a pasta mais recente para um pendrive/HD externo toda semana."
