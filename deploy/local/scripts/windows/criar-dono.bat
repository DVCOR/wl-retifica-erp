@echo off
rem WL Retifica ERP - criar-dono (clique duas vezes). Logica em criar-dono.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar-dono.ps1" %*
echo.
pause
