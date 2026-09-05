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
      /*
       * A VIA CRUA TEM LISTA FECHADA -- ver `PermitidasNaViaCrua()`.
       *
       * `__dynsIsFun()` responde por QUALQUER simbolo linkado na DLL -- o
       * runtime inteiro do Harbour, nao so o nosso. Sem filtro, uma string
       * digitada num campo de texto alcanca `OS()`, `VERSION()` e, o que
       * importa, `__QUIT()`: o processo morre sem erro, sem log e sem o "ERR:"
       * que o contrato promete. Medido em 03/09/2026 -- `OS()` devolveu
       * "Windows 8 6.2.9200" por esta via.
       *
       * A primeira correcao foi um prefixo `API_`, e ele era largo DEMAIS: esta
       * via nao passa por `LogOp()` nem por `ConvertDeep()` -- so `Despacha()`
       * registra. `API_` abriria daqui `Api_Meta_Copyfile`, `Api_Bulk_Delete` e
       * toda destrutiva de T10/T13/T14 SEM linha em `.qdbu/log`, que e o oposto
       * do que o o guia do projeto promete ("nenhuma consegue esquecer").
       *
       * Nem `API_META_` serve: `Api_Meta_Copyfile` escreve arquivo.
       *
       * Herdado do dll-harbour, o projeto-ponte de onde este nasceu. Apontado
       * por revisao de codigo naquele repositorio; conferido e corrigido aqui.
       */
      ELSEIF hb_AScan( PermitidasNaViaCrua(), Upper( cFunc ), , , .T. ) == 0
         xRet := "ERR:funcao nao liberada na via crua (" + Sanea( cFunc ) + ")"
      ELSEIF ! __dynsIsFun( Upper( cFunc ) )
         xRet := "ERR:funcao '" + Sanea( cFunc ) + "' nao existe na DLL"
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

      /*
       * A LENTE VOLTA AO PADRAO AQUI, e nao so no fim de `Despacha()`.
       *
       * Um erro de runtime dentro da Api_* rompe direto para este RECOVER,
       * pulando o `CdpNativa( cCdpAnt )` do caminho normal -- e `s_cNativa`
       * ficaria travada na codepage do pedido que falhou. O proximo envelope a
       * escolhe de novo, mas o canal de progresso (`job.prg`) converte para
       * UTF-8 FORA do dispatcher: uma tarefa ainda viva passaria a rotular a
       * barra com a lente errada. Voltar ao padrao e o unico estado que nao
       * depende de qual pedido morreu.
       */
      CdpNativa( CdpPadrao() )

   END SEQUENCE

   ErrorBlock( bOld )

   RETURN xRet

/*
 * A lista fechada da via crua -- a chamada `HbCall( "Api_Xxx", cArg )` sem
 * envelope, que existe por compatibilidade com o cliente C.
 *
 * O criterio e uma pergunta so: ESTA FUNCAO PODE MUDAR BYTES EM DISCO? Se
 * puder, ela nao entra aqui, porque esta via NAO passa por `LogOp()`. Entrar
 * seria criar uma rota autorizada e sem registro para o que o log existe para
 * registrar.
 *
 * As tres sao o handshake da ponte -- eco e versao, nada mais. Os chamadores
 * reais estao em `tests/testload.c` e no `--selftest` de
 * `app/src-tauri/src/main.rs`; TODO o resto do app fala por envelope.
 *
 * Funcao nova aqui e decisao consciente, e o teste de `tests/testload.c`
 * comparado com esta lista e o que impede a lista de crescer por descuido.
 */
STATIC FUNCTION PermitidasNaViaCrua()
   RETURN { "API_META_PING", "API_META_VERSION", "API_META_ECHO" }

/*
 * O nome recusado volta ecoado na mensagem, e ele e ENTRADA NAO CONFIAVEL.
 *
 * Dois motivos para nao devolver o que chegou:
 *
 * 1. Esta via nao passa por `ConvertDeep()`, e `qdbudll.rs` decodifica com
 *    `String::from_utf8` ESTRITO (de proposito -- ver o guia do projeto). Um byte
 *    invalido no nome transformaria a propria recusa num erro duro de ponte,
 *    trocando "funcao nao liberada" por uma falha de decodificacao.
 * 2. A mensagem vai para tela e para log; controle e novalinha nao tem o que
 *    fazer em nenhum dos dois.
 *
 * Fica so ASCII imprimivel, cortado em 64 caracteres -- o suficiente para a
 * pessoa reconhecer o que digitou.
 */
