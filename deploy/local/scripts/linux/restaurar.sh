#!/usr/bin/env bash
# Restaura um backup de deploy/local/backups/.
# Uso: scripts/linux/restaurar.sh [AAAA-MM-DD_HHMM]   (sem argumento: lista e pergunta)
# Antes de restaurar faz um backup de segurança do estado atual.
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env

pasta="${1:-}"
if [[ -z "$pasta" ]]; then
  info "Backups disponíveis:"
  find "$DIR_LOCAL/backups" -mindepth 1 -maxdepth 1 -type d -name '20*' ! -name '*.parcial' -printf '    %f\n' | sort -r | head -40
  read -r -p "Qual restaurar? (nome da pasta): " pasta
fi
[[ -f "$DIR_LOCAL/backups/$pasta/banco.dump" ]] || erro "Backup não encontrado: backups/$pasta"

aviso "ATENÇÃO: tudo o que foi feito no sistema depois de '$pasta' será substituído."
read -r -p "Digite RESTAURAR para continuar: " conf
[[ "$conf" == "RESTAURAR" ]] || erro "Cancelado."

info "Backup de segurança do estado atual"
compose up -d db
compose run --rm --entrypoint bash backup /ferramentas/backup.sh

info "Parando o sistema (só o banco fica ligado)"
compose --profile admin --profile imagens stop app caddy kong auth rest realtime storage backup meta studio imgproxy 2>/dev/null || true

info "Restaurando $pasta"
compose run --rm --no-deps --entrypoint bash backup /ferramentas/restaurar.sh "$pasta"

info "Religando o sistema"
compose up -d --force-recreate
aguardar_app || true
mostrar_enderecos
