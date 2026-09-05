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
/*
 * DOIS PROPOSITOS, e eles nao exigem a mesma coisa.
 *
 *   lParaOperacao = .T.  PRE-VOO: uma operacao destrutiva vem logo depois. O
 *                        destino e sempre AO LADO do original, e o espaco tem
 *                        de caber tambem o .tmp que a R2 exige.
 *
 *   lParaOperacao = .F.  COPIA AVULSA: a pessoa pediu uma copia, e so. Escolhe
 *                        a pasta, nada vem depois, e nasce 1x apenas.
 *
 * A distincao apareceu ao ligar o backup a um item de menu: o aviso "esta em
 * modo compartilhado, a operacao seguinte vai exigir exclusivo" era ruido puro
 * numa copia avulsa, porque nao ha operacao seguinte. E copiar NUNCA exigiu
 * exclusivo -- CopiaArquivo() le com FO_READ + FO_SHARED desde sempre.
 */
STATIC FUNCTION MontaChecklist( cH, cCaminhoDestino, lParaOperacao )

   LOCAL hInfo := SessHandle( cH )
   LOCAL aSet, nBytes, nLivre, nPreciso, aItens := {}
   LOCAL aIdx := {}, hIdx
   LOCAL lEspacoOk, lGrande, cDestino, lMesmoVol, nLivreOrigem
   LOCAL cAlvo, cSelo := CarimboAgora()

   /* Os indices abertos entram como DEFINICAO, nao como arquivo copiado: e a
      chave que permite reconstrui-los depois de uma restauracao. Ver o
      comentario em ConjuntoDoArquivo(). */
   IF HB_ISARRAY( hInfo[ "indexes" ] )
      FOR EACH hIdx IN hInfo[ "indexes" ]
         IF HB_ISHASH( hIdx ) .AND. hb_HHasKey( hIdx, "path" )
            AAdd( aIdx, hIdx[ "path" ] )
         ELSEIF HB_ISSTRING( hIdx )
            AAdd( aIdx, hIdx )
         ENDIF
      NEXT
   ENDIF

   aSet   := ConjuntoDoArquivo( hInfo[ "path" ] )
   nBytes := BytesDoConjunto( aSet )

   /*
    * O caminho COMPLETO do destino -- pasta e nome.
    *
    * Pre-voo nao aceita destino: copia ao lado, com o nome sugerido. A
    * restauracao precisa ser uma renomeacao no mesmo volume, e nao uma copia
    * que pode falhar na hora errada.
    *
    * Copia avulsa aceita o caminho inteiro, porque renomear e o uso comum --
    * mesma pasta, nome com carimbo. Vazio significa "use a sugestao".
    */
   cAlvo := iif( lParaOperacao .OR. Empty( cCaminhoDestino ), ;
                 NomeDoBackup( hInfo[ "path" ], cSelo ), ;
                 CaminhoOS( cCaminhoDestino ) )

   cDestino := hb_FNameDir( cAlvo )

   lMesmoVol := MesmoVolume( cDestino, hInfo[ "path" ] )

   /* Medido no volume de DESTINO: perguntar a origem quando a copia vai para
      outro disco responde a pergunta errada. */
   nLivre := EspacoLivre( hb_DirSepAdd( cDestino ) + "x" )

   /* 2x so quando o .tmp da operacao seguinte disputa o MESMO volume. */
   nPreciso := nBytes * iif( lParaOperacao .AND. lMesmoVol, ;
                             FATOR_OPERACAO, FATOR_COPIA )

   /* -1 e "nao pude conferir", que NAO e "nao tem espaco". Bloqueia do mesmo
      jeito: seguir sem saber e apostar o arquivo do cliente numa suposicao. */
   lEspacoOk := nLivre >= 0 .AND. nLivre >= nPreciso
   lGrande   := nBytes >= GRANDE_BYTES

   IF nLivre < 0
      AAdd( aItens, Item( "CHECK_DISK_UNKNOWN", NIVEL_FAIL, ;
                          { "path" => cDestino } ) )
   ELSE
      AAdd( aItens, Item( "CHECK_DISK_SPACE", ;
                          iif( lEspacoOk, NIVEL_PASS, NIVEL_FAIL ), ;
                          { "needed" => nPreciso, ;
                            "free"   => nLivre, ;
                            "where"  => cDestino } ) )
   ENDIF

   /* Volume diferente: o backup nao ocupa nada na origem, mas o .tmp da
      operacao seguinte continua nascendo la. Conferencia propria -- passar na do
      destino nao diz nada sobre este disco. */
   IF lParaOperacao .AND. ! lMesmoVol
      nLivreOrigem := EspacoLivre( hInfo[ "path" ] )
      AAdd( aItens, Item( "CHECK_SOURCE_ROOM", ;
                          iif( nLivreOrigem >= nBytes, NIVEL_PASS, NIVEL_FAIL ), ;
                          { "needed" => nBytes, ;
                            "free"   => Max( 0, nLivreOrigem ), ;
                            "where"  => hb_FNameDir( hInfo[ "path" ] ) } ) )
   ENDIF

   AAdd( aItens, Item( "CHECK_FILE_SET", NIVEL_PASS, ;
                       { "n" => Len( aSet ), "bytes" => nBytes } ) )

   /*
    * Destino ja ocupado: RECUSA, nunca sobrescrita silenciosa.
    *
    * Com o nome editavel, colidir deixou de ser improvavel -- e o arquivo que
    * estaria ali e, quase por definicao, um backup anterior. Sobrescrever um
    * backup para criar outro e a forma mais direta de nao ter backup nenhum.
    *
    * A recusa e por conferencia e nao por erro de gravacao: aparece ANTES,
    * com o nome do arquivo, enquanto ainda da para trocar. Um erro no meio da
    * copia de 800 MB apareceria depois da espera, e com o arquivo ja alterado.
    */
   IF hb_FileExists( cAlvo )
      AAdd( aItens, Item( "CHECK_TARGET_EXISTS", NIVEL_FAIL, ;
                          { "file" => hb_FNameNameExt( cAlvo ) } ) )
   ENDIF

   /* Copiar por cima da propria origem destruiria o arquivo. Nao e hipotese
      remota com o nome editavel: basta apagar o carimbo do nome sugerido. */
   IF Upper( AllTrim( cAlvo ) ) == Upper( AllTrim( hInfo[ "path" ] ) )
      AAdd( aItens, Item( "CHECK_TARGET_IS_SOURCE", NIVEL_FAIL, ;
                          { "file" => hb_FNameNameExt( cAlvo ) } ) )
   ENDIF

   /* Aviso, nao falha: arquivo grande nao impede nada -- so exige que a pessoa
      saiba antes, e nao descubra esperando. */
   IF lGrande
      AAdd( aItens, Item( "CHECK_LARGE_FILE", NIVEL_WARN, ;
                          { "bytes" => nBytes, "limit" => GRANDE_BYTES } ) )
   ENDIF

   /*
    * O aviso e sobre a OPERACAO SEGUINTE, nunca sobre a copia.
    *
    * Copiar nunca exigiu exclusivo -- CopiaArquivo() le com FO_READ+FO_SHARED,
    * e no DBU original sempre foi assim: com o arquivo aberto, e so copiar. Numa copia
    * avulsa nao ha operacao seguinte, e o aviso seria ruido. Ruido num checklist
    * e pior que silencio: ensina a ignorar a lista.
    */
   IF lParaOperacao .AND. ! hInfo[ "exclusive" ]
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
      "dir"        => cDestino, ;
      "target"     => cAlvo, ;
      "stamp"      => cSelo, ;
      "sameVolume" => lMesmoVol, ;
      "forOperation" => lParaOperacao, ;
      "indexes"    => DefinicoesDosIndices( cH ), ;
      "large"      => lGrande, ;
      "checks"     => aItens, ;
      "limitBytes" => GRANDE_BYTES, ;
      "canProceed" => AScan( aItens, {| h | h[ "level" ] == NIVEL_FAIL } ) == 0 }


