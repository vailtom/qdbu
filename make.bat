@echo off
rem `setlocal` NAO E DETALHE: sem ele, o que este script exporta VAZA
rem para o cmd de quem chamou -- e o debug.bat exporta
rem WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333. Rodar
rem debug.bat e depois run.bat na MESMA janela abriria CDP num lancamento que
rem deveria estar sem ele, e em qualquer outro programa WebView2 iniciado dali.
rem O make.bat tem a variante lenta do mesmo problema: cada chamada empilha
rem C:\hbmsvcin no PATH, que cresce sem limite na sessao.
setlocal
rem Compila bin\dbudll.dll (32-bit).
rem Feche o app antes: com a DLL carregada o linker falha com LNK1104 e APAGA a
rem DLL antiga antes de desistir.
call "%~dp0vs.bat" || exit /b 1

cd /d "%~dp0"
hbmk2 dbudll.hbp %*
