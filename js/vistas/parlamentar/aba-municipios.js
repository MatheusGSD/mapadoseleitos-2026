// Aba Municípios da vista do parlamentar: ticket #22.
// As listas "Onde teve mais votos" e "Onde foi mais forte", com 10 linhas e "Ver os N municípios" (#7), e a linha
// do núcleo da votação na segunda (#12). Parâmetros no endereço: ord=forca (a segunda lista) e todos=1.
import { h } from '../../ui/html.js';
import { numero, pct } from '../../nucleo/formato.js';
import { naUF } from '../../nucleo/ufs.js';
import { dele, doCargo } from './comum.js';
import { oQueE } from '../../ui/o-que-e.js';

const LINHAS = 10;

export async function abrir(ctx, rota, e, alvo, { votacao: v }) {
  const ord = rota.params.ord === 'forca' ? 'forca' : 'votos';
  const todos = rota.params.todos === '1';
  const lista = ord === 'votos' ? v.maisVotos : v.maisForte;
  const mostra = todos ? lista : lista.slice(0, LINHAS);
  const topo = lista.length ? (ord === 'votos' ? lista[0].votos : lista[0].forca) : 1;
  const nucleo = ord === 'forca' ? v.nucleo.length : 0;
  const ir = (params) => ctx.href({ vista: 'parlamentar', sq: e.sq, m: rota.m, l: rota.l, aba: 'municipios', params });
  const noMapa = (m) => ctx.href({ vista: 'parlamentar', sq: e.sq, m, aba: 'mapa', params: {} });
  const ela = e.genero === 'FEMININO' ? 'ela' : 'ele';

  const linha = (r, i) => h`<li><a class="mun" href="${noMapa(r.ibge)}">
    <span class="mun-pos">${i + 1}</span>
    <span class="mun-nome">${ctx.indice.municipiosPorIbge.get(r.ibge)?.nome}</span>
    <span class="mun-valor">${ord === 'votos' ? numero(r.votos) : pct(r.forca)}</span>
    <span class="mun-sub">${ord === 'votos' ? `força local ${pct(r.forca)} · peso ${pct(r.peso)}`
      : `${numero(r.votos)} ${r.votos === 1 ? 'voto' : 'votos'} · peso ${pct(r.peso)}`}</span>
    <span class="barra" aria-hidden="true"><i style="width: ${((100 * (ord === 'votos' ? r.votos : r.forca)) / topo).toFixed(1)}%"></i></span>
  </a></li>`;
  const divisoria = h`<li class="divisoria"><span>Até aqui, metade dos votos ${dele(e)}: o núcleo da votação</span></li>`;

  alvo.innerHTML = String(h`
    <div class="segmentado" role="group" aria-label="Ordem dos municípios">
      <a href="${ir({})}" aria-current="${ord === 'votos'}">Onde teve mais votos</a>
      <a href="${ir({ ord: 'forca' })}" aria-current="${ord === 'forca'}">Onde foi mais forte</a>
    </div>
    <p class="nota">${ord === 'votos'
      ? h`Os municípios que mais deram votos a ${ela}. O peso diz quanto da votação ${dele(e)} veio de cada um.
        ${oQueE('peso')}`
      : h`Os municípios que mais votaram ${e.genero === 'FEMININO' ? 'nela' : 'nele'}, em proporção: a força local é a parte
        dos votos concorrentes ${doCargo(e.cargo)} que foi para ${ela}. Não depende do tamanho do município.
        ${oQueE('forca-local')}`}</p>
    <ol class="lista-municipios">${mostra.map((r, i) => (nucleo && i === nucleo - 1 && nucleo < lista.length
      ? [linha(r, i), divisoria] : linha(r, i)))}</ol>
    ${nucleo > mostra.length ? h`<p class="nota nota-nucleo">O núcleo da votação são os ${numero(nucleo)} primeiros desta
      lista: somados, deram metade dos votos ${dele(e)}.</p>` : ''}
    ${todos || lista.length <= LINHAS ? '' : h`<p><a class="botao leve" href="${ir({ ...(ord === 'forca' ? { ord } : {}), todos: '1' })}">Ver os
      ${numero(lista.length)} municípios</a></p>`}
    ${v.contagem.zero ? h`<p class="nota">Em ${numero(v.contagem.zero)} ${v.contagem.zero === 1 ? 'município' : 'municípios'}
      ${naUF(e.uf)}, ${ela} não teve voto.</p>` : ''}
    ${v.municipios.length === 1 ? h`<p class="nota">O Distrito Federal é um município só: não há núcleo da votação. No mapa,
      os círculos dos locais de votação mostram de onde vieram os votos.</p>` : ''}`);
}
