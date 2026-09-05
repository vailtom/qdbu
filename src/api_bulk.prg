/*
 * api_bulk.prg - PACK e ZAP. As primeiras operacoes que DESTROEM dado.
 *
 * ATE AQUI TUDO SO LIA. Isto muda com este arquivo, e por isso ele e o unico
 * lugar do projeto onde as regras de as regras de integridade sao obrigatorias
 * linha a linha, e nao recomendacoes.
 *
 * A SEQUENCIA, e ela e a mesma para os dois comandos:
 *
 *   1. a UI avisa da perda e pergunta se segue          (SweetAlert, 3 saidas)
 *   2. a UI pergunta se quer backup antes
 *   3. AQUI: fecha a area, toma exclusivo, opera, devolve compartilhado, religa
 *
 * Os passos 1 e 2 sao da tela de proposito: a DLL nao pergunta nada. Ela recebe
 * `backup` ja decidido e executa. Uma DLL que faz perguntas nao tem como ser
 * testada sem GUI, e o cliente C (tests/) precisa poder exercitar isto.
 *
 * O EXCLUSIVO E TENTADO DEPOIS DE PERGUNTAR, e nao antes.
 *
 * Parece errado -- "por que perguntar se pode nao dar?" -- mas conferir
 * exclusividade EXIGE TOMA-LA, o que ja obriga a fechar a area. Uma
 * pre-conferencia seria tao disruptiva quanto a tentativa real, e custaria um
 * ciclo de fechar/reabrir so para descobrir uma coisa que a tentativa
 * descobriria de qualquer jeito. Decisao do autor, 02/09/2026.
 *
 * AS DUAS ESTRATEGIAS DE ZAP, e a diferenca de custo e enorme
 *
 *   COM backup    RENOMEIA o original (ele VIRA o backup) e cria um DBF vazio
 *                 com a mesma estrutura. Instantaneo, INDEPENDENTE DO TAMANHO:
 *                 um arquivo de 800 MB e "zapado" em milissegundos, porque nada
 *                 e copiado nem apagado -- so um nome muda.
 *
 *   SEM backup    ZAP + dbCommit(). O comando xBase, direto.
 *
 * A estrategia do rename e do autor, e e melhor que copiar-depois-zapar em
 * todos os eixos: mais rapida, nao precisa de espaco para uma copia, e nao ha
 * janela em que exista meia copia. Ver o desenho do backup.
 *
 * PACK nao tem esse atalho: ele PRESERVA os registros nao marcados, entao o
 * arquivo resultante e diferente do original e o original tem de ser copiado
 * de verdade antes.
 */

#include "dbstruct.ch"
#include "fileio.ch"
#include "dbinfo.ch"


STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )


