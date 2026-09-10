/*
 * config.prg -- configuracao em TRES niveis, e a cascata que os resolve.
 *
 * O codepage (e, no global, alguns SETs do xBase) pode viver em tres lugares,
 * do mais especifico ao mais geral:
 *
 *   arquivo    <pasta do dbf>/.qdbu/arquivos.json   -- por DBF
 *   conexao    campo `codepage` em connections.json -- por pasta cadastrada
 *   global     <raiz>/.qdbu/config.json             -- o app inteiro
 *
 * LER sempre roda a cascata (CodepageResolvido): arquivo > conexao > global >
 * PT850. ESCREVER e sempre OPT-IN e BEST-EFFORT -- ninguem cria arquivo de
 * config sozinho, e uma pasta de cliente read-only ou de rede nunca derruba a
 * operacao (a lente vale na sessao mesmo que o disco recuse). E a mesma
 * filosofia do log: perder uma escolha e ruim, travar o trabalho e pior.
 *
 * A convencao `.qdbu/` e a mesma de paths.prg: config do app na raiz, perfis
 * (e agora o codepage por arquivo) na pasta do cliente.
 */

#include "set.ch"

/* Config global lida uma vez e mantida em memoria (file-wide static: tem de
   ser declarada antes de qualquer funcao). */
STATIC s_hGlobal := NIL

/*
 * A "entrada da DLL": INIT roda uma vez na init da VM (HbStart -> hb_vmInit),
 * antes de qualquer arquivo abrir.
 *
 * SET EPOCH TO 1979 -- decisao do projeto: data de dois digitos com ano < 79
 * vira 20xx, 79+ vira 19xx. Fixo, nao configuravel: dado legado espera isto, e
 * um EPOCH que variasse por tela produziria a mesma data como anos diferentes.
 *
 * E aplica o que o global guardou (hoje: mostrar deletados).
 */
INIT PROCEDURE QDbuSetup()

   SET EPOCH TO 1979
   AplicaGlobalNaVM()

   RETURN

/* ============================================================ nivel GLOBAL */

STATIC FUNCTION ArqGlobal()
   RETURN hb_DirSepAdd( DirConfigQDbu() ) + "config.json"

/* Lida uma vez e mantida em memoria -- e consultada a cada file.open. */
FUNCTION ConfigGlobal()

   LOCAL cJson, x

   IF s_hGlobal == NIL
      s_hGlobal := { => }
      hb_HKeepOrder( s_hGlobal, .T. )
      cJson := hb_MemoRead( ArqGlobal() )
      IF ! Empty( cJson ) .AND. hb_jsonDecode( cJson, @x ) != 0 .AND. HB_ISHASH( x )
         s_hGlobal := x
      ENDIF
   ENDIF

   RETURN s_hGlobal

/* Best-effort: .T. gravou, .F. nao deu (e a config vale so nesta sessao). */
FUNCTION SalvaConfigGlobal( hCfg )

   LOCAL cDir := DirConfigQDbu()
   LOCAL lOk

   s_hGlobal := hCfg

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      IF ! hb_DirExists( cDir )
         hb_DirBuild( cDir )
      ENDIF
      /* O RETORNO DE hb_MemoWrit E O RESULTADO. Ele nao levanta erro numa
         pasta somente-leitura ou num disco cheio: devolve .F. e segue, entao
         descartar o valor fazia o RECOVER nunca disparar e a funcao mentir
         "gravei". */
      lOk := hb_MemoWrit( ArqGlobal(), hb_jsonEncode( hCfg, .T. ) )
   RECOVER
      lOk := .F.
   END SEQUENCE

   RETURN lOk

/* Aplica na VM o que e estado do xBase (nao so dado guardado). Hoje, DELETED. */
STATIC PROCEDURE AplicaGlobalNaVM()

   LOCAL h := ConfigGlobal()

   IF hb_HHasKey( h, "showDeleted" ) .AND. HB_ISLOGICAL( h[ "showDeleted" ] )
      /* showDeleted e o inverso de _SET_DELETED, como em session.deleted. */
      Set( _SET_DELETED, ! h[ "showDeleted" ] )
   ENDIF

   RETURN

