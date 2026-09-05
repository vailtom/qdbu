@echo off
rem `setlocal`: o vs.bat abaixo carrega o ambiente INTEIRO do MSVC e
rem empilha %HB_INSTALL_PREFIX%\bin no PATH. Sem isto, rodar este
rem script duas vezes na mesma janela empilha duas vezes, e o PATH cresce
rem sem limite ate a sessao quebrar -- mesmo motivo dos .bat da raiz.
setlocal
rem Trilho C: exercita o contrato da DLL sem Rust e sem GUI.
call "%~dp0..\vs.bat" || exit /b 1

cd /d "%~dp0.."
cl /nologo /W3 /Fe:bin\testload.exe /Fo:bin\ tests\testload.c >nul || goto :err
echo Build OK: bin\testload.exe
bin\testload.exe %*
goto :eof

:err
echo Falha ao compilar tests\testload.c
