// Dispersão da votação (#12), no lugar de "metade dos votos veio de N municípios", que não se compara entre UFs.
// O número vem do build, no índice (a exceção do #9): ele pede o eleitorado de cada local, que o site não baixa.
import { nomeProprio } from '../../nucleo/texto.js';
import { pct } from '../../nucleo/formato.js';
import { daUF, pelaUF } from '../../nucleo/ufs.js';

/**
 * fraseDaDispersao(eleito, medianaDaUF) -> { antes, x, depois, texto, espalhado, referencia }
 * texto = antes + x + depois, com x (a porcentagem) à parte para o destaque. referencia: a mediana dos deputados
 * eleitos pela UF, só para deputado; o senador fica só com os 50% (`espalhado`).
 */
export function fraseDaDispersao(e, mediana) {
  const antes = `Metade dos votos de ${nomeProprio(e.nome)} veio de locais de votação onde vota `;
  const x = pct(e.dispersao);
  const depois = ` do eleitorado ${daUF(e.uf)}.`;
  return {
    antes, x, depois, texto: antes + x + depois,
    espalhado: 'Se o voto fosse espalhado como o eleitorado, seriam 50%.',
    referencia: e.cargo === 6 ? `Entre os deputados federais eleitos ${pelaUF(e.uf)}, a mediana é ${pct(mediana)}.` : null,
  };
}
