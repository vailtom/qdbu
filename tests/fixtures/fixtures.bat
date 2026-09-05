@echo off
rem `setlocal`: o vs.bat abaixo carrega o ambiente INTEIRO do MSVC e
rem empilha %HB_INSTALL_PREFIX%\bin no PATH. Sem isto, rodar este
rem script duas vezes na mesma janela empilha duas vezes, e o PATH cresce
rem sem limite ate a sessao quebrar -- mesmo motivo dos .bat da raiz.
setlocal
rem Gera as fixtures sinteticas. Nenhum DBF real entra no repositorio.
rem Uso: fixtures.bat [quantidade-do-grande.dbf]
call "%~dp0..\..\vs.bat" || exit /b 1

cd /d "%~dp0"
hbrun gen_fixtures.prg %*
