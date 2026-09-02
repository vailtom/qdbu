/*
 * rebind.prg - desligar -> operar -> religar -> reancorar.
 *
 * A R5 de docs/10-integridade.md, e o item que o plano marca como o mais
 * perigoso do checklist inteiro. Existe uma rotina so, e todas as operacoes
 * exclusivas passam por ela -- tres implementacoes seriam tres conjuntos de
 * manhas diferentes, e as duas que estivessem erradas errariam em silencio.
 *
 * O SINTOMA DE NAO SEGUIR ISTO
 *
 * A operacao "funciona", e a grade depois mostra dados errados sem nenhum erro
 * na tela. Nada estoura: o indice continua aberto apontando para registros que
 * mudaram de lugar, o filtro continua compilado sobre uma work area que foi
 * fechada e reaberta, e o cursor esta num RecNo() que agora e outro registro.
 *
 * AS DUAS FORMAS DE OPERACAO EXCLUSIVA, e elas exigem coisas diferentes
 *
 *   NO LUGAR (PACK, ZAP)
 *     A work area continua a mesma; o arquivo e alterado embaixo dela. Os
 *     indices ABERTOS o proprio dbPack() reconstroi -- e por isso NAO se deve
 *     fecha-los antes: fechados, eles ficariam obsoletos apontando para
 *     posicoes que nao existem mais, e reabri-los depois traria lixo.
 *
 *   FORA DO LUGAR (alterar estrutura)
 *     Um `.tmp` e montado, verificado, e os nomes sao trocados. O arquivo que a
 *     work area tinha aberto DEIXA DE EXISTIR. Aqui os indices precisam ser
 *     RECONSTRUIDOS a partir da chave, nao reabertos: eles descrevem um arquivo
 *     que nao esta mais la.
 *
 * E por isto que a chave de cada indice e capturada, e nao so o caminho. A
 * expressao mora no CABECALHO do .ntx; se o arquivo se perde no meio da
 * operacao, e a copia capturada aqui que permite remontar.
 *
 * O CURSOR SE REANCORA PELA CHAVE, NAO PELO RecNo()
 *
 * Depois de um PACK os numeros de registro mudam: o registro 500 vira o 480
 * porque vinte anteriores foram apagados. Voltar para RecNo() 500 leva a pessoa
 * a OUTRO registro, sem aviso -- e ela vai editar o que acha que estava vendo.
 * Com uma ordem ativa, guarda-se o VALOR da chave e faz-se dbSeek(); sem ordem,
 * o RecNo() e o unico ancoradouro que existe, e ele e limitado a LastRec().
 *
 * NADA AQUI ABORTA POR UM ITEM
 *
 * Religar devolve `errors[]` com o que nao voltou, e segue com o resto. Um
 * indice que agora recusa nao pode impedir o filtro de ser reaplicado: a
 * operacao ja aconteceu, e o trabalho aqui e recuperar o maximo do ambiente.
 * Mesma decisao do `view.apply` (B9.4).
 */

#include "dbinfo.ch"


/*
 * Fotografa o ambiente do handle.
 *
 * Chamada ANTES de qualquer coisa. O que nao for capturado aqui nao volta.
 */
FUNCTION EstadoAntes( cH )

   LOCAL hInfo := SessHandle( cH )
   LOCAL aIdx := {}
   LOCAL nAtiva := IndexOrd()
   LOCAL i, cBag, xChave

   FOR i := 1 TO ordCount()
      cBag := ordBagName( i )
      AAdd( aIdx, { ;
         "order"  => i, ;
         "name"   => NomeDaOrdemNo( i ), ;
         "key"    => ordKey( i ), ;
         "for"    => ordFor( i ), ;
         "bag"    => cBag, ;
         "path"   => CaminhoDoBagReg( cBag, hInfo[ "indexes" ] ), ;
         "active" => ( i == nAtiva ) } )
   NEXT

   /*
    * O valor da chave do registro corrente, e nao o RecNo().
    *
    * Avaliado AGORA, enquanto o registro ainda existe e a ordem ainda esta
    * montada. Depois da operacao pode nao haver de onde tirar.
    */
   xChave := NIL
   IF nAtiva > 0 .AND. ! Eof() .AND. ! Bof()
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         xChave := &( ordKey( nAtiva ) )
      RECOVER
         xChave := NIL
      END SEQUENCE
   ENDIF

   RETURN { ;
      "h"        => cH, ;
      "path"     => hInfo[ "path" ], ;
      "alias"    => hInfo[ "alias" ], ;
      "exclusive" => hInfo[ "exclusive" ], ;
      "indexes"  => aIdx, ;
      "order"    => nAtiva, ;
      "filter"   => dbFilter(), ;
      "recno"    => RecNo(), ;
      "key"      => xChave, ;
      "visible"  => hInfo[ "visible" ] }


