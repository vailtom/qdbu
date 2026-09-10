/*
 * gen_fixtures.prg - gera os DBFs de teste do projeto.
 *
 * REGRA DO PROJETO: nenhum DBF real entra no repositorio. As fixtures sao
 * sinteticas e geradas por este script; o .gitignore bloqueia *.dbf/*.dbt/*.ntx.
 *
 * Uso:  fixtures.bat            gera as fixtures pequenas
 *       fixtures.bat 500000     gera tambem grande.dbf com N registros
 */

#include "dbstruct.ch"

/* A codepage do lado DBF. Sem o REQUEST ela nao entra no binario. */
REQUEST HB_CODEPAGE_PT850

PROCEDURE Main( cQtdGrande )

   LOCAL nGrande := Val( hb_defaultValue( cQtdGrande, "0" ) )

   hb_cdpSelect( "PT850" )

   ? "Gerando fixtures em " + CurDir()
   ?

   GeraTipos()
   GeraVazio()
   GeraRelacionadas()
   GeraReferencia()

   IF nGrande > 0
      GeraGrande( nGrande )
   ELSE
      ? "grande.dbf: pulado (passe a quantidade como argumento)"
   ENDIF

   ?
   ? "Pronto."

   RETURN

/*
 * tipos.dbf - um registro de cada situacao que a UI precisa aguentar.
 * Inclui acentuacao (round-trip de codepage) e byte NUL dentro de campo
 * caractere -- que trunca a resposta inteira se o JSON nao escapar.
 */
STATIC PROCEDURE GeraTipos()

   LOCAL aEstru := { ;
      { "TXT",    "C", 40, 0 }, ;
      { "ACENTO", "C", 40, 0 }, ;
      { "SUJO",   "C", 20, 0 }, ;
      { "NUM",    "N", 12, 2 }, ;
      { "INT",    "N",  8, 0 }, ;
      { "DATA",   "D",  8, 0 }, ;
      { "LOGICO", "L",  1, 0 }, ;
      { "OBS",    "M", 10, 0 } }

   FErase( "tipos.dbf" ) ; FErase( "tipos.dbt" )
   dbCreate( "tipos.dbf", aEstru )
   USE tipos EXCLUSIVE NEW

   AppendRec( "primeiro registro", "JOAO ACUCAR ANGULO", "limpo", ;
              1234.56, 42, hb_Date( 2009, 7, 3 ), .T., "memo curto" )

   /* acentuacao real, gravada na codepage do arquivo */
   AppendRec( "acentos", Nativo( "JOÃO ÇÃO ÂNGULO ÜBER ñ" ), "limpo", ;
              -99.99, 0, hb_Date( 1979, 1, 1 ), .F., "linha 1" + hb_eol() + "linha 2" )

   /* byte NUL no meio de campo C: o JSON tem de escapar, senao a resposta trunca */
   AppendRec( "com NUL", "antes" + Chr( 0 ) + "depois", "a" + Chr( 0 ) + "b", ;
              0, 0, hb_Date( 2000, 12, 31 ), .T., "" )

   /* extremos numericos e campos vazios */
   AppendRec( "", "", "", 999999999.99, 99999999, CToD( "" ), .F., "" )

   /*
    * O PESADELO DO CSV, tudo numa linha so.
    *
    * Cada um destes quebra o arquivo de um jeito diferente se o escape falhar:
    * o separador parte a linha em duas colunas, a aspas dupla fecha o campo no
    * meio, e a quebra de linha vira DOIS registros -- e a partir dali o arquivo
    * inteiro desalinha, sem erro nenhum. Sao os casos que so aparecem no dado
    * de cliente, meses depois.
    */
   AppendRec( Nativo( "vírgula, ponto; e mais" ), ;
              'aspas "duplas" no meio', ;
              "apostrofo d'agua", ;
              1, 1, hb_Date( 2020, 5, 10 ), .T., ;
              "memo com" + hb_eol() + "quebra de linha" + hb_eol() + 'e "aspas"' )

   /* Separador de campo DENTRO do valor, nos tres que oferecemos. */
   AppendRec( "tab" + Chr( 9 ) + "e;ponto-e-virgula", ;
              Nativo( "vírgula,dentro" ), ;
              'tudo: ,;"' + Chr( 9 ), ;
              -1, -1, hb_Date( 1999, 12, 31 ), .F., ;
              'memo: ,;" e ' + Chr( 9 ) + " tab" )

   /* registro deletado, para exercitar SET DELETED e o marcador da grade */
   AppendRec( "deletado", "este registro esta marcado", "x", ;
              1, 1, Date(), .T., "" )
   dbDelete()

   ? "tipos.dbf      " + hb_ntos( LastRec() ) + " registros, " + ;
     hb_ntos( Len( aEstru ) ) + " campos"
   dbCloseArea()

   RETURN

