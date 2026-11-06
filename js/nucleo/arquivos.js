// Leitura dos arquivos que o site publica (formato decidido no #9, gerado por pipeline/publica.py, que documenta
// cada campo). Aqui se desfazem os deltas ("Δ") e os índices, e cada linha vira um objeto com nome de campo.
// Os índices valem só dentro da mesma UF e da mesma versão:
//   ci  candidato: posição em uf.candidatos     pa  partido (legenda): posição em uf.legendas
//   mi  município: posição em uf.municipios     li  local de votação: posição em uf.locais

const TRAJETORIA = { R: 'reeleito', J: 'ja-exerceu', N: 'novato' };
const SITUACAO = { 1: 'eleito', 2: 'qp', 3: 'media' };
// destinação do voto (#10): 0 válido, 1 sub judice, 2 anulado
const MARCA = ['valido', 'sub_judice', 'anulado'];
const PB = 10000; // pontos-base: 10.000 = 100%
const COORD = 1e5; // coordenada em 10^-5 grau

/** Soma acumulada: refaz os inteiros guardados como diferença para o anterior. */
export function acumular(deltas) {
  const r = new Array(deltas.length);
  let s = 0;
  for (let i = 0; i < deltas.length; i++) r[i] = s += deltas[i];
  return r;
}

const porCargo = (a5, a6) => ({ 5: a5, 6: a6 });

export function decodificarIndice(j) {
  const eleitos = j.e.map(([sq, uf, cargo, nome, civil, anteriores, partido, federacao, genero, cor, escolaridade,
    nascimento, traj, votos, sit, disp, recurso]) => ({
    sq, uf, cargo, nome, civil, anteriores, partido, federacao: federacao || null, genero, cor, escolaridade,
    nascimento, trajetoria: TRAJETORIA[traj], votos, situacao: SITUACAO[sit], dispersao: disp / PB, recurso: recurso === 1,
  }));
  const ex = j.ex.map(([sq, uf, cargo, nome, totalizacao]) => ({ sq, uf, cargo, nome, totalizacao }));
  const ibges = acumular(j.mun.i);
  const municipios = ibges.map((ibge, i) => ({ ibge, nome: j.mun.n[i], uf: j.mun.uf[Math.floor(ibge / 100000)] }));
  const ufs = new Map(Object.entries(j.uf).map(([uf, [c5, c6, mediana, aguardando]]) => [uf, {
    concorrentes: porCargo(c5, c6), medianaDispersao: mediana / PB, senadoresAguardando: aguardando,
    totalizacao: porCargo(...j.tot[uf]),
  }]));
  return {
    foto: j.foto, ufs, eleitos, ex, municipios,
    eleitosPorSq: new Map(eleitos.map((e) => [e.sq, e])),
    exPorSq: new Map(ex.map((e) => [e.sq, e])),
    municipiosPorIbge: new Map(municipios.map((m) => [m.ibge, m])),
  };
}

export const chaveLocal = (ibge, zona, numero) => `${ibge}-${zona}-${numero}`;

export function decodificarUF(j) {
  const candidatos = j.cand.map(([sq, cargo, numero, nome, partido, marca, votos], ci) =>
    ({ ci, sq, cargo, numero, nome, partido, marca: MARCA[marca], votos }));
  const legendas = j.leg.map(([numero, sigla, marca, votos], pa) => ({ pa, numero, sigla, marca: MARCA[marca], votos }));
  const municipios = acumular(j.mun.i).map((ibge, mi) => ({ mi, ibge, concorrentes: porCargo(j.mun.c5[mi], j.mun.c6[mi]) }));

  const numeros = acumular(j.loc.nr);
  const sem = new Set(acumular(j.loc.sem));
  const xs = acumular(j.loc.x);
  const ys = acumular(j.loc.y);
  const locais = [];
  let p = 0;
  for (const [mi, zona, quantos] of j.loc.z) {
    for (let k = 0; k < quantos; k++) {
      const li = locais.length;
      const ponto = sem.has(li) ? null : [xs[p] / COORD, ys[p++] / COORD];
      locais.push({ li, mi, ibge: municipios[mi].ibge, zona, numero: numeros[li], concorrentes: porCargo(j.loc.c5[li], j.loc.c6[li]), ponto });
    }
  }
  return {
    candidatos, legendas, municipios, locais,
    candidatoPorSq: new Map(candidatos.map((c) => [c.sq, c])),
    municipioPorIbge: new Map(municipios.map((m) => [m.ibge, m])),
    localPorChave: new Map(locais.map((l) => [chaveLocal(l.ibge, l.zona, l.numero), l])),
  };
}

function linhas(colunas, nomes) {
  const [primeira] = colunas;
  return primeira.map((_, i) => Object.fromEntries(nomes.map((n, k) => [n, colunas[k][i]])));
}

export function decodificarParlamentar(j) {
  return {
    municipios: linhas([acumular(j.m[0]), j.m[1], j.m[2]], ['mi', 'votos', 'posicao']),
    locais: linhas([acumular(j.l[0]), j.l[1], j.l[2]], ['li', 'votos', 'posicao']),
  };
}

function rankings(j) {
  return {
    ranking: porCargo(linhas(j.r5, ['ci', 'votos']), linhas(j.r6, ['ci', 'votos'])),
    legendas: linhas(j.l6, ['pa', 'votos']),
  };
}

export function decodificarMunicipio(j) {
  return {
    ...rankings(j),
    locais: j.loc.map(([nome, bairro, endereco, secoes, eleitorado], i) =>
      ({ li: j.l0 + i, nome, bairro, endereco, secoes, eleitorado })),
  };
}

export function decodificarLocal(j) {
  return {
    nome: j.n, endereco: j.end, bairro: j.b, eleitorado: j.a, ...rankings(j), eleitos: j.e,
    secoes: j.s.map(([secao, c5, c6, ...votos]) => ({ secao, concorrentes: porCargo(c5, c6), votos })),
  };
}

/** Caminhos dos arquivos, relativos à pasta dos dados (dados/). */
export function caminhos(versao) {
  return {
    indice: `${versao}/indice.json`,
    uf: (uf) => `${versao}/uf/${uf}.json`,
    parlamentar: (sq) => `${versao}/p/${sq}.json`,
    municipio: (ibge) => `${versao}/m/${ibge}.json`,
    local: (ibge, zona, numero) => `${versao}/l/${chaveLocal(ibge, zona, numero)}.json`,
  };
}
