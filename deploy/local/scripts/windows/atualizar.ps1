# Atualiza o sistema: backup -> código novo -> imagem nova -> migrations.
#   Com internet:  atualizar.bat          (git pull + build)
#   Sem internet:  copie a pasta nova do sistema com pacote\wl-imagens.tar
#                  (gerado por exportar-imagens) e rode atualizar.bat: ele
#                  carrega o pacote em vez de construir.
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env

Info 'Backup antes de atualizar'
& "$PSScriptRoot\backup-agora.ps1"

$pacote = Join-Path $DirLocal 'pacote\wl-imagens.tar'
if (Test-Path $pacote) {
  Info 'Carregando imagens do pacote offline'
  Exec docker load -i $pacote
} else {
  if ((Test-Path (Join-Path $DirRepo '.git')) -and (Get-Command git -ErrorAction SilentlyContinue)) {
    Info 'Baixando o código novo (git pull)'
    Exec git -C $DirRepo pull --ff-only
  }
  Info 'Baixando imagens e construindo o app'
  docker compose --profile ferramentas pull --ignore-buildable
  if ($LASTEXITCODE -ne 0) { Aviso 'não consegui baixar imagens; seguindo com as que já existem' }
  Compose build app
}

Info 'Aplicando a nova versão'
Compose up -d
Aguardar-App | Out-Null
Mostrar-Enderecos
