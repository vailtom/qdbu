@echo off
rem =====================================================================
rem  confere.bat - o checklist de ANTES DE PUBLICAR, executavel.
rem
rem  Existe porque a 00.76 foi empacotada, marcada e publicada com os tres
rem  README dizendo 00.75 e com uma afirmacao FALSA sobre FOR e WHILE no
rem  texto. Nada quebrou, nada avisou, e quem percebeu foi o autor com o
rem  release ja no ar.
rem
rem  A licao nao e "ter mais cuidado": e que checklist em prosa se esquece
rem  e checklist que RODA nao. Cada item aqui sai com codigo 1 e diz o que
rem  fazer. Um comando so, antes do empacota.bat.
rem
rem      confere.bat
rem
rem  O que ele NAO faz esta impresso no fim: as conferencias que exigem
rem  olho humano nao viram "ok" automatico so para a tela ficar verde.
rem =====================================================================
setlocal EnableDelayedExpansion

if "%QDBU_HOME%"=="" set "QDBU_HOME=%~dp0"
if "%QDBU_HOME:~-1%"=="\" set "QDBU_HOME=%QDBU_HOME:~0,-1%"
cd /d "%QDBU_HOME%" || exit /b 1

set "FALHAS=0"
echo.
echo ==================== ANTES DE PUBLICAR ====================
echo.

