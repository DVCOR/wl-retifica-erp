# Troca o IP e/ou o nome (WL_HOST) da instalação e reinicia o necessário.
# Uso: trocar-endereco.bat   (ou ... -File trocar-endereco.ps1 -Ip 192.168.0.20 [-Nome wl.local])
param([string]$Ip = '', [string]$Nome = '')
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env

if (-not $Nome) { $Nome = Valor-Env 'WL_HOST' }
if (-not $Ip) {
  $Ip = Ip-Da-Rede
  $r = Read-Host "Novo IP [$Ip]"; if ($r) { $Ip = $r }
}
Node-Ferramenta env.mjs endereco --arquivo ../.env --ip $Ip --host $Nome
Info 'Recriando serviços com o novo endereço'
Compose up -d --force-recreate caddy auth storage app
Aguardar-App | Out-Null
Mostrar-Enderecos