/*
 * backup.check {"h":"h7"} -> o relatorio, sem efeito nenhum.
 */
FUNCTION Api_Backup_Check( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cAlvo := ParStr( hP, "path" )
   LOCAL lOp   := ParLog( hP, "forOperation", .T. )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF ( xErro := DestinoValido( @cAlvo ) ) != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( MontaChecklist( cH, cAlvo, lOp ) )


/*
 * O caminho de destino serve? Vazio significa "use a sugestao".
 *
 * Confere a PASTA, e nao o arquivo: o arquivo ainda nao existe -- e se existir,
 * quem recusa e a conferencia CHECK_TARGET_EXISTS, que e uma recusa com nome e
 * explicacao, nao um erro de gravacao no meio da copia.
 */
STATIC FUNCTION DestinoValido( cAlvo )

   LOCAL cDir

   IF Empty( cAlvo )
      RETURN NIL
   ENDIF

   cAlvo := CaminhoOS( cAlvo )
   cDir  := hb_FNameDir( cAlvo )

   IF Empty( hb_FNameName( cAlvo ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "destination file name is required", ;
                  "path", { "param" => "path" } )
   ENDIF

   IF ! Empty( cDir ) .AND. ! hb_DirExists( cDir )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "destination folder not found", "path", ;
                  { "dir" => cDir } )
   ENDIF

   RETURN NIL


/*
 * A definicao de cada indice aberto -- nome, chave e FOR.
 *
 * Vai no resultado porque o backup NAO copia os .ntx: eles sao derivados, e o
 * que precisa sobreviver e a chave que os regenera. Sem isto, restaurar um .dbf
 * deixaria a pessoa sem saber quais indices existiam nem com que expressao.
 */
STATIC FUNCTION DefinicoesDosIndices( cH )

   LOCAL aRet := {}
   LOCAL i

   HB_SYMBOL_UNUSED( cH )

   FOR i := 1 TO ordCount()
      AAdd( aRet, { ;
         "bag" => ordBagName( i ), ;
         "key" => ordKey( i ), ;
         "for" => ordFor( i ) } )
   NEXT

   RETURN aRet


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
   LOCAL cAlvo    := ParStr( hP, "path" )
   LOCAL lOp      := ParLog( hP, "forOperation", .T. )
   LOCAL lConfGde := ParLog( hP, "confirmLarge", .F. )
   LOCAL lZip     := ParLog( hP, "compress", .F. )
   LOCAL xErro, hRel, cSelo, aFeitos := {}, hArq, cDestino, nTotal, nFeito := 0
   LOCAL hCopia, aCopias := {}, nEste := 0
   LOCAL lAberto, cZip, cModoZip := ""

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   /* Confere DE NOVO. Entre o check e o run o usuario pode ter lido o
      relatorio, ido almocar e voltado -- e o disco pode ter enchido. */
   IF ( xErro := DestinoValido( @cAlvo ) ) != NIL
      RETURN xErro
   ENDIF

   hRel := MontaChecklist( cH, cAlvo, lOp )

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
   cSelo  := hRel[ "stamp" ]
   nTotal := hRel[ "bytes" ]

   /* SessSelect() ja rodou e nos deixou na area deste handle. */
   lAberto := ! Empty( Alias() )

   QDbu_JobBegin( JobMsg( iif( lZip, "UI_JOB_ZIP", "UI_JOB_BACKUP" ), ;
                         hRel[ "file" ] ), nTotal )

   /*
    * COMPACTADO: um .zip no lugar do conjunto de copias.
    *
    * A diferenca com a copia normal nao e so o tamanho -- e QUANTOS ARQUIVOS
    * saem. O backup comum gera um .dbf (e o .dbt quando ha memo) ao lado; o
    * compactado gera UM arquivo so, que e o que se manda por e-mail ou guarda
    * num pendrive sem medo de separar o par.
    *
    * A via -- zipar o original direto ou copiar antes -- e escolhida DENTRO do
    * ZipDoArquivo, tentando: ele nao pergunta o modo do arquivo, ele tenta abrir
    * e ve o que o SO responde. `cModo` volta dizendo qual foi, e a tela mostra.
    */
   IF lZip
      cZip := hb_FNameExtSet( hRel[ "target" ], ".zip" )

      xErro := ZipDoArquivo( SessHandle( cH )[ "path" ], ;
                             cZip, hRel[ "file" ], ;
                             {| n, t | HB_SYMBOL_UNUSED( t ), QDbu_Progress( n ) }, ;
                             @cModoZip )
      QDbu_JobEnd()

      IF xErro != NIL
         RETURN xErro
      ENDIF

      RETURN Ok( { ;
         "file"    => hRel[ "file" ], ;
         "stamp"   => cSelo, ;
         "dir"     => hRel[ "dir" ], ;
         "bytes"   => Max( 0, hb_FSize( cZip ) ), ;
         "source"  => nTotal, ;
         "mode"    => "zip-" + cModoZip, ;
         "files"   => { { "source" => hRel[ "file" ], ;
                          "backup" => hb_FNameNameExt( cZip ), ;
                          "bytes"  => Max( 0, hb_FSize( cZip ) ), ;
                          "role"   => "zip" } }, ;
         "indexes" => hRel[ "indexes" ], ;
         "checks"  => hRel[ "checks" ] } )
   ENDIF

   /*
    * DUAS VIAS, e a escolha e pelo estado do arquivo -- nao por preferencia.
    *
    *   ABERTO   -> CopiaPorRegistro()  le pela work area
    *   FECHADO  -> CopiaArquivo()      le os bytes com FOpen
    *
    * Nao e otimizacao: a copia de bytes NAO CONSEGUE abrir um arquivo que o RDD
    * mantem exclusivo -- o Windows nega o segundo handle mesmo dentro do proprio
    * processo. E o pre-voo roda antes de PACK/ZAP, que exigem exclusivo. A via
    * de bytes falharia exatamente no caso que justifica o backup.
    *
    * A via por registro cobre o conjunto INTEIRO de uma vez: dbCreate() cria o
    * .DBT junto quando ha campo memo, e os valores memo sao copiados como
    * valores. Por isso ela nao percorre `set` -- ela substitui o laco.
    */
   IF lAberto
      xErro := CopiaPorRegistro( hRel[ "target" ], ;
                                 {| n, t | HB_SYMBOL_UNUSED( t ), QDbu_Progress( n ) } )
      QDbu_JobEnd()

      IF xErro != NIL
         RETURN xErro
      ENDIF

      /*
       * O RELATORIO TEM DE DESCREVER O CONJUNTO, e nao so o .DBF.
       *
       * `CopiaPorRegistro()` cria o .DBT JUNTO quando ha campo memo -- esta
       * escrito no comentario acima -- mas o resultado listava uma entrada so,
       * com o tamanho so do .DBF. Na tela isso saia como uma contradicao que a
       * pessoa le em um segundo, e foi assim que apareceu (03/09/2026, fixture
       * TIPOS.DBF):
       *
       *     Arquivos que serao copiados    2 arquivos, 3,3 KB
       *     1 arquivo copiado              tipos_20260903_224521.dbf   1,2 KB
       *
       * Prometeu dois, relatou um, e os dois estavam no disco. O backup estava
       * CERTO; quem mentia era o relato -- e mentia justamente sobre o memo, que
       * e o arquivo que some junto e leva o conteudo com ele. Quem lesse "1
       * arquivo copiado" concluiria que o .DBT ficou de fora.
       *
       * O `bytes` sofria do mesmo: 1.271 registrados no log para uma operacao
       * que escreveu 3.338.
       *
       * A montagem agora sai do conjunto de origem (`set`) passando por
       * `DestinoDoMembro()`, que e exatamente o que a via por bytes faz mais
       * abaixo -- as duas vias descrevem o resultado do mesmo jeito, e o
       * tamanho vem do arquivo que ficou no disco, nao do que se esperava dele.
       */
      FOR EACH hArq IN hRel[ "set" ]
         cDestino := DestinoDoMembro( hArq[ "path" ], hRel[ "target" ], hArq[ "role" ] )
         IF hb_FileExists( cDestino )
            nEste := Max( 0, hb_FSize( cDestino ) )
            nFeito += nEste
            AAdd( aCopias, { "source" => hb_FNameNameExt( hArq[ "path" ] ), ;
                             "backup" => hb_FNameNameExt( cDestino ), ;
                             "bytes"  => nEste, ;
                             "role"   => hArq[ "role" ] } )
         ENDIF
      NEXT

      RETURN Ok( { ;
         "file"    => hRel[ "file" ], ;
         "stamp"   => cSelo, ;
         "dir"     => hRel[ "dir" ], ;
         "bytes"   => nFeito, ;
         "mode"    => "record", ;
         "files"   => aCopias, ;
         "indexes" => hRel[ "indexes" ], ;
         "checks"  => hRel[ "checks" ] } )
   ENDIF

   FOR EACH hArq IN hRel[ "set" ]
      cDestino := DestinoDoMembro( hArq[ "path" ], hRel[ "target" ], hArq[ "role" ] )

      xErro := CopiaArquivo( hArq[ "path" ], cDestino, nFeito, nTotal, @nEste )
      IF xErro != NIL
         QDbu_JobEnd()
         DesfazParciais( aFeitos )
         RETURN xErro
      ENDIF

      /* Passo 3 da sequencia, e o que da valor aos outros: conferir que a copia
         ficou de pe. FCreate() bem-sucedido seguido de disco cheio deixa um
         arquivo truncado, e um backup truncado e pior que backup nenhum. */
      xErro := BackupConfere( cDestino, nEste )
      IF xErro != NIL
         QDbu_JobEnd()
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

   QDbu_JobEnd()

   RETURN Ok( { ;
      "file"    => hRel[ "file" ], ;
      "stamp"   => cSelo, ;
      "dir"     => hRel[ "dir" ], ;
      "mode"    => "bytes", ;
      "indexes" => hRel[ "indexes" ], ;
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
