@echo off
rem `setlocal` NAO E DETALHE: sem ele, tudo que este script define VAZA para o
rem cmd de quem chamou. O vs.bat carrega o ambiente INTEIRO do MSVC e empilha
rem %HB_INSTALL_PREFIX%\bin no PATH; rodar o script duas vezes na mesma janela
rem empilha duas vezes, e o PATH cresce sem limite ate a sessao quebrar.
setlocal
rem Release 32-bit.
rem
rem O `resources` do tauri.conf.json esta na forma de MAPA
rem (`{ "../../bin/qdbudll.dll": "qdbudll.dll" }`) e nao de lista, de proposito:
rem na forma de lista o Tauri reescreve cada `..` como `_up_`, e a DLL vai parar
rem em resources\_up_\_up_\bin\ -- caminho que achar_dll() NUNCA visita.
rem O app instalado subia com "FALHOU ao carregar a DLL" e nada apontava a causa.
rem Com o mapa, a DLL cai ao LADO do executavel, que e o primeiro candidato de
rem achar_dll(), tanto no instalador quanto em target\...
call "%~dp0..\vs.bat" || exit /b 1

rem O APP ABERTO IMPEDE O BUILD -- e agora ele para ANTES de compilar.
rem O `resources` do tauri.conf.json faz o build script do tauri-build copiar
rem bin\qdbudll.dll para junto do executavel em TODO `cargo build`. Com o app
rem rodando, a DLL esta carregada e a copia falha com
rem "O arquivo ja esta sendo usado por outro processo. (os error 32)"
rem no meio de trinta linhas de saida do build script.
rem
rem O app aberto ja impedia o build antes disto (o linker nao substitui o .exe
rem em uso e devolve LNK1104); o que muda e a mensagem, que passa a vir cedo e
rem incompreensivel. Por isso a checagem aqui, com o nome do processo.
tasklist /fi "imagename eq qdbu-console.exe" 2>nul | find /i "qdbu-console.exe" >nul
if not errorlevel 1 (
  echo.
  echo [%~nx0] O app esta ABERTO e segura bin\qdbudll.dll -- feche-o e repita.
  echo           Este script nao o fecha sozinho: ele compila a versao final e
  echo           nao relanca nada, entao derrubar o app de quem chamou seria
  echo           surpresa. run.bat e dev.bat, que relancam, fecham por conta.
  echo.
  exit /b 1
)

rem A DLL PRECISA EXISTIR ANTES DO CARGO -- nao so na hora de empacotar.
rem O `resources` do tauri.conf.json e resolvido pelo build script do tauri-build
rem em TODO `cargo build`, nao apenas em `cargo tauri build`: arquivo ausente
rem aborta com ResourcePathNotFound, e a mensagem nao diz o que fazer. Duas
rem situacoes normais caem nisso -- clone novo (bin\ e ignorado pelo git) e a
rem recuperacao do LNK1104, que APAGA a DLL antiga antes de desistir.
if not exist "%QDBU_HOME%\bin\qdbudll.dll" (
  echo [%~nx0] bin\qdbudll.dll nao existe -- compilando a DLL antes.
  call "%QDBU_HOME%\make.bat" || exit /b 1
)

cd /d "%~dp0src-tauri"
cargo build --release --target i686-pc-windows-msvc %*
if errorlevel 1 exit /b 1

echo.
copy /y "%QDBU_HOME%\bin\qdbudll.dll" "target\i686-pc-windows-msvc\release\" >nul
echo Pronto: app\src-tauri\target\i686-pc-windows-msvc\release\qdbu-console.exe
