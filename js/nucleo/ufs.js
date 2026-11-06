// As 27 UFs: sigla, código IBGE (os dois primeiros dígitos do código do município), nome, região e o artigo que
// o nome pede ("pelo Rio Grande do Norte", "pela Bahia", "por Minas Gerais"). A ordem é a do IBGE.
const TABELA = [
  ['RO', 11, 'Rondônia', 'Norte', ''], ['AC', 12, 'Acre', 'Norte', 'o'], ['AM', 13, 'Amazonas', 'Norte', 'o'],
  ['RR', 14, 'Roraima', 'Norte', ''], ['PA', 15, 'Pará', 'Norte', 'o'], ['AP', 16, 'Amapá', 'Norte', 'o'],
  ['TO', 17, 'Tocantins', 'Norte', 'o'],
  ['MA', 21, 'Maranhão', 'Nordeste', 'o'], ['PI', 22, 'Piauí', 'Nordeste', 'o'], ['CE', 23, 'Ceará', 'Nordeste', 'o'],
  ['RN', 24, 'Rio Grande do Norte', 'Nordeste', 'o'], ['PB', 25, 'Paraíba', 'Nordeste', 'a'],
  ['PE', 26, 'Pernambuco', 'Nordeste', ''], ['AL', 27, 'Alagoas', 'Nordeste', ''], ['SE', 28, 'Sergipe', 'Nordeste', ''],
  ['BA', 29, 'Bahia', 'Nordeste', 'a'],
  ['MG', 31, 'Minas Gerais', 'Sudeste', ''], ['ES', 32, 'Espírito Santo', 'Sudeste', 'o'],
  ['RJ', 33, 'Rio de Janeiro', 'Sudeste', 'o'], ['SP', 35, 'São Paulo', 'Sudeste', ''],
  ['PR', 41, 'Paraná', 'Sul', 'o'], ['SC', 42, 'Santa Catarina', 'Sul', ''], ['RS', 43, 'Rio Grande do Sul', 'Sul', 'o'],
  ['MS', 50, 'Mato Grosso do Sul', 'Centro-Oeste', ''], ['MT', 51, 'Mato Grosso', 'Centro-Oeste', ''],
  ['GO', 52, 'Goiás', 'Centro-Oeste', ''], ['DF', 53, 'Distrito Federal', 'Centro-Oeste', 'o'],
];

export const UFS = new Map(TABELA.map(([sigla, ibge, nome, regiao, artigo]) => [sigla, { sigla, ibge, nome, regiao, artigo }]));
export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

/** A UF de um código IBGE de município (7 dígitos), ou null. */
export function ufDoMunicipio(ibge) {
  const c = Math.floor(Number(ibge) / 100000);
  for (const u of UFS.values()) if (u.ibge === c) return u.sigla;
  return null;
}

/** "pelo Rio Grande do Norte", "pela Bahia", "por Minas Gerais". */
export const pelaUF = (sigla) => { const u = UFS.get(sigla); return `${u.artigo ? 'pel' + u.artigo : 'por'} ${u.nome}`; };
/** "no Rio Grande do Norte", "na Bahia", "em Minas Gerais". */
export const naUF = (sigla) => { const u = UFS.get(sigla); return `${u.artigo ? 'n' + u.artigo : 'em'} ${u.nome}`; };
/** "do Rio Grande do Norte", "da Bahia", "de Minas Gerais". */
export const daUF = (sigla) => { const u = UFS.get(sigla); return `${u.artigo ? 'd' + u.artigo : 'de'} ${u.nome}`; };
