@echo off
rem Release 32-bit + copia a DLL para junto do executavel.
call "%~dp0..\vs.bat" || exit /b 1

cd /d "%~dp0src-tauri"
cargo build --release --target i686-pc-windows-msvc %*
if errorlevel 1 exit /b 1

echo.
copy /y "%DBU_HOME%\bin\dbudll.dll" "target\i686-pc-windows-msvc\release\" >nul
echo Pronto: app\src-tauri\target\i686-pc-windows-msvc\release\dbu-console.exe
