@echo off
rem Acompanha o log do app (que nao tem console). Ctrl+C para sair.
call "%~dp0..\..\env.bat" || exit /b 1
if not exist "%DBU_LOG%" type nul > "%DBU_LOG%"
powershell -NoProfile -Command "Get-Content -Path $env:DBU_LOG -Wait -Tail 40"
