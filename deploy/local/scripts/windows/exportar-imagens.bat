@echo off
rem WL Retifica ERP - exportar-imagens (clique duas vezes). Logica em exportar-imagens.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0exportar-imagens.ps1" %*
echo.
pause
