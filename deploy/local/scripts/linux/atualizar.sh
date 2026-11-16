#!/usr/bin/env bash
# Atualiza o sistema: backup -> código novo -> imagem nova -> migrations.
#   Com internet:  scripts/linux/atualizar.sh          (git pull + build)
#   Sem internet:  copie a pasta nova do sistema e o pacote/wl-imagens.tar
#                  (gerado por exportar-imagens.sh) e rode este script: ele
#                  carrega o pacote em vez de construir.
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env

info "Backup antes de atualizar"
bash "$DIR_LOCAL/scripts/linux/backup-agora.sh"

if [[ -f "$DIR_LOCAL/pacote/wl-imagens.tar" ]]; then
  info "Carregando imagens do pacote offline"
  docker load -i "$DIR_LOCAL/pacote/wl-imagens.tar"
else
  if [[ -d "$DIR_REPO/.git" ]] || [[ -f "$DIR_REPO/.git" ]]; then
    info "Baixando o código novo (git pull)"
    git -C "$DIR_REPO" pull --ff-only || erro "git pull falhou (sem internet? alterações locais?)."
  fi
  info "Baixando imagens e construindo o app"
  compose --profile ferramentas pull --ignore-buildable || aviso "não consegui baixar imagens; seguindo com as que já existem"
  compose build app
fi

info "Aplicando a nova versão"
compose up -d
aguardar_app || true
mostrar_enderecos