/*
 * TODO literal com acento tem de passar por aqui -- ja foi esquecido duas vezes,
 * e o sintoma nao acusa a causa: a exportacao devolve "v├¡rgula" e parece bug de
 * codepage do dispatcher, quando o errado e o dado que entrou no DBF.
 *
 * Literal acentuado deste arquivo -> bytes CP850.
 *
 * Este .prg e salvo em UTF-8, entao "JOAO" com til carrega bytes UTF-8. Gravar
 * isso cru produzia um DBF que NAO era CP850, e a fixture criada para provar a
 * conversao provava o contrario: a leitura devolvia "JO<box>O" -- UTF-8 lido
 * como CP850 -- e parecia bug do dispatcher, nao do gerador.
 */
STATIC FUNCTION Nativo( cUtf8 )
   RETURN hb_Translate( cUtf8, "UTF8", "PT850" )

STATIC PROCEDURE AppendRec( cTxt, cAcento, cSujo, nNum, nInt, dData, lLog, cObs )

   dbAppend()
   FIELD->TXT    := cTxt
   FIELD->ACENTO := cAcento
   FIELD->SUJO   := cSujo
   FIELD->NUM    := nNum
   FIELD->INT    := nInt
   FIELD->DATA   := dData
   FIELD->LOGICO := lLog
   FIELD->OBS    := cObs

   RETURN

/* vazio.dbf - estrutura valida, zero registros. Borda do paginador. */
STATIC PROCEDURE GeraVazio()

   FErase( "vazio.dbf" )
   dbCreate( "vazio.dbf", { { "CODIGO", "C", 10, 0 }, { "VALOR", "N", 10, 2 } } )
   ? "vazio.dbf      0 registros"

   RETURN

/* pai.dbf + filho.dbf - para o bloco de relacoes (B13). */
STATIC PROCEDURE GeraRelacionadas()

   LOCAL i, j

   FErase( "pai.dbf" ) ; FErase( "filho.dbf" ) ; FErase( "filho.ntx" )

   dbCreate( "pai.dbf", { { "COD", "C", 5, 0 }, { "NOME", "C", 30, 0 } } )
   USE pai EXCLUSIVE NEW
   FOR i := 1 TO 20
      dbAppend()
      FIELD->COD  := StrZero( i, 5 )
      FIELD->NOME := "CLIENTE " + StrZero( i, 5 )
   NEXT
   ? "pai.dbf        " + hb_ntos( LastRec() ) + " registros"
   dbCloseArea()

   dbCreate( "filho.dbf", { { "COD", "C", 5, 0 }, { "ITEM", "N", 4, 0 }, { "VALOR", "N", 10, 2 } } )

   /*
    * prefixo.dbf -- UM NOME QUE E PREFIXO DO OUTRO, trocados de lugar.
    *
    * Existe por um defeito real: `AScan( aNomes, cNome )` compara com `=`, que
    * obedece ao SET EXACT -- nunca ligado neste projeto. Procurando `SYNC1`
    * numa lista que comeca com `SYNC10`, o AScan devolvia a posicao do OUTRO
    * campo, e a troca dos dois passava por "ninguem se moveu". `COD`/`CODIGO`
    * e `CLI_NOME`/`CLI_NOME2` sao a cara de um DBF de verdade, entao isto nao
    * e um caso de laboratorio.
    *
    * Aqui a ordem e SYNC10, SYNC1; na referencia e SYNC1, SYNC10. Os dois
    * campos mudaram de lugar, e os dois tem de aparecer com `position`.
    */
   dbCreate( "prefixo.dbf", { { "SYNC10", "C", 8, 0 }, { "SYNC1", "C", 8, 0 } } )
   USE filho EXCLUSIVE NEW
   FOR i := 1 TO 20
      FOR j := 1 TO 3
         dbAppend()
         FIELD->COD   := StrZero( i, 5 )
         FIELD->ITEM  := j
         FIELD->VALOR := i * 100 + j
      NEXT
   NEXT
   INDEX ON FIELD->COD TO filho
   ? "filho.dbf      " + hb_ntos( LastRec() ) + " registros + filho.ntx"
   dbCloseArea()

   RETURN

