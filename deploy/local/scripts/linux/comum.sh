#!/usr/bin/env bash
# Funções comuns dos scripts Linux da instalação local. Use com `source`.
set -euo pipefail

DIR_LOCAL="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # deploy/local
# shellcheck disable=SC2034 # usado por atualizar.sh
DIR_REPO="$(cd "$DIR_LOCAL/../.." && pwd)"
IMAGEM_NODE="node:22-bookworm-slim"
cd "$DIR_LOCAL"

info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m[ERRO]\033[0m %s\n' "$*" >&2; exit 1; }

compose() { docker compose "$@"; }

checar_docker() {
  command -v docker >/dev/null 2>&1 || erro "Docker não encontrado. Instale o Docker Engine (veja LEIA-ME.md)."
  docker compose version >/dev/null 2>&1 || erro "Plugin 'docker compose' não encontrado."
  docker info >/dev/null 2>&1 || erro "O Docker não está rodando (ou falta permissão: rode com sudo ou entre no grupo docker)."
}

checar_env() {
  [[ -f "$DIR_LOCAL/.env" ]] || erro "deploy/local/.env não existe. Rode primeiro: scripts/linux/instalar.sh"
}

# Roda a ferramenta Node (env.mjs) num container, como o usuário atual.
node_ferramenta() {
  docker run --rm --user "$(id -u):$(id -g)" -v "$DIR_LOCAL:/w" -w /w/ferramentas "$IMAGEM_NODE" node "$@"
}

ip_da_rede() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')
  fi
  [[ -n "$ip" ]] || ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  printf '%s' "$ip"
}

valor_env() { grep -E "^$1=" "$DIR_LOCAL/.env" | head -1 | cut -d= -f2-; }

aguardar_app() {
  info "Aguardando o sistema ficar pronto (pode levar alguns minutos na primeira vez)"
  local id
  for _ in $(seq 1 120); do
    id=$(compose ps -q app 2>/dev/null || true)
    if [[ -n "$id" ]] && [[ "$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null)" == "healthy" ]]; then
      return 0
    fi
    sleep 5
  done
  aviso "O app ainda não respondeu. Veja: docker compose logs --tail 100 migracoes app"
  return 1
}

mostrar_enderecos() {
  local host ip
  host=$(valor_env WL_HOST); ip=$(valor_env WL_IP)
  echo
  info "Sistema no ar:"
  echo "    https://$host"
  [[ "$ip" != "$host" ]] && echo "    https://$ip"
  echo "    Certificado para os aparelhos: http://$ip/certificado"
}
