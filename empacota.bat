@echo off
rem =====================================================================
rem  empacota.bat - monta o .zip do QDBU para o time de teste.
rem
rem  NAO E INSTALADOR. E um pacote portatil: descompactar e clicar. O
rem  instalador vem depois; isto existe para pipeline de beta ser um
rem  comando so.
rem
rem  `setlocal`: o vs.bat carrega o ambiente INTEIRO do MSVC e empilha
rem  %HB_INSTALL_PREFIX%\bin no PATH. Sem isto, rodar duas vezes na mesma
rem  janela empilha duas vezes -- mesmo motivo dos outros .bat.
rem =====================================================================
setlocal

call "%~dp0vs.bat" || exit /b 1

rem ---- O APP ABERTO IMPEDE O BUILD -------------------------------------
rem O `resources` do tauri.conf.json faz o tauri-build copiar
rem bin\qdbudll.dll para junto do executavel em TODO `cargo build`. Com o
rem app rodando a DLL esta carregada e a copia falha com "os error 32", no
rem meio de trinta linhas de saida. Parar aqui da a mensagem util.
tasklist /fi "imagename eq qdbu.exe" 2>nul | find /i "qdbu.exe" >nul
if not errorlevel 1 (
  echo.
  echo [%~nx0] O app esta ABERTO e segura bin\qdbudll.dll -- feche-o e repita.
  echo.
  exit /b 1
)

rem ---- A DLL PRECISA EXISTIR ANTES DO CARGO ----------------------------
rem Resolvido pelo build script do tauri-build em todo `cargo build`, nao
rem so ao empacotar: ausente, aborta com ResourcePathNotFound e a mensagem
rem nao diz o que fazer. Clone novo cai nisso, porque bin\ e ignorado.
if not exist "%QDBU_HOME%\bin\qdbudll.dll" (
  echo [%~nx0] bin\qdbudll.dll nao existe -- compilando a DLL antes.
  call "%QDBU_HOME%\make.bat" || exit /b 1
)

rem ---- CRT ESTATICA: E O QUE TORNA O PACOTE PORTATIL -------------------
rem Sem isto o exe importa VCRUNTIME140.dll, e a maquina do testador
rem precisaria do redistribuivel do Visual C++ instalado. O sintoma seria
rem o pior possivel: duplo clique, nenhuma janela, nenhuma mensagem.
rem A DLL do Harbour ja e estatica (so KERNEL32, USER32 e WINMM), entao
rem com esta linha o pacote inteiro passa a depender so do Windows.
set "RUSTFLAGS=-C target-feature=+crt-static"

echo [%~nx0] Compilando release 32-bit com CRT estatica...
cd /d "%~dp0app\src-tauri"
cargo build --release --target i686-pc-windows-msvc || exit /b 1

set "ORIGEM=%QDBU_HOME%\app\src-tauri\target\i686-pc-windows-msvc\release\qdbu.exe"
if not exist "%ORIGEM%" (
  echo [%~nx0] O executavel nao apareceu em target\...\release\ -- build falhou?
  exit /b 1
)

rem ---- Versao e carimbo, numa chamada so ------------------------------
for /f "usebackq tokens=1,2" %%a in (`powershell -NoProfile -Command ^
  "$c=Get-Content '%QDBU_HOME%\app\src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json; '{0} {1}' -f $c.version,(Get-Date -Format yyyyMMdd)"`) do (
  set "VER=%%a"
  set "HOJE=%%b"
)

set "NOME=qdbu-%VER%-%HOJE%"
set "SAIDA=%QDBU_HOME%\dist"
set "PASTA=%SAIDA%\%NOME%"

rem Refaz do zero: pacote e artefato, e sobra de execucao anterior dentro
rem dele viraria arquivo a mais no .zip sem ninguem notar.
rem ---- dist/ SE PROTEGE SOZINHA -------------------------------------
rem O .gitignore da raiz ja bloqueia dist/, mas isso e UMA linha num
rem arquivo que muda: some num refactor e o pacote passa a aparecer no
rem `git status` sem ninguem notar -- e um .zip de 2,8 MB commitado por
rem engano nao sai mais do historico sem reescreve-lo.
rem Este .gitignore local vale mesmo que o da raiz perca a linha.
if not exist "%SAIDA%" mkdir "%SAIDA%"
if not exist "%SAIDA%\.gitignore" (
  > "%SAIDA%\.gitignore" echo # Pacotes gerados por empacota.bat. Nada aqui e versionado.
  >>"%SAIDA%\.gitignore" echo *
)

if exist "%PASTA%" rmdir /s /q "%PASTA%"
mkdir "%PASTA%" 2>nul

rem ---- O conteudo, e so ele -------------------------------------------
rem A interface NAO entra: `generate_context!()` a embute no binario em
rem tempo de compilacao, e em release `dir_da_ui()` devolve None. Copiar
rem app\ui para ca criaria uma segunda copia que o app jamais leria.
copy /y "%ORIGEM%" "%PASTA%\qdbu.exe" >nul || exit /b 1
copy /y "%QDBU_HOME%\bin\qdbudll.dll" "%PASTA%\qdbudll.dll" >nul || exit /b 1
copy /y "%QDBU_HOME%\LICENSE" "%PASTA%\LICENSE.txt" >nul

