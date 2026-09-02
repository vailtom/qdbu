/*
 * api_backup.prg - o checklist de pre-voo e o backup, expostos a UI.
 *
 * DUAS CHAMADAS, E A SEPARACAO E O PONTO
 *
 *   backup.check {"h":"h7"}   -> confere e NAO faz nada
 *   backup.run   {"h":"h7"}   -> confere de novo, faz, e verifica
 *
 * `check` existe para a tela poder MOSTRAR a conferencia antes de qualquer
 * coisa acontecer. O usuario ve quanto espaco precisa, quanto tem, o tamanho do
 * conjunto, e se a operacao vai demorar -- e so entao confirma. Seguranca que
 * nao aparece nao gera confianca: gera a impressao de ferramenta que nao faz
 * nada.
 *
 * `run` NAO confia no `check` anterior. Entre um e outro o usuario pode ter
 * lido um relatorio, ido almocar e voltado; o disco pode ter enchido. A
 * conferencia roda de novo, e e a do `run` que decide.
 *
 * O QUE ESTA API DELIBERADAMENTE NAO FAZ
 *
 * Nao decide se a operacao destrutiva pode acontecer. Ela responde "o backup
 * esta de pe, sim ou nao"; quem opera e T10/T13/T14, e a regra la e simples --
 * backup nao confirmado, operacao nao comeca.
 */

#include "fileio.ch"
#include "backup.ch"


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
 * Uma conferencia do checklist.
 *
 * TRES NIVEIS, e nao um `ok` booleano.
 *
 * A primeira versao usava `ok` + `blocking`, e "arquivo aberto em modo
 * compartilhado" saia como `ok:.F., blocking:.F.` -- lido na tela, um X
 * vermelho num item que nao impede nada. O usuario veria uma reprovacao onde ha
 * apenas um aviso, e a conferencia que existe para dar confianca produziria
 * exatamente o contrario.
 *
 *   "pass"  passou
 *   "warn"  merece saber, nao impede
 *   "fail"  impede a operacao
 *
 * A UI escolhe cor e icone pelo nivel, e `canProceed` sai de "nenhum fail" --
 * uma regra so, num lugar so.
 */
#define NIVEL_PASS   "pass"
#define NIVEL_WARN   "warn"
#define NIVEL_FAIL   "fail"

STATIC FUNCTION Item( cId, cNivel, hParams )
   RETURN { "id"     => cId, ;
            "level"  => cNivel, ;
            "params" => hb_defaultValue( hParams, { => } ) }


/*
 * Monta o checklist do arquivo aberto em `cH`.
 *
 * Devolve a hash do relatorio, sem tocar em nada. Usada pelo `check` e de novo
 * pelo `run` -- ter dois caminhos que conferem coisas diferentes seria a forma
 * mais provavel de o `run` passar onde o `check` reprovou.
 */
STATIC FUNCTION MontaChecklist( cH )

   LOCAL hInfo := SessHandle( cH )
   LOCAL aSet, nBytes, nLivre, nPreciso, aItens := {}
   LOCAL aIdx := {}, hIdx
   LOCAL lEspacoOk, lGrande

   /* Os indices ABERTOS neste handle. Fechados nao entram: nao correm risco
      porque a operacao destrutiva nem os conhece. */
   IF HB_ISARRAY( hInfo[ "indexes" ] )
      FOR EACH hIdx IN hInfo[ "indexes" ]
         IF HB_ISHASH( hIdx ) .AND. hb_HHasKey( hIdx, "path" )
            AAdd( aIdx, hIdx[ "path" ] )
         ELSEIF HB_ISSTRING( hIdx )
            AAdd( aIdx, hIdx )
         ENDIF
      NEXT
   ENDIF

   aSet     := ConjuntoDoArquivo( hInfo[ "path" ], aIdx )
   nBytes   := BytesDoConjunto( aSet )
   nLivre   := EspacoLivre( hInfo[ "path" ] )
   nPreciso := nBytes * FATOR_ESPACO

   /* -1 e "nao pude conferir", que NAO e "nao tem espaco". Bloqueia do mesmo
      jeito: seguir sem saber e apostar o arquivo do cliente numa suposicao. */
   lEspacoOk := nLivre >= 0 .AND. nLivre >= nPreciso
   lGrande   := nBytes >= GRANDE_BYTES

   IF nLivre < 0
      AAdd( aItens, Item( "CHECK_DISK_UNKNOWN", NIVEL_FAIL, ;
                          { "path" => hb_FNameDir( hInfo[ "path" ] ) } ) )
   ELSE
      AAdd( aItens, Item( "CHECK_DISK_SPACE", ;
                          iif( lEspacoOk, NIVEL_PASS, NIVEL_FAIL ), ;
                          { "needed" => nPreciso, ;
                            "free"   => nLivre, ;
                            "factor" => FATOR_ESPACO } ) )
   ENDIF

   AAdd( aItens, Item( "CHECK_FILE_SET", NIVEL_PASS, ;
                       { "n" => Len( aSet ), "bytes" => nBytes } ) )

   /* Aviso, nao falha: arquivo grande nao impede nada -- so exige que a pessoa
      saiba antes, e nao descubra esperando. */
   IF lGrande
      AAdd( aItens, Item( "CHECK_LARGE_FILE", NIVEL_WARN, ;
                          { "bytes" => nBytes, "limit" => GRANDE_BYTES } ) )
   ENDIF

   /* Exclusivo nao e exigido pelo BACKUP (ler compartilhado serve), mas e
      exigido pela operacao que vem depois. Avisar aqui evita a pessoa esperar a
      copia inteira para so entao ser recusada. */
   IF ! hInfo[ "exclusive" ]
      AAdd( aItens, Item( "CHECK_NOT_EXCLUSIVE", NIVEL_WARN, ;
                          { "file" => hb_FNameNameExt( hInfo[ "path" ] ) } ) )
   ENDIF

   RETURN { ;
      "file"       => hb_FNameNameExt( hInfo[ "path" ] ), ;
      "path"       => hInfo[ "path" ], ;
      "set"        => aSet, ;
      "bytes"      => nBytes, ;
      "freeBytes"  => nLivre, ;
      "neededBytes" => nPreciso, ;
      "factor"     => FATOR_ESPACO, ;
      "large"      => lGrande, ;
      "checks"     => aItens, ;
      "limitBytes" => GRANDE_BYTES, ;
      "canProceed" => AScan( aItens, {| h | h[ "level" ] == NIVEL_FAIL } ) == 0 }