/* O codepage padrao do app -- PT850 se nada foi escolhido. */
FUNCTION CodepageGlobal()

   LOCAL h := ConfigGlobal()

   IF hb_HHasKey( h, "codepage" ) .AND. CdpValida( h[ "codepage" ] )
      RETURN h[ "codepage" ]
   ENDIF

   RETURN CdpPadrao()

/*
 * A barra de ferramentas mostra o texto ao lado do icone?
 *
 * Preferencia de TELA: nao ha estado na VM para aplicar, so um valor guardado
 * que a interface le no arranque. `.T.` quando nada foi escolhido -- quem chega
 * ao app pela primeira vez le os nomes, e so esconde depois de ja saber onde
 * cada coisa esta.
 */
FUNCTION RotulosNaBarra()

   LOCAL h := ConfigGlobal()

   IF hb_HHasKey( h, "toolbarLabels" ) .AND. HB_ISLOGICAL( h[ "toolbarLabels" ] )
      RETURN h[ "toolbarLabels" ]
   ENDIF

   RETURN .T.

/*
 * O terminal preferido -- um ID, nunca um caminho de executavel.
 *
 * Quem conhece a lista e o Rust (`TERMINAIS` em main.rs), que e quem abre o
 * processo; aqui isto e so um texto guardado, como `toolbarLabels`. Vazio
 * quando nada foi escolhido, e o Rust cai no padrao dele.
 *
 * NAO se valida a lista aqui de proposito: a DLL nao sabe quais terminais
 * existem na maquina, e um `IF` com os nomes copiados viveria desatualizado em
 * relacao ao unico lugar que os usa. Id desconhecido cai no padrao la, que e
 * onde a decisao pode ser tomada com informacao.
 */
/*
 * O sincronizar estrutura considera a ORDEM dos campos? (docs/20)
 *
 * Nao ha padrao certo: o ERP do autor le campo por posicao e precisa da
 * ordem; outro sistema casa por nome e a ordem e ruido. Decisao do autor
 * (09/09/2026): cada usuario escolhe, e a escolha fica. Desligado por
 * omissao porque e o que NAO produz diagnostico a mais -- quem precisa da
 * ordem liga uma vez.
 */
FUNCTION SyncByPosition()

   LOCAL h := ConfigGlobal()

   IF hb_HHasKey( h, "syncByPosition" ) .AND. HB_ISLOGICAL( h[ "syncByPosition" ] )
      RETURN h[ "syncByPosition" ]
   ENDIF

   RETURN .F.

FUNCTION TerminalPreferido()

   LOCAL h := ConfigGlobal()

   IF hb_HHasKey( h, "terminal" ) .AND. HB_ISSTRING( h[ "terminal" ] )
      RETURN h[ "terminal" ]
   ENDIF

   RETURN ""

/* ========================================================== nivel CONEXAO */

/* Codepage cadastrado na conexao `cConn`, ou "" se nao ha (ou nome nao existe).
   Connections() vem de api_workspace.prg -- mesmo link. */
FUNCTION CodepageDaConexao( cConn )

   LOCAL h

   IF Empty( cConn )
      RETURN ""
   ENDIF

   FOR EACH h IN Connections()
      IF HB_ISHASH( h ) .AND. hb_HHasKey( h, "name" ) .AND. ;
         Upper( h[ "name" ] ) == Upper( cConn )
         IF hb_HHasKey( h, "codepage" ) .AND. CdpValida( h[ "codepage" ] )
            RETURN h[ "codepage" ]
         ENDIF
         EXIT
      ENDIF
   NEXT

   RETURN ""

/* ========================================================== nivel ARQUIVO */

