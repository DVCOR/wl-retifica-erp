# Num computador COM internet: baixa todas as imagens, constrói o app e salva
# tudo em deploy\local\pacote\wl-imagens.tar para levar à oficina (pendrive).
. "$PSScriptRoot\comum.ps1"
Checar-Docker

$envArq = Join-Path $DirLocal '.env'
$temp = $false
if (-not (Test-Path $envArq)) {
  $temp = $true
  Set-Content -Path $envArq -Value "WL_HOST=wl.local`nWL_IP=127.0.0.1`nWL_ENDERECOS=wl.local" -NoNewline
}
try {
  $perfis = @('--profile', 'ferramentas', '--profile', 'admin', '--profile', 'imagens')
  Info 'Baixando imagens'
  Exec docker pull $ImagemNode
  Compose @perfis pull --ignore-buildable
  Info 'Construindo o app'
  Compose build app
  $imagens = @(docker compose @perfis config --images | Sort-Object -Unique) + $ImagemNode
  New-Item -ItemType Directory -Force (Join-Path $DirLocal 'pacote') | Out-Null
  Info "Salvando $($imagens.Count) imagens em pacote\wl-imagens.tar (alguns GB)"
  Exec docker save -o (Join-Path $DirLocal 'pacote\wl-imagens.tar') @imagens
  Info 'Pronto: copie a pasta do sistema inteira (com pacote\) para o pendrive.'
} finally {
  if ($temp) { Remove-Item $envArq }
}
