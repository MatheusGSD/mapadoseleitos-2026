// HTML por template: h`<p>${valor}</p>` escapa cada valor interpolado; o que já foi montado com h (ou marcado com
// cru) entra como está, e listas são juntadas. Use String(...) ou .toString() para pôr no innerHTML.

class Html {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function valor(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Html) return v.s;
  if (Array.isArray(v)) return v.map(valor).join('');
  return esc(v);
}

export function h(partes, ...valores) {
  let s = partes[0];
  for (let i = 0; i < valores.length; i++) s += valor(valores[i]) + partes[i + 1];
  return new Html(s);
}

/** HTML confiável que não deve ser escapado. */
export const cru = (s) => new Html(String(s));