call :leiame "%PASTA%\LEIAME.txt"

rem ---- O .zip ----------------------------------------------------------
rem Compress-Archive porque vem com o Windows: o testador nao precisa de
rem nada instalado, e o script nao depende de 7-Zip nem de arj.
if exist "%SAIDA%\%NOME%.zip" del /q "%SAIDA%\%NOME%.zip"
powershell -NoProfile -Command ^
  "Compress-Archive -Path '%PASTA%\*' -DestinationPath '%SAIDA%\%NOME%.zip' -CompressionLevel Optimal" || exit /b 1

rem A pasta de estagio some DEPOIS de o .zip existir, e nunca antes: se a
rem compactacao falhar, o conteudo montado continua ai para ser inspecionado.
rem O artefato e o .zip; a pasta era so o caminho ate ele.
if exist "%SAIDA%\%NOME%.zip" (
  rmdir /s /q "%PASTA%"
) else (
  echo [%~nx0] O .zip nao foi criado -- a pasta %NOME% ficou em dist\ para conferencia.
  exit /b 1
)

echo.
echo   Pacote:  dist\%NOME%.zip
for %%f in ("%SAIDA%\%NOME%.zip") do echo   Tamanho: %%~zf bytes
echo   Conteudo: qdbu.exe + qdbudll.dll + LEIAME.txt + LICENSE.txt
echo.
echo   Manda o .zip. Quem recebe descompacta numa pasta gravavel e clica
echo   em qdbu.exe. Nao precisa instalar nada.
echo.
exit /b 0

rem =====================================================================
rem  O LEIAME vive AQUI, e nao num arquivo solto do repositorio.
rem  Ele descreve o PACOTE -- o que entrou, o que a maquina precisa ter e
rem  onde o app grava. Um arquivo separado envelheceria em silencio na
rem  primeira vez que este script mudasse de conteudo.
rem =====================================================================
:leiame
> %1 echo QDBU %VER%  --  pacote de teste de %HOJE%
>>%1 echo.
>>%1 echo COMO RODAR
>>%1 echo.
>>%1 echo   1. Descompacte esta pasta onde voce tenha permissao de escrita
>>%1 echo      (Documentos, Desktop, um pendrive). Evite Arquivos de
>>%1 echo      Programas: o app grava do lado dele.
>>%1 echo   2. Clique em qdbu.exe. Nao ha instalacao.
>>%1 echo.
>>%1 echo O QUE A MAQUINA PRECISA TER
>>%1 echo.
>>%1 echo   Windows 10 ou 11.
>>%1 echo   WebView2 Runtime, que ja vem no Windows 11 e no Windows 10
>>%1 echo   atualizado. Se a janela abrir vazia ou nao abrir, instale de
>>%1 echo   https://developer.microsoft.com/microsoft-edge/webview2/
>>%1 echo.
>>%1 echo   Nada mais. O executavel leva a biblioteca C embutida, entao
>>%1 echo   nao pede o redistribuivel do Visual C++.
>>%1 echo.
>>%1 echo ONDE ELE GRAVA
>>%1 echo.
>>%1 echo   Ao lado do qdbu.exe, em duas pastas que ele cria sozinho:
>>%1 echo.
>>%1 echo     .run\    log da aplicacao e cache do navegador embutido
>>%1 echo     .qdbu\   suas conexoes, a sessao e o LOG DE ALTERACOES
>>%1 echo.
>>%1 echo   Apagar a pasta apaga o app inteiro. Nao mexe no registro do
>>%1 echo   Windows e nao deixa nada em outro lugar.
>>%1 echo.
>>%1 echo AVISO
>>%1 echo.
>>%1 echo   Prova de conceito e exercicio de estudo, fornecido SEM GARANTIA
>>%1 echo   DE NENHUMA ESPECIE. O uso e por sua conta e risco. Ver
>>%1 echo   LICENSE.txt.
>>%1 echo.
>>%1 echo   ELE ESCREVE NO SEU DBF. Compactar, esvaziar, alterar estrutura,
>>%1 echo   substituir em massa e editar registro mudam bytes no disco. Ha
>>%1 echo   um pre-voo que confere espaco, faz backup do conjunto e verifica
>>%1 echo   a copia antes de operar -- isso reduz o risco, nao o elimina.
>>%1 echo.
>>%1 echo   TENHA BACKUP antes de apontar para dado de producao.
>>%1 echo.
>>%1 echo AO RELATAR UM PROBLEMA
>>%1 echo.
>>%1 echo   Mande o .run\qdbu.log junto, e diga o que voce fez ate
>>%1 echo   a tela errada aparecer. O log tem o que aconteceu; a descricao
>>%1 echo   tem o que voce esperava.
exit /b 0
