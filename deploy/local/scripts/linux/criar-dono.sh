#!/usr/bin/env bash
# Cria o usuário dono e a empresa WL Retífica (pode rodar de novo sem problema).
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env
compose run --rm ferramentas node criar-dono.mjs
