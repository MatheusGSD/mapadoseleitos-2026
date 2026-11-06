// Formatação para a interface, no vocabulário do GLOSSARY.md.

const NF = new Intl.NumberFormat('pt-BR');
export const numero = (x) => NF.format(x);

/** Fração como porcentagem: 1 casa, ou 2 abaixo de 1%. */
export function pct(x, casas) {
  if (x == null || Number.isNaN(x)) return '—';
  const p = x * 100;
  const d = casas ?? (p > 0 && p < 1 ? 2 : 1);
  return p.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
}

/** "2026-10-24T12:40:12" -> "24/10/2026" */
export const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

const ela = (e) => e.genero === 'FEMININO';
const flex = (e, m, f) => (ela(e) ? f : m);

export const cargoDe = (e) => (e.cargo === 5 ? flex(e, 'Senador', 'Senadora') : flex(e, 'Deputado federal', 'Deputada federal'));
export const cargoNome = (cargo) => (cargo === 5 ? 'Senador' : 'Deputado federal');
export const casaDe = (cargo) => (cargo === 5 ? 'Senado' : 'Câmara dos Deputados');

/** "eleita por quociente partidário", "eleito por média", "eleito" */
export function situacaoDe(e) {
  const x = flex(e, 'eleito', 'eleita');
  return e.situacao === 'qp' ? `${x} por quociente partidário` : e.situacao === 'media' ? `${x} por média` : x;
}

/** Trajetória no cargo: "reeleita", "já exerceu o cargo", "novato" */
export function trajetoriaDe(e) {
  if (e.trajetoria === 'reeleito') return flex(e, 'reeleito', 'reeleita');
  if (e.trajetoria === 'ja-exerceu') return 'já exerceu o cargo';
  return flex(e, 'novato', 'novata');
}
