// O mapa (#4, #7): MapLibre GL JS 6 com a malha do IBGE; o mapa base do OpenFreeMap é opcional. Este módulo só
// sabe desenhar. O que pintar é de cada vista, pela API de baixo: estado por município e por local
// (feature-state) e a expressão de cor que lê esse estado. Assim a vista do parlamentar (#22) e a do território
// (#23) pintam sem editar este arquivo.
//
// Fontes:   'municipios' (id = código IBGE), 'ufs' (promoteId 'sigla'), 'locais' (id = li, os locais com ponto da UF
//           aberta; propriedade m = código IBGE do município)
// Camadas:  'mun-fill', 'mun-linha', 'uf-fill', 'uf-veu', 'uf-linha', 'mun-hover', 'mun-sel', 'locais', 'locais-sel'
// Estados que o módulo usa: hover, sel e fora (UFs), hover e sel (municípios), sel (locais). As vistas põem os seus
// em pintar*().
//
// Mapa base ("Ruas e nomes"): só a partir do zoom de município (ZOOM_RUAS), como contexto (#4). No Brasil inteiro,
// os tiles do OpenFreeMap passam de 1,7 MB e, com sprite e fontes, dobrariam a primeira visita. O estilo dele só é
// pedido na primeira vez que o mapa chega a esse zoom com a camada ligada.
import * as maplibregl from 'maplibre-gl';
import { ufDoMunicipio } from '../nucleo/ufs.js';

export const COR = {
  // o neutro é um pouco mais escuro que o chão do mapa base, para os municípios se destacarem dele
  fundo: '#eef0ec', municipio: '#e6e8e1', municipioSelecionado: '#cdd5dc', bordaMunicipio: '#ffffff',
  bordaUF: '#59626b', tinta: '#1c2228', local: '#59626b',
};
const sel = ['boolean', ['feature-state', 'sel'], false];
const hover = ['boolean', ['feature-state', 'hover'], false];
export const NEUTRO = {
  municipios: { 'fill-color': ['case', sel, COR.municipioSelecionado, COR.municipio] },
  locais: {
    'circle-color': COR.local,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 3, 14, 6],
  },
};
const VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': COR.fundo } }] };

async function estiloBase(url, tempo) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tempo);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const largo = () => matchMedia('(min-width: 900px)').matches;
// o painel cobre a esquerda do mapa no computador (ver estilo/painel.css)
const folga = () => (largo() ? { left: 450, top: 40, right: 40, bottom: 40 } : { left: 16, top: 16, right: 16, bottom: 28 });

// a partir deste zoom (o de um município), a UF do centro do mapa ganha a malha detalhada (pipeline malha)
const ZOOM_DETALHE = 7;
// a partir deste, o mapa base aparece (Natal inteira fica em ~10,5; o RN inteiro, em ~7,5)
export const ZOOM_RUAS = 8;
// no celular, quanto tempo a atribuição fica aberta antes de se recolher no ⓘ (ms)
const TEMPO_ATRIBUICAO = 5000;
// quanto o toque ou o clique procuram um local de votação em volta de si (px)
const FOLGA_DO_TOQUE = { dedo: 12, mouse: 3 };
// o que a MapLibre escreve nos controles e o leitor de tela lê (#33); sem isto, sai em inglês
const ROTULOS = {
  'Map.Title': 'Mapa', 'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar',
  'AttributionControl.ToggleAttribution': 'Mostrar ou esconder os créditos do mapa', 'Popup.Close': 'Fechar',
};

/**
 * criarMapa(elemento, { malha, malhaUF, mapaBase, tempoMapaBase, aoFalharMapaBase }) -> API do mapa.
 * malha: o que dados.malha() devolve ({ municipios, ufs, caixas }); malhaUF: dados.malhaUF; mapaBase: URL do estilo.
 */
