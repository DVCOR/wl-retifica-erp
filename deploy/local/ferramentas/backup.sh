#!/usr/bin/env bash
# Faz um backup completo agora em /backups/AAAA-MM-DD_HHMM/:
#   banco.dump       pg_dump -Fc do banco "postgres" inteiro (auth, storage, app)
#   arquivos.tar.gz  fotos, PDFs e logos (volume do Storage)
#   env.txt          cópia do deploy/local/.env (SENHAS! guarde com cuidado)
#   SHA256SUMS       conferência
# e apaga backups com mais de BACKUP_DIAS dias. Roda dentro do container
# `backup` (imagem supabase/postgres: pg_dump da mesma versão do banco).
set -euo pipefail

DIAS="${BACKUP_DIAS:-30}"
carimbo=$(date +%Y-%m-%d_%H%M)
destino="/backups/$carimbo"
parcial="$destino.parcial"

rm -rf "$parcial"
mkdir -p "$parcial"
echo "[backup] $(date '+%d/%m/%Y %H:%M') iniciando -> backups/$carimbo"

pg_dump -Fc -Z 6 -d postgres -f "$parcial/banco.dump"
tar -czf "$parcial/arquivos.tar.gz" -C /var/lib/storage .
if [[ -f /config/env ]]; then cp /config/env "$parcial/env.txt"; fi
(cd "$parcial" && sha256sum ./* > SHA256SUMS)

rm -rf "$destino"
mv "$parcial" "$destino"
echo "[backup] ok: $(du -sh "$destino" | cut -f1) em backups/$carimbo"

# Rotação: apaga pastas de backup antigas (e restos de backups interrompidos).
find /backups -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$DIAS" -print -exec rm -rf {} + \
  | sed 's/^/[backup] apagado (antigo): /'
find /backups -mindepth 1 -maxdepth 1 -type d -name '*.parcial' -mmin +360 -exec rm -rf {} +
