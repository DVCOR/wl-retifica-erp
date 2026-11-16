#!/usr/bin/env bash
# Sobe (ou religa) todos os serviços. As migrations novas são aplicadas.
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env
info "Subindo os serviços"
compose up -d
aguardar_app || true
mostrar_enderecos
