// Partida do site: carrega o índice e a malha, monta o painel e o mapa e abre a vista que o endereço pede.
// O mapa é opcional para o painel: se ele não abrir (sem WebGL 2, CDN fora), busca e listas seguem funcionando.
import { NOME_DO_SITE, DADOS, MALHA, MAPA_BASE, TEMPO_MAPA_BASE } from './config.js';
import { criarDados } from './dados.js';
import { criarBusca } from './nucleo/busca.js';
import { lerRota, escreverRota, vistaDe, trilha } from './nucleo/rotas.js';
import { UFS } from './nucleo/ufs.js';
import { dataBR } from './nucleo/formato.js';
import { h } from './ui/html.js';
import { montarBusca } from './ui/caixa-busca.js';
import { usarFotos, carregarFotosVisiveis } from './ui/componentes.js';
import { semMapa } from './mapa/sem-mapa.js';
import { VISTAS } from './vistas/registro.js';

const $ = (s) => document.querySelector(s);
const conteudo = $('#conteudo');
for (const el of document.querySelectorAll('[data-nome-do-site]')) el.textContent = NOME_DO_SITE;
document.title = NOME_DO_SITE;

const dados = criarDados({ dados: DADOS, malha: MALHA });
// o mapa (MapLibre, a maior parte da primeira visita) e a malha baixam junto com o índice, sem esperar o painel
const pMalha = dados.malha();
const pModuloMapa = import('./mapa/mapa.js');
pMalha.catch(() => {});
pModuloMapa.catch(() => {});
// A vista do endereço, a folha de estilo dela e, num endereço de território ou de parlamentar, os arquivos dela também
// baixam junto com o índice, e não depois dele: no "Fast 3G", são voltas de rede a menos (#33). O import() e dados.js
// guardam o que chegou, e abrir() pega pronto; um pedido que falhar é refeito pela vista.
const estilos = new Map();
const rotaInicial = lerRota(location.hash);
const vistaInicial = VISTAS[rotaInicial.vista];
vistaInicial?.modulo().catch(() => {});
// a parte "Quem cobrar" do município (#43) é um módulo à parte, que o território só pede quando ela abre
if (rotaInicial.vista === 'territorio' && rotaInicial.params?.aba === 'cobrar') import('./vistas/territorio/cobranca.js').catch(() => {});
for (const href of vistaInicial?.estilos ?? []) carregarEstilo(href);
for (const p of arquivosDaRota(rotaInicial)) p.catch(() => {});

function arquivosDaRota(r) {
  if (r.vista === 'territorio' && r.m) {
    return [dados.uf(r.uf), r.l ? dados.local(r.m, r.l.zona, r.l.numero) : dados.municipio(r.m)];
  }
  return r.vista === 'parlamentar' ? [dados.parlamentar(r.sq)] : [];
}

let indice;
try {
  indice = await dados.indice();
} catch (erro) {
  conteudo.innerHTML = String(h`<div class="aviso-erro"><h1 class="titulo">Os dados não carregaram</h1>
    <p>${erro.message}. Confira a conexão e recarregue a página.</p></div>`);
  throw erro;
}
// as fotos do TSE ficam na versão dos dados (#19), ao lado da ficha, e cada uma só é pedida perto da tela
usarFotos(`${DADOS}${await dados.versao()}/foto/`);
if ('IntersectionObserver' in window) carregarFotosVisiveis(document.body, { MutationObserver });

const ctx = {
  indice, dados, busca: criarBusca(indice), mapa: semMapa(), conteudo,
  href: escreverRota,
  /** Diz um texto curto ao leitor de tela pela região de status fixa do painel (#anuncio), que as vistas não redesenham. */
  anunciar(texto) {
    const el = $('#anuncio');
    // limpa antes, para o mesmo texto ser lido de novo
    el.textContent = '';
    setTimeout(() => { el.textContent = texto; }, 100);
  },
  navegar(rota, { substituir = false } = {}) {
    const hash = escreverRota(rota);
    if (substituir) { history.replaceState(null, '', hash); abrir(); } else location.hash = hash;
  },
};

// para depurar no console: __site.mapa.map é a instância da MapLibre, __site.indice o índice decodificado
globalThis.__site = ctx;

$('#rodape').innerHTML = String(h`<p>Resultado oficial do TSE, totalizado até ${dataBR(indice.foto)}. Ainda pode mudar por
  decisão da Justiça Eleitoral. <a href="${escreverRota({ vista: 'como-funciona', secao: null })}">Como funciona</a></p>
  <p>Feito por Matheus Dalmolin · <a href="https://dalmolin.dev/" target="_blank" rel="noopener">dalmolin.dev</a></p>`);

montarBusca($('#busca'), {
  busca: ctx.busca,
  navegar: (r) => ctx.navegar(r),
  rotaDaLista: (q) => {
    const atual = lerRota(location.hash);
    return { vista: 'eleitos', params: { ...(atual.vista === 'eleitos' ? atual.params : {}), q } };
  },
});

// ---------- vistas ----------
let aberta = {}, anterior = null, vez = 0, mapaPronto = false, pintou = false;

// uma promessa por folha: a vista espera a folha que a partida já pediu chegar, e não só ser pedida
function carregarEstilo(href) {
  if (!estilos.has(href)) {
    estilos.set(href, new Promise((ok) => {
      const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
      l.dataset.vista = href;
      l.onload = l.onerror = ok;
      document.head.append(l);
    }));
  }
  return estilos.get(href);
}

function pintarMapa() {
  if (!mapaPronto || !aberta.mapa) return;
  aberta.mapa(ctx.mapa, { animar: pintou });
  pintou = true;
}

