@echo off
rem WL Retifica ERP - atualizar (clique duas vezes). Logica em atualizar.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0atualizar.ps1" %*
echo.
pause