/*
 * Desliga o que a operacao exclusiva nao tolera.
 *
 * `lFecharIndices` distingue as duas formas:
 *
 *   .F. (PACK/ZAP)  os indices FICAM abertos, porque e o proprio dbPack() que
 *                   os reconstroi. Fecha-los seria trocar uma reconstrucao
 *                   correta e automatica por uma manual e pior.
 *   .T. (estrutura) o arquivo vai ser substituido; indice aberto sobre ele
 *                   passa a descrever algo que nao existe.
 *
 * O FILTRO SAI SEMPRE. Ele e um codeblock compilado contra esta work area; se a
 * area for fechada e reaberta, o bloco sobrevive apontando para o nada, e o
 * sintoma e a grade mostrar registros que nao satisfazem o filtro -- sem erro.
 */
FUNCTION Desligar( hEstado, lFecharIndices )

   dbClearFilter()

   IF hb_defaultValue( lFecharIndices, .F. )
      ordListClear()
   ENDIF

   HB_SYMBOL_UNUSED( hEstado )

   RETURN NIL


/*
 * Religa o ambiente e reancora o cursor.
 *
 * Devolve um array de falhas -- `{ "item", "code", "params" }` --, vazio quando
 * tudo voltou. Nunca levanta erro: a operacao ja aconteceu, e recusar-se a
 * religar deixaria o usuario pior do que religar pela metade.
 */
FUNCTION Religar( hEstado )

   LOCAL aFalhas := {}
   LOCAL hIdx, nOrdem := 0, i

   /* 1. Indices. Reabre pelo caminho; se o arquivo sumiu ou recusa, registra e
         segue -- o proximo pode funcionar. */
   IF Len( hEstado[ "indexes" ] ) > 0 .AND. ordCount() == 0
      FOR EACH hIdx IN hEstado[ "indexes" ]
         BEGIN SEQUENCE WITH {| e | Break( e ) }
            ordListAdd( hIdx[ "path" ] )
         RECOVER
            AAdd( aFalhas, { ;
               "item"   => "index", ;
               "code"   => "ERROR_REBIND_INDEX_FAILED", ;
               "params" => { "file" => hb_FNameNameExt( hIdx[ "path" ] ), ;
                             "key"  => hIdx[ "key" ] } } )
         END SEQUENCE
      NEXT
   ENDIF

   /* 2. Ordem ativa. Pelo NOME e nao pelo numero: se um indice do meio nao
         voltou, o numero 3 passou a ser outro indice -- e trocar a ordem sem
         avisar e o tipo de erro que so aparece na tela como "os dados estao
         fora de ordem". */
   IF hEstado[ "order" ] > 0
      FOR i := 1 TO ordCount()
         IF Upper( AllTrim( NomeDaOrdemNo( i ) ) ) == ;
            Upper( AllTrim( NomeDaOrdemDoEstado( hEstado ) ) )
            nOrdem := i
            EXIT
         ENDIF
      NEXT

      IF nOrdem > 0
         ordSetFocus( nOrdem )
      ELSE
         AAdd( aFalhas, { ;
            "item"   => "order", ;
            "code"   => "ERROR_REBIND_ORDER_LOST", ;
            "params" => { "name" => NomeDaOrdemDoEstado( hEstado ) } } )
      ENDIF
   ENDIF

   /* 3. Filtro. */
   IF ! Empty( hEstado[ "filter" ] )
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         dbSetFilter( hb_macroBlock( hEstado[ "filter" ] ), hEstado[ "filter" ] )
      RECOVER
         AAdd( aFalhas, { ;
            "item"   => "filter", ;
            "code"   => "ERROR_REBIND_FILTER_FAILED", ;
            "params" => { "expr" => hEstado[ "filter" ] } } )
      END SEQUENCE
   ENDIF

   /* 4. Cursor. */
   AEval( ReancoraCursor( hEstado, nOrdem ), {| h | AAdd( aFalhas, h ) } )

   RETURN aFalhas


