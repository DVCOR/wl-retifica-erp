# Sobe (ou religa) todos os serviços. As migrations novas são aplicadas.
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env
Info 'Subindo os serviços'
Compose up -d
Aguardar-App | Out-Null
Mostrar-Enderecos
