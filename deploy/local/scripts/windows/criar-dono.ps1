# Cria o usuário dono e a empresa WL Retífica (pode rodar de novo sem problema).
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env
Compose run --rm ferramentas node criar-dono.mjs
