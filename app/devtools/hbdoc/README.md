# hbdoc -- documentacao das funcoes, copiada do Harbour

Origem: harbour/core@c1941b599466443d145e26ff6d2dd408a6a248bb (2026-09-07)

- `core/`  <- doc/en/*.txt
- `hbct/`  <- contrib/hbct/doc/en/*.txt

Copia fiel, sem edicao. Doc errada se corrige em `catalogo.manual.json`
(secao `patch`), nunca aqui: estes arquivos somem no proximo `--fetch`.
Para acrescentar funcoes de outra contrib, copie o `doc/en/*.txt` dela para
uma pasta nova aqui, registre a pasta em FONTES no catalogo.mjs, ponha os
nomes no REQUEST de src/util/expr_funcs.prg e regenere.

Licenca da documentacao: a do Harbour (GPL com excecao de linkagem);
ver LICENSE no repositorio harbour/core.
