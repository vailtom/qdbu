/*
 * dispatch.prg - despachante unico chamado pela ponte C.
 *
 * ENVELOPE (estilo JSON-RPC/MCP):
 *
 *   pedido   {"id":"r-42","method":"file.open","params":{...}}
 *   sucesso  {"id":"r-42","ok":true,"rev":17,"result":{...}}
 *   recusa   {"id":"r-42","ok":false,"error":{"code":"...","message":"..."}}
 *
 * O `id` volta ecoado. Serve para tres coisas: correlacionar jobs assincronos,
 * rastrear no log, e detectar buffer desalinhado -- se o id da resposta nao bate
 * com o do pedido, e bug de ponte, nao dado ruim. Falha barulhenta em vez de
 * silenciosa.
 *
 * O `rev` e um contador de sessao que sobe a cada mutacao. O JS compara com o
 * que tem; se pulou, refaz session.state. Invalidacao de cache em uma linha.
 *
 * Compatibilidade: chamada sem envelope (string crua) continua funcionando como
 * `Api_Xxx(cArg) -> string`. E o que o cliente C (tests/testload.c) usa.
 */

#include "hbclass.ch"

FUNCTION DllDispatch( cFunc, cArg )

   LOCAL xRet
   LOCAL oErr
   LOCAL bOld

   hb_default( @cFunc, "" )
   hb_default( @cArg, "" )

   bOld := ErrorBlock( {| e | Break( e ) } )

   BEGIN SEQUENCE

      IF Upper( cFunc ) == "RPC"
         xRet := Despacha( cArg )          /* envelope */
      ELSEIF Empty( cFunc )
         xRet := "ERR:funcao nao informada"
      ELSEIF ! __dynsIsFun( Upper( cFunc ) )
         xRet := "ERR:funcao '" + cFunc + "' nao existe na DLL"
      ELSE
         xRet := hb_ExecFromArray( Upper( cFunc ), { cArg } )
      ENDIF

      /*
       * A SERIALIZACAO TAMBEM E TRABALHO, entao fica DENTRO da rede.
       *
       * Estava depois do END SEQUENCE e depois do ErrorBlock( bOld ) -- ou
       * seja, sem alvo para o Break e ja com o tratador padrao de volta. E
       * ToStr() pode falhar: hb_jsonEncode() sobre uma estrutura que aponta
       * para si mesma recursa ate estourar a pilha. Numa DLL com gtnul o
       * tratador padrao nao tem onde mostrar nada e o PROCESSO MORRE -- sem
       * mensagem e sem log, porque a falha acontece antes de qualquer coisa
       * ser escrita.
       *
       * O contrato do projeto e que erro de runtime sempre vira "ERR:" e nunca
       * derruba. Este era o unico ponto em que ele nao valia.
       */
      xRet := ToStr( xRet )

   RECOVER USING oErr

      /* Ja e string: se a falha foi no proprio ToStr acima, o que sai daqui
         nao passa por ele de novo -- seria repetir o que acabou de estourar. */
      xRet := "ERR:" + ErrDesc( oErr )

   END SEQUENCE

   ErrorBlock( bOld )

   RETURN xRet

/*
 * Trata um envelope. Recebe o JSON cru, devolve o JSON cru.
 *
 * Roteamento: "file.open" -> Api_File_Open( hParams ). Metodo inexistente e
 * RECUSA, nao "ERR:" -- errar o nome do metodo e erro previsivel do chamador.
 */
STATIC FUNCTION Despacha( cJson )

   LOCAL hReq := NIL
   LOCAL cId := ""
   LOCAL cMetodo, cFuncao, xResp, hParams
   LOCAL nInicio

   IF hb_jsonDecode( cJson, @hReq ) == 0 .OR. ! HB_ISHASH( hReq )
      RETURN Envelope( "", Err( "ERROR_BAD_ENVELOPE", "envelope is not valid JSON" ) )
   ENDIF

   IF hb_HHasKey( hReq, "id" ) .AND. HB_ISSTRING( hReq[ "id" ] )
      cId := hReq[ "id" ]
   ENDIF

   cMetodo := iif( hb_HHasKey( hReq, "method" ) .AND. HB_ISSTRING( hReq[ "method" ] ), ;
                   hReq[ "method" ], "" )

   IF Empty( cMetodo )
      RETURN Envelope( cId, Err( "ERROR_PARAM_REQUIRED", "method is required", "method", ;
                                 { "param" => "method" } ) )
   ENDIF

   hParams := iif( hb_HHasKey( hReq, "params" ) .AND. HB_ISHASH( hReq[ "params" ] ), ;
                   hReq[ "params" ], { => } )

   /* O JSON chega em UTF-8; o lado DBF fala CP850. Converter aqui, num ponto
      unico, evita que cada Api_* tenha de lembrar -- e nao deixa caminho escapar. */
   hParams := ConvertDeep( hParams, .F. )

   cFuncao := NomeDaFuncao( cMetodo )

   IF ! __dynsIsFun( cFuncao )
      RETURN Envelope( cId, ;
         Err( "ERROR_UNKNOWN_METHOD", "method does not exist", , ;
               { "method" => cMetodo } ) )
   ENDIF

   nInicio := hb_MilliSeconds()

   xResp := hb_ExecFromArray( cFuncao, { hParams } )

   /* Api_* pode devolver a resposta pronta (Ok/Err) ou so os dados. */
   IF ! IsResponse( xResp )
      xResp := Ok( xResp )
   ENDIF

   /*
    * O LOG SAI DAQUI, e nao de dentro de cada Api_*.
    *
    * Mesmo motivo do ConvertDeep acima: ponto unico. Espalhar a chamada por
    * vinte funcoes garante que a proxima nasca sem ela, e um log com buraco e
    * pior que log nenhum -- da a impressao de que a operacao nao aconteceu.
    * Aqui tambem e o unico lugar que conhece o tempo gasto e o desfecho.
    *
    * Quem decide o que vale registrar e o log (ver MetodosRegistrados em
    * util/log.prg); o dispatcher so oferece tudo.
    */
   LogOp( cMetodo, hParams, xResp[ "ok" ], ;
          iif( xResp[ "ok" ], "", xResp[ "error" ][ "code" ] ), ;
          hb_MilliSeconds() - nInicio, ;
          ArquivoDoPedido( hParams ), ;
          iif( xResp[ "ok" ], NIL, xResp[ "error" ][ "params" ] ), ;
          iif( xResp[ "ok" ] .AND. hb_HHasKey( xResp, "result" ) .AND. ;
               HB_ISHASH( xResp[ "result" ] ), xResp[ "result" ], NIL ) )

   RETURN Envelope( cId, xResp )

