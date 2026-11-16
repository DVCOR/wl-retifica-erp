#!/usr/bin/env bash
# Loop do serviço `backup`: a cada 10 minutos, se ainda não existe backup de
# hoje e já passou de BACKUP_HORA (0-23), roda backup.sh. Assim o backup sai
# mesmo que o PC seja desligado à noite (basta ficar ligado depois do horário).
set -uo pipefail

HORA="${BACKUP_HORA:-12}"
echo "[backup] agendador ativo: 1 backup por dia a partir das ${HORA}h, guarda ${BACKUP_DIAS:-30} dias"

while true; do
  hoje=$(date +%Y-%m-%d)
  agora_h=$((10#$(date +%H)))
  if (( agora_h >= HORA )) && ! compgen -G "/backups/${hoje}_[0-9][0-9][0-9][0-9]" >/dev/null; then
    if ! bash /ferramentas/backup.sh; then
      echo "[backup] ERRO no backup; nova tentativa em 10 minutos" >&2
    fi
  fi
  sleep 600
done
