@echo off
rem Compila bin\dbudll.dll (32-bit).
rem Feche o app antes: com a DLL carregada o linker falha com LNK1104 e APAGA a
rem DLL antiga antes de desistir.
call "%~dp0vs.bat" || exit /b 1

cd /d "%~dp0"
hbmk2 dbudll.hbp %*
