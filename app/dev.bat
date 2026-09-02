@echo off
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

set "DBU_UI_DIR=%~dp0ui"

cd /d "%~dp0src-tauri"
cargo build --target i686-pc-windows-msvc
if errorlevel 1 exit /b 1

start "" "target\i686-pc-windows-msvc\debug\dbu-console.exe" >nul 2>&1

echo.
echo UI servida do disco: %DBU_UI_DIR%
echo CDP na porta 9333 (sempre ligado em debug).
echo Editou o frontend? devtools\cdp.bat reload
