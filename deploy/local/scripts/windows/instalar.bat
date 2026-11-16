@echo off
rem WL Retifica ERP - instalar (clique duas vezes). Logica em instalar.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
echo.
pause
