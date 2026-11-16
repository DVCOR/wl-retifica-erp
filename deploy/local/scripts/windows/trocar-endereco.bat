@echo off
rem WL Retifica ERP - trocar-endereco (clique duas vezes). Logica em trocar-endereco.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0trocar-endereco.ps1" %*
echo.
pause
