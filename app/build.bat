@echo off
rem `setlocal` NAO E DETALHE: sem ele, o que este script exporta VAZA
rem para o cmd de quem chamou -- e o debug.bat exporta
rem WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333. Rodar
rem debug.bat e depois run.bat na MESMA janela abriria CDP num lancamento que
rem deveria estar sem ele, e em qualquer outro programa WebView2 iniciado dali.
rem O make.bat tem a variante lenta do mesmo problema: cada chamada empilha
rem C:\hbmsvcin no PATH, que cresce sem limite na sessao.
setlocal
rem O `resources` do tauri.conf.json e que poe a DLL DENTRO do instalador.
rem A copia daqui embaixo serve so para rodar de targetelease\ na maquina de
rem quem compila -- nao e o que o bundler empacota. Sem o `resources`, o
rem instalador sai sem a DLL e o app instalado nunca carrega.
rem Release 32-bit + copia a DLL para junto do executavel.
call "%~dp0..\vs.bat" || exit /b 1

cd /d "%~dp0src-tauri"
cargo build --release --target i686-pc-windows-msvc %*
if errorlevel 1 exit /b 1

echo.
copy /y "%DBU_HOME%\bin\dbudll.dll" "target\i686-pc-windows-msvc\release\" >nul
echo Pronto: app\src-tauri\target\i686-pc-windows-msvc\release\dbu-console.exe