/*
 * backup.check {"h":"h7"} -> o relatorio, sem efeito nenhum.
 */
FUNCTION Api_Backup_Check( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( MontaChecklist( cH ) )


/*
 * backup.run {"h":"h7","confirmLarge":true} -> faz o backup do conjunto.
 *
 * `confirmLarge` e a confirmacao explicita para arquivo grande. Sem ela, um
 * conjunto acima do limite e RECUSADO -- e a recusa e a mensagem, nao um erro.
 * A tela mostra o tamanho e pergunta; a pessoa decide.
 *
 * TUDO OU NADA. Se a copia de qualquer arquivo do conjunto falhar, as que ja
 * foram feitas sao apagadas. Um backup pela metade e a pior das saidas: parece
 * existir, e a operacao destrutiva seguinte roda com a confianca de quem acha
 * que tem volta.
 */
FUNCTION Api_Backup_Run( hP )

   LOCAL cH       := ParStr( hP, "h" )
   LOCAL lConfGde := ParLog( hP, "confirmLarge", .F. )
   LOCAL xErro, hRel, cSelo, aFeitos := {}, hArq, cDestino, nTotal, nFeito := 0
   LOCAL hCopia, aCopias := {}

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   /* Confere DE NOVO. Entre o check e o run o usuario pode ter lido o
      relatorio, ido almocar e voltado -- e o disco pode ter enchido. */
   hRel := MontaChecklist( cH )

   IF ! hRel[ "canProceed" ]
      RETURN Err( "ERROR_BACKUP_PRECHECK_FAILED", "pre-flight check failed", , ;
                  { "file"   => hRel[ "file" ], ;
                    "needed" => hRel[ "neededBytes" ], ;
                    "free"   => hRel[ "freeBytes" ] } )
   ENDIF

   IF hRel[ "large" ] .AND. ! lConfGde
      RETURN Err( "ERROR_BACKUP_NEEDS_CONFIRM", "large file needs confirmation", , ;
                  { "file" => hRel[ "file" ], "bytes" => hRel[ "bytes" ] } )
   ENDIF

   /* Um selo para o conjunto inteiro: os arquivos saem reconheciveis como
      grupo, e nao com horas diferentes por terem sido copiados em sequencia. */
   cSelo  := CarimboAgora()
   nTotal := hRel[ "bytes" ]

   Dbu_JobBegin( JobMsg( "UI_JOB_BACKUP", hRel[ "file" ] ), nTotal )

   FOR EACH hArq IN hRel[ "set" ]
      cDestino := NomeDoBackup( hArq[ "path" ], cSelo )

      xErro := CopiaArquivo( hArq[ "path" ], cDestino, nFeito, nTotal )
      IF xErro != NIL
         Dbu_JobEnd()
         DesfazParciais( aFeitos )
         RETURN xErro
      ENDIF

      /* Passo 3 da sequencia, e o que da valor aos outros: conferir que a copia
         ficou de pe. FCreate() bem-sucedido seguido de disco cheio deixa um
         arquivo truncado, e um backup truncado e pior que backup nenhum. */
      xErro := BackupConfere( hArq[ "path" ], cDestino )
      IF xErro != NIL
         Dbu_JobEnd()
         AAdd( aFeitos, cDestino )
         DesfazParciais( aFeitos )
         RETURN xErro
      ENDIF

      nFeito += hArq[ "bytes" ]
      AAdd( aFeitos, cDestino )

      hCopia := { "source" => hb_FNameNameExt( hArq[ "path" ] ), ;
                  "backup" => hb_FNameNameExt( cDestino ), ;
                  "bytes"  => hArq[ "bytes" ], ;
                  "role"   => hArq[ "role" ] }
      AAdd( aCopias, hCopia )
   NEXT

   Dbu_JobEnd()

   RETURN Ok( { ;
      "file"    => hRel[ "file" ], ;
      "stamp"   => cSelo, ;
      "dir"     => hb_FNameDir( hRel[ "path" ] ), ;
      "bytes"   => nTotal, ;
      "files"   => aCopias, ;
      "checks"  => hRel[ "checks" ] } )


/* Apaga as copias ja feitas. R3: cancelar (ou falhar) nao deixa lixo. */
STATIC FUNCTION DesfazParciais( aFeitos )

   LOCAL c

   FOR EACH c IN aFeitos
      IF hb_FileExists( c )
         FErase( c )
      ENDIF
   NEXT

   RETURN NIL
