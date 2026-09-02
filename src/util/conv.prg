/*
 * conv.prg - conversao de texto para os tipos do DBF.
 *
 * Existe para o caminho de ENTRADA: importacao (T13), edicao de celula (T8) e o
 * filtro guiado. Onde o usuario -- ou um CSV de outro sistema -- entrega texto
 * e o campo espera outra coisa.
 *
 * A regra que vale para tudo aqui: ser generoso ao LER e rigoroso ao ESCREVER.
 * Aceitar "sim", "S", "1" e "TRUE" na entrada nao custa nada; escrever cada um
 * deles num arquivo diferente cria um dialeto que so este app entende.
 */

/*
 * C2Bool( cTexto ) -> .T. / .F.
 *
 * Origem: C2BOOL() do NetPlus, 18/12/2010, que aceitava "YES.Y.T.SIM.1.S.".
 *
 * V e VERDADEIRO entraram na lista porque e o que o EXCEL EM PORTUGUES escreve
 * ao salvar uma celula logica como CSV -- e importar planilha do Excel e o caso
 * de uso mais provavel da T13. TRUE cobre a versao em ingles.
 *
 * X esta na lista porque em formulario brasileiro "X" marca sim.
 *
 * A exportacao daqui escreve "S"/"N" (Bool2C, em api_export.prg): um so formato
 * na saida, muitos aceitos na entrada.
 *
 * O ponto final delimita os itens: sem ele, "SI" casaria dentro de "SIM" e
 * qualquer prefixo viraria verdadeiro.
 */
FUNCTION C2Bool( cTexto )

   LOCAL c := "." + Upper( AllTrim( hb_defaultValue( cTexto, "" ) ) ) + "."

   RETURN c $ ".S.SIM.V.VERDADEIRO.T..T..1.Y.YES.TRUE.X."

/*
 * Bool2C( lValor ) -> "S" / "N"
 *
 * O par de C2Bool na saida. "S"/"N" e nao "V"/"F": e o que a funcao acima
 * reconhecia desde 2010, e o que qualquer sistema brasileiro entende. O
 * round-trip fecha -- exportar e reimportar devolve o mesmo valor.
 */
FUNCTION Bool2C( lValor )
   RETURN iif( hb_defaultValue( lValor, .F. ), "S", "N" )

/*
 * C2Date( cTexto ) -> data, ou data vazia quando nao reconhece.
 *
 * Aceita AAAA-MM-DD (o que exportamos) e DD/MM/AAAA (o que o usuario digita).
 * Data invalida volta vazia em vez de estourar: numa importacao de milhares de
 * linhas, uma data ruim nao pode derrubar o lote.
 */
FUNCTION C2Date( cTexto )

   LOCAL c := AllTrim( hb_defaultValue( cTexto, "" ) )

   IF Len( c ) == 10 .AND. SubStr( c, 3, 1 ) == "/"
      RETURN hb_SToD( SubStr( c, 7, 4 ) + SubStr( c, 4, 2 ) + SubStr( c, 1, 2 ) )
   ENDIF

   RETURN hb_SToD( StrTran( StrTran( c, "-", "" ), "/", "" ) )

/*
 * C2Num( cTexto ) -> numero.
 *
 * Aceita virgula como separador decimal, que e como o usuario digita e como o
 * Excel em pt-BR exporta. Ponto de milhar sai fora antes: "1.234,56" tem de
 * virar 1234.56, e nao 1.234 truncado no primeiro ponto.
 */
FUNCTION C2Num( cTexto )

   LOCAL c := AllTrim( hb_defaultValue( cTexto, "" ) )

   /* So trata como separador de milhar se houver virgula depois -- senao
      "1.234" (mil duzentos e trinta e quatro) e "1.234" (um virgula duzentos e
      trinta e quatro) seriam indistinguiveis, e o certo e respeitar o ponto. */
   IF "," $ c
      c := StrTran( c, ".", "" )
      c := StrTran( c, ",", "." )
   ENDIF

   RETURN Val( c )
