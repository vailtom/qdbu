@echo off
rem =====================================================================
rem  clean.bat - libera espaco apagando SO o que se regenera.
rem
rem  O projeto e autocontido (regra 1 do guia): tudo que ele produz cai
rem  sob a raiz do projeto. Isso e bom para nao sujar a maquina e ruim
rem  para o disco -- so o cache do cargo passa de 8 GB.
rem
rem  O CRITERIO E UNICO: entra na lista o que um comando do projeto refaz
rem  do zero. Nada que dependa de uma escolha de quem usa, e nada que
rem  tenha custado uma execucao que nao se repete.
rem
rem  NAO ENTRA, NUNCA:
rem    .git\                          o repositorio
rem    ARJ\                           os backups do arjota.bat -- 700 MB, e
rem                                   cada um e um estado que nao volta
rem    .qdbu\                         conexoes, sessao e o LOG DE ALTERACOES
rem    .run\mapa-anonimizacao.txt     o de-para da anonimizacao do historico
rem    .run\*.bundle                  o repositorio antes de ser reescrito
rem    dist\                          o pacote do beta -- so com o 2o argumento
rem    src\ docs\ app\ui\ lib\ tests\ fonte
rem
rem  Por isso .run\ e limpa por NOME, item a item, e nunca por curinga na
rem  pasta inteira: e la que moram o mapa da anonimizacao e o bundle, que
rem  nao voltam de comando nenhum.
rem
rem  SEM ARGUMENTO NAO APAGA NADA: mostra o relatorio com os tamanhos.
rem  Apagar exige dizer `agora`, em palavra inteira -- um `-f` de duas
rem  letras e facil demais de digitar por engano num script de 8 GB.
rem
rem    clean.bat              relatorio, nao toca em nada
rem    clean.bat agora        apaga a lista
rem    clean.bat agora dist   apaga a lista E os pacotes de dist\
rem
rem  Depois de limpar, para voltar ao ponto de partida:
rem    make.bat        refaz bin\qdbudll.dll
rem    app\run.bat     refaz target\ e sobe (a 1a compilacao leva minutos,
rem                    porque refaz as dependencias tambem)
rem =====================================================================
setlocal enabledelayedexpansion

set "RAIZ=%~dp0"
if "%RAIZ:~-1%"=="\" set "RAIZ=%RAIZ:~0,-1%"

set "MODO=%~1"
set "COMDIST=%~2"

rem ---- O APP ABERTO SEGURA A DLL E O CACHE DO WEBVIEW2 -----------------
rem Apagar com ele rodando deixa a arvore pela metade: alguns arquivos
rem somem, outros recusam por lock, e o `rmdir` termina sem dizer quais.
rem Mesma checagem dos outros .bat, pelo mesmo motivo.
tasklist /fi "imagename eq qdbu.exe" 2>nul | find /i "qdbu.exe" >nul
if not errorlevel 1 (
  echo.
  echo [%~nx0] O app esta ABERTO -- ele segura bin\qdbudll.dll e o cache do
  echo          WebView2. Feche-o e repita.
  echo.
  exit /b 1
)

echo.
if /i "%MODO%"=="agora" (
  echo   LIMPANDO  %RAIZ%
) else (
  echo   O QUE DA PARA LIBERAR EM  %RAIZ%
)
echo   -------------------------------------------------------------------
echo.

set /a TOTAL=0

rem ---- Cache de compilacao ---------------------------------------------
rem O maior de todos, e o unico que sozinho justifica este script.
call :pasta "app\src-tauri\target"     "cache do cargo -- cargo build refaz"
call :pasta "app\src-tauri\gen"        "gerado pelo tauri-build a cada build"

rem ---- Produtos do make.bat e do tests\build.bat ------------------------
rem bin\ inteiro: a DLL, os .lib/.exp do linker e os executaveis do
rem trilho C. make.bat e tests\build.bat refazem em segundos.
call :pasta "bin"                      "DLL e binarios do trilho C -- make.bat refaz"

rem ---- Rascunho das execucoes ------------------------------------------
rem O cache do WebView2 se refaz sozinho no proximo boot; as pastas de
rem trabalho dos testes de integridade guardam copias de DBF que os
rem proprios roteiros recriam.
call :pasta ".run\webview2"            "cache do WebView2 -- refeito no proximo boot"
call :pasta ".run\r8"                  "copias de trabalho do teste R8"
call :pasta ".run\t10"                 "copias de trabalho do teste T10"
call :pasta ".run\t13"                 "copias de trabalho do teste T13"
call :pasta ".run\t13csv"              "copias de trabalho do teste T13 (CSV)"

