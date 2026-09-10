/*
 * api_config.prg -- a configuracao GLOBAL do app (nivel mais geral da cascata
 * de config.prg). Codepage padrao e os SETs do xBase que valem para tudo.
 *
 * Os outros dois niveis moram noutros lugares, de proposito: o de CONEXAO em
 * workspace.* (connections.json), o de ARQUIVO em file.setcodepage (o .qdbu/
 * da pasta do cliente). Aqui e so o global.
 */

#include "set.ch"

/*
 * config.get -> { codepage, showDeleted, epoch, codepages[], default }
 *
 * O estado global de agora, mais a lista de codepages para o seletor de
 * Preferencias (a mesma de meta.codepages). `codepage` e sempre o efetivo --
 * PT850 quando nada foi escolhido, nunca vazio, para o combo ter o que marcar.
 */
FUNCTION Api_Config_Get( hP )

   HB_SYMBOL_UNUSED( hP )

   RETURN Ok( { ;
      "codepage"      => CodepageGlobal(), ;
      "showDeleted"   => ! Set( _SET_DELETED ), ;
      "toolbarLabels" => RotulosNaBarra(), ;
      "terminal"      => TerminalPreferido(), ;
      "syncByPosition" => SyncByPosition(), ;
      "epoch"         => Set( _SET_EPOCH ), ;
      "codepages"     => CodepagesDisponiveis(), ;
      "default"       => CdpPadrao() } )

/*
 * config.set {"codepage":"ESWIN","showDeleted":true} -> config.get + saved
 *
 * Grava o que veio (o que nao veio fica), aplica o SET DELETED JA na VM, e
 * persiste em <raiz>/.qdbu/config.json. `saved` diz se o disco aceitou -- em
 * disco cheio a escolha ainda vale nesta sessao (BEST-EFFORT, ver config.prg).
 *
 * `epoch` nao entra: e fixo em 1979 (QDbuSetup, config.prg).
 */
FUNCTION Api_Config_Set( hP )

   LOCAL h := hb_HClone( ConfigGlobal() )
   LOCAL lSalvou

   IF ! HB_ISHASH( h )
      h := { => }
   ENDIF
   hb_HKeepOrder( h, .T. )

   IF hb_HHasKey( hP, "codepage" )
      IF ! CdpValida( hP[ "codepage" ] )
         RETURN Err( "ERROR_UNKNOWN_CODEPAGE", "unknown codepage", "codepage", ;
                     { "codepage" => hP[ "codepage" ] } )
      ENDIF
      h[ "codepage" ] := hP[ "codepage" ]
   ENDIF

   IF hb_HHasKey( hP, "showDeleted" ) .AND. HB_ISLOGICAL( hP[ "showDeleted" ] )
      h[ "showDeleted" ] := hP[ "showDeleted" ]
      Set( _SET_DELETED, ! hP[ "showDeleted" ] )   /* aplica agora, nao so no proximo boot */
   ENDIF

   /* Preferencia de TELA, sem estado na VM: a barra de ferramentas mostra so
      os icones ou o icone com o texto ao lado. Quem aplica e a interface; aqui
      ela so e guardada, para sobreviver ao fechamento. */
   IF hb_HHasKey( hP, "toolbarLabels" ) .AND. HB_ISLOGICAL( hP[ "toolbarLabels" ] )
      h[ "toolbarLabels" ] := hP[ "toolbarLabels" ]
   ENDIF

   /* Preferencia de TELA tambem, e pelo mesmo molde do toolbarLabels: um id de
      terminal, guardado como texto. Quem sabe o que cada id significa -- e
      quais existem nesta maquina -- e o Rust, que e quem abre o processo.
      Vazio APAGA a escolha em vez de gravar "", para o arquivo guardar so o
      que foi decidido; ausencia ja e o padrao. */
   IF hb_HHasKey( hP, "terminal" ) .AND. HB_ISSTRING( hP[ "terminal" ] )
      IF Empty( hP[ "terminal" ] )
         IF hb_HHasKey( h, "terminal" )
            hb_HDel( h, "terminal" )
         ENDIF
      ELSE
         h[ "terminal" ] := hP[ "terminal" ]
      ENDIF
   ENDIF

   /* Preferencia do sincronizar estrutura (docs/20): a ordem dos campos conta
      como diferenca? Mesmo molde do showDeleted -- logico, guardado como veio. */
   IF hb_HHasKey( hP, "syncByPosition" ) .AND. HB_ISLOGICAL( hP[ "syncByPosition" ] )
      h[ "syncByPosition" ] := hP[ "syncByPosition" ]
   ENDIF

   lSalvou := SalvaConfigGlobal( h )
   SessBump()

   RETURN Ok( { ;
      "saved"         => lSalvou, ;
      "codepage"      => CodepageGlobal(), ;
      "showDeleted"   => ! Set( _SET_DELETED ), ;
      "toolbarLabels" => RotulosNaBarra(), ;
      "terminal"      => TerminalPreferido(), ;
      "syncByPosition" => SyncByPosition(), ;
      "epoch"         => Set( _SET_EPOCH ) } )
