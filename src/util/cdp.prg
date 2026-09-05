/*
 * cdp.prg - conversao de codepage.
 *
 * O mundo DBF e CP850/CP437; JSON e UTF-8. A conversao acontece NA PONTE, nos
 * dois sentidos, e o arquivo no disco nunca e tocado -- diferente do
 * `Oem to Ansi` do xWDBU, que converte o DBF inteiro e e irreversivel.
 *
 * Isto vale para TUDO que atravessa, nao so para o conteudo dos campos: a
 * pasta J:/bases/base01 tem um arquivo chamado "NETLBL - Copia.DBF" com o
 * acento gravado no NOME. Sem converter, o `o` acentuado chega ao JSON como
 * byte 0xA2 solto e o `String::from_utf8` estrito do Rust recusa a resposta
 * inteira -- que foi exatamente o que aconteceu na primeira vez que abrimos
 * uma pasta real.
 */

/* Codepages usadas. Sem o REQUEST elas nao entram no binario. */
REQUEST HB_CODEPAGE_PT850
REQUEST HB_CODEPAGE_UTF8

/* PTISO (ISO-8859-1) para exportar CSV a sistemas antigos que esperam ANSI.
   O Harbour nao tem PTWIN: nao existe cpptwin.c. Na pratica ISO-8859-1 e
   Windows-1252 so divergem nos bytes 0x80-0x9F, que nao aparecem em texto
   portugues -- e o rotulo na UI diz "ANSI" para nao exigir isso do usuario. */
REQUEST HB_CODEPAGE_PTISO

/* Codepages oferecidas por arquivo (B3.2/B3.5). PT860 = DOS Portugal;
   ESWIN = representante do Windows-1252 ocidental (ver Candidatos abaixo). */
REQUEST HB_CODEPAGE_PT860
REQUEST HB_CODEPAGE_ESWIN

/* Codepage do pedido CORRENTE. Antes era "o codepage do app"; agora o
   dispatcher a troca por pedido, a partir do arquivo que o pedido toca
   (dispatch.prg, CdpDoPedido). A VM e uma so thread, entao setar e restaurar
   em volta de cada Despacha e seguro. */
STATIC s_cNativa := "PT850"

/*
 * Codepage do lado DBF/sistema de arquivos. O dispatcher a troca por pedido
 * (dispatch.prg): cada arquivo carrega o seu, guardado no handle desde o
 * file.open. Sem handle no pedido, vale CdpPadrao().
 */
FUNCTION CdpNativa( cNova )

   LOCAL cAnterior := s_cNativa

   IF HB_ISSTRING( cNova ) .AND. ! Empty( cNova )
      s_cNativa := cNova
   ENDIF

   RETURN cAnterior

/*
 * As codepages OFERECIDAS na tela, por ordem de uso no Brasil.
 *
 * So entra o que REALMENTE linkou -- `hb_cdpExists()` filtra, entao um REQUEST
 * que faltasse vira ausencia de opcao, nunca uma opcao morta que estoura ao
 * ser escolhida. O ROTULO nao vem daqui: e texto de usuario e mora no i18n
 * (UI_CDP_<id>). Daqui saem so o id do Harbour e o numero canonico da pagina,
 * que a tela usa de pista e a deteccao por cabecalho casa.
 *
 * Nao existe "PTWIN" no Harbour: os drivers *WIN latinos (ESWIN, FRWIN, ITWIN)
 * compartilham a MESMA tabela Windows-1252. ESWIN representa o CP1252 ocidental
 * -- a conversao de BYTES e identica entre eles; o que muda e a collation, e o
 * QDBU ordena por indice (chave no cabecalho do NTX) ou fisica, nunca pela
 * collation da VM. Ver o plano de entrega, B3.
 */
STATIC FUNCTION Candidatos()
   RETURN { ;
      { "id" => "PT850", "cp" => 850 }, ;
      { "id" => "ESWIN", "cp" => 1252 }, ;
      { "id" => "PTISO", "cp" => 28591 }, ;
      { "id" => "PT860", "cp" => 860 }, ;
      { "id" => "UTF8",  "cp" => 65001 } }

