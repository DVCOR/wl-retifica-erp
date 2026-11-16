#!/usr/bin/env bash
# Num computador COM internet: baixa todas as imagens, constrói o app e salva
# tudo em deploy/local/pacote/wl-imagens.tar para levar à oficina (pendrive).
# A imagem do app não depende do .env da oficina (endereço/chaves entram ao subir).
source "$(dirname "$0")/comum.sh"
checar_docker

# O compose precisa de valores para interpolar; usa um .env provisório se não houver.
temp=0
if [[ ! -f "$DIR_LOCAL/.env" ]]; then
  temp=1
  printf 'WL_HOST=wl.local\nWL_IP=127.0.0.1\nWL_ENDERECOS=wl.local\n' > "$DIR_LOCAL/.env"
fi
trap '[[ $temp == 1 ]] && rm -f "$DIR_LOCAL/.env"' EXIT

PERFIS=(--profile ferramentas --profile admin --profile imagens)
info "Baixando imagens"
docker pull "$IMAGEM_NODE"
compose "${PERFIS[@]}" pull --ignore-buildable
info "Construindo o app"
compose build app

mapfile -t imagens < <(compose "${PERFIS[@]}" config --images | sort -u)
imagens+=("$IMAGEM_NODE")
mkdir -p "$DIR_LOCAL/pacote"
info "Salvando ${#imagens[@]} imagens em pacote/wl-imagens.tar (alguns GB)"
docker save -o "$DIR_LOCAL/pacote/wl-imagens.tar" "${imagens[@]}"
info "Pronto: copie a pasta do sistema inteira (com pacote/) para o pendrive."