/*
 * Volta o cursor para onde a pessoa estava -- ou o mais perto possivel.
 *
 * Com ordem ativa e chave guardada, dbSeek(). Sem isso, o RecNo() limitado a
 * LastRec(): depois de um PACK o arquivo encolheu, e ir para um RecNo() que nao
 * existe mais deixaria a grade em Eof() sem explicacao.
 */
STATIC FUNCTION ReancoraCursor( hEstado, nOrdem )

   LOCAL aFalhas := {}
   LOCAL lAchou  := .F.
   LOCAL nAlvo

   IF nOrdem > 0 .AND. hEstado[ "key" ] != NIL

      /* O Harbour recusa RETURN de dentro de BEGIN SEQUENCE (E0025), entao a
         resposta vira uma variavel. Nao e so sintaxe: com a saida no fim, o
         caminho de sucesso e o de falha passam pelo mesmo lugar, e nao ha como
         um deles esquecer de reancorar. */
      /* O RECOVER nao reatribui: `lAchou` ja nasce .F., e se o dbSeek estourar
         a atribuicao nunca completou. Reatribuir era codigo morto -- e o
         compilador reclamava (W0032). */
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         lAchou := ProcuraChaveERecno( hEstado[ "key" ], hEstado[ "recno" ] )
      RECOVER
      END SEQUENCE

      IF ! lAchou
         /* A chave nao existe mais -- o registro pode ter sido justamente o
            apagado. Nao e falha da religacao; e o resultado da operacao. */
         dbGoTop()
         AAdd( aFalhas, { ;
            "item"   => "cursor", ;
            "code"   => "WARN_REBIND_RECORD_GONE", ;
            "params" => { => } } )
      ENDIF

   ELSE

      nAlvo := Max( 1, Min( hEstado[ "recno" ], LastRec() ) )
      IF LastRec() == 0
         dbGoTop()
      ELSE
         dbGoTo( nAlvo )
      ENDIF

   ENDIF

   RETURN aFalhas


/*
 * Procura a chave e, dentro dela, o registro certo.
 *
 * A CHAVE SOZINHA NAO BASTA, e isto foi medido, nao suposto.
 *
 * O primeiro desenho fazia `dbSeek( chave, .T. )` e dava por resolvido. Num
 * teste sobre NETCLI, com a ordem `cli_nome` ativa, o cursor estava no registro
 * 25 e voltava no 14 -- OUTRO registro, sem erro nenhum na tela. Motivo:
 * "VALE PRESENTE" aparece varias vezes, e o seek para na PRIMEIRA ocorrencia.
 * Em dado real, nome de cliente, cidade e data nunca sao unicos.
 *
 * Esse e precisamente o sintoma que esta rotina existe para impedir: a operacao
 * "funciona" e a pessoa passa a olhar outro registro achando que e o mesmo --
 * e o proximo campo que ela editar sera no registro errado.
 *
 * O algoritmo: acha a chave, e caminha DENTRO dela procurando o RecNo()
 * original. O passeio e limitado pela igualdade da chave, entao nao percorre o
 * arquivo -- so o grupo de homonimos, que e pequeno mesmo num arquivo de 400
 * mil registros.
 *
 * Se o RecNo() nao esta no grupo, o registro deixou de existir (foi justamente
 * o apagado pelo PACK) ou mudou de numero. Ai a primeira ocorrencia da chave e
 * a melhor resposta possivel -- e continua sendo a vizinhanca certa, que o
 * RecNo() cru nao seria.
 */
