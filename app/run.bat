@echo off
rem `setlocal` NAO E DETALHE: sem ele, tudo que este script define VAZA para o
rem cmd de quem chamou. O vs.bat carrega o ambiente INTEIRO do MSVC e empilha
rem %HB_INSTALL_PREFIX%\bin no PATH; rodar o script duas vezes na mesma janela
rem empilha duas vezes, e o PATH cresce sem limite ate a sessao quebrar.
setlocal
rem Dev: compila e lanca destacado.
rem
rem O app nao tem console (windows_subsystem = "windows"); os logs vao para
rem %QDBU_HOME%\.run\qdbu-console.log -- acompanhe com devtools\log.bat.
rem
rem O CDP do WebView2 sobe SEMPRE em build de debug, na porta 9333 (ligado pelo
rem proprio Rust, ver liga_cdp() em src-tauri/src/main.rs). Valide a UI com
rem devtools\cdp.bat click/text/eval/shot/reload/logs.
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

cd /d "%~dp0src-tauri"
cargo build --target i686-pc-windows-msvc
if errorlevel 1 exit /b 1

rem O >nul 2>&1 desanexa os handles: sem isso o app herda o stdout de quem
rem chamou, e um wrapper que capture a saida fica preso esperando o app fechar.
start "" "target\i686-pc-windows-msvc\debug\qdbu-console.exe" >nul 2>&1
