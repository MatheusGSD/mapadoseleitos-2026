// Caixa de busca (#6): uma caixa só, que acha parlamentares pelo nome de urna, pelo nome civil e pelos nomes de urna
// anteriores, e municípios pelo nome. Ignora acento e caixa, aceita o começo da palavra e um erro de digitação nas
// palavras longas. Só os eleitos entram (quem deixou de ser eleito sai da busca, #10); locais de votação ficam fora.
// O índice da MiniSearch é montado no navegador a partir do índice publicado (#9).
import MiniSearch from '../../vendor/minisearch@7.2.0/minisearch.min.js';
import { semAcento } from './texto.js';

const OPCOES = {
  prefix: true,
  fuzzy: (termo) => (termo.length >= 5 ? 0.2 : false),
  combineWith: 'AND',
  boost: { nome: 3, anteriores: 1.5 },
};

export function criarBusca(indice) {
  const ms = new MiniSearch({
    fields: ['nome', 'civil', 'anteriores'],
    storeFields: ['tipo', 'ref'],
    processTerm: (t) => semAcento(t) || null,
  });
  ms.addAll([
    ...indice.eleitos.map((e) => ({ id: `p${e.sq}`, tipo: 'p', ref: e.sq, nome: e.nome, civil: e.civil, anteriores: e.anteriores.join(' ') })),
    ...indice.municipios.map((m) => ({ id: `m${m.ibge}`, tipo: 'm', ref: m.ibge, nome: m.nome })),
  ]);
  const eleitos = new Map(indice.eleitos.map((e) => [e.sq, e]));
  const municipios = new Map(indice.municipios.map((m) => [m.ibge, m]));

  const procurar = (texto, tipo) => {
    const q = String(texto ?? '').trim();
    if (semAcento(q).replace(/[^a-z0-9]/g, '').length < 2) return [];
    return ms.search(q, { ...OPCOES, filter: (r) => r.tipo === tipo });
  };

  return {
    /** Sugestões da caixa: { parlamentares: [eleito], municipios: [município] }, os mais parecidos primeiro. */
    sugerir(texto, { parlamentares = 6, municipios: nMun = 5 } = {}) {
      return {
        parlamentares: procurar(texto, 'p').slice(0, parlamentares).map((r) => eleitos.get(r.ref)),
        municipios: procurar(texto, 'm').slice(0, nMun).map((r) => municipios.get(r.ref)),
      };
    },
    /** Para a lista: o SQ de todo eleito que casa com o texto. */
    eleitos: (texto) => new Set(procurar(texto, 'p').map((r) => r.ref)),
  };
}
