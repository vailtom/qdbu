/*
 * dbfhdr.prg - o cabecalho de um DBF lido DIRETO do arquivo, sem work area.
 *
 * Existe porque a mesma leitura estava para nascer pela segunda vez.
 * `ReadHeader` (api_workspace.prg) le os 32 bytes iniciais para a arvore dizer
 * "quantos registros, quantos campos, e um DBF?" sem abrir nada; o sincronizar
 * estrutura precisa dos DESCRITORES DE CAMPO de cada arquivo de uma pasta --
 * 227 arquivos na base mais rica -- e abrir 227 work areas so para ler a
 * estrutura seria lento e barulhento (locks, memo, indices que nao existem).
 * O cabecalho ja tem tudo: 32 bytes de capa e 32 por campo.
 *
 * NUNCA CONFIE NO CABECALHO SEM VALIDAR. Na pasta de homologacao ha 7 arquivos
 * com extensao .DBF que sao INI/texto (assinatura 0x5B = '['). Confiar cegamente
 * nos bytes 4..7 faria a arvore anunciar "1.380.013.134 registros". As quatro
 * checagens de `ReadDbfHeader` vem daquele caso.
 *
 * `inUse` E DIFERENTE DE `valid`. O arquivo acabou de ser listado, entao ele
 * existe; se o `hb_vfOpen` falha, e acesso negado -- quase sempre outro
 * programa com ele aberto em exclusivo, o normal numa pasta de cliente com o
 * ERP rodando. Sem a distincao a arvore riscava um DBF perfeito como "nao e um
 * DBF" enquanto o sistema do cliente estava aberto.
 *
 * Aqui nao ha `FRead` sobre REGISTRO: o que a R8 proibe e ler o fluxo de dados
 * por fora do RDD. Cabecalho e capa, nao dado.
 */

#include "fileio.ch"

/*
 * Devolve um hash:
 *
 *   valid       .T. quando passou nas quatro checagens
 *   inUse       .T. quando nem deu para abrir para leitura
 *   reason      o motivo, quando !valid (texto interno, nao vai a tela)
 *   records     bytes 4..7 (little-endian)
 *   fields      quantidade de campos
 *   recordSize  bytes por registro
 *   memo        o bit 0x80 da assinatura
 *   fieldList   {} ou, com lCampos, [ {n,name,type,len,dec} ... ]
 *
 * lCampos decide se a LISTA viaja na resposta -- `fields` (a quantidade) e
 * sempre contado do mesmo jeito, pelo terminador. A arvore nao precisa dos
 * descritores, mas precisa que o numero deles seja o mesmo que o sincronizar
 * estrutura enxerga no mesmo arquivo.
 */
