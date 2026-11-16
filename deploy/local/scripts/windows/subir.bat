@echo off
rem WL Retifica ERP - subir (clique duas vezes). Logica em subir.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir.ps1" %*
echo.
pause