STATIC FUNCTION ProcuraChaveERecno( xChave, nRecno )

   LOCAL nPrimeiro, lOk := .F.

   IF dbSeek( xChave, .T. )   /* soft: o mais proximo serve */

      nPrimeiro := RecNo()
      lOk := .T.

      IF HB_ISNUMERIC( nRecno ) .AND. RecNo() != nRecno

         DO WHILE ! Eof() .AND. ordKeyVal() == xChave .AND. RecNo() != nRecno
            dbSkip( 1 )
         ENDDO

         /* Saiu do grupo sem achar: o registro nao existe mais, ou mudou de
            numero. Volta a primeira ocorrencia -- e a vizinhanca certa, que e
            o que a pessoa reconhece na tela. */
         IF Eof() .OR. RecNo() != nRecno
            dbGoTo( nPrimeiro )
         ENDIF

      ENDIF

   ENDIF

   RETURN lOk


/*
 * Faz a operacao com o ambiente preservado.
 *
 * ESTE e o ponto de entrada -- T10, T13 e T14 chamam so isto, e nao as tres
 * partes soltas. Ter as pecas expostas convidaria a esquecer uma, e a que se
 * esquece e sempre a ultima.
 *
 *   bOperacao      codeblock que faz o servico. Devolve NIL (ok) ou a recusa.
 *   lFecharIndices .T. para operacao fora do lugar; .F. para PACK/ZAP.
 *
 * Devolve { "error", "rebindErrors" }. `error` nao-NIL significa que a operacao
 * recusou -- e mesmo assim o ambiente e religado, porque desligar e nao religar
 * deixaria a tela pior que antes de tentar.
 */
FUNCTION ComEstadoPreservado( cH, bOperacao, lFecharIndices )

   LOCAL hEstado := EstadoAntes( cH )
   LOCAL xErro

   Desligar( hEstado, lFecharIndices )

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      xErro := Eval( bOperacao )
   RECOVER
      xErro := Err( "ERROR_OPERATION_FAILED", "operation raised", , ;
                    { "file" => hb_FNameNameExt( hEstado[ "path" ] ) } )
   END SEQUENCE

   /* `before` viaja de volta porque quem chama precisa poder AFIRMAR que o
      ambiente voltou -- comparar o depois com o antes exige ter o antes, e ele
      so existe aqui dentro. O selftest e o meta.rebindtest se apoiam nisto. */
   RETURN { "error"        => xErro, ;
            "rebindErrors" => Religar( hEstado ), ;
            "before"       => hEstado }


/* ------------------------------------------------------------- auxiliares */

/* ordName() devolve vazio para NTX sem nome interno -- e NTX quase nunca tem.
   O nome do arquivo e o unico identificador estavel que sobra. */
STATIC FUNCTION NomeDaOrdemNo( i )

   LOCAL c := ordName( i )

   RETURN iif( Empty( c ), Upper( hb_FNameName( hb_defaultValue( ordBagName( i ), "" ) ) ), c )


STATIC FUNCTION NomeDaOrdemDoEstado( hEstado )

   LOCAL h

   FOR EACH h IN hEstado[ "indexes" ]
      IF h[ "active" ]
         RETURN h[ "name" ]
      ENDIF
   NEXT

   RETURN ""


/* ordBagName() devolve so o nome, sem pasta. Casa contra o registrado na
   sessao, como faz o api_index.prg. */
STATIC FUNCTION CaminhoDoBagReg( cBag, aReg )

   LOCAL cAlvo := Upper( hb_FNameName( hb_defaultValue( cBag, "" ) ) )
   LOCAL c

   IF HB_ISARRAY( aReg )
      FOR EACH c IN aReg
         IF HB_ISSTRING( c ) .AND. Upper( hb_FNameName( c ) ) == cAlvo
            RETURN c
         ELSEIF HB_ISHASH( c ) .AND. hb_HHasKey( c, "path" ) .AND. ;
                Upper( hb_FNameName( c[ "path" ] ) ) == cAlvo
            RETURN c[ "path" ]
         ENDIF
      NEXT
   ENDIF

   RETURN hb_defaultValue( cBag, "" )
