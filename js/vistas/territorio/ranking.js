// "Como este território votou": o ranking de um cargo num município ou local de votação (#5, #7, #10). Lógica pura,
// testada em node (testes/territorio/); a vista (index.js) só desenha o que sai daqui.
import { forcaLocal, pesoNaVotacao } from '../../nucleo/medidas.js';
import { numero } from '../../nucleo/formato.js';

/**
 * O ranking completo de um cargo num território.
 *   arquivo: o município ou o local decodificado ({ ranking: { 5, 6 }, legendas }), em ordem de votos
 *   uf: o arquivo da UF decodificado (dá nome às linhas)
 *   concorrentes: votos concorrentes do cargo no território (do arquivo da UF), o denominador da força local
 *   eleitos: os eleitos da UF no cargo, do índice (a situação de eleito só está nele)
 * -> { cargo, concorrentes, linhas, semVoto }: semVoto são os eleitos sem nenhum voto no território, que não têm linha
 */
export function ranking({ arquivo, uf, cargo, concorrentes, eleitos }) {
  const eleito = new Set(eleitos.map((e) => e.sq));
  const candidatos = arquivo.ranking[cargo].map((r) => {
    const c = uf.candidatos[r.ci];
    return {
      tipo: 'candidato', ci: c.ci, sq: c.sq, numero: c.numero, nome: c.nome, partido: c.partido, marca: c.marca,
      eleito: eleito.has(c.sq), votos: r.votos, forca: forcaLocal(r.votos, concorrentes),
      peso: pesoNaVotacao(r.votos, c.votos),
    };
  });
  const comVoto = new Set(candidatos.map((l) => l.sq));
  // posição entre os candidatos, qualquer que seja a destinação do voto; empate fica com a mesma posição, a melhor
  candidatos.forEach((l, i) => { l.posicao = i && l.votos === candidatos[i - 1].votos ? candidatos[i - 1].posicao : i + 1; });
  // o voto de legenda (só deputado) não tem posição nem peso, mas tem linha, na ordem dos votos
  const legendas = cargo === 6 ? arquivo.legendas.map((r) => {
    const p = uf.legendas[r.pa];
    return { tipo: 'legenda', pa: p.pa, numero: p.numero, sigla: p.sigla, marca: p.marca, votos: r.votos,
      forca: forcaLocal(r.votos, concorrentes), peso: null };
  }) : [];
  return {
    cargo, concorrentes, linhas: intercalar(candidatos, legendas), semVoto: eleitos.filter((e) => !comVoto.has(e.sq)),
  };
}

const CARGOS = [5, 6];

/**
 * Estado da vista a partir do endereço (rota.params): c (5 senador, 6 deputado federal), f=todos ("Todos"; sem ele,
 * "Só eleitos") e todos=1 ("Ver todos", que só vale em "Todos"). Sem cargo, vale o do parlamentar de onde se veio
 * (de), e depois o de deputado federal.
 */
export function lerEstado(params, de) {
  const c = Number(params.c);
  const soEleitos = params.f !== 'todos';
  return { cargo: CARGOS.includes(c) ? c : de?.cargo ?? 6, soEleitos, todas: !soEleitos && params.todos === '1' };
}

/** O contrário de lerEstado: os parâmetros do endereço, só com o que difere do padrão, mais o `de` de `params`. */
export function escreverEstado({ cargo, soEleitos, todas }, params, de) {
  const p = {};
  if (cargo !== (de?.cargo ?? 6)) p.c = String(cargo);
  if (!soEleitos) p.f = 'todos';
  if (!soEleitos && todas) p.todos = '1';
  if (params.de) p.de = params.de;
  return p;
}

/** Linhas do ranking em "Todos" antes de "Ver todos (N)" (#7). */
export const LINHAS = 5;

/**
 * O que o painel mostra do ranking (#7).
 *   soEleitos: "Só eleitos" (o padrão) esconde os não eleitos e as legendas sem mudar posição nem força, e uma linha
 *              soma o que ficou escondido, para a coluna fechar em 100%. Os eleitos aparecem todos.
 *   todas:     em "Todos", depois de "Ver todos"; antes, só as LINHAS primeiras
 * -> { linhas, outros: { candidatos, legendas, votos, forca } | null, verTodos: N linhas | null }
 */
export function mostrar(r, { soEleitos, todas = false }) {
  if (!soEleitos) {
    const corta = !todas && r.linhas.length > LINHAS;
    return { linhas: corta ? r.linhas.slice(0, LINHAS) : r.linhas, outros: null, verTodos: corta ? r.linhas.length : null };
  }
  const resto = r.linhas.filter((l) => !l.eleito);
  const votos = resto.reduce((s, l) => s + l.votos, 0);
  const candidatos = resto.filter((l) => l.tipo === 'candidato').length;
  const outros = resto.length
    ? { candidatos, legendas: resto.length - candidatos, votos, forca: forcaLocal(votos, r.concorrentes) }
    : null;
  return { linhas: r.linhas.filter((l) => l.eleito), outros, verTodos: null };
}

/** "Outros 3 candidatos e 2 legendas", "Outro candidato e 1 legenda", "Outros 12 candidatos", "As 2 legendas". */
export function rotuloOutros({ candidatos, legendas }) {
  const leg = legendas === 1 ? '1 legenda' : `${numero(legendas)} legendas`;
  if (!candidatos) return `As ${leg}`;
  const cand = candidatos === 1 ? 'Outro candidato' : `Outros ${numero(candidatos)} candidatos`;
  return legendas ? `${cand} e ${leg}` : cand;
}

/** Junta duas listas já em ordem decrescente de votos; no empate, a primeira vem antes. */
function intercalar(a, b) {
  const r = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) r.push(j >= b.length || (i < a.length && a[i].votos >= b[j].votos) ? a[i++] : b[j++]);
  return r;
}