STATIC FUNCTION DirQPasta( cArq )
   RETURN hb_FNameDir( cArq ) + ".qdbu"

STATIC FUNCTION ArqDaPasta( cArq )
   RETURN hb_DirSepAdd( DirQPasta( cArq ) ) + "arquivos.json"

/* O mapa NOME(maiusculo do dbf) -> { "codepage": ... } da pasta. {} se nao ha. */
FUNCTION ConfigArquivos( cArq )

   LOCAL cJson := hb_MemoRead( ArqDaPasta( cArq ) ), x := NIL

   IF ! Empty( cJson ) .AND. hb_jsonDecode( cJson, @x ) != 0 .AND. HB_ISHASH( x )
      RETURN x
   ENDIF

   RETURN { => }

FUNCTION CodepageDoArquivo( cArq )

   LOCAL h := ConfigArquivos( cArq )
   LOCAL cNome := Upper( hb_FNameNameExt( cArq ) )

   IF hb_HHasKey( h, cNome ) .AND. HB_ISHASH( h[ cNome ] ) .AND. ;
      hb_HHasKey( h[ cNome ], "codepage" ) .AND. CdpValida( h[ cNome ][ "codepage" ] )
      RETURN h[ cNome ][ "codepage" ]
   ENDIF

   RETURN ""

/*
 * Fixa a escolha por-arquivo. OPT-IN (so quando alguem clica "fixar") e
 * BEST-EFFORT: cria a pasta .qdbu/ do cliente se preciso, mas se o disco
 * recusar (read-only, rede) devolve .F. sem derrubar nada.
 */
FUNCTION SalvaCodepageArquivo( cArq, cCdp )

   LOCAL cDir := DirQPasta( cArq )
   LOCAL h, cNome := Upper( hb_FNameNameExt( cArq ) )
   LOCAL lOk

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      h := ConfigArquivos( cArq )
      IF ! hb_HHasKey( h, cNome ) .OR. ! HB_ISHASH( h[ cNome ] )
         h[ cNome ] := { => }
      ENDIF
      h[ cNome ][ "codepage" ] := cCdp
      IF ! hb_DirExists( cDir )
         hb_DirBuild( cDir )
      ENDIF
      lOk := hb_MemoWrit( ArqDaPasta( cArq ), hb_jsonEncode( h, .T. ) )
   RECOVER
      lOk := .F.
   END SEQUENCE

   RETURN lOk

/*
 * Desfixa: tira este arquivo do mapa da pasta.
 *
 * Existe porque a tela OFERECE desfixar. Enquanto o pino era um botao de mao
 * unica, nao havia o que desfazer; com a caixa de marcar, desmarcar tem de
 * mudar o disco -- senao a tela diz "nao fixado" e a cascata traz o pino de
 * volta na proxima abertura, que e a mentira silenciosa que o projeto inteiro
 * evita.
 *
 * BEST-EFFORT como o resto do modulo, e mais uma saida: mapa que nao existe ou
 * arquivo que nao esta nele ja E o estado pedido, entao devolve .T. sem tocar
 * no disco. Some com a pasta `.qdbu/` nao -- ela pode guardar outros perfis.
 */
FUNCTION RemoveCodepageArquivo( cArq )

   LOCAL h, cNome := Upper( hb_FNameNameExt( cArq ) )
   LOCAL lOk

   /* Sem RETURN dentro do corpo do SEQUENCE: o compilador recusa (E0025), e a
      saida antecipada nao e necessaria -- nao estar no mapa ja e o estado
      pedido, entao basta nao escrever. */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      h := ConfigArquivos( cArq )
      IF hb_HHasKey( h, cNome )
         hb_HDel( h, cNome )
         lOk := hb_MemoWrit( ArqDaPasta( cArq ), hb_jsonEncode( h, .T. ) )
      ELSE
         /* Nao estar no mapa JA E o estado pedido -- nada a escrever, e a
            resposta honesta continua sendo .T. */
         lOk := .T.
      ENDIF
   RECOVER
      lOk := .F.
   END SEQUENCE

   RETURN lOk