STATIC FUNCTION ParLog( hP, cChave, lPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN lPadrao
   ENDIF

   RETURN iif( HB_ISLOGICAL( hP[ cChave ] ), hP[ cChave ], lPadrao )


/*
 * bulk.zap {"h":"h7","backup":true}
 *
 * COM backup: renomeia o original e cria um vazio no lugar.
 * SEM backup: ZAP + dbCommit().
 */
FUNCTION Api_Bulk_Zap( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL lBackup := ParLog( hP, "backup", .T. )

   RETURN Destrutiva( cH, "zap", lBackup )


/*
 * bulk.pack {"h":"h7","backup":true}
 *
 * COM backup: copia por registro (o desenho do backup) e depois PACK + dbCommit().
 * SEM backup: PACK + dbCommit().
 */
FUNCTION Api_Bulk_Pack( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL lBackup := ParLog( hP, "backup", .T. )

   RETURN Destrutiva( cH, "pack", lBackup )


/*
 * O corpo comum. UMA rotina para os dois comandos, pelo mesmo motivo que o
 * rebind e uma so: duas implementacoes seriam dois conjuntos de manhas, e a que
 * estivesse errada erraria em silencio.
 */
STATIC FUNCTION Destrutiva( cH, cAcao, lBackup )

   LOCAL xErro, hInfo, hEstado, aEstru
   LOCAL lModoOrig
   LOCAL cArq, cAlias, cMemo, nWa
   LOCAL cSelo, cBackup, nAntes, nDepois, cExtMemo, oErr
   LOCAL aFalhas := {}

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo  := SessHandle( cH )

   /*
    * O MODO ORIGINAL E COPIADO PARA UM LOCAL, e isto nao e preciosismo.
    *
    * `hInfo` e uma REFERENCIA VIVA para o hash da sessao, e o
    * `SessReattach( cH, nWa, .T. )` la embaixo grava `.T.` em
    * `hInfo[ "exclusive" ]` -- e o registro de que a area esta exclusiva
    * AGORA. A partir dali, todo `hInfo[ "exclusive" ]` devolve `.T.`, e a
    * reabertura no fim devolveria o arquivo EXCLUSIVO mesmo para quem o tinha
    * aberto compartilhado. O sintoma e mudo: a operacao termina bem, e o
    * arquivo fica travado para todo mundo ate a aba ser fechada.
    */
   lModoOrig := hInfo[ "exclusive" ]
   cArq   := hInfo[ "path" ]
   cAlias := hInfo[ "alias" ]
   nAntes := LastRec()

   /*
    * A estrutura E A EXTENSAO DO MEMO sao lidas ANTES de fechar.
    *
    * Depois do dbCloseArea() nao ha work area selecionada, e qualquer dbInfo()
    * vira erro de RUNTIME -- que sobe pelo RECOVER do dispatcher como "ERR:" e
    * chega a tela como "Erro nao identificado", sem codigo e sem explicacao.
    * Foi exatamente o que aconteceu na primeira versao: o dbInfo(DBI_MEMOEXT)
    * estava depois do fechamento, e o ZAP com backup morria ali.
    */
   aEstru := dbStruct()
   cExtMemo := dbInfo( DBI_MEMOEXT )

   /* Fotografa indices, ordem, filtro e cursor. R5. */
   hEstado := EstadoAntes( cH )

   cSelo   := CarimboAgora()
   cBackup := NomeDoBackup( cArq, cSelo )

   dbCloseArea()

   /* ---------------------------------------------------- ZAP com renomeacao */
   IF cAcao == "zap" .AND. lBackup

      /*
       * Renomear exige o arquivo FECHADO -- por nos e por todos. Se outro
       * processo o tem aberto, o FRename falha, e essa e a resposta certa:
       * melhor recusar que operar com alguem lendo.
       */
      IF FRename( cArq, cBackup ) != 0
         RETURN ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, ;
                        Err( "ERROR_CANNOT_LOCK_EXCLUSIVE", "rename failed", "h", ;
                             { "file" => hb_FNameNameExt( cArq ) } ) )
      ENDIF

      /* O memo acompanha: um DBF com campo memo cujo .DBT ficou para tras nao
         abre. Renomeia com a mesma base, para o par continuar par. */
      cMemo := hb_FNameExtSet( cArq, cExtMemo )
      IF hb_FileExists( cMemo )
         FRename( cMemo, hb_FNameExtSet( cBackup, hb_FNameExt( cMemo ) ) )
      ENDIF

      BEGIN SEQUENCE WITH {| e | Break( e ) }
         dbCreate( cArq, aEstru )
      RECOVER USING oErr
         /* Nao conseguiu criar o vazio: DESFAZ a renomeacao. Deixar o usuario
            sem o arquivo no lugar dele seria o pior desfecho possivel. */
         FRename( cBackup, cArq )
         RETURN ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, ;
                        Err( "ERROR_ZAP_CREATE_FAILED", "could not create the empty file", ;
                             "h", { "file" => hb_FNameNameExt( cArq ), ;
                                    "reason" => ErroTexto( oErr ) } ) )
      END SEQUENCE

      xErro := ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL )
      IF xErro != NIL
         RETURN xErro
      ENDIF

      RETURN Ok( { "action"   => "zap", ;
                   "strategy" => "rename", ;
                   "file"     => hb_FNameNameExt( cArq ), ;
                   "backup"   => hb_FNameNameExt( cBackup ), ;
                   "before"   => nAntes, ;
                   "after"    => 0 } )
   ENDIF

   /* ------------------------------------- as demais: exclusivo e o comando */

   nWa := AbreNaArea( cArq, cAlias, .T. )      /* EXCLUSIVO */

   IF nWa == 0
      RETURN ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, ;
                     Err( "ERROR_CANNOT_LOCK_EXCLUSIVE", "another program is using it", ;
                          "h", { "file" => hb_FNameNameExt( cArq ) } ) )
   ENDIF

   SessReattach( cH, nWa, .T. )

   /* PACK com backup: copia por REGISTRO, sob o exclusivo que ja temos. E a
      unica forma de o retrato ser consistente -- ninguem escreve agora. */
   IF cAcao == "pack" .AND. lBackup
      QDbu_JobBegin( JobMsg( "UI_JOB_BACKUP", hb_FNameNameExt( cBackup ) ), LastRec() )
      xErro := CopiaPorRegistro( cBackup, {| n, t | HB_SYMBOL_UNUSED( t ), QDbu_Progress( n ) } )
      QDbu_JobEnd()

      IF xErro != NIL
         /* Backup falhou: NAO opera. R4 -- backup antes, e se nao houve backup
            nao ha operacao. */
         ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL )
         RETURN xErro
      ENDIF
   ENDIF

   /*
    * OS INDICES TEM DE ESTAR ABERTOS **DURANTE** O PACK/ZAP.
    *
    * A regra do projeto diz que aqui os indices nao se fecham "porque e o
    * proprio dbPack() que os reconstroi". Verdade -- mas so vale para os que
    * estao abertos NA AREA no momento da chamada, e ate agora nenhum estava: o
    * caminho exclusivo acima faz `AbreNaArea()` do zero, que abre o .DBF e mais
    * nada. `__dbPack()` rodava sobre uma area sem ordem nenhuma, nao tinha o que
    * reconstruir, e `ReabreArea()` depois reanexava um .NTX que descrevia o
    * arquivo de ANTES.
    *
    * O sintoma e o que a R5 previu: nenhum erro em lugar nenhum, e a grade
    * mostrando dados errados. Medido em 03/09/2026 na fixture TIPOS.DBF, 7
    * registros com 1 marcado, indice TIPOSTXT por TXT: depois do PACK a ordem
    * fisica mostrava os 6 restantes e a ordem indexada mostrava 3. Metade dos
    * registros invisivel, sem uma linha de aviso. O carimbo do .NTX no disco
    * continuava sendo o da criacao -- o PACK nao o tinha tocado.
    *
    * Vale para o ZAP pelo mesmo motivo: `__dbZap()` esvazia os indices ABERTOS;
    * os que ficaram de fora sobrevivem cheios de chaves para registros que nao
    * existem mais.
    *
    * Falha ao reabrir um indice aqui NAO aborta: o objetivo desta reabertura e
    * que o RDD reconstrua o que der: o que nao voltou tambem nao vai para o
    * `Religar()` reanexar obsoleto, porque `ordCount()` la ja sera > 0. Quem
    * precisa saber e a pessoa, e ela ve pela lista de indices abertos.
    */
   ReanexaIndices( hEstado )

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      IF cAcao == "pack"
         QDbu_JobBegin( JobMsg( iif( cAcao == "pack", "UI_JOB_PACK", "UI_JOB_ZAP" ), ;
                               hb_FNameNameExt( cArq ) ), 0 )
         __dbPack()
         QDbu_JobEnd()
      ELSE
         __dbZap()
      ENDIF
      dbCommit()
   RECOVER USING oErr
      QDbu_JobEnd()
      ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL )
      RETURN Err( iif( cAcao == "pack", "ERROR_PACK_FAILED", "ERROR_ZAP_FAILED" ), ;
                  "operation failed", "h", ;
                  { "file"   => hb_FNameNameExt( cArq ), ;
                    "reason" => ErroTexto( oErr ) } )
   END SEQUENCE

   nDepois := LastRec()

   xErro := ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL )
   IF xErro != NIL
      RETURN xErro
   ENDIF

   HB_SYMBOL_UNUSED( aFalhas )

   RETURN Ok( { "action"   => cAcao, ;
                "strategy" => iif( lBackup, "copy", "direct" ), ;
                "file"     => hb_FNameNameExt( cArq ), ;
                "backup"   => iif( lBackup .AND. cAcao == "pack", ;
                                   hb_FNameNameExt( cBackup ), "" ), ;
                "before"   => nAntes, ;
                "after"    => nDepois, ;
                "removed"  => Max( 0, nAntes - nDepois ) } )


