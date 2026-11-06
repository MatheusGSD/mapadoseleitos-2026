// Filtros da lista dos eleitos (#6). Combinam-se com E entre critérios e OU dentro de um critério, e o estado vai no
// endereço: cada critério é um parâmetro, com os valores separados por vírgula (?partido=pt,pl&genero=feminino).
// O valor é o do TSE sem acento nem caixa ("ensino-medio-completo"); o rótulo, o do TSE para leitura.
import { capitalizar, slug } from './texto.js';

/** Dia da posse: a idade dos filtros e da ordenação é a desta data (#6). */
export const POSSE = '2027-02-01';

export function idadeNaPosse(nascimento) {
  const [a, m, d] = nascimento.split('-').map(Number);
  const [pa, pm, pd] = POSSE.split('-').map(Number);
  return pa - a - (pm < m || (pm === m && pd < d) ? 1 : 0);
}

const FAIXAS = [['ate-34', 'Até 34 anos', 34], ['35-49', '35 a 49', 49], ['50-64', '50 a 64', 64], ['65-ou-mais', '65 ou mais', Infinity]];
export function faixaEtaria(nascimento) {
  const i = idadeNaPosse(nascimento);
  return FAIXAS.find(([, , ate]) => i <= ate)[0];
}

const ordemFixa = (...valores) => valores.map((v) => ({ valor: slug(v), rotulo: capitalizar(v) }));

// chave (o parâmetro do endereço), rótulo, valor do eleito e, quando o critério tem, a ordem das opções.
// `todas`: as opções aparecem mesmo sem eleito; senão, só as que algum eleito tem.
export const CRITERIOS = [
  { chave: 'uf', rotulo: 'UF', valor: (e) => slug(e.uf), rotuloDe: (e) => e.uf },
  {
    chave: 'cargo', rotulo: 'Cargo', valor: (e) => (e.cargo === 5 ? 'senador' : 'deputado-federal'), todas: true,
    ordem: [{ valor: 'senador', rotulo: 'Senador' }, { valor: 'deputado-federal', rotulo: 'Deputado federal' }],
  },
  { chave: 'partido', rotulo: 'Partido na eleição', valor: (e) => slug(e.partido), rotuloDe: (e) => e.partido },
  {
    chave: 'genero', rotulo: 'Gênero', nota: 'autodeclarado ao TSE', valor: (e) => slug(e.genero),
    rotuloDe: (e) => capitalizar(e.genero), ordem: ordemFixa('FEMININO', 'MASCULINO'),
  },
  {
    chave: 'cor', rotulo: 'Raça/cor', nota: 'autodeclarada ao TSE', valor: (e) => slug(e.cor),
    rotuloDe: (e) => capitalizar(e.cor), ordem: ordemFixa('BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDÍGENA'),
  },
  {
    chave: 'escolaridade', rotulo: 'Escolaridade', valor: (e) => slug(e.escolaridade),
    rotuloDe: (e) => capitalizar(e.escolaridade),
    ordem: ordemFixa('LÊ E ESCREVE', 'ENSINO FUNDAMENTAL INCOMPLETO', 'ENSINO FUNDAMENTAL COMPLETO',
      'ENSINO MÉDIO INCOMPLETO', 'ENSINO MÉDIO COMPLETO', 'SUPERIOR INCOMPLETO', 'SUPERIOR COMPLETO'),
  },
  {
    chave: 'idade', rotulo: 'Idade na posse', valor: (e) => faixaEtaria(e.nascimento), todas: true,
    ordem: FAIXAS.map(([valor, rotulo]) => ({ valor, rotulo })),
  },
  {
    chave: 'trajetoria', rotulo: 'Trajetória no cargo', valor: (e) => e.trajetoria, todas: true,
    ordem: [{ valor: 'reeleito', rotulo: 'Reeleito' }, { valor: 'ja-exerceu', rotulo: 'Já exerceu o cargo' },
      { valor: 'novato', rotulo: 'Novato' }],
  },
];
const POR_CHAVE = new Map(CRITERIOS.map((c) => [c.chave, c]));

/** Filtros a partir dos parâmetros do endereço: Map(chave -> Set de valores). Parâmetro que não é critério fica fora. */
export function lerFiltros(params) {
  const f = new Map();
  for (const { chave } of CRITERIOS) {
    const valores = String(params?.[chave] ?? '').split(',').map(slug).filter(Boolean);
    if (valores.length) f.set(chave, new Set(valores));
  }
  return f;
}

/** Parâmetros do endereço a partir dos filtros: { chave: 'a,b' }, na ordem dos critérios. */
export function escreverFiltros(f) {
  const p = {};
  for (const { chave } of CRITERIOS) if (f.get(chave)?.size) p[chave] = [...f.get(chave)].join(',');
  return p;
}

function passa(e, f, exceto) {
  for (const [chave, valores] of f) if (chave !== exceto && !valores.has(POR_CHAVE.get(chave).valor(e))) return false;
  return true;
}

/** Os eleitos que passam em todos os critérios (E) e, em cada um, em algum dos valores (OU). */
export const filtrar = (eleitos, f) => eleitos.filter((e) => passa(e, f));

/** Quantos eleitos cada opção daria: conta com os outros critérios, mas não com o do próprio. */
export function contar(eleitos, f) {
  const r = new Map(CRITERIOS.map((c) => [c.chave, new Map()]));
  for (const e of eleitos) {
    for (const c of CRITERIOS) {
      if (!passa(e, f, c.chave)) continue;
      const m = r.get(c.chave), v = c.valor(e);
      m.set(v, (m.get(v) || 0) + 1);
    }
  }
  return r;
}

/** Liga ou desliga um valor de um critério; devolve filtros novos. */
export function alternar(f, chave, valor) {
  const novo = new Map([...f].map(([k, v]) => [k, new Set(v)]));
  const s = novo.get(chave) || new Set();
  if (s.has(valor)) s.delete(valor); else s.add(valor);
  if (s.size) novo.set(chave, s); else novo.delete(chave);
  return novo;
}

/** As opções de um critério: [{ valor, rotulo }], na ordem do critério (ou alfabética). */
export function opcoes(eleitos, chave) {
  const c = POR_CHAVE.get(chave);
  if (c.todas) return c.ordem;
  const achados = new Map();
  for (const e of eleitos) achados.set(c.valor(e), c.rotuloDe(e));
  const ordem = c.ordem?.map((o) => o.valor) ?? [...achados.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const resto = [...achados.keys()].filter((v) => !ordem.includes(v)).sort();
  return [...ordem, ...resto].filter((v) => achados.has(v)).map((valor) => ({ valor, rotulo: achados.get(valor) }));
}
