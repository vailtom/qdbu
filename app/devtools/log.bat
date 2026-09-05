@echo off
rem Acompanha o log do app (que nao tem console). Ctrl+C para sair.
call "%~dp0..\..\env.bat" || exit /b 1
if not exist "%QDBU_LOG%" type nul > "%QDBU_LOG%"
powershell -NoProfile -Command "Get-Content -Path $env:QDBU_LOG -Wait -Tail 40"
