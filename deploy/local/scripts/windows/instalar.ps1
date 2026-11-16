# Instala o WL Retífica ERP neste computador (Windows 10/11 + Docker Desktop).
# Uso: instalar.bat   (ou: powershell -ExecutionPolicy Bypass -File instalar.ps1 [-Ip 192.168.0.10] [-Nome wl.local])
param([string]$Ip = '', [string]$Nome = 'wl.local')
. "$PSScriptRoot\comum.ps1"

Checar-Docker
$pacote = Join-Path $DirLocal 'pacote\wl-imagens.tar'

# 1. Imagens
if (Test-Path $pacote) {
  Info 'Carregando imagens do pacote offline'
  Exec docker load -i $pacote
} else {
  Info 'Baixando a imagem base do Node (precisa de internet)'
  docker image inspect $ImagemNode *> $null
  if ($LASTEXITCODE -ne 0) { Exec docker pull $ImagemNode }
}

# 2. Segredos e endereço
if (-not (Test-Path (Join-Path $DirLocal '.env'))) {
  if (-not $Ip) { $Ip = Ip-Da-Rede }
  $r = Read-Host "IP fixo deste computador na rede [$Ip]"; if ($r) { $Ip = $r }
  $r = Read-Host "Nome do endereço [$Nome]"; if ($r) { $Nome = $r }
  Info 'Gerando senhas e chaves em deploy\local\.env'
  Node-Ferramenta env.mjs gerar --arquivo ../.env --ip $Ip --host $Nome
} else {
  Info 'deploy\local\.env já existe: mantendo as senhas'
}
New-Item -ItemType Directory -Force (Join-Path $DirLocal 'backups') | Out-Null

# 3. Imagens do Supabase e do app
if (-not (Test-Path $pacote)) {
  Info 'Baixando imagens do Supabase e Caddy (precisa de internet)'
  Compose --profile ferramentas pull --ignore-buildable
  Info 'Construindo a imagem do app (alguns minutos)'
  Compose build app
}

# 4. Liberar as portas 80/443 no Firewall (rede privada). Precisa de administrador.
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if ($admin) {
  if (-not (Get-NetFirewallRule -DisplayName 'WL Retifica ERP (HTTP/HTTPS)' -ErrorAction SilentlyContinue)) {
    Info 'Liberando portas 80 e 443 no Firewall do Windows (rede privada)'
    New-NetFirewallRule -DisplayName 'WL Retifica ERP (HTTP/HTTPS)' -Direction Inbound -Protocol TCP `
      -LocalPort 80, 443 -Action Allow -Profile Private | Out-Null
  }
} else {
  Aviso 'Sem administrador: se os tablets não abrirem o sistema, libere as portas 80 e 443 no Firewall (LEIA-ME, seção 4).'
}

# 5. Subir
Info 'Subindo os serviços'
Compose up -d
Aguardar-App | Out-Null

# 6. Dono + empresa
$r = Read-Host 'Criar agora o usuário DONO e a empresa? [S/n]'
if ($r -notmatch '^[nN]') { Compose run --rm ferramentas node criar-dono.mjs }

# 7. Certificado para este PC
$cert = Join-Path $DirLocal 'certificado\wl-retifica-certificado.crt'
New-Item -ItemType Directory -Force (Split-Path $cert) | Out-Null
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt $cert *> $null
if (Test-Path $cert) {
  Info "Certificado salvo em $cert"
  if ($admin) {
    Info 'Instalando o certificado neste computador (Autoridades de Certificação Raiz Confiáveis)'
    Import-Certificate -FilePath $cert -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
  }
}

Mostrar-Enderecos
Write-Host ''
Info 'Próximos passos: instale o certificado nos tablets/celulares (LEIA-ME.md, seção 5).'
Info 'No Docker Desktop: Settings > General > marque "Start Docker Desktop when you sign in".'
