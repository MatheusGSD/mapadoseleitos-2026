// O que a aba Ficha diz de um eleito (#11), sem DOM: sai do arquivo `ficha` (f/<sq>.json; pipeline/publica.py
// documenta os campos) e da linha dele no índice, que já traz nome completo, partido, federação, gênero, cor/raça,
// escolaridade, nascimento e o registro sob recurso. A aba (aba-ficha.js) só escreve o HTML.
import { numero, dataBR } from '../../nucleo/formato.js';
import { nomeProprio, capitalizar } from '../../nucleo/texto.js';
import { idadeNaPosse } from '../../nucleo/filtros.js';
import { TEXTO_RECURSO } from '../../ui/componentes.js';

/** Quantos projetos a ficha mostra antes do "Ver todos" (#11). */
export const RECENTES = 5;

const ela = (e) => e.genero === 'FEMININO';
const plural = (n, um, varios) => (n === 1 ? um : varios);

/** A ficha de um eleito: `e` é a linha do índice; `f`, o arquivo f/<sq>.json; `todos`, a lista inteira de projetos. */
export function fichaDe(e, f, { todos = false } = {}) {
  const p = projetos(e, f, todos);
  const bio = biografia(f.bio);
  return {
    recurso: e.recurso ? TEXTO_RECURSO : null,
    biografia: bio,
    projetos: p,
    tse: tse(e, f),
    bens: bens(e, f.bens),
    candidaturas: candidaturas(e, f.cand, { aberta: Boolean(p.semProjeto) }),
    links: [
      f.id.camara && { rotulo: 'Página na Câmara dos Deputados', url: `https://www.camara.leg.br/deputados/${f.id.camara}` },
      f.id.senado && { rotulo: 'Página no Senado', url: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${f.id.senado}` },
      { rotulo: 'Candidatura no TSE', url: f.tse },
      bio.url && { rotulo: 'Artigo na Wikipédia', url: bio.url },
    ].filter(Boolean),
  };
}

// ---------------------------------------------------------------- biografia (primeiro parágrafo da Wikipédia, #11)

const SEM_TRECHO = 'Sem trecho da Wikipédia. A ficha só traz o primeiro parágrafo de um artigo quando ele está ligado com '
  + 'segurança a esta pessoa.';

// Sem ligação segura ao artigo não há trecho, e a nota é a mesma para todos. Com ligação, o trecho sai como está no
// artigo, também quando traz o nome de registro de quem usa nome social (mudança do #11 em 27/10/2026).
function biografia(bio) {
  if (!bio) return { texto: null, titulo: null, url: null, captura: null, semTrecho: SEM_TRECHO };
  return {
    texto: bio.t, titulo: bio.a.replaceAll('_', ' '),
    url: `https://pt.wikipedia.org/wiki/${encodeURIComponent(bio.a).replaceAll('%2F', '/')}`,
    captura: `Trecho capturado em ${dataBR(bio.d)}`, semTrecho: null,
  };
}

// ---------------------------------------------------------------- projetos (PL, PLP, PDL e PEC de primeiro autor, #11)

const CASA = { c: 'Câmara', s: 'Senado' };
const PAGINA = {
  c: (id) => `https://www.camara.leg.br/propostas-legislativas/${id}`,
  s: (id) => `https://www25.senado.leg.br/web/atividade/materias/-/materia/${id}`,
};

function projetos(e, f, todos) {
  const p = f.proj;
  const [naCamara, noSenado] = p.n;
  const total = naCamara + noSenado;
  const varios = total > RECENTES;
  // a lista vem do mais recente; a sigla é a da Casa (PLS e PDS no Senado, #19) e o número pode ter letra ("213A")
  const itens = (todos ? p.i : p.i.slice(0, RECENTES)).map(([casa, id, sigla, num, ano, data, ementa, norma]) => ({
    rotulo: `${sigla} ${num}/${ano}`, casa: CASA[casa], data: dataBR(data), ementa, norma: norma === 1, url: PAGINA[casa](id),
  }));
  const outros = total ? plural(p.co, ' outro projeto', ` outros ${numero(p.co)} projetos`)
    : ` ${numero(p.co)} ${plural(p.co, 'projeto', 'projetos')}`;
  return {
    semProjeto: total ? null : semProjeto(e, p.co),
    resumo: total ? resumo(naCamara, noSenado, p.i.at(-1)[5].slice(0, 4)) : null,
    nota: 'Projetos de lei (PL e PLP), de decreto legislativo (PDL) e propostas de emenda à Constituição (PEC) de que é '
      + `${ela(e) ? 'primeira autora' : 'primeiro autor'}.`,
    normas: p.norma ? `${numero(p.norma)} ${plural(p.norma, 'virou norma', 'viraram norma')}` : null,
    coautor: p.co ? `${ela(e) ? 'Coautora' : 'Coautor'} de${outros}` : null,
    itens,
    verTodos: varios && !todos ? `Ver todos os ${numero(total)}` : null,
    verMenos: varios && todos ? `Ver só os ${RECENTES} mais recentes` : null,
    captura: `Projetos até ${dataBR(p.d)}`,
    // as proposições de todos os tipos e papéis, nas páginas das Casas
    links: [
      f.id.camara && { rotulo: 'Todas as proposições na Câmara', url: 'https://www.camara.leg.br/busca-portal?contextoBusca='
        + `BuscaProposicoes&pagina=1&order=data&abaEspecifica=true&q=${encodeURIComponent(`autores.ideCadastro: ${f.id.camara}`)}` },
      f.id.senado && { rotulo: 'Todas as proposições no Senado',
        url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/autor/${f.id.senado}/p/1` },
    ].filter(Boolean),
  };
}

// A frase de quem não tem projeto em nenhuma das Casas (#11). Quem é coautor de algum (3 reeleitos em 2026) não
// pode ler que não apresentou nada: a frase diz "como primeiro autor", e a coautoria vem logo abaixo.
function semProjeto(e, co) {
  const autor = co ? ` como ${ela(e) ? 'primeira autora' : 'primeiro autor'}` : '';
  return `${nomeProprio(e.nome)} ainda não apresentou projetos no Congresso${autor}. Toma posse em 1º de fevereiro de 2027.`;
}

// "8 projetos na Câmara desde 2019", "1 projeto no Senado, em 2025", "3 projetos desde 2011: 1 na Câmara; 2 no Senado"
function resumo(naCamara, noSenado, desde) {
  const total = naCamara + noSenado;
  const quantos = `${numero(total)} ${plural(total, 'projeto', 'projetos')}`;
  const quando = total === 1 ? `, em ${desde}` : ` desde ${desde}`;
  if (naCamara && noSenado) return `${quantos}${quando}: ${numero(naCamara)} na Câmara; ${numero(noSenado)} no Senado`;
  return `${quantos} ${naCamara ? 'na Câmara' : 'no Senado'}${quando}`;
}

// ---------------------------------------------------------------- dados do TSE (#11)

/** "PT, em federação com PC do B e PV". A federação vem no índice como "13-PT/65-PC do B/43-PV". */
function partido(e) {
  if (!e.federacao) return e.partido;
  const outros = e.federacao.split('/').map((p) => p.replace(/^\d+-/, '')).filter((p) => p !== e.partido);
  const lista = outros.length > 1 ? `${outros.slice(0, -1).join(', ')} e ${outros.at(-1)}` : outros[0];
  return `${e.partido}, em federação com ${lista}`;
}

function tse(e, f) {
  const [cidade, uf] = f.nat;
  return [
    ['Nome completo', nomeProprio(e.civil)],
    ['Partido na eleição', partido(e)],
    ['Idade na posse', `${idadeNaPosse(e.nascimento)} anos`],
    ['Nascimento', `${dataBR(e.nascimento)}, em ${cidade} (${uf})`],
    ['Ocupação declarada ao TSE', capitalizar(f.ocup)],
    ['Escolaridade', capitalizar(e.escolaridade)],
    ['Gênero', capitalizar(e.genero)],
    ['Cor ou raça', capitalizar(e.cor)],
  ];
}

// ---------------------------------------------------------------- bens declarados (só tipo e valor, #19)

const REAIS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Centavos -> "R$ 1.500,00", com espaço que não quebra. */
export const reais = (centavos) => `R$ ${REAIS.format(centavos / 100)}`;

// na ordem da declaração: nada ordena nem compara bens (#11)
function bens(e, b) {
  if (!b) return { resumo: 'Não declarou bens', itens: [], ressalva: null };
  const [total, itens] = b;
  return {
    resumo: `${reais(total)} em ${numero(itens.length)} ${plural(itens.length, 'item', 'itens')}`,
    itens: itens.map(([tipo, valor]) => ({ tipo, valor: reais(valor) })),
    ressalva: `Valores declarados ${ela(e) ? 'pela candidata' : 'pelo candidato'}, os mesmos do Imposto de Renda, que em `
      + 'geral registra o preço de compra, e não o valor atual.',
  };
}

// ---------------------------------------------------------------- candidaturas anteriores (histórico do TSE, #11)

const MUNICIPAL = /^(prefeito|vice-prefeito|vereador)$/i;
const FEMININO = { deputado: 'deputada', prefeito: 'prefeita', vereador: 'vereadora', governador: 'governadora', senador: 'senadora' };
const RESULTADO = { 'eleito por qp': 'eleito por quociente partidário' };

/** "Vice-prefeito" -> "Vice-prefeita"; "1º suplente senador" (ou "1º suplente") -> "1ª suplente de senador". */
function cargoAnterior(cargo, fem) {
  const suplente = /^([12])º suplente( senador)?$/i.exec(cargo);
  if (suplente) return `${suplente[1]}${fem ? 'ª' : 'º'} suplente de senador`;
  if (!fem) return cargo;
  return cargo.replace(/\b(deputado|prefeito|vereador|governador|senador)\b/gi,
    (p) => (p[0] === p[0].toUpperCase() ? FEMININO[p.toLowerCase()].replace(/^./, (l) => l.toUpperCase()) : FEMININO[p]));
}

// o resultado vazio (#NULO no TSE: o vice e o suplente seguem o titular) não aparece
function resultadoAnterior(resultado, fem) {
  if (!resultado) return null;
  const r = RESULTADO[resultado.toLowerCase()] ?? resultado.toLowerCase();
  return fem ? r.replace(/\beleito\b/, 'eleita') : r;
}

function candidaturas(e, lista, { aberta }) {
  const itens = lista.map(([ano, cargo, onde, uf, partido, resultado]) => ({
    ano, cargo: cargoAnterior(cargo, ela(e)), onde: MUNICIPAL.test(cargo) ? `${onde} (${uf})` : onde, partido,
    resultado: resultadoAnterior(resultado, ela(e)),
  }));
  return {
    titulo: itens.length ? `Candidaturas anteriores (${numero(itens.length)})` : 'Candidaturas anteriores', itens, aberta,
    vazio: itens.length ? null : 'Não há candidaturas anteriores no histórico do TSE.',
  };
}