FUNCTION ReadDbfHeader( cArq, lCampos )

   LOCAL hFile, cBuf, cDesc, aCampos
   LOCAL nSig, nRegs, nHdr, nRec, nTam, nEsperado, nMax, nLidos
   LOCAL hRet := { "valid" => .F., "inUse" => .F., "reason" => "", "records" => 0, ;
                   "fields" => 0, "recordSize" => 0, "memo" => .F., "fieldList" => {} }

   hb_default( @lCampos, .F. )

   hFile := hb_vfOpen( cArq, FO_READ + FO_SHARED )

   IF hFile == NIL
      hRet[ "inUse" ] := .T.
      hRet[ "reason" ] := "nao foi possivel abrir para leitura"
      RETURN hRet
   ENDIF

   cBuf := Space( 32 )

   IF hb_vfRead( hFile, @cBuf, 32 ) < 32
      hb_vfClose( hFile )
      hRet[ "reason" ] := "menor que 32 bytes"
      RETURN hRet
   ENDIF

   nSig  := hb_BPeek( cBuf, 1 )
   nRegs := hb_BPeek( cBuf, 5 ) + hb_BPeek( cBuf, 6 ) * 256 + ;
            hb_BPeek( cBuf, 7 ) * 65536 + hb_BPeek( cBuf, 8 ) * 16777216
   nHdr  := hb_BPeek( cBuf, 9 )  + hb_BPeek( cBuf, 10 ) * 256
   nRec  := hb_BPeek( cBuf, 11 ) + hb_BPeek( cBuf, 12 ) * 256

   IF AScan( { 0x02, 0x03, 0x04, 0x05, 0x30, 0x31, 0x32, 0x43, 0x63, ;
               0x83, 0x8B, 0x8E, 0xB3, 0xCB, 0xE5, 0xF5, 0xFB }, nSig ) == 0
      hb_vfClose( hFile )
      hRet[ "reason" ] := "assinatura 0x" + hb_NumToHex( nSig, 2 ) + " nao e xBase"
      RETURN hRet
   ENDIF

   IF nHdr < 33 .OR. nRec < 1
      hb_vfClose( hFile )
      hRet[ "reason" ] := "cabecalho ou registro com tamanho impossivel"
      RETURN hRet
   ENDIF

   /*
    * Os descritores vem logo depois da capa, 32 bytes cada, e terminam num
    * byte 0x0D. O TERMINADOR E QUEM MANDA, nao a conta `(nHdr-33)/32`: um
    * cabecalho FoxPro traz 263 bytes de "backlink" depois do 0x0D, e a conta
    * inventaria oito campos de lixo.
    */
   nMax  := Int( ( nHdr - 33 ) / 32 )
   cDesc := Space( nMax * 32 + 1 )
   nLidos := hb_vfRead( hFile, @cDesc, nMax * 32 + 1 )
   hb_vfClose( hFile )

   IF nLidos < 32
      hRet[ "reason" ] := "descritores de campo truncados"
      RETURN hRet
   ENDIF

   /*
    * OS DOIS CAMINHOS CONTAM PELO TERMINADOR -- e nao so o que pede a lista.
    *
    * A conta `(nHdr-33)/32` sobreviveu aqui depois de o comentario acima ja
    * dizer por que ela nao serve, e o resultado era pior que o defeito
    * original: `struct.scan` (com lista) dizia 119 campos e `workspace.files`
    * (sem lista) dizia 127 PARA O MESMO ARQUIVO, na mesma sessao -- a arvore
    * discordando da tela de sincronizar. Duas leituras do mesmo cabecalho que
    * respondem diferente sao piores que uma errada, porque nenhuma das duas
    * se denuncia. Apontado em revisao, 09/09/2026.
    *
    * E CONTAR E `Len()` DA MESMA LISTA, nao um segundo laco que "so conta":
    * um contador proprio teria de repetir as duas regras de parada (o 0x0D e
    * o nome vazio) e divergiria no dia em que uma delas mudasse -- que e
    * exatamente o defeito que se esta corrigindo aqui. O que `lCampos` decide
    * hoje e apenas se a lista VIAJA na resposta; monta-la custa 32 bytes de
    * texto ja lido por campo, ao lado de um hb_vfOpen por arquivo.
    */
   aCampos := FieldDescriptors( cDesc, nLidos )
   hRet[ "fields" ] := Len( aCampos )
   IF lCampos
      hRet[ "fieldList" ] := aCampos
   ENDIF

   nTam := hb_FSize( cArq )
   nEsperado := nHdr + nRegs * nRec

   /* tolera lixo no fim (EOF marker, padding), mas nao ordem de grandeza errada */
   IF nRegs > 0 .AND. Abs( nEsperado - nTam ) > nRec + 8
      hRet[ "reason" ] := "cabecalho anuncia " + hb_ntos( nRegs ) + ;
                          " registros (" + hb_ntos( nEsperado ) + " bytes), " + ;
                          "mas o arquivo tem " + hb_ntos( nTam )
      RETURN hRet
   ENDIF

   hRet[ "valid" ]      := .T.
   hRet[ "records" ]    := nRegs
   hRet[ "recordSize" ] := nRec
   hRet[ "memo" ]       := hb_bitAnd( nSig, 0x80 ) != 0

   RETURN hRet


/*
 * Um descritor de 32 bytes por campo:
 *
 *   1..11  nome, terminado em NUL (e preenchido com NUL ate os 11)
 *   12     tipo: C N D L M ...
 *   17     tamanho
 *   18     decimais
 *
 * CAMPO C ACIMA DE 255: o Clipper guarda o byte alto do tamanho NOS DECIMAIS
 * (um C nao tem decimais). `dbStruct()` desfaz isso sozinho; lendo o byte cru,
 * um C(300) sairia como C(44,1). E a mesma leitura que o RDD faz -- e ela tem
 * asercao contra o `file.info` do mesmo arquivo.
 *
 * O mesmo formato dos campos do `AreaStructure()` (api_file.prg), de
 * proposito: quem compara estruturas vindas do cabecalho com estruturas vindas
 * de uma area aberta nao pode ter de traduzir entre as duas.
 */
STATIC FUNCTION FieldDescriptors( cDesc, nLidos )

   LOCAL aRet := {}
   LOCAL nPos := 1, i := 0
   LOCAL cUm, cNome, cTipo, nLen, nDec, nNul

   DO WHILE nPos + 31 <= nLidos .AND. hb_BPeek( cDesc, nPos ) != 0x0D
      cUm   := hb_BSubStr( cDesc, nPos, 32 )
      cNome := hb_BLeft( cUm, 11 )
      nNul  := hb_BAt( Chr( 0 ), cNome )
      IF nNul > 0
         cNome := hb_BLeft( cNome, nNul - 1 )
      ENDIF
      cNome := Upper( AllTrim( cNome ) )
      cTipo := Upper( hb_BSubStr( cUm, 12, 1 ) )
      nLen  := hb_BPeek( cUm, 17 )
      nDec  := hb_BPeek( cUm, 18 )

      IF cTipo == "C"
         nLen += nDec * 256
         nDec := 0
      ENDIF

      /* Nome vazio depois do terminador ausente: e lixo, nao campo. */
      IF Empty( cNome )
         EXIT
      ENDIF

      i++
      AAdd( aRet, { "n" => i, "name" => cNome, "type" => cTipo, "len" => nLen, "dec" => nDec } )
      nPos += 32
   ENDDO

   RETURN aRet