/*
 * ref/ - a PASTA DE REFERENCIA do sincronizar estrutura (docs/20).
 *
 * A pasta de fixtures faz o papel de "cliente" e esta faz o de "homologacao":
 * cada arquivo aqui existe para produzir UM diagnostico previsivel.
 *
 *   tipos.dbf   ACENTO e TXT trocados de lugar (position); TXT 40->60 (len,
 *               cliente menor); NUM 12,2 -> 12,3 (dec); INT some da
 *               referencia (extra no cliente); NOVO C 10 nasce (missing).
 *               OBS memo continua, para o .dbt ir junto na copia.
 *   pai.dbf     identico -> same
 *   (filho.dbf) nao existe aqui -> onlyInTarget; nunca vira acao
 *   extra.dbf   so aqui -> missingInTarget, cria vazio
 *   larga.dbf   um C(300): o byte alto do tamanho mora nos decimais, e a
 *               leitura do cabecalho tem de desfazer isso como o RDD faz
 *   lixo.dbf    texto com extensao .dbf -> invalid, listado e nunca aplicado
 */
STATIC PROCEDURE GeraReferencia()

   LOCAL i

   IF ! hb_DirExists( "ref" )
      hb_DirCreate( "ref" )
   ENDIF
   AEval( Directory( "ref" + hb_ps() + "*.*" ), {| a | FErase( "ref" + hb_ps() + a[ 1 ] ) } )

   dbCreate( "ref/tipos.dbf", { ;
      { "ACENTO", "C", 40, 0 }, ;
      { "TXT",    "C", 60, 0 }, ;
      { "SUJO",   "C", 20, 0 }, ;
      { "NUM",    "N", 12, 3 }, ;
      { "DATA",   "D",  8, 0 }, ;
      { "LOGICO", "L",  1, 0 }, ;
      { "OBS",    "M", 10, 0 }, ;
      { "NOVO",   "C", 10, 0 } } )
   dbUseArea( .T.,, "ref/tipos.dbf", "REFT", .F. )
   dbAppend()
   FIELD->TXT := "referencia" ; FIELD->NUM := 1.234 ; FIELD->NOVO := "novo"
   dbCloseArea()

   dbCreate( "ref/pai.dbf", { { "COD", "C", 5, 0 }, { "NOME", "C", 30, 0 } } )
   dbUseArea( .T.,, "ref/pai.dbf", "REFP", .F. )
   FOR i := 1 TO 3
      dbAppend()
      FIELD->COD := StrZero( i, 5 ) ; FIELD->NOME := "REF " + StrZero( i, 5 )
   NEXT
   dbCloseArea()

   dbCreate( "ref/extra.dbf", { { "CODIGO", "C", 10, 0 }, { "QUANDO", "D", 8, 0 } } )

   /* O outro lado do prefixo.dbf: mesma dupla, ordem invertida. Ver o
      comentario na geracao do alvo. */
   dbCreate( "ref/prefixo.dbf", { { "SYNC1", "C", 8, 0 }, { "SYNC10", "C", 8, 0 } } )

   dbCreate( "ref/larga.dbf", { { "ID", "N", 6, 0 }, { "TEXTO", "C", 300, 0 } } )
   dbUseArea( .T.,, "ref/larga.dbf", "REFL", .F. )
   dbAppend()
   FIELD->ID := 1 ; FIELD->TEXTO := Replicate( "x", 300 )
   dbCloseArea()

   hb_MemoWrit( "ref/lixo.dbf", "[secao]" + hb_eol() + "isto nao e um dbf" + hb_eol() )

   ? "ref/           tipos, pai, extra, larga(C300), prefixo, lixo(invalido)"

   RETURN

/* grande.dbf - volume para exercitar paginacao, jobs, progresso e cancelamento. */
STATIC PROCEDURE GeraGrande( nQtd )

   LOCAL i
   LOCAL nPasso := Max( 1, Int( nQtd / 10 ) )

   FErase( "grande.dbf" ) ; FErase( "grande.ntx" )
   dbCreate( "grande.dbf", { ;
      { "CHAVE", "C", 10, 0 }, ;
      { "NOME",  "C", 40, 0 }, ;
      { "VALOR", "N", 12, 2 }, ;
      { "DATA",  "D",  8, 0 } } )

   USE grande EXCLUSIVE NEW
   ? "grande.dbf     gerando " + hb_ntos( nQtd ) + " registros..."

   FOR i := 1 TO nQtd
      dbAppend()
      FIELD->CHAVE := StrZero( nQtd - i + 1, 10 )   /* fora de ordem, de proposito */
      FIELD->NOME  := "REGISTRO " + StrZero( i, 10 )
      FIELD->VALOR := i / 100
      FIELD->DATA  := Date() - ( i % 3650 )
      IF i % nPasso == 0
         ?? "."
      ENDIF
   NEXT

   INDEX ON FIELD->CHAVE TO grande
   ?
   ? "grande.dbf     " + hb_ntos( LastRec() ) + " registros + grande.ntx"
   dbCloseArea()

   RETURN
