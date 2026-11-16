#!/usr/bin/env bash
# Troca o IP e/ou o nome (WL_HOST) da instalação e reinicia o necessário.
# Uso: scripts/linux/trocar-endereco.sh --ip 192.168.0.20 [--host wl.local]
source "$(dirname "$0")/comum.sh"
checar_docker
checar_env

IP=""; HOST="$(valor_env WL_HOST)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) IP="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    *) erro "opção desconhecida: $1" ;;
  esac
done
[[ -n "$IP" ]] || { IP=$(ip_da_rede); read -r -p "Novo IP [$IP]: " r; IP="${r:-$IP}"; }

node_ferramenta env.mjs endereco --arquivo ../.env --ip "$IP" --host "$HOST"
info "Recriando serviços com o novo endereço"
compose up -d --force-recreate caddy auth storage app
aguardar_app || true
mostrar_enderecos
aviso "Os aparelhos precisam abrir o endereço novo (e, se o nome mudou, o certificado continua o mesmo)."
