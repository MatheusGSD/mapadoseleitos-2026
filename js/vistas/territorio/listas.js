// As listas da vista do território (#7, #9): os locais de votação de um município e a tabela das seções de um local.
// Lógica pura, testada em node (testes/territorio/).
import { semAcento } from '../../nucleo/texto.js';
import { numero } from '../../nucleo/formato.js';

/**
 * O que o leitor de tela ouve a cada letra da busca entre os locais (#33): só a contagem, e nada sem busca. A lista
 * inteira, lida a cada letra, não deixaria ouvir o resultado.
 */
export function contagemDosLocais(n, busca) {
  const b = busca.trim();
  if (!b) return '';
  if (!n) return `Nenhum local de votação com “${b}”`;
  return `${numero(n)} ${n === 1 ? 'local' : 'locais'} de votação com “${b}”`;
}

/**
 * Os locais de votação de um município, dos que têm mais eleitores para os que têm menos.
 *   municipio: o arquivo do município decodificado; uf: o arquivo da UF decodificado (zona, número e ponto)
 *   busca: palavras que o nome, o bairro ou o endereço têm de trazer, sem acento e em qualquer ordem
 * Um local sem ponto no mapa (sem coordenada ou com coordenada compartilhada, #9) vem com semPonto.
 */
export function locaisDoMunicipio(municipio, uf, { busca = '' } = {}) {
  const palavras = semAcento(busca).split(/\s+/).filter(Boolean);
  return municipio.locais
    .map((x) => {
      const l = uf.locais[x.li];
      return { ...x, zona: l.zona, numero: l.numero, semPonto: !l.ponto };
    })
    .filter((x) => {
      const texto = semAcento(`${x.nome} ${x.bairro} ${x.endereco}`);
      return palavras.every((p) => texto.includes(p));
    })
    .sort((a, b) => b.eleitorado - a.eleitorado || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * As seções de um local para um cargo: uma coluna por eleito do cargo que teve voto no local, do mais votado no local
 * para o menos, e uma linha por seção, em ordem de número. O arquivo do local só traz os votos dos eleitos (#9).
 *   local: o arquivo do local decodificado; uf: o arquivo da UF decodificado (dá nome às colunas)
 * -> { colunas: [{ ci, sq, nome, partido, votos }], linhas: [{ secao, concorrentes, votos: [por coluna] }] }
 */
export function tabelaDasSecoes(local, uf, cargo) {
  const colunas = local.eleitos
    .map((ci, k) => ({ k, c: uf.candidatos[ci], votos: local.secoes.reduce((s, x) => s + x.votos[k], 0) }))
    .filter((x) => x.c.cargo === cargo && x.votos > 0)
    .sort((a, b) => b.votos - a.votos || a.c.ci - b.c.ci);
  return {
    colunas: colunas.map(({ c, votos }) => ({ ci: c.ci, sq: c.sq, nome: c.nome, partido: c.partido, votos })),
    linhas: [...local.secoes]
      .sort((a, b) => a.secao - b.secao)
      .map((s) => ({ secao: s.secao, concorrentes: s.concorrentes[cargo], votos: colunas.map((x) => s.votos[x.k]) })),
  };
}