/* ============================================================== a CASCATA */

/*
 * O codepage EFETIVO de um arquivo: arquivo > conexao > global > PT850.
 * `cOrigem` (por referencia) volta dizendo de onde veio -- "file", "connection",
 * "global" ou "default" --, para a UI mostrar se a lente foi herdada.
 */
FUNCTION CodepageResolvido( cArq, cConn, cOrigem )

   LOCAL c

   IF ! Empty( c := CodepageDoArquivo( cArq ) )
      cOrigem := "file"
      RETURN c
   ENDIF

   IF ! Empty( c := CodepageDaConexao( cConn ) )
      cOrigem := "connection"
      RETURN c
   ENDIF

   IF hb_HHasKey( ConfigGlobal(), "codepage" ) .AND. CdpValida( ConfigGlobal()[ "codepage" ] )
      cOrigem := "global"
      RETURN ConfigGlobal()[ "codepage" ]
   ENDIF

   cOrigem := "default"

   RETURN CdpPadrao()

/* ================================================= historico de expressoes */

/*
 * <raiz>/.qdbu/expressoes.json    { "NETCLI.DBF": [ "...", "..." ] }
 *
 * Chaveado pelo NOME do arquivo, nao pelo caminho: NETCLI.DBF existe em
 * centenas de pastas de cliente com a mesma estrutura, e uma expressao escrita
 * num cliente vale em todos -- chavear por caminho jogaria fora justamente o
 * caso em que o historico mais serve. Na raiz, e nao na pasta do cliente,
 * porque o objetivo e ATRAVESSAR clientes.
 *
 * 20 por arquivo, mais recente primeiro, sem repetidas. Best-effort como o
 * resto do modulo.
 */
#define HIST_EXPR_MAX 20

STATIC FUNCTION ArqExpressoes()
   RETURN hb_DirSepAdd( DirConfigQDbu() ) + "expressoes.json"

STATIC FUNCTION LeExpressoes()

   LOCAL cJson := hb_MemoRead( ArqExpressoes() ), x := NIL

   IF ! Empty( cJson ) .AND. hb_jsonDecode( cJson, @x ) != 0 .AND. HB_ISHASH( x )
      RETURN x
   ENDIF

   RETURN { => }

FUNCTION HistoricoExpr( cNome )

   LOCAL h := LeExpressoes()

   IF hb_HHasKey( h, cNome ) .AND. HB_ISARRAY( h[ cNome ] )
      RETURN h[ cNome ]
   ENDIF

   RETURN {}

FUNCTION GuardaHistoricoExpr( cNome, cExpr )

   LOCAL cDir := DirConfigQDbu()
   LOCAL h, a, n
   LOCAL lOk

   /* Sem RETURN dentro do SEQUENCE (E0025). */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      h := LeExpressoes()
      hb_HKeepOrder( h, .T. )
      a := iif( hb_HHasKey( h, cNome ) .AND. HB_ISARRAY( h[ cNome ] ), h[ cNome ], {} )
      /* repetida sobe para o topo em vez de aparecer duas vezes */
      n := AScan( a, {| c | HB_ISSTRING( c ) .AND. c == cExpr } )
      IF n > 0
         hb_ADel( a, n, .T. )
      ENDIF
      hb_AIns( a, 1, cExpr, .T. )
      IF Len( a ) > HIST_EXPR_MAX
         ASize( a, HIST_EXPR_MAX )
      ENDIF
      h[ cNome ] := a
      IF ! hb_DirExists( cDir )
         hb_DirBuild( cDir )
      ENDIF
      lOk := hb_MemoWrit( ArqExpressoes(), hb_jsonEncode( h, .T. ) )
   RECOVER
      lOk := .F.
   END SEQUENCE

   RETURN lOk
