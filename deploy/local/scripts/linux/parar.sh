#!/usr/bin/env bash
# Para todos os serviços (os dados ficam guardados nos volumes do Docker).
source "$(dirname "$0")/comum.sh"
checar_docker
info "Parando os serviços"
compose --profile admin --profile imagens stop
info "Parado. Para ligar de novo: scripts/linux/subir.sh"
