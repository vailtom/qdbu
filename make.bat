@echo off
rem `setlocal` NAO E DETALHE: sem ele, tudo que este script define VAZA para o
rem cmd de quem chamou. O vs.bat carrega o ambiente INTEIRO do MSVC e empilha
rem %HB_INSTALL_PREFIX%\bin no PATH; rodar o script duas vezes na mesma janela
rem empilha duas vezes, e o PATH cresce sem limite ate a sessao quebrar.
setlocal
rem Compila bin\qdbudll.dll (32-bit).
rem Feche o app antes: com a DLL carregada o linker falha com LNK1104 e APAGA a
rem DLL antiga antes de desistir.
call "%~dp0vs.bat" || exit /b 1

cd /d "%~dp0"
hbmk2 qdbudll.hbp %*
