@echo off
rem WL Retifica ERP - backup-agora (clique duas vezes). Logica em backup-agora.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-agora.ps1" %*
echo.
pause
