# Faz um backup agora em deploy\local\backups\AAAA-MM-DD_HHMM\.
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Checar-Env
Info 'Fazendo backup'
$rodando = docker compose ps -q --status running backup 2>$null
if ($rodando) {
  Compose exec -T backup bash /ferramentas/backup.sh
} else {
  Compose run --rm --entrypoint bash backup /ferramentas/backup.sh
}
Info "Backups em: $DirLocal\backups"
Write-Host '    Copie a pasta mais recente para um pendrive/HD externo toda semana.'
