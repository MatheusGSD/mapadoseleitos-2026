// Pintura do mapa na vista do parlamentar (#5, #7, #12), pela API de js/mapa/mapa.js: a força local de cada município
// e local na escala dele, o tamanho dos círculos e o contorno do núcleo da votação. O mapa fica pintado nas três abas.
// Não importa js/mapa/mapa.js: ele traz a MapLibre, e o painel tem de abrir mesmo quando o mapa não abre.
import { COR_LOCAL_SEM_VOTO, COR_NUCLEO, COR_SEM_VOTO, raioDoCirculo } from './escala.js';

// as cores neutras de js/mapa/mapa.js (COR.municipio, COR.local): o que fica fora da UF dele não muda de cor
const COR = { municipio: '#e6e8e1', local: '#59626b' };
const ZOOM_RUA = 11;

// camada própria da vista, sobre a fonte 'municipios' do mapa: lê o estado `nucleo` que a vista põe em cada município
const CAMADA_NUCLEO = 'parlamentar-nucleo';
const nucleo = ['boolean', ['feature-state', 'nucleo'], false];
const faixa = ['coalesce', ['feature-state', 'faixa'], -2];
const r = ['coalesce', ['feature-state', 'r'], 1];

function corPorFaixa(escala, semVoto, semEstado) {
  return ['match', faixa, -1, semVoto, ...escala.faixas.flatMap((f, i) => [i, f.cor]), semEstado];
}

/**
 * Pinta a votação dele: municípios pela faixa da força local, locais como círculos (área proporcional aos votos,
 * com o maior local da UF como referência) e o contorno dos municípios do núcleo.
 */
export function pintar(m, v) {
  const noNucleo = new Set(v.nucleo.map((x) => x.ibge));
  // o município selecionado guarda a cor da faixa: o contorno da seleção (mun-sel) já o marca
  m.pintarMunicipios(new Map(v.municipios.map((x) => [x.ibge, { faixa: x.faixa, nucleo: noNucleo.has(x.ibge) }])), {
    'fill-color': corPorFaixa(v.escala, COR_SEM_VOTO, COR.municipio),
  });
  const maximo = v.locais.reduce((x, l) => Math.max(x, l.votos), 1);
  m.pintarLocais(new Map(v.locais.filter((l) => l.ponto).map((l) => [l.li, { faixa: l.faixa, r: raioDoCirculo(l.votos, maximo) }])), {
    'circle-color': corPorFaixa(v.escala, COR_LOCAL_SEM_VOTO, COR.local),
    'circle-radius': noZoom((raio) => raio),
  });
  contornarNucleo(m);
  anelPorFora(m);
}

// o raio de cada local (estado r, o do zoom 10) ao longo do zoom; `f` transforma o raio em cada parada da curva
const noZoom = (f) => ['interpolate', ['linear'], ['zoom'], 6, f(['*', 0.35, r]), 10, f(r), 14, f(['*', 2.2, r])];

// O anel do local selecionado ('locais-sel', de mapa.js) tem raio fixo e ficaria dentro dos círculos grandes. Enquanto
// a vista está aberta, ele contorna o círculo por fora; ao sair, volta ao que era.
let anelOriginal = null;
function anelPorFora(m) {
  const map = m.map;
  if (!map?.getLayer('locais-sel') || anelOriginal) return;
  anelOriginal = map.getPaintProperty('locais-sel', 'circle-radius');
  const sel = ['boolean', ['feature-state', 'sel'], false];
  map.setPaintProperty('locais-sel', 'circle-radius', noZoom((raio) => ['case', sel, ['+', 3, raio], 0]));
}

function contornarNucleo(m) {
  const map = m.map;
  if (!map || map.getLayer(CAMADA_NUCLEO)) return;
  map.addLayer({
    id: CAMADA_NUCLEO, type: 'line', source: 'municipios',
    paint: {
      'line-color': COR_NUCLEO,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, ['case', nucleo, 1, 0], 9, ['case', nucleo, 2.2, 0]],
      // no zoom de rua o foco são os locais de votação
      'line-opacity': ['interpolate', ['linear'], ['zoom'], ZOOM_RUA, 1, ZOOM_RUA + 2, 0.4],
    },
  }, 'mun-hover');
}

/** Ao sair da vista do parlamentar: tira a camada do núcleo e devolve o anel da seleção ao que era. */
export function despintar(m) {
  if (m.map?.getLayer(CAMADA_NUCLEO)) m.map.removeLayer(CAMADA_NUCLEO);
  if (anelOriginal && m.map?.getLayer('locais-sel')) m.map.setPaintProperty('locais-sel', 'circle-radius', anelOriginal);
  anelOriginal = null;
}
