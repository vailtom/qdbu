@echo off
rem Compila o poke.exe -- o `outro app` dos cenarios de concorrencia.
rem Ver docs/10-integridade.md, R8.
call "%~dp0..\..\vs.bat" || exit /b 1
cd /d "%~dp0"
hbmk2 poke.prg -gtcgi -o poke
if errorlevel 1 exit /b 1
echo Pronto: tests\concorrencia\poke.exe
