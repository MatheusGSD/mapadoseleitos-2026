// TopoJSON (a malha do IBGE, gerada por `pipeline malha`) para GeoJSON, que é o que a MapLibre desenha. Lê só o que a
// malha usa: polígonos e multipolígonos, com arcos quantizados em delta (https://github.com/topojson/topojson-specification).

function arcosDecodificados(topo) {
  const [sx, sy] = topo.transform?.scale ?? [1, 1];
  const [tx, ty] = topo.transform?.translate ?? [0, 0];
  const quantizado = !!topo.transform;
  return topo.arcs.map((arco) => {
    let x = 0, y = 0;
    return arco.map(([a, b]) => {
      if (!quantizado) return [a, b];
      x += a; y += b;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

function anel(indices, arcos) {
  const pontos = [];
  for (const i of indices) {
    const arco = i < 0 ? arcos[~i].slice().reverse() : arcos[i];
    // o primeiro ponto de cada arco repete o último do anterior
    for (let k = pontos.length ? 1 : 0; k < arco.length; k++) pontos.push(arco[k]);
  }
  return pontos;
}

function geometria(g, arcos) {
  if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.arcs.map((a) => anel(a, arcos)) };
  if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.arcs.map((p) => p.map((a) => anel(a, arcos))) };
  throw new Error(`TopoJSON: geometria ${g.type} não suportada`);
}

/** FeatureCollection de um objeto do TopoJSON. O id numérico (código IBGE) vira número. */
export function paraGeoJSON(topo, objeto) {
  const arcos = arcosDecodificados(topo);
  return {
    type: 'FeatureCollection',
    features: topo.objects[objeto].geometries.map((g) => ({
      type: 'Feature',
      id: /^\d+$/.test(String(g.id)) ? Number(g.id) : g.id,
      properties: { ...(g.properties || {}) },
      geometry: geometria(g, arcos),
    })),
  };
}

/** Área (em grau², só para comparar partes) do anel externo de um polígono. */
function area([anel]) {
  let s = 0;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) s += (anel[j][0] + anel[i][0]) * (anel[j][1] - anel[i][1]);
  return Math.abs(s / 2);
}

// parte com menos que isto da área da maior fica fora da caixa de enquadrar (ilhas oceânicas)
const FRACAO_PRINCIPAL = 0.3;

/**
 * [[oeste, sul], [leste, norte]] de uma geometria GeoJSON. Com `principal`, um multipolígono só conta as partes
 * grandes: a caixa de Vitória (ES) deixa fora Trindade, a 1.100 km da costa, e o mapa enquadra a cidade.
 */
export function caixa(g, { principal = false } = {}) {
  let coords = g.coordinates;
  if (principal && g.type === 'MultiPolygon') {
    const areas = coords.map(area);
    const maior = Math.max(...areas);
    coords = coords.filter((_, i) => areas[i] >= FRACAO_PRINCIPAL * maior);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const anda = (c) => {
    if (typeof c[0] === 'number') {
      if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0];
      if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1];
    } else c.forEach(anda);
  };
  anda(coords);
  return [[x0, y0], [x1, y1]];
}

/** A caixa que contém todas as caixas dadas. */
export function juntarCaixas(caixas) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [[a, b], [c, d]] of caixas) {
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  return [[x0, y0], [x1, y1]];
}
