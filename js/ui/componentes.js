// Peças de interface que mais de uma vista usa.
import { h } from './html.js';
import { escreverRota } from '../nucleo/rotas.js';
import { nomeProprio } from '../nucleo/texto.js';
import { numero, cargoDe, trajetoriaDe } from '../nucleo/formato.js';

const TITULOS = new Set(['DR.', 'DRA.', 'DR', 'DRA', 'PROF.', 'PROFESSOR', 'PROFESSORA', 'DELEGADO', 'DELEGADA',
  'CORONEL', 'CAPITÃO', 'SARGENTO', 'PASTOR', 'PASTORA', 'GENERAL', 'MAJOR', 'CABO', 'SOLDADO']);
const PARTICULAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'O', 'A']);

/** Iniciais do nome de urna, sem título nem partícula: "DR. FÁBIO RUEDA" -> "FR". */
export function iniciais(nome) {
  const p = nome.split(/\s+/).filter((x) => !PARTICULAS.has(x));
  const sem = p.filter((x) => !TITULOS.has(x));
  const usa = sem.length ? sem : p;
  return (usa.length > 1 ? usa[0][0] + usa[usa.length - 1][0] : usa[0].slice(0, 2)).toUpperCase();
}

// a pasta das fotos do TSE na versão dos dados (dados/<versão>/foto/), que o principal.js passa ao saber a versão
let pastaDasFotos = null;
/** Diz onde estão as fotos do TSE (#19): `dados/<versão>/foto/`. */
export function usarFotos(pasta) { pastaDasFotos = pasta; }
/** A foto do TSE de um eleito (161 x 225 px, ~6 KB), ou null antes de usarFotos. */
export const urlDaFoto = (e) => (pastaDasFotos ? `${pastaDasFotos}${e.sq}.jpg` : null);

/**
 * Foto do eleito: a do TSE para todos (#11), por cima das iniciais, que aparecem enquanto ela carrega ou se ela não
 * vier. O endereço fica em data-foto até a linha chegar perto da parte visível (carregarFotosVisiveis).
 */
export const foto = (e, classe = '') => h`<span class="foto ${classe}" aria-hidden="true">${iniciais(e.nome)}${urlDaFoto(e)
  ? h`<img data-foto="${urlDaFoto(e)}" alt="" decoding="async" width="161" height="225">` : ''}</span>`;

/**
 * Pede cada foto (img[data-foto]) só quando ela chega a 150 px da parte visível da lista. As 72 fotos da entrada de
 * SP somam 420 KB; com loading="lazy", o Chrome pede 28 no computador (e mais em conexão lenta), e a entrada ficaria
 * no limite dos 300 KB por clique do #9. Com um MutationObserver, vigia também o que as vistas escreverem depois.
 */
export function carregarFotosVisiveis(raiz, { IntersectionObserver = globalThis.IntersectionObserver,
  MutationObserver = undefined, margem = '150px 0px' } = {}) {
  const vistas = new WeakSet();
  const io = new IntersectionObserver((entradas) => {
    for (const { target: img, isIntersecting } of entradas) {
      if (!isIntersecting) continue;
      img.src = img.dataset.foto;
      img.removeAttribute('data-foto');
      io.unobserve(img);
    }
  }, { rootMargin: margem, scrollMargin: margem });
  const fotosEm = (no) => (no.matches?.('img[data-foto]') ? [no] : no.querySelectorAll?.('img[data-foto]') ?? []);
  function olhar(no) {
    for (const img of fotosEm(no)) {
      if (vistas.has(img)) continue;
      vistas.add(img);
      io.observe(img);
    }
  }
  olhar(raiz);
  if (MutationObserver) {
    new MutationObserver((mudancas) => {
      for (const m of mudancas) {
        for (const n of m.addedNodes) if (n.nodeType === 1) olhar(n);
        // a vista que se redesenha tira as fotos que ainda não apareceram: o vigia as solta
        for (const n of m.removedNodes) if (n.nodeType === 1) for (const img of fotosEm(n)) io.unobserve(img);
      }
    }).observe(raiz, { childList: true, subtree: true });
  }
  return { olhar };
}

export const href = (rota) => escreverRota(rota);
export const rotaDoParlamentar = (e) => ({ vista: 'parlamentar', sq: e.sq, aba: 'mapa', params: {} });

/** Selo da trajetória no cargo nas listas: só "novato" e "já exerceu"; o reeleito, a maioria, fica sem selo. */
export const seloTrajetoria = (e) => (e.trajetoria === 'reeleito' ? '' : h`<span class="selo">${trajetoriaDe(e)}</span>`);

/** O texto completo do registro sob recurso (#10): na dica da marca e na aba Ficha. */
export const TEXTO_RECURSO = 'O registro foi aceito, mas há recurso pendente na Justiça Eleitoral. Os votos contam '
  + 'normalmente. Se o registro for negado, o resultado pode mudar.';

/** Marca do registro sob recurso (#10), com o texto completo na dica. */
export const marcaRecurso = (e) => (e.recurso
  ? h`<span class="selo selo-recurso" title="${TEXTO_RECURSO}">Registro sob recurso</span>`
  : '');

/** Uma linha da lista dos eleitos: foto, nome, partido e votos, selo. `extra`: texto a mais na segunda linha. */
export function linhaEleito(e, { extra = '', comCargo = false } = {}) {
  const sub = [comCargo ? cargoDe(e) : '', e.partido, `${numero(e.votos)} votos`, extra].filter(Boolean).join(' · ');
  return h`<li><a class="eleito" href="${href(rotaDoParlamentar(e))}">${foto(e)}
    <span class="eleito-nome">${nomeProprio(e.nome)}</span><span class="eleito-sub">${sub}</span>
    <span class="eleito-selos">${seloTrajetoria(e)}</span></a></li>`;
}