rem ---- Fixtures ---------------------------------------------------------
rem Regra 2 do guia: nenhum arquivo de dados entra no repositorio, as
rem fixtures sao GERADAS. tests\fixtures\fixtures.bat as refaz.
call :massa "tests\fixtures\*.dbf"     "fixtures -- fixtures.bat refaz"
call :massa "tests\fixtures\*.dbt"     ""
call :massa "tests\fixtures\*.ntx"     ""
call :massa "tests\fixtures\*.csv"     ""
call :massa "tests\fixtures\*.json"    ""
call :massa "tests\fixtures\*.xlsx"    ""

rem ---- Logs e sobras nomeadas -------------------------------------------
call :massa ".run\*.log"               "logs do app"
call :massa ".run\selftest_*.dbf"      "sobras do --selftest"
call :massa ".run\selftest_*.dbt"      ""
call :massa ".run\selftest_*.ntx"      ""

rem ---- Pacotes: so quando pedido ----------------------------------------
rem Fica de fora por padrao porque o .zip de dist\ costuma ser o que esta
rem prestes a virar um Release. empacota.bat o refaz, mas leva um build
rem release inteiro -- e apagar por acidente o que ja foi anunciado e pior
rem que ficar com alguns MB no disco.
if /i "%COMDIST%"=="dist" (
  call :pasta "dist"                   "pacotes do empacota.bat -- ele refaz"
) else (
  if exist "%RAIZ%\dist" echo    dist\  preservado -- inclua com:  clean.bat agora dist
)

echo.
echo   -------------------------------------------------------------------
set /a TG=TOTAL/1024
set /a TD=(TOTAL*10/1024)%%10
if /i "%MODO%"=="agora" (
  echo   Liberado:  %TOTAL% MB  ^(%TG%,%TD% GB^)
  echo.
  echo   Para voltar ao ponto de partida:  make.bat  e depois  app\run.bat
) else (
  echo   Liberaria: %TOTAL% MB  ^(%TG%,%TD% GB^)
  echo.
  echo   Nada foi apagado. Para apagar de fato:  clean.bat agora
)
echo.
exit /b 0

rem =====================================================================
rem  :pasta <caminho relativo> <por que pode sumir>
rem =====================================================================
:pasta
set "P=%RAIZ%\%~1"
if not exist "%P%" exit /b 0
call :mb "%P%" TAM
set /a TOTAL=TOTAL+TAM
echo    %~1
echo         !TAM! MB   %~2
if /i "%MODO%"=="agora" (
  rmdir /s /q "%P%" 2>nul
  if exist "%P%" echo         [ATENCAO] nao saiu inteira -- algum arquivo esta em uso.
)
exit /b 0

rem =====================================================================
rem  :massa <mascara relativa> <por que pode sumir>
rem
rem  Separado de :pasta porque curinga de ARQUIVO nunca pode virar rmdir:
rem  um caminho montado errado apagaria a pasta inteira em vez do que
rem  casou com a mascara. Aqui so ha `del`, e so sobre o que o `for`
rem  realmente encontrou.
rem =====================================================================
:massa
set "M=%RAIZ%\%~1"
set /a QTD=0
set /a KB=0
for %%f in ("%M%") do (
  set /a QTD=QTD+1
  set /a KB=KB+%%~zf/1024
)
if %QTD%==0 exit /b 0
set /a MBA=KB/1024
set /a TOTAL=TOTAL+MBA
echo    %~1  ^(%QTD%^)
echo         !MBA! MB   %~2
if /i "%MODO%"=="agora" del /q "%M%" 2>nul
exit /b 0

rem =====================================================================
rem  :mb <pasta> <variavel>  -- soma recursiva, JA em MB inteiros.
rem
rem  Via PowerShell por dois motivos: o `dir /s` do cmd imprime o total
rem  com separador de milhar da localidade ("8.495.302.144") e `set /a`
rem  nao le isso; e `set /a` e 32-bit, entao 8 GB em bytes estouraria de
rem  qualquer jeito. Em MB o maior alvo cabe folgado num inteiro.
rem
rem  O laco `foreach` no lugar de `... ^| Measure-Object` nao e estilo: o
rem  `|` dentro de um `for /f` que ja usa `^` para continuar a linha
rem  precisa de dois niveis de escape, e a versao com pipe voltava VAZIA
rem  -- o relatorio inteiro dizia 0 MB, que e o pior desfecho possivel
rem  para um script cuja unica saida e um numero. Sem pipe nao ha escape.
rem =====================================================================
:mb
set "%~2=0"
for /f %%n in ('powershell -NoProfile -Command "$s=[int64]0; foreach($f in (Get-ChildItem -LiteralPath '%~1' -Recurse -Force -File -EA SilentlyContinue)){$s+=$f.Length}; [int][math]::Round($s/1MB)"') do set "%~2=%%n"
exit /b 0
