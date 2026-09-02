@echo off
rem Carrega env.bat + ambiente MSVC x86. Usado pelos scripts de build.
call "%~dp0env.bat" || exit /b 1
call "%DBU_VSDEVCMD%" -arch=x86 -host_arch=x86 >nul
exit /b 0
