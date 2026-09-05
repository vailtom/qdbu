@echo off
rem `setlocal` NAO E DETALHE: sem ele, tudo que este script define VAZA para o
rem cmd de quem chamou. O vs.bat carrega o ambiente INTEIRO do MSVC e empilha
rem %HB_INSTALL_PREFIX%\bin no PATH; rodar o script duas vezes na mesma janela
rem empilha duas vezes, e o PATH cresce sem limite ate a sessao quebrar.
setlocal
rem Dev com recarga de frontend SEM recompilar o Rust.
rem
rem generate_context!() embute app\ui\ no binario em tempo de compilacao. Aqui o
rem proprio app serve app\ui\ do disco pelo protocolo "dev": editar HTML/CSS/JS
rem e depois devtools\cdp.bat reload ja mostra a mudanca.
rem
rem Nao usamos servidor HTTP externo de proposito: a origem seria remota e o ACL
rem do Tauri v2 recusa o invoke ("status not allowed. Plugin not found").
rem Estes dois scripts sao de DESENVOLVIMENTO e lancam sempre o executavel de
rem debug -- o caminho do `start` la embaixo e fixo. Repassar argumentos ao
rem compilador com um `start` fixo produz a pior combinacao possivel: `--release`
rem compilaria a versao final por varios minutos e abriria o binario ANTIGO, o de
rem debug, sem dizer nada. A pessoa olharia a tela achando que ve a versao final.
rem Para a versao final existe build.bat, que compila E copia a DLL para o lado.
if not "%~1"=="" (
  echo.
  echo %~nx0 nao aceita argumentos -- ele sempre lanca o executavel de debug.
  echo Para a versao final use:  build.bat
  echo.
  exit /b 1
)

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
  echo [%~nx0] Fechando a instancia anterior do app -- ela segura bin\qdbudll.dll.
  taskkill /im qdbu-console.exe /f >nul 2>&1
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

set "QDBU_UI_DIR=%~dp0ui"

cd /d "%~dp0src-tauri"
cargo build --target i686-pc-windows-msvc
if errorlevel 1 exit /b 1

start "" "target\i686-pc-windows-msvc\debug\qdbu-console.exe" >nul 2>&1

echo.
echo UI servida do disco: %QDBU_UI_DIR%
echo CDP na porta 9333 (sempre ligado em debug).
echo Editou o frontend? devtools\cdp.bat reload
