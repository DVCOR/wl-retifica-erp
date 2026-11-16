# Para todos os serviços (os dados ficam guardados nos volumes do Docker).
. "$PSScriptRoot\comum.ps1"
Checar-Docker
Info 'Parando os serviços'
Compose --profile admin --profile imagens stop
Info 'Parado. Para ligar de novo: subir.bat'