/*
 * "file.open" -> "API_FILE_OPEN"
 * "workspace.conexao.listar" -> "API_WORKSPACE_CONEXAO_LISTAR"
 */
STATIC FUNCTION NomeDaFuncao( cMetodo )
   RETURN "API_" + Upper( StrTran( cMetodo, ".", "_" ) )

/*
 * Qual arquivo o pedido tocou -- so o nome, para o log.
 *
 * A pergunta que o log responde e "o que aconteceu com ESTE arquivo", entao o
 * nome precisa estar em cada linha. Ele chega de dois jeitos: por `path` (abrir,
 * exportar, criar indice) ou por `h`, o handle de uma aba ja aberta -- e nesse
 * caso quem sabe o caminho e a sessao.
 */
STATIC FUNCTION ArquivoDoPedido( hParams )

   LOCAL cH, hInfo

   IF ! HB_ISHASH( hParams )
      RETURN ""
   ENDIF

   IF hb_HHasKey( hParams, "path" ) .AND. HB_ISSTRING( hParams[ "path" ] )
      RETURN hb_FNameNameExt( hParams[ "path" ] )
   ENDIF

   IF hb_HHasKey( hParams, "h" ) .AND. HB_ISSTRING( hParams[ "h" ] )
      cH := hParams[ "h" ]
      hInfo := SessHandle( cH )
      IF HB_ISHASH( hInfo ) .AND. hb_HHasKey( hInfo, "path" )
         RETURN hb_FNameNameExt( hInfo[ "path" ] )
      ENDIF
   ENDIF

   IF hb_HHasKey( hParams, "dir" ) .AND. HB_ISSTRING( hParams[ "dir" ] )
      RETURN hParams[ "dir" ]
   ENDIF

   RETURN ""

/* Junta id + rev na resposta e serializa. */
STATIC FUNCTION Envelope( cId, hResp )

   LOCAL hOut := { => }

   hOut[ "id" ] := cId
   hOut[ "ok" ] := hResp[ "ok" ]
   hOut[ "rev" ] := SessRev()

   IF hResp[ "ok" ]
      hOut[ "result" ] := hResp[ "result" ]
   ELSE
      hOut[ "error" ] := hResp[ "error" ]
   ENDIF

   /* Ponto unico de saida: tudo vira UTF-8 antes do encode. Sem isto, um nome
      de arquivo acentuado (existe "NETLBL - Copia.DBF" em base01) faz o Rust
      recusar a resposta inteira -- e com razao. */
   RETURN hb_jsonEncode( ConvertDeep( hOut, .T. ) )

/* converte qualquer retorno para string (modo cru, sem envelope) */
STATIC FUNCTION ToStr( x )

   DO CASE
   CASE x == NIL          ; RETURN ""
   CASE HB_ISSTRING( x )  ; RETURN x
   CASE HB_ISNUMERIC( x ) ; RETURN hb_ntos( x )
   CASE HB_ISLOGICAL( x ) ; RETURN iif( x, ".T.", ".F." )
   CASE HB_ISDATE( x )    ; RETURN DToC( x )
   CASE HB_ISARRAY( x ) .OR. HB_ISHASH( x ) ; RETURN hb_jsonEncode( x )
   ENDCASE

   RETURN hb_ValToExp( x )

STATIC FUNCTION ErrDesc( oErr )

   LOCAL cMsg := ""

   IF HB_ISOBJECT( oErr )
      cMsg := iif( HB_ISSTRING( oErr:description ), oErr:description, "" )
      IF ! Empty( oErr:operation )
         cMsg += " [" + oErr:operation + "]"
      ENDIF
      IF HB_ISARRAY( oErr:args ) .AND. Len( oErr:args ) > 0
         cMsg += " args=" + hb_ValToExp( oErr:args )
      ENDIF
   ELSE
      cMsg := hb_ValToExp( oErr )
   ENDIF

   RETURN cMsg
