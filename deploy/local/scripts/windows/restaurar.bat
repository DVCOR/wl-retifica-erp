@echo off
rem WL Retifica ERP - restaurar (clique duas vezes). Logica em restaurar.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restaurar.ps1" %*
echo.
pause
