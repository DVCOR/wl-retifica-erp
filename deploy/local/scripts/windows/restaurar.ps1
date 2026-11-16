# Restaura um backup de deploy\local\backups\.
# Uso: restaurar.bat [AAAA-MM-DD_HHMM]   (sem argumento: lista e pergunta)
# Antes de restaurar faz um backup de segurança do estado atual.
param([string]$Pasta = '')
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env

$dirBackups = Join-Path $DirLocal 'backups'
if (-not $Pasta) {
  Info 'Backups disponíveis:'
  Get-ChildItem $dirBackups -Directory | Where-Object { $_.Name -notlike '*.parcial' } |
    Sort-Object Name -Descending | Select-Object -First 40 | ForEach-Object { Write-Host "    $($_.Name)" }
  $Pasta = Read-Host 'Qual restaurar? (nome da pasta)'
}
if (-not (Test-Path (Join-Path $dirBackups "$Pasta\banco.dump"))) { Falhar "Backup não encontrado: backups\$Pasta" }

Aviso "ATENÇÃO: tudo o que foi feito no sistema depois de '$Pasta' será substituído."
$conf = Read-Host 'Digite RESTAURAR para continuar'
if ($conf -ne 'RESTAURAR') { Falhar 'Cancelado.' }

Info 'Backup de segurança do estado atual'
Compose up -d db
Compose run --rm --entrypoint bash backup /ferramentas/backup.sh

Info 'Parando o sistema (só o banco fica ligado)'
docker compose --profile admin --profile imagens stop app caddy kong auth rest realtime storage backup meta studio imgproxy 2>$null

Info "Restaurando $Pasta"
Compose run --rm --no-deps --entrypoint bash backup /ferramentas/restaurar.sh $Pasta

Info 'Religando o sistema'
Compose up -d --force-recreate
Aguardar-App | Out-Null
Mostrar-Enderecos
