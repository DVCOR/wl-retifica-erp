@echo off
rem WL Retifica ERP - parar (clique duas vezes). Logica em parar.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0parar.ps1" %*
echo.
pause
