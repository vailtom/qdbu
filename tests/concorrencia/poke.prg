/*
 * poke.prg -- simula "o outro app" (o ERP, o DBU original) mexendo no mesmo
 * arquivo que o QDBU tem aberto.
 *
 * Abre COMPARTILHADO, trava o registro, grava o campo, solta. E exatamente o
 * que qualquer programa Clipper faz -- e o que o QDBU precisa sobreviver.
 *
 *   poke <arquivo.dbf> <recno> <campo> <valor>
 */

REQUEST DBFNTX, DBFCDX

PROCEDURE Main( cArq, cRec, cCampo, cValor )

   LOCAL nRec, nPos, xAntes, cTipo

   IF cArq == NIL .OR. cRec == NIL .OR. cCampo == NIL
      ? "uso: poke <arquivo.dbf> <recno> <campo> <valor>"
      RETURN
   ENDIF

   nRec := Val( cRec )
   hb_default( @cValor, "" )

   rddSetDefault( "DBFNTX" )
   SET DELETED OFF

   /* .T. no quinto parametro = COMPARTILHADO. O QDBU esta com o arquivo
      aberto; abrir exclusivo aqui falharia, e nao e isso que se quer testar. */
   dbUseArea( .T., , cArq, "ALVO", .T., .F. )

   IF ! Used()
      ? "nao consegui abrir (compartilhado):", cArq
      RETURN
   ENDIF

   ? "arquivo :", cArq
   ? "registros:", LastRec()

   dbGoTo( nRec )
   IF Eof()
      ? "registro", nRec, "nao existe"
      dbCloseArea()
      RETURN
   ENDIF

   nPos := FieldPos( cCampo )
   IF nPos == 0
      ? "campo", cCampo, "nao existe"
      dbCloseArea()
      RETURN
   ENDIF

   xAntes := FieldGet( nPos )
   cTipo := ValType( xAntes )

   /* SEM valor = so LE. Existe porque usar a ferramenta de escrita para
      conferir o resultado altera o que se queria conferir -- foi o que
      aconteceu na primeira passada do teste. */
   IF PCount() < 4
      ? "registro:", nRec
      ? "campo   :", cCampo, "(" + cTipo + ")"
      ? "VALOR   :", "[" + AllTrim( Transform( xAntes, NIL ) ) + "]"
      dbCloseArea()
      RETURN
   ENDIF

   IF ! RLock()
      ? "nao consegui travar o registro", nRec
      dbCloseArea()
      RETURN
   ENDIF

   DO CASE
   /* Memo tambem chega como "C" no ValType -- mas nao tem tamanho fixo, e
      encher/cortar pelo valor anterior gravaria menos do que se pediu. */
   CASE hb_FieldType( nPos ) $ "MP" ; FieldPut( nPos, cValor )
   CASE cTipo == "C" ; FieldPut( nPos, PadR( cValor, Len( xAntes ) ) )
   CASE cTipo == "N" ; FieldPut( nPos, Val( cValor ) )
   CASE cTipo == "L" ; FieldPut( nPos, Upper( Left( cValor, 1 ) ) $ "TSY1" )
   CASE cTipo == "D" ; FieldPut( nPos, SToD( cValor ) )
   OTHERWISE         ; FieldPut( nPos, cValor )
   ENDCASE

   dbCommit()
   dbUnlock()

   ? "registro:", nRec
   ? "campo   :", cCampo, "(" + cTipo + ")"
   ? "ANTES   :", "[" + AllTrim( Transform( xAntes, NIL ) ) + "]"
   ? "AGORA   :", "[" + AllTrim( Transform( FieldGet( nPos ), NIL ) ) + "]"

   dbCloseArea()

   RETURN
