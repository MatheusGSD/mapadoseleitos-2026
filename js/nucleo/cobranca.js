// A cobrança (#43): quem cobrar num município, em que ordem, e a mensagem pronta para cada um. Lógica pura, testada em
// node (testes/cobranca/); a vista (js/vistas/territorio/cobranca.js) só desenha. Só a cobrança carrega este módulo.
import { pesoNaVotacao } from './medidas.js';
import { numero, pct } from './formato.js';
import { nomeProprio } from './texto.js';

/** Linhas da lista de deputados antes de "Ver todos (N)", como no ranking do território. */
export const LINHAS = 5;
export const ORDENS = { votos: 'Mais votados aqui', peso: 'Mais dependem daqui' };

/**
 * Quem cobrar num município: os deputados federais eleitos com voto ali e os senadores eleitos pela UF (sempre, mesmo
 * sem voto ali), cada um com os votos no município e o peso na votação. Nada ordena entre municípios.
 *   municipio: o arquivo do município decodificado ({ ranking: { 5, 6 } }); uf: o arquivo da UF decodificado
 *   eleitos: os eleitos da UF, do índice; ordem: 'votos' ("Mais votados aqui") ou 'peso' ("Mais dependem daqui")
 * -> { deputados: [{ eleito, votos, peso }], senadores: [...] }
 */
export function quemCobrar({ municipio, uf, eleitos, ordem = 'votos' }) {
  const votosAqui = new Map();
  for (const cargo of [5, 6]) {
    for (const r of municipio.ranking[cargo]) votosAqui.set(uf.candidatos[r.ci].sq, r.votos);
  }
  const linha = (e) => {
    const votos = votosAqui.get(e.sq) ?? 0;
    return { eleito: e, votos, peso: pesoNaVotacao(votos, uf.candidatoPorSq.get(e.sq)?.votos ?? 0) };
  };
  const [a, b] = ordem === 'peso' ? ['peso', 'votos'] : ['votos', 'peso'];
  const ordenar = (xs) => xs.sort((x, y) => y[a] - x[a] || y[b] - x[b] || x.eleito.sq - y.eleito.sq);
  return {
    deputados: ordenar(eleitos.filter((e) => e.cargo === 6).map(linha).filter((l) => l.votos > 0)),
    senadores: ordenar(eleitos.filter((e) => e.cargo === 5).map(linha)),
  };
}

/** As LINHAS primeiras e "Ver todos (N)", ou a lista inteira depois de "Ver todos". */
export function mostrarLista(linhas, todas) {
  const corta = !todas && linhas.length > LINHAS;
  return { linhas: corta ? linhas.slice(0, LINHAS) : linhas, verTodos: corta ? linhas.length : null };
}

/** Estado da cobrança no endereço (#/<UF>/<ibge>?aba=cobrar[&ord=peso][&todos=1]). */
export const lerEstado = (params) => ({ ordem: params.ord === 'peso' ? 'peso' : 'votos', todas: params.todos === '1' });

/** O contrário de lerEstado, só com o que difere do padrão, mais o `de` (de qual parlamentar se veio). */
export function escreverEstado({ ordem, todas }, params) {
  const p = { aba: 'cobrar' };
  if (ordem === 'peso') p.ord = 'peso';
  if (todas) p.todos = '1';
  if (params.de) p.de = params.de;
  return p;
}

const ela = (e) => e.genero === 'FEMININO';
const ele = (e) => e.genero === 'MASCULINO';
const flex = (e, m, f) => (ela(e) ? f : ele(e) ? m : `${m}(a)`);

/** "Deputada", "Senador", ou "Deputado(a)" se o TSE não diz o gênero. */
export const tratamento = (e) => (e.cargo === 5 ? flex(e, 'Senador', 'Senadora') : flex(e, 'Deputado', 'Deputada'));

/**
 * A mensagem para um parlamentar (#43): { assunto, corpo }. O nome de quem escreve fica para a pessoa preencher (o site
 * não pede nem guarda); sem o problema, a mensagem deixa o lugar dele.
 *   eleito (do índice), votos e peso (no município), problema (o texto da caixa), nome (do município), link (dos números)
 */
export function mensagem({ eleito, votos, peso, problema, nome, link }) {
  const senhor = ela(eleito) ? 'a senhora' : ele(eleito) ? 'o senhor' : 'o(a) senhor(a)';
  const onde = votos
    ? `Moro em ${nome}, onde ${senhor} teve ${numero(votos)} ${votos === 1 ? 'voto' : 'votos'} em 2026, ${pct(peso)} da sua votação.`
    : `Moro em ${nome}.`;
  const corpo = [
    `${tratamento(eleito)} ${nomeProprio(eleito.nome)},`, '', onde, '',
    String(problema ?? '').trim() || '[escreva aqui o problema]', '',
    'Peço sua atenção a isso.', '', '[seu nome]', '', `Os números são do TSE: ${link}`,
  ].join('\n');
  return { assunto: `${nome}: um pedido de quem mora aqui`, corpo };
}

/** O e-mail pronto (RFC 6068): assunto e corpo codificados, com as quebras de linha em CRLF. */
export function mailto(email, { assunto, corpo }) {
  const c = (s) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));
  return `mailto:${email}?subject=${c(assunto)}&body=${c(corpo)}`;
}

/** "(61) 3215-5827" -> "tel:+556132155827" */
export const linkDoTelefone = (tel) => `tel:+55${tel.replace(/\D/g, '')}`;

/** O arquivo de contato da UF (c/<UF>.json, pipeline/publica.py): { data, porSq: Map(sq -> { casa, email, tel, redes }) }. */
export function decodificarContatos(j) {
  return {
    data: j.d,
    porSq: new Map(j.e.map(([sq, casa, email, tel, redes]) => [sq, {
      casa: casa || null, email: email || null, tel: tel || null, redes: redes.map(([rede, url]) => ({ rede, url })),
    }])),
  };
}
