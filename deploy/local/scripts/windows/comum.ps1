# Funções comuns dos scripts Windows da instalação local. Use com ". $PSScriptRoot\comum.ps1".
# 'Continue' de propósito: no Windows PowerShell 5.1, com 'Stop', qualquer
# texto que o docker escreve no stderr vira erro fatal. Checamos $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DirLocal = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path   # deploy\local
$DirRepo = (Resolve-Path (Join-Path $DirLocal '..\..')).Path
$ImagemNode = 'node:22-bookworm-slim'
Set-Location $DirLocal

function Info($msg) { Write-Host "==> $msg" -ForegroundColor Green }
function Aviso($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Falhar($msg) { Write-Host "[ERRO] $msg" -ForegroundColor Red; exit 1 }

# Roda um comando externo e para se ele falhar.
# (função simples, sem param(): assim opções como -i/--rm passam direto)
function Exec {
  $cmd, $resto = $args
  & $cmd @resto
  if ($LASTEXITCODE -ne 0) { Falhar "comando falhou: $cmd $($resto -join ' ')" }
}

function Compose { Exec docker compose @args }

function Checar-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Falhar 'Docker Desktop não encontrado. Instale o Docker Desktop (veja LEIA-ME.md).'
  }
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Falhar 'O Docker Desktop não está aberto. Abra o Docker Desktop, espere ficar verde e rode de novo.'
  }
}

function Checar-Env {
  if (-not (Test-Path (Join-Path $DirLocal '.env'))) {
    Falhar 'deploy\local\.env não existe. Rode primeiro o instalar.bat'
  }
}

function Node-Ferramenta {
  Exec docker run --rm -v "${DirLocal}:/w" -w /w/ferramentas $ImagemNode node @args
}

function Ip-Da-Rede {
  $cfg = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
    Select-Object -First 1
  if ($cfg) { return $cfg.IPv4Address.IPAddress }
  return ''
}

function Valor-Env($chave) {
  $linha = Get-Content (Join-Path $DirLocal '.env') | Where-Object { $_ -match "^$chave=" } | Select-Object -First 1
  if ($linha) { return $linha.Substring($chave.Length + 1) }
  return ''
}

function Aguardar-App {
  Info 'Aguardando o sistema ficar pronto (pode levar alguns minutos na primeira vez)'
  for ($i = 0; $i -lt 120; $i++) {
    $id = (docker compose ps -q app 2>$null)
    if ($id) {
      $saude = (docker inspect -f '{{.State.Health.Status}}' $id 2>$null)
      if ($saude -eq 'healthy') { return $true }
    }
    Start-Sleep -Seconds 5
  }
  Aviso 'O app ainda não respondeu. Veja: docker compose logs --tail 100 migracoes app'
  return $false
}

function Mostrar-Enderecos {
  $h = Valor-Env 'WL_HOST'
  $ip = Valor-Env 'WL_IP'
  Write-Host ''
  Info 'Sistema no ar:'
  Write-Host "    https://$h"
  if ($ip -ne $h) { Write-Host "    https://$ip" }
  Write-Host "    Certificado para os aparelhos: http://$ip/certificado"
}