FUNCTION CodepagesDisponiveis()

   LOCAL aRet := {}, h

   FOR EACH h IN Candidatos()
      IF hb_cdpExists( h[ "id" ] )
         AAdd( aRet, hb_HClone( h ) )
      ENDIF
   NEXT

   RETURN aRet

/* .T. se `cId` e uma das oferecidas -- e nao qualquer codepage do Harbour.
   Assim a tela e o backend nunca divergem sobre o que existe. */
FUNCTION CdpValida( cId )
   RETURN HB_ISSTRING( cId ) .AND. ;
          AScan( CodepagesDisponiveis(), {| h | h[ "id" ] == cId } ) > 0

/* O padrao quando o pedido nao diz nada: PT850, o do Clipper no Brasil. */
FUNCTION CdpPadrao()
   RETURN "PT850"

/*
 * T( cUtf8 ) -- texto de MENSAGEM, escrito com acento no fonte.
 *
 * Os .prg deste projeto sao salvos em UTF-8, mas o lado DBF e CP850, e o
 * dispatcher converte nativa -> UTF-8 na saida. Um literal acentuado escrito
 * direto vira bytes UTF-8 que o ConvertDeep converte DE NOVO: a UI recebe
 * "o destino ├® o pr├│prio arquivo" em vez de "é o próprio".
 *
 * Envolver o literal aqui fecha o round-trip -- UTF-8 -> nativa aqui,
 * nativa -> UTF-8 no dispatcher.
 *
 * Vale SO para texto que o usuario le. Nome de funcao, comentario e codigo
 * continuam sem acento, por serem lidos por quem programa e nao pelo app.
 */
FUNCTION T( cUtf8 )

   IF ! HB_ISSTRING( cUtf8 ) .OR. Empty( cUtf8 )
      RETURN cUtf8
   ENDIF

   RETURN hb_Translate( cUtf8, "UTF8", s_cNativa )

/* nativo -> UTF-8, para sair no JSON */
FUNCTION ParaUtf8( cTexto )

   IF ! HB_ISSTRING( cTexto ) .OR. Empty( cTexto )
      RETURN cTexto
   ENDIF

   RETURN hb_Translate( cTexto, s_cNativa, "UTF8" )

/* UTF-8 -> nativo, para entrar vindo do JSON */
FUNCTION DeUtf8( cTexto )

   IF ! HB_ISSTRING( cTexto ) .OR. Empty( cTexto )
      RETURN cTexto
   ENDIF

   RETURN hb_Translate( cTexto, "UTF8", s_cNativa )

/*
 * Converte recursivamente toda string de uma estrutura (hash, array ou string).
 *
 * Chamado uma vez na saida e uma vez na entrada do dispatcher: assim nenhuma
 * Api_* precisa lembrar de converter, e nao existe caminho que escape. Chaves
 * de hash tambem passam -- podem vir de nome de campo com acento.
 */
FUNCTION ConvertDeep( x, lParaUtf8 )

   LOCAL hNovo, cChave, aNovo, i

   DO CASE
   CASE HB_ISSTRING( x )
      RETURN iif( lParaUtf8, ParaUtf8( x ), DeUtf8( x ) )

   CASE HB_ISHASH( x )
      hNovo := { => }
      hb_HKeepOrder( hNovo, .T. )
      FOR EACH cChave IN hb_HKeys( x )
         hNovo[ ConvertDeep( cChave, lParaUtf8 ) ] := ;
            ConvertDeep( x[ cChave ], lParaUtf8 )
      NEXT
      RETURN hNovo

   CASE HB_ISARRAY( x )
      aNovo := Array( Len( x ) )
      FOR i := 1 TO Len( x )
         aNovo[ i ] := ConvertDeep( x[ i ], lParaUtf8 )
      NEXT
      RETURN aNovo
   ENDCASE

   RETURN x