rem ---------------------------------------------------------------- 1
rem CHAVE DE API. O autor pediu, com todas as letras, que o processo
rem abortasse se a chave dele fosse subir. Ela mora em .qdbu\ia.json, que
rem e ignorado -- mas "e ignorado" e uma linha num arquivo que muda.
echo [1/9] Chave de API em arquivo rastreado...
git grep -I -l -E "sk-[A-Za-z0-9_-]{20,}" -- . >nul 2>&1
if not errorlevel 1 (
  echo       FALHOU: ha algo com cara de chave de API em arquivo rastreado:
  git grep -I -l -E "sk-[A-Za-z0-9_-]{20,}" -- .
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 2
rem ARQUIVOS PROIBIDOS, no HISTORICO e nao so no topo. Num repositorio
rem publico, arquivo que ficou num commit antigo esta publicado do mesmo
rem jeito.
echo [2/9] Arquivos proibidos em qualquer commit...
git log --all --pretty=format: --name-only --diff-filter=A 2>nul | sort /unique > "%TEMP%\qdbu_hist.txt"
findstr /i /r "^docs/ GUIA-DO-PROJETO arjota\.bat backup_sources\.py ^\.qdbu/ \.dbf$ \.dbt$ \.ntx$ \.vew$" "%TEMP%\qdbu_hist.txt" >nul 2>&1
if not errorlevel 1 (
  echo       FALHOU: entrou no historico algo que nao podia:
  findstr /i /r "^docs/ GUIA-DO-PROJETO arjota\.bat backup_sources\.py ^\.qdbu/ \.dbf$ \.dbt$ \.ntx$ \.vew$" "%TEMP%\qdbu_hist.txt"
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 3
rem REGRA 5: nenhuma mencao a ferramenta de IA no que e publicado --
rem conteudo, nome de arquivo ou mensagem de commit.
echo [3/9] Regra 5 nas mensagens de commit...
git log --all --format="%%s %%b" 2>nul | findstr /i "claude anthropic copilot chatgpt co-authored-by" >nul 2>&1
if not errorlevel 1 (
  echo       FALHOU: mensagem de commit cita a ferramenta:
  git log --all --format="%%h %%s" | findstr /i "claude anthropic copilot chatgpt"
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 4
rem A VERSAO PUBLICADA. O erro que fez este arquivo nascer.
echo [4/9] Os tres README dizem a versao do binario...
where node >nul 2>&1
if errorlevel 1 (
  echo       FALHOU: node nao esta no PATH.
  set /a FALHAS+=1
) else (
  node "%QDBU_HOME%\app\devtools\versao.mjs" >nul 2>&1
  if errorlevel 1 (
    echo       FALHOU:
    node "%QDBU_HOME%\app\devtools\versao.mjs"
    echo       Corrija: node app\devtools\versao.mjs --corrigir
    set /a FALHAS+=1
  ) else (
    echo       ok
  )
)

rem ---------------------------------------------------------------- 5
echo [5/9] i18n: orfa, idioma atrasado, literal solto...
node "%QDBU_HOME%\app\devtools\i18n.mjs" >nul 2>&1
if errorlevel 1 (
  echo       FALHOU:
  node "%QDBU_HOME%\app\devtools\i18n.mjs"
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 6
echo [6/9] Catalogo de funcoes em sincronia com o REQUEST...
node "%QDBU_HOME%\app\devtools\catalogo.mjs" >nul 2>&1
if errorlevel 1 (
  echo       FALHOU:
  node "%QDBU_HOME%\app\devtools\catalogo.mjs"
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 7
rem TRILHO C: o contrato da DLL. Precisa do app fechado, como o build.
echo [7/9] Trilho C: contrato da DLL...
tasklist /fi "imagename eq qdbu.exe" 2>nul | find /i "qdbu.exe" >nul
if not errorlevel 1 (
  echo       PULADO: o app esta aberto e segura a DLL. Feche-o e repita.
  set /a FALHAS+=1
) else (
  call "%QDBU_HOME%\tests\build.bat" >"%TEMP%\qdbu_c.txt" 2>&1
  if errorlevel 1 (
    echo       FALHOU: veja %TEMP%\qdbu_c.txt
    set /a FALHAS+=1
  ) else (
    echo       ok
  )
)

rem ---------------------------------------------------------------- 8
rem MENSAGEM DE COMMIT EM INGLES -- regra absoluta do autor, 08/09/2026.
rem O historico de um repositorio publico e lido por quem chega de fora, e
rem e onde esta escrito POR QUE cada coisa e como e. Regra sem trilho e
rem regra que morre no primeiro dia corrido.
echo [8/9] Mensagens de commit em ingles...
node "%QDBU_HOME%\app\devtools\commits.mjs" >nul 2>&1
if errorlevel 1 (
  echo       FALHOU:
  node "%QDBU_HOME%\app\devtools\commits.mjs"
  set /a FALHAS+=1
) else (
  echo       ok
)

rem ---------------------------------------------------------------- 9
rem ARVORE LIMPA. Publicar com mudanca nao commitada produz um pacote que
rem nao corresponde a nenhum commit -- e ninguem consegue reproduzi-lo.
echo [9/9] Arvore de trabalho limpa...
git diff --quiet 2>nul
if errorlevel 1 (
  echo       FALHOU: ha mudanca nao commitada:
  git status --short
  set /a FALHAS+=1
) else (
  git diff --cached --quiet 2>nul
  if errorlevel 1 (
    echo       FALHOU: ha mudanca em stage nao commitada.
    set /a FALHAS+=1
  ) else (
    echo       ok
  )
)

echo.
echo ===========================================================
if not "%FALHAS%"=="0" (
  echo  Itens que falharam: %FALHAS%. Nao publique antes de resolver.
  echo ===========================================================
  echo.
  exit /b 1
)

echo  Os 9 automaticos passaram.
echo ===========================================================
echo.
rem AS TRES QUE PRECISAM DE OLHO NAO VIRAM "ok" AUTOMATICO. Marcar como
rem verde o que ninguem olhou e pior que nao ter o item: da a sensacao de
rem conferido. Ficam impressas, e a pessoa faz.
echo  FALTA VOCE, e nenhuma destas da para automatizar:
echo.
echo   [ ] --selftest passou?
echo       cd app\src-tauri ^&^& cargo run --target i686-pc-windows-msvc -- --selftest
echo.
echo   [ ] Abriu o .zip e olhou o que tem dentro?
echo       Quatro arquivos, nenhum de configuracao.
echo.
echo   [ ] As notas do release estao em INGLES (regra 7) e dizem o que
echo       MUDOU nesta versao -- conferido contra o codigo, nao de memoria?
echo.
exit /b 0
