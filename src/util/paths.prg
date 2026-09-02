/*
 * paths.prg - onde o app guarda a propria configuracao.
 *
 * O projeto e autocontido (ver GUIA-DO-PROJETO.md): tudo que ele gera fica sob a raiz.
 * A raiz e achada subindo a partir do executavel ate encontrar `dbudll.hbp` --
 * a mesma marca que o Rust usa em raiz_projeto().
 *
 * Convencao `.dbu/` repetida de proposito: a config do app fica em
 * <raiz>/.dbu/, e os perfis de cada conexao em <pasta do cliente>/.dbu/.
 * Uma convencao so, dois lugares.
 */

FUNCTION DirConfigDbu()

   LOCAL cDir := hb_DirBase()
   LOCAL i

   FOR i := 1 TO 8
      IF hb_FileExists( hb_DirSepAdd( cDir ) + "dbudll.hbp" )
         RETURN hb_DirSepAdd( cDir ) + ".dbu"
      ENDIF
      cDir := hb_PathNormalize( hb_DirSepAdd( cDir ) + ".." )
   NEXT

   /* Fora da arvore do projeto (app instalado): ao lado do executavel. */
   RETURN hb_DirSepAdd( hb_DirBase() ) + ".dbu"

/*
 * <raiz>/.run -- o que o app produz em tempo de execucao: log, cache do
 * WebView2, temporarios da geracao de XLSX.
 *
 * Separado de `.dbu/` de proposito: `.dbu/` e configuracao que o usuario quer
 * manter, `.run/` e descartavel. Apagar `.run/` nunca perde escolha nenhuma.
 */
FUNCTION DirRun()

   LOCAL cDir := hb_DirBase()
   LOCAL i

   FOR i := 1 TO 8
      IF hb_FileExists( hb_DirSepAdd( cDir ) + "dbudll.hbp" )
         RETURN hb_DirSepAdd( cDir ) + ".run"
      ENDIF
      cDir := hb_PathNormalize( hb_DirSepAdd( cDir ) + ".." )
   NEXT

   RETURN hb_DirSepAdd( hb_DirBase() ) + ".run"

/*
 * Padroniza o separador e resolve caminho relativo.
 *
 * Caminho com barras misturadas aparece naturalmente: a conexao e cadastrada
 * como "J:/bases/base01" e o Directory() devolve "NETEST.DBF".
 *
 * NAO usamos hb_PathNormalize() aqui: ela COME a barra invertida --
 * "J:\programa\dbu\NETUSU.DBF" sai como "J:programadbuNETUSU.DBF", e o
 * usuario recebe "arquivo nao existe" para um arquivo que existe.
 */
FUNCTION CaminhoOS( cCaminho )

   LOCAL cSep := hb_ps()
   LOCAL c

   IF ! HB_ISSTRING( cCaminho ) .OR. Empty( cCaminho )
      RETURN ""
   ENDIF

   c := AllTrim( cCaminho )
   c := StrTran( c, "/", cSep )
   c := StrTran( c, Chr( 92 ), cSep )

   /* colapsa separador repetido, preservando o prefixo UNC */
   DO WHILE cSep + cSep $ SubStr( c, 2 )
      c := Left( c, 1 ) + StrTran( SubStr( c, 2 ), cSep + cSep, cSep )
   ENDDO

   IF ! EhAbsoluto( c )
      c := hb_DirSepAdd( hb_cwd() ) + c
   ENDIF

   RETURN c

/* "C:" + separador, prefixo UNC, ou comecando pelo separador */
STATIC FUNCTION EhAbsoluto( c )

   IF Len( c ) >= 2 .AND. SubStr( c, 2, 1 ) == ":"
      RETURN .T.
   ENDIF

   RETURN Left( c, 1 ) == hb_ps()
