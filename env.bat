@echo off
rem =====================================================================
rem  env.bat - ponto UNICO de configuracao do projeto.
rem
rem  Todo .bat do repositorio chama este arquivo. Nada de caminho de
rem  ferramenta espalhado pelos scripts.
rem
rem  Para ajustar na sua maquina, crie env.local.bat ao lado deste arquivo
rem  (ignorado pelo git) definindo o que precisar, por exemplo:
rem
rem      set HB_INSTALL_PREFIX=D:\harbour
rem      set DBU_VSDEVCMD=D:\VS\Common7\Tools\VsDevCmd.bat
rem =====================================================================

rem Raiz do projeto (sem barra final). Tudo que o projeto gera fica aqui dentro.
for %%i in ("%~dp0.") do set "DBU_HOME=%%~fi"

rem Overrides locais primeiro: quem define, manda.
if exist "%DBU_HOME%\env.local.bat" call "%DBU_HOME%\env.local.bat"

rem ---- Harbour ----
if "%HB_INSTALL_PREFIX%"=="" set "HB_INSTALL_PREFIX=C:\hbmsvc"

rem ---- Visual Studio (x86) ----
if not "%DBU_VSDEVCMD%"=="" goto :vs_ok
set "DBU_VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if exist "%DBU_VSWHERE%" (
  for /f "usebackq tokens=*" %%i in (`"%DBU_VSWHERE%" -latest -products * -property installationPath 2^>nul`) do (
    set "DBU_VSDEVCMD=%%i\Common7\Tools\VsDevCmd.bat"
  )
)
:vs_ok

rem ---- Pastas geradas: dentro do projeto, nunca em %TEMP% ou %LOCALAPPDATA% ----
if "%DBU_LOG%"=="" set "DBU_LOG=%DBU_HOME%\.run\dbu-console.log"
if "%WEBVIEW2_USER_DATA_FOLDER%"=="" set "WEBVIEW2_USER_DATA_FOLDER=%DBU_HOME%\.run\webview2"
if not exist "%DBU_HOME%\.run" mkdir "%DBU_HOME%\.run"

rem ---- Backup (arjota.bat) ----
rem  Definido ANTES das conferencias: backup nao precisa de Harbour nem de VS.
if "%DBU_ARJ%"=="" set "DBU_ARJ=J:\arj.exe"

rem ---- Conferencias ----
if not exist "%HB_INSTALL_PREFIX%\bin\hbmk2.exe" (
  echo [env] Harbour nao encontrado em "%HB_INSTALL_PREFIX%".
  echo [env] Defina HB_INSTALL_PREFIX em env.local.bat
  exit /b 1
)
if not exist "%DBU_VSDEVCMD%" (
  echo [env] VsDevCmd.bat nao encontrado.
  echo [env] Defina DBU_VSDEVCMD em env.local.bat
  exit /b 1
)

set "PATH=%PATH%;%HB_INSTALL_PREFIX%\bin"
set "INCLUDE=%INCLUDE%;%HB_INSTALL_PREFIX%\include"
exit /b 0