STATIC FUNCTION Sanea( cNome )

   LOCAL cOut := ""
   LOCAL i, n

   FOR i := 1 TO Min( Len( cNome ), 64 )
      n := Asc( SubStr( cNome, i, 1 ) )
      cOut += iif( n >= 32 .AND. n <= 126, Chr( n ), "?" )
   NEXT

   RETURN cOut + iif( Len( cNome ) > 64, "...", "" )

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
   LOCAL nInicio, cCdpAnt, cSaida

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

   /*
    * CODEPAGE POR ARQUIVO (B3.2/B3.5). A conversao acontece aqui, num ponto
    * unico -- mas cada arquivo tem o seu, entao a lente e escolhida ANTES,
    * a partir do handle (ou do `codepage` do proprio file.open) que o pedido
    * carrega. `CdpDoPedido` le esses campos CRUS: `h`, `codepage` e `path` sao
    * ASCII, seguros de ler antes do ConvertDeep. Restaurada no fim do caminho
    * normal; se a Api_* estourar, o RECOVER de `DllDispatch()` a devolve ao
    * padrao -- e o unico jeito de nenhuma saida deixar a lente presa.
    */
   cCdpAnt := CdpNativa( CdpDoPedido( cMetodo, hParams ) )

   /* O JSON chega em UTF-8; o lado DBF fala a codepage do arquivo. Converter
      aqui, num ponto unico, evita que cada Api_* tenha de lembrar. */
   hParams := ConvertDeep( hParams, .F. )

   cFuncao := NomeDaFuncao( cMetodo )

   IF ! __dynsIsFun( cFuncao )
      xResp := Err( "ERROR_UNKNOWN_METHOD", "method does not exist", , ;
                    { "method" => cMetodo } )
      CdpNativa( cCdpAnt )
      RETURN Envelope( cId, xResp )
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

   /* Envelope AINDA sob a codepage do arquivo: e ela que converte a saida para
      UTF-8. So depois restaura, para o proximo pedido nao herdar esta. */
   cSaida := Envelope( cId, xResp )
   CdpNativa( cCdpAnt )

   RETURN cSaida

/*
 * Os metodos em que um `codepage` NO PEDIDO escolhe a lente.
 *
 * A lista e fechada de proposito. `codepage` e nome de parametro de mais de um
 * metodo: `workspace.add`, `workspace.update` e `config.set` tambem o recebem
 * -- mas ali ele e DADO A GUARDAR, nao a lente com que ler o pedido. Honrar o
 * campo em qualquer metodo fazia `workspace.add {"nome":"Ação","codepage":
 * "ESWIN"}` gravar o nome em CP1252 no connections.json, que o `workspace.list`
 * (sem `h` e sem `codepage`) depois lia sob PT850: acento quebrado na arvore e
 * o `Upper()` de `CodepageDaConexao` deixando de casar.
 *
 * So os dois metodos que falam de UM DBF entram: `file.open`, que ainda nao tem
 * handle, e `file.setcodepage`, que troca a lente do handle que ja tem.
 */
STATIC FUNCTION AceitaCodepageNoPedido( cMetodo )
   RETURN Lower( cMetodo ) == "file.open" .OR. Lower( cMetodo ) == "file.setcodepage"

/*
 * A codepage com que ESTE pedido le e grava bytes de DBF.
 *
 * Ordem: o `codepage` do proprio pedido (so file.open/file.setcodepage) vence;
 * senao o do handle `h`, que o file.open guardou; senao o padrao. Le os campos
 * CRUS do envelope -- `h`, `codepage`, `path` sao ASCII, entao ler antes do
 * ConvertDeep nao corrompe nada.
 */
STATIC FUNCTION CdpDoPedido( cMetodo, hParams )

   LOCAL hInfo

   IF ! HB_ISHASH( hParams )
      RETURN CdpPadrao()
   ENDIF

   IF AceitaCodepageNoPedido( cMetodo ) .AND. ;
      hb_HHasKey( hParams, "codepage" ) .AND. HB_ISSTRING( hParams[ "codepage" ] ) .AND. ;
      CdpValida( hParams[ "codepage" ] )
      RETURN hParams[ "codepage" ]
   ENDIF

   IF hb_HHasKey( hParams, "h" ) .AND. HB_ISSTRING( hParams[ "h" ] )
      hInfo := SessHandle( hParams[ "h" ] )
      IF HB_ISHASH( hInfo ) .AND. hb_HHasKey( hInfo, "codepage" ) .AND. ;
         ! Empty( hInfo[ "codepage" ] )
         RETURN hInfo[ "codepage" ]
      ENDIF
   ENDIF

   RETURN CdpPadrao()

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
