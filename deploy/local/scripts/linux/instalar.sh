#!/usr/bin/env bash
# Instala o WL Retífica ERP neste computador (Linux).
# Uso: scripts/linux/instalar.sh [--ip 192.168.0.10] [--host wl.local]
# Precisa de internet só se as imagens não vierem num pacote (pacote/wl-imagens.tar).
source "$(dirname "$0")/comum.sh"

IP=""; HOST="wl.local"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) IP="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    *) erro "opção desconhecida: $1" ;;
  esac
done

checar_docker

# 1. Imagens: do pacote offline, se houver; senão baixa/constrói.
if [[ -f "$DIR_LOCAL/pacote/wl-imagens.tar" ]]; then
  info "Carregando imagens do pacote offline"
  docker load -i "$DIR_LOCAL/pacote/wl-imagens.tar"
else
  info "Baixando a imagem base do Node (precisa de internet)"
  docker image inspect "$IMAGEM_NODE" >/dev/null 2>&1 || docker pull "$IMAGEM_NODE"
fi

# 2. Segredos e endereço.
if [[ ! -f "$DIR_LOCAL/.env" ]]; then
  [[ -n "$IP" ]] || IP=$(ip_da_rede)
  read -r -p "IP fixo deste computador na rede [$IP]: " resp; IP="${resp:-$IP}"
  read -r -p "Nome do endereço [$HOST]: " resp; HOST="${resp:-$HOST}"
  info "Gerando senhas e chaves em deploy/local/.env"
  node_ferramenta env.mjs gerar --arquivo ../.env --ip "$IP" --host "$HOST"
else
  info "deploy/local/.env já existe: mantendo as senhas"
fi
mkdir -p "$DIR_LOCAL/backups"

# 3. Imagens do Supabase e do app.
if [[ ! -f "$DIR_LOCAL/pacote/wl-imagens.tar" ]]; then
  info "Baixando imagens do Supabase e Caddy (precisa de internet)"
  compose --profile ferramentas pull --ignore-buildable
  info "Construindo a imagem do app (alguns minutos)"
  compose build app
fi

# 4. Sobe tudo (o serviço migracoes aplica as migrations).
info "Subindo os serviços"
compose up -d
aguardar_app || true

# 5. Usuário dono + empresa.
read -r -p "Criar agora o usuário DONO e a empresa? [S/n] " resp
if [[ ! "$resp" =~ ^[nN] ]]; then
  compose run --rm ferramentas node criar-dono.mjs
fi

mostrar_enderecos
echo
info "Próximos passos: instale o certificado nos aparelhos (LEIA-ME.md, seção 5)."