export async function criarMapa(el, { malha, malhaUF, mapaBase, tempoMapaBase = 4000, aoFalharMapaBase }) {
  const map = new maplibregl.Map({
    container: el, style: VAZIO, bounds: malha.caixas.brasil, fitBoundsOptions: { padding: folga() },
    attributionControl: { compact: true }, minZoom: 1.5, maxZoom: 16, dragRotate: false, pitchWithRotate: false,
    touchPitch: false, renderWorldCopies: false, locale: ROTULOS,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  await new Promise((ok, erro) => { map.once('load', ok); map.once('error', (e) => erro(e.error ?? e)); });

  // Atribuição (#33): a MapLibre abre a compacta expandida e só a recolhe no ⓘ quando alguém arrasta o mapa. No
  // celular, com o mapa base, ela ocupa duas linhas e cobre o pé do mapa. Aqui ela se recolhe no primeiro movimento ou
  // depois de TEMPO_ATRIBUICAO parada. Quando o mapa base entra, ela abre de novo, com o crédito do OpenStreetMap.
  const atribuicao = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  const recolherAtribuicao = () => { if (!largo()) atribuicao?.classList.remove('maplibregl-compact-show'); };
  function mostrarAtribuicao() {
    atribuicao?.classList.add('maplibregl-compact-show');
    setTimeout(recolherAtribuicao, TEMPO_ATRIBUICAO);
  }
  map.on('movestart', recolherAtribuicao);
  setTimeout(recolherAtribuicao, TEMPO_ATRIBUICAO);

  const ufs = { ...malha.ufs, features: malha.ufs.features.map((f) => ({ ...f, properties: { sigla: f.id } })) };
  map.addSource('municipios', { type: 'geojson', data: malha.municipios, attribution: 'Malha: IBGE (2025)' });
  map.addSource('ufs', { type: 'geojson', data: ufs, promoteId: 'sigla' });
  map.addSource('locais', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'mun-fill', type: 'fill', source: 'municipios', paint: { ...NEUTRO.municipios } });
  map.addLayer({
    id: 'mun-linha', type: 'line', source: 'municipios',
    paint: { 'line-color': COR.bordaMunicipio, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.1, 6, 0.4, 10, 1.2] },
  });
  map.addLayer({
    id: 'uf-fill', type: 'fill', source: 'ufs',
    paint: { 'fill-color': COR.tinta, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, ['case', hover, 0.09, 0], 6, 0] },
  });
  // véu sobre as UFs fora de foco (focarUF): a UF aberta se destaca das vizinhas, que têm a mesma cor neutra
  map.addLayer({
    id: 'uf-veu', type: 'fill', source: 'ufs',
    paint: { 'fill-color': COR.fundo, 'fill-opacity': ['case', ['boolean', ['feature-state', 'fora'], false], 0.65, 0] },
  });
  map.addLayer({
    id: 'uf-linha', type: 'line', source: 'ufs',
    // some no zoom de município, onde a malha detalhada desenha a borda e a leve não coincide com ela
    paint: {
      'line-color': COR.bordaUF, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 7, 1.4],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 1, 9, 0],
    },
  });
  map.addLayer({ id: 'mun-hover', type: 'line', source: 'municipios', minzoom: 5, paint: { 'line-color': COR.tinta, 'line-width': ['case', hover, 1.5, 0] } });
  // no zoom de rua, o contorno do município (malha a 1%) fica mais leve: ali o foco é o local de votação
  map.addLayer({
    id: 'mun-sel', type: 'line', source: 'municipios',
    paint: {
      'line-color': COR.tinta, 'line-width': ['case', sel, 3, 0],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.35],
    },
  });
  map.addLayer({
    id: 'locais', type: 'circle', source: 'locais',
    paint: {
      ...NEUTRO.locais, 'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 11, 1.2],
    },
  });
  map.addLayer({
    id: 'locais-sel', type: 'circle', source: 'locais',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['case', sel, 5, 0], 14, ['case', sel, 14, 0]],
      'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': COR.tinta, 'circle-stroke-width': ['case', sel, 2.5, 0],
    },
  });

  const camadas = { municipios: true, locais: true, ruas: !!mapaBase };
  const camadasBase = [];
  let base = mapaBase ? 'esperando' : 'sem';
  const visivel = (b) => (b ? 'visible' : 'none');
  function aplicar() {
    map.setLayoutProperty('mun-fill', 'visibility', visivel(camadas.municipios));
    map.setLayoutProperty('locais', 'visibility', visivel(camadas.locais));
    map.setLayoutProperty('locais-sel', 'visibility', visivel(camadas.locais));
    for (const id of camadasBase) map.setLayoutProperty(id, 'visibility', visivel(camadas.ruas));
    const comRuas = camadas.ruas && base === 'pronto';
    // ao aproximar, a área clareia para os círculos dos locais e as ruas aparecerem (#7)
    map.setPaintProperty('mun-fill', 'fill-opacity',
      ['interpolate', ['linear'], ['zoom'], ZOOM_RUAS, comRuas ? 0.85 : 1, 11, camadas.locais ? 0.3 : 0.7]);
    map.setPaintProperty('locais', 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.5, 0.85]);
    map.setPaintProperty('locais', 'circle-stroke-opacity', ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.5, 1]);
  }
  aplicar();

  // o mapa base entra por baixo das nossas camadas, com os rótulos por cima do preenchimento dos municípios
  async function carregarBase() {
    if (base !== 'esperando' || !camadas.ruas || map.getZoom() < ZOOM_RUAS) return;
    base = 'carregando';
    try {
      const estilo = await estiloBase(mapaBase, tempoMapaBase);
      if (estilo.glyphs) map.setGlyphs(estilo.glyphs);
      if (estilo.sprite) map.setSprite(estilo.sprite);
      for (const [id, fonte] of Object.entries(estilo.sources)) map.addSource(id, fonte);
      for (const camada of estilo.layers) {
        if (camada.type === 'background') continue;
        const antes = camada.type === 'symbol' ? 'uf-linha' : 'mun-fill';
        map.addLayer({ ...camada, minzoom: Math.max(camada.minzoom ?? 0, ZOOM_RUAS) }, antes);
        camadasBase.push(camada.id);
      }
      base = 'pronto';
      mostrarAtribuicao();
    } catch (erro) {
      base = 'falhou';
      console.warn('mapa base', erro);
      aoFalharMapaBase?.();
    }
    aplicar();
  }
  map.on('moveend', carregarBase);

  // ---------- interação: o que está debaixo do ponteiro ----------
  let locaisDaUF = [], ufDosLocais = null;
  let interacao = { aoClicar: null, dica: null };
  const locaisVisiveis = () => camadas.locais && map.getZoom() > 8;
  // No zoom de município, o círculo de um local tem de 1 a 3 px de raio, e o dedo não acerta o pixel dele (#33). Fora
  // de um círculo, o toque abre o local mais perto numa folga em volta dele, maior para o dedo que para o mouse.
  function localEm(ponto) {
    const exato = map.queryRenderedFeatures(ponto, { layers: ['locais'] })[0];
    if (exato) return exato;
    const r = matchMedia('(pointer: coarse)').matches ? FOLGA_DO_TOQUE.dedo : FOLGA_DO_TOQUE.mouse;
    let perto = null, menor = Infinity;
    for (const f of map.queryRenderedFeatures([[ponto.x - r, ponto.y - r], [ponto.x + r, ponto.y + r]], { layers: ['locais'] })) {
      const p = map.project(f.geometry.coordinates);
      const d = Math.hypot(p.x - ponto.x, p.y - ponto.y);
      if (d < menor) [perto, menor] = [f, d];
    }
    return perto;
  }
  function alvoEm(ponto) {
    const loc = locaisVisiveis() && localEm(ponto);
    if (loc) {
      const l = locaisDaUF[loc.id];
      return { uf: ufDosLocais, m: l.ibge, li: l.li, zona: l.zona, numero: l.numero };
    }
    const mun = map.queryRenderedFeatures(ponto, { layers: ['mun-fill', 'mun-linha'] })[0];
    if (mun) return { uf: ufDoMunicipio(mun.id), m: mun.id };
    const uf = map.queryRenderedFeatures(ponto, { layers: ['uf-fill'] })[0];
    return uf ? { uf: uf.id } : null;
  }

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'dica', offset: 12, maxWidth: '280px' });
  const temHover = matchMedia('(hover: hover)').matches;
  let sobre = { mun: null, uf: null };
  function marcarSobre(alvo) {
    const mun = alvo?.m ?? null, uf = alvo?.uf ?? null;
    if (sobre.mun !== mun) {
      if (sobre.mun !== null) map.setFeatureState({ source: 'municipios', id: sobre.mun }, { hover: false });
      if (mun !== null) map.setFeatureState({ source: 'municipios', id: mun }, { hover: true });
    }
    if (sobre.uf !== uf) {
      if (sobre.uf !== null) map.setFeatureState({ source: 'ufs', id: sobre.uf }, { hover: false });
      if (uf !== null) map.setFeatureState({ source: 'ufs', id: uf }, { hover: true });
    }
    sobre = { mun, uf };
  }
  map.on('mousemove', (e) => {
    const alvo = alvoEm(e.point);
    marcarSobre(alvo);
    map.getCanvas().style.cursor = alvo ? 'pointer' : '';
    const html = temHover && alvo && interacao.dica?.(alvo);
    if (html) popup.setLngLat(e.lngLat).setHTML(String(html)).addTo(map); else popup.remove();
  });
  map.on('mouseout', () => { popup.remove(); marcarSobre(null); });
  map.on('click', (e) => { popup.remove(); interacao.aoClicar?.(alvoEm(e.point)); });

  // ---------- seleção e pintura ----------
  let selecao = { m: null, li: null };
  const estados = { municipios: null, locais: null };
  function reaplicarSelecao() {
    if (selecao.m !== null) map.setFeatureState({ source: 'municipios', id: selecao.m }, { sel: true });
    if (selecao.li !== null) map.setFeatureState({ source: 'locais', id: selecao.li }, { sel: true });
  }
  function aplicarEstados(fonte) {
    for (const [id, st] of estados[fonte] ?? []) map.setFeatureState({ source: fonte, id }, st);
  }
  function pintar(fonte, camada, novos, paint) {
    map.removeFeatureState({ source: fonte });
    estados[fonte] = novos;
    aplicarEstados(fonte);
    for (const [k, v] of Object.entries(paint ?? {})) map.setPaintProperty(camada, k, v);
    reaplicarSelecao();
  }

  // ---------- malha detalhada da UF no zoom de município ----------
  // A malha leve do Brasil desenha Natal como um quadrilátero. Ao parar num zoom de município, a UF do centro do mapa
  // troca os polígonos pelos da malha detalhada dela (um arquivo por UF, baixado uma vez). As vistas não percebem:
  // o id é o mesmo código IBGE, e o estado que elas pintaram é reaplicado.
  const feicoes = new Map(malha.municipios.features.map((f) => [f.id, f]));
  const detalhadas = new Set();
  async function detalhar(uf) {
    if (!uf || !malhaUF || detalhadas.has(uf)) return;
    detalhadas.add(uf);
    try {
      const d = await malhaUF(uf);
      for (const f of d.municipios.features) feicoes.set(f.id, f);
      for (const [id, c] of d.caixas) malha.caixas.municipio.set(id, c);
      map.getSource('municipios').setData({ type: 'FeatureCollection', features: [...feicoes.values()] });
      map.once('idle', () => { aplicarEstados('municipios'); reaplicarSelecao(); });
    } catch (erro) {
      detalhadas.delete(uf); // tenta de novo no próximo movimento; a malha leve continua de pé
      console.warn('malha detalhada', uf, erro);
    }
  }
  // depois de cada movimento, quando o desenho termina (no moveend o centro ainda pode não estar desenhado)
  let movido = true;
  map.on('moveend', () => { movido = true; });
  map.on('idle', () => {
    if (!movido || map.getZoom() < ZOOM_DETALHE) return;
    movido = false;
    detalhar(map.queryRenderedFeatures(map.project(map.getCenter()), { layers: ['uf-fill'] })[0]?.id);
  });

  return {
    /** A instância da MapLibre, para o que esta API não cobre. */
    map,
    /** Se há mapa base configurado (ele só carrega no zoom de município). */
    temMapaBase: !!mapaBase,
    /** { aoClicar(alvo), dica(alvo) -> html }; alvo: { uf, m?, li?, zona?, numero? } ou null (clique fora). */
    definirInteracao(x) { interacao = { ...interacao, ...x }; },
    /** Tira a pintura das vistas: municípios e locais na cor neutra. */
    neutro() {
      pintar('municipios', 'mun-fill', null, NEUTRO.municipios);
      pintar('locais', 'locais', null, NEUTRO.locais);
    },
    /** estados: Map(código IBGE -> objeto de feature-state); paint: propriedades da camada 'mun-fill' (fill-color). */
    pintarMunicipios: (estados, paint) => pintar('municipios', 'mun-fill', estados, paint),
    /** estados: Map(li -> objeto); paint: propriedades da camada 'locais' (circle-color, circle-radius...). */
    pintarLocais: (estados, paint) => pintar('locais', 'locais', estados, paint),
    /** Os locais com ponto no mapa de uma UF (o arquivo da UF decodificado), ou null para nenhum. */
    mostrarLocais(sigla, dadosUF) {
      if (sigla === ufDosLocais && dadosUF) return;
      ufDosLocais = dadosUF ? sigla : null;
      locaisDaUF = dadosUF?.locais ?? [];
      const features = locaisDaUF.filter((l) => l.ponto).map((l) =>
        ({ type: 'Feature', id: l.li, geometry: { type: 'Point', coordinates: l.ponto }, properties: { m: l.ibge } }));
      map.getSource('locais').setData({ type: 'FeatureCollection', features });
      selecao.li = null;
    },
    /** Põe um véu sobre as outras UFs (sigla), ou tira (null). */
    focarUF(sigla = null) {
      for (const f of malha.ufs.features) map.setFeatureState({ source: 'ufs', id: f.id }, { fora: !!sigla && f.id !== sigla });
    },
    /** Contorno no município e no local selecionados (li do local, na UF mostrada). */
    destacar({ m = null, li = null } = {}) {
      if (selecao.m !== null) map.setFeatureState({ source: 'municipios', id: selecao.m }, { sel: false });
      if (selecao.li !== null) map.setFeatureState({ source: 'locais', id: selecao.li }, { sel: false });
      selecao = { m, li };
      reaplicarSelecao();
    },
    /** Enquadra { ponto: [lon, lat] }, { m }, { uf } ou, sem nada, o Brasil. */
    enquadrar(alvo = {}, { animar = true } = {}) {
      const op = { padding: folga(), duration: animar ? 700 : 0, maxZoom: 13 };
      // o ponto vai para o centro da parte visível com `offset`: o `padding` do easeTo fica gravado na câmera e se
      // somaria ao do próximo fitBounds (#22)
      const f = folga();
      const offset = [(f.left - f.right) / 2, (f.top - f.bottom) / 2];
      if (alvo.ponto) map.easeTo({ center: alvo.ponto, zoom: Math.max(map.getZoom(), 13.5), offset, duration: op.duration });
      else if (alvo.m && malha.caixas.municipio.has(alvo.m)) {
        detalhar(ufDoMunicipio(alvo.m));
        map.fitBounds(malha.caixas.municipio.get(alvo.m), op);
      }
      else if (alvo.uf) map.fitBounds(malha.caixas.uf.get(alvo.uf), op);
      else map.fitBounds(malha.caixas.brasil, op);
    },
    camadas(patch) { Object.assign(camadas, patch); aplicar(); carregarBase(); },
    redimensionar: () => map.resize(),
  };
}
