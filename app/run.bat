@echo off
rem Dev: compila e lanca destacado.
rem
rem O app nao tem console (windows_subsystem = "windows"); os logs vao para
rem %DBU_HOME%\.run\dbu-console.log -- acompanhe com devtools\log.bat.
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

cd /d "%~dp0src-tauri"
cargo build --target i686-pc-windows-msvc
if errorlevel 1 exit /b 1

rem O >nul 2>&1 desanexa os handles: sem isso o app herda o stdout de quem
rem chamou, e um wrapper que capture a saida fica preso esperando o app fechar.
start "" "target\i686-pc-windows-msvc\debug\dbu-console.exe" >nul 2>&1
