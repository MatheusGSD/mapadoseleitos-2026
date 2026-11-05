# Mapa dos eleitos

De onde vieram os votos de cada deputado federal e senador eleito em 2026, da UF ao local de votação.

**https://mapadoseleitos.dalmolin.dev**

Para cada um dos 567 eleitos (513 deputados federais e 54 senadores), o site mostra:

- os municípios e os locais de votação onde ele teve voto;
- a força dele em cada lugar;
- uma ficha com os dados do TSE, a biografia e os projetos.

Para cada município, mostra quem foi votado ali e quem cobrar, com o contato do gabinete e uma mensagem pronta. A
página [Como funciona](https://mapadoseleitos.dalmolin.dev/#/como-funciona) explica cada medida.

Este repositório tem só o que o site serve: o HTML, o CSS, o JavaScript e os arquivos de dados já prontos, gerados a
partir dos dados abertos das fontes abaixo. O site é estático e é publicado pelo GitHub Pages.

## Fontes

- **TSE, dados abertos e API de resultados:** os votos do 1º turno, em 4 de outubro de 2026, por seção; os
  candidatos, com os bens declarados, as fotos e as redes sociais declaradas; os locais de votação.
- **IBGE:** o contorno dos municípios, da Malha Municipal 2025.
- **Câmara dos Deputados e Senado Federal:** os projetos de cada eleito e o contato dos gabinetes.
- **Wikipédia e Wikidata:** o trecho da biografia e a ligação entre o eleito e o artigo.
- **OpenFreeMap:** as ruas e os nomes do mapa, com dados do OpenStreetMap.

## Licença

- **Código:** MIT (ver [LICENSE](LICENSE)).
- **Dados**, nas pastas `dados/` e `malha/`: podem ser reusados livremente, citando as fontes (TSE, IBGE, Câmara dos
  Deputados e Senado Federal). Os trechos da Wikipédia seguem a licença
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br), com o crédito em cada um.

## Achou um erro?

[Abra uma issue](https://github.com/MatheusGSD/mapadoseleitos-2026/issues) com o endereço da tela e o que está errado.
É preciso ter uma conta no GitHub.

Feito por Matheus Dalmolin.
