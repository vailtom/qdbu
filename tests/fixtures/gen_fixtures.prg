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