function nomesDaTrilha(rota) {
  return {
    uf: rota.vista === 'parlamentar' ? indice.eleitosPorSq.get(rota.sq)?.uf : rota.uf,
    municipio: rota.m ? indice.municipiosPorIbge.get(rota.m)?.nome : null,
    local: aberta.local ?? null,
  };
}

function desenharTrilha(rota) {
  const passos = trilha(rota, nomesDaTrilha(rota));
  const sair = rota.vista === 'parlamentar' && indice.eleitosPorSq.get(rota.sq);
  $('#trilha').innerHTML = String(h`<ol>${passos.map((p) => h`<li>${p.rota
    ? h`<a href="${escreverRota(p.rota)}">${p.rotulo}</a>` : h`<span aria-current="page">${p.rotulo}</span>`}</li>`)}</ol>`);
  if (sair) {
    // fechar o parlamentar leva à entrada da UF dele
    $('#trilha').insertAdjacentHTML('afterbegin', String(h`<a class="trilha-sair" href="${escreverRota({ vista: 'uf', uf: sair.uf })}"
      aria-label="Fechar o parlamentar">✕</a>`));
  }
}

async function abrir() {
  const rota = lerRota(location.hash);
  const nome = vistaDe(rota, indice);
  const minha = ++vez;
  const def = VISTAS[nome] ?? VISTAS['nao-encontrado'];
  try { aberta.fechar?.(); } catch (e) { console.error(e); }
  aberta = {};
  const [mod] = await Promise.all([def.modulo(), ...(def.estilos ?? []).map(carregarEstilo)]);
  if (minha !== vez) return;
  let resultado;
  try {
    resultado = (await mod.abrir(ctx, rota, anterior)) ?? {};
  } catch (erro) {
    console.error(erro);
    conteudo.innerHTML = String(h`<div class="aviso-erro"><h1 class="titulo">Esta parte não carregou</h1><p>${erro.message}.</p>
      <p><a href="#/">Voltar para a entrada</a></p></div>`);
    resultado = {};
  }
  if (minha !== vez) return;
  aberta = resultado;
  document.title = aberta.titulo ? `${aberta.titulo} · ${NOME_DO_SITE}` : NOME_DO_SITE;
  // o aviso de quem deixou de ser eleito fica na trilha da UF dele; o "não encontrado", na da entrada
  desenharTrilha(nome === 'aviso' ? { vista: 'uf', uf: indice.exPorSq.get(rota.sq).uf }
    : nome === 'nao-encontrado' ? { vista: 'inicio' } : rota);
  const mudouDeLugar = !anterior || escreverRota({ ...anterior, params: {} }) !== escreverRota({ ...rota, params: {} });
  if (mudouDeLugar) {
    conteudo.scrollTop = 0;
    if (!matchMedia('(min-width: 900px)').matches && anterior) window.scrollTo({ top: 0 });
  }
  anterior = rota;
  pintarMapa();
}

window.addEventListener('hashchange', abrir);
await abrir();

// ---------- mapa ----------
function dicaPadrao(alvo) {
  if (alvo.li !== undefined) {
    return h`<b>Local de votação</b><br>${indice.municipiosPorIbge.get(alvo.m)?.nome} · zona ${alvo.zona}`;
  }
  if (alvo.m) return h`<b>${indice.municipiosPorIbge.get(alvo.m)?.nome ?? alvo.m}</b><br>${UFS.get(alvo.uf)?.nome}`;
  return h`<b>${UFS.get(alvo.uf)?.nome}</b>`;
}
function cliquePadrao(alvo) {
  if (alvo.li !== undefined) return { vista: 'territorio', uf: alvo.uf, m: alvo.m, l: { zona: alvo.zona, numero: alvo.numero }, params: {} };
  if (alvo.m) return { vista: 'territorio', uf: alvo.uf, m: alvo.m, params: {} };
  return { vista: 'uf', uf: alvo.uf };
}

try {
  const [{ criarMapa }, malha] = await Promise.all([pModuloMapa, pMalha]);
  const caixa = $('#camadas');
  const semRuas = () => {
    const cb = caixa.querySelector('[data-camada="ruas"]');
    cb.checked = false; cb.disabled = true;
    cb.parentElement.title = 'O mapa base não respondeu agora';
  };
  ctx.mapa = await criarMapa($('#mapa'), {
    malha, malhaUF: dados.malhaUF, mapaBase: MAPA_BASE, tempoMapaBase: TEMPO_MAPA_BASE, aoFalharMapaBase: semRuas,
  });
  ctx.mapa.definirInteracao({
    dica: (alvo) => aberta.dica?.(alvo) ?? dicaPadrao(alvo),
    aoClicar: (alvo) => {
      if (!alvo) return;
      const r = aberta.aoClicarNoMapa ? aberta.aoClicarNoMapa(alvo) : undefined;
      const destino = r === undefined ? cliquePadrao(alvo) : r;
      if (destino) ctx.navegar(destino);
    },
  });
  caixa.hidden = false;
  caixa.open = matchMedia('(min-width: 900px)').matches; // no celular, fechada para não cobrir o mapa
  if (!ctx.mapa.temMapaBase) semRuas();
  for (const cb of caixa.querySelectorAll('input')) {
    cb.addEventListener('change', () => ctx.mapa.camadas({ [cb.dataset.camada]: cb.checked }));
  }
  mapaPronto = true;
  pintarMapa();
} catch (erro) {
  console.error(erro);
  $('#mapa').classList.add('mapa-sem');
  $('#mapa').innerHTML = String(h`<p>O mapa não abriu neste navegador (${erro.message ?? erro}). A busca e as listas
    funcionam sem ele.</p>`);
}
