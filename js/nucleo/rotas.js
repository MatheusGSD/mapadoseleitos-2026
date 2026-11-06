// Estado no endereço (#6, #7): cada tela tem um endereço no hash, que se compartilha. O hash funciona no GitHub Pages
// sem regra de reescrita no servidor.
//
//   #/                                        entrada do Brasil
//   #/RN                                      entrada da UF: os eleitos por cargo
//   #/RN/2408102[/1-1015][?c=5&f=todos&de=…]  território: município (código IBGE) e local de votação (zona-número)
//   #/parlamentar/<sq>[/<ibge>[/<zona>-<número>]][?aba=municipios|ficha]   vista do parlamentar
//   #/eleitos[?q=…&uf=rn,sp&cargo=…&ord=…]   busca e filtros
//   #/como-funciona[/<seção>]                a página "Como funciona" (#32), aberta numa seção
//
// Rota: { vista, ... }. As vistas do território e do parlamentar e a lista guardam em `params` o que mais estiver no
// endereço (strings), sem que este módulo precise conhecer cada parâmetro: assim cada vista define os seus.
import { UFS, ufDoMunicipio } from './ufs.js';

export const ABAS = ['mapa', 'municipios', 'ficha'];
const NAO = { vista: 'nao-encontrado' };
const IBGE = /^\d{7}$/;
const LOCAL = /^(\d{1,4})-(\d{1,5})$/;
const SECAO = /^[a-z0-9-]{1,40}$/;

function local(seg) {
  const x = LOCAL.exec(seg);
  return x ? { zona: Number(x[1]), numero: Number(x[2]) } : null;
}

/** Território a partir de [ibge, zona-número]; null se não serve. `uf`, quando dada, tem de ser a do município. */
function territorioDe(segs, uf) {
  if (segs.length > 2 || (segs[0] && !IBGE.test(segs[0]))) return null;
  const t = {};
  if (segs[0]) {
    t.m = Number(segs[0]);
    if (uf && ufDoMunicipio(t.m) !== uf) return null;
  }
  if (segs[1]) {
    t.l = local(segs[1]);
    if (!t.l) return null;
  }
  return t;
}

export function lerRota(hash) {
  const h = String(hash || '').replace(/^#/, '');
  const i = h.indexOf('?');
  const caminho = i < 0 ? h : h.slice(0, i);
  const params = Object.fromEntries(new URLSearchParams(i < 0 ? '' : h.slice(i + 1)));
  const segs = caminho.split('/').filter(Boolean).map(decodeURIComponent);

  if (!segs.length) return { vista: 'inicio' };
  if (segs[0] === 'eleitos') return segs.length === 1 ? { vista: 'eleitos', params } : NAO;
  // a seção que a página não tiver abre a página do começo (js/vistas/como-funciona/)
  if (segs[0] === 'como-funciona') {
    if (segs.length > 2 || (segs[1] && !SECAO.test(segs[1]))) return NAO;
    return { vista: 'como-funciona', secao: segs[1] ?? null };
  }
  if (segs[0] === 'parlamentar') {
    if (!/^\d{1,15}$/.test(segs[1] || '')) return NAO;
    const t = territorioDe(segs.slice(2));
    const aba = params.aba ?? 'mapa';
    if (!t || !ABAS.includes(aba)) return NAO;
    delete params.aba;
    return { vista: 'parlamentar', sq: Number(segs[1]), ...t, aba, params };
  }
  const uf = segs[0].toUpperCase();
  if (!UFS.has(uf)) return NAO;
  if (segs.length === 1) return { vista: 'uf', uf };
  const t = territorioDe(segs.slice(1), uf);
  return t ? { vista: 'territorio', uf, ...t, params } : NAO;
}

/**
 * Qual vista abre para a rota, diante do índice decodificado (arquivos.js): o parlamentar que deixou de ser eleito
 * abre a página de aviso (#10); parlamentar ou município que o índice não tem, ou município de outra UF que a do
 * parlamentar, dá "não encontrado".
 */
export function vistaDe(rota, indice) {
  if (rota.vista === 'parlamentar') {
    const e = indice.eleitosPorSq.get(rota.sq);
    if (!e) return indice.exPorSq.has(rota.sq) ? 'aviso' : 'nao-encontrado';
    if (rota.m && indice.municipiosPorIbge.get(rota.m)?.uf !== e.uf) return 'nao-encontrado';
    return 'parlamentar';
  }
  if (rota.vista === 'territorio' && !indice.municipiosPorIbge.has(rota.m)) return 'nao-encontrado';
  return rota.vista;
}

// parâmetros do território que a trilha leva ao subir de nível: cargo, "Só eleitos | Todos" e de qual parlamentar veio
const PERSISTEM = ['c', 'f', 'de'];

/**
 * Trilha Brasil › UF › município › local: [{ rotulo, rota }], com `rota` null no passo atual. Na vista do
 * parlamentar, os passos mudam o território sem sair dele. `nomes`: { uf (do parlamentar), municipio, local }.
 */
export function trilha(rota, nomes = {}) {
  const brasil = { rotulo: 'Brasil', rota: { vista: 'inicio' } };
  const passos = [brasil];
  if (rota.vista === 'eleitos') passos.push({ rotulo: 'Eleitos', rota: null });
  if (rota.vista === 'como-funciona') passos.push({ rotulo: 'Como funciona', rota: null });
  if (rota.vista === 'uf') passos.push({ rotulo: UFS.get(rota.uf).nome, rota: null });
  if (rota.vista === 'territorio' || rota.vista === 'parlamentar') {
    const uf = rota.uf ?? nomes.uf;
    const params = Object.fromEntries(PERSISTEM.filter((k) => rota.params?.[k]).map((k) => [k, rota.params[k]]));
    const ir = rota.vista === 'parlamentar'
      ? (t) => ({ vista: 'parlamentar', sq: rota.sq, ...t, aba: 'mapa', params: {} })
      : (t) => (t.m ? { vista: 'territorio', uf, ...t, params } : { vista: 'uf', uf });
    passos.push({ rotulo: UFS.get(uf)?.nome ?? uf, rota: ir({}) });
    if (rota.m) passos.push({ rotulo: nomes.municipio ?? String(rota.m), rota: ir({ m: rota.m }) });
    if (rota.l) passos.push({ rotulo: nomes.local ?? 'Local de votação', rota: null });
  }
  passos[passos.length - 1].rota = null;
  return passos;
}

function consulta(params) {
  const partes = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%2C/gi, ',')}`);
  return partes.length ? '?' + partes.join('&') : '';
}

function caminhoTerritorio(r) {
  return (r.m ? `/${r.m}` : '') + (r.m && r.l ? `/${r.l.zona}-${r.l.numero}` : '');
}

export function escreverRota(r) {
  switch (r.vista) {
    case 'uf': return `#/${r.uf}`;
    case 'territorio': return `#/${r.uf}${caminhoTerritorio(r)}${consulta(r.params)}`;
    case 'parlamentar': {
      const aba = r.aba && r.aba !== 'mapa' ? { aba: r.aba } : {};
      return `#/parlamentar/${r.sq}${caminhoTerritorio(r)}${consulta({ ...aba, ...r.params })}`;
    }
    case 'eleitos': return `#/eleitos${consulta(r.params)}`;
    case 'como-funciona': return `#/como-funciona${r.secao ? `/${r.secao}` : ''}`;
    default: return '#/';
  }
}
