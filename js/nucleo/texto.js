// Texto: comparação sem acento, valores do TSE para leitura e nomes de urna.

/** Sem acento e em minúsculas, como a busca e os filtros comparam. */
export const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Valor do TSE como vai no endereço: "ENSINO MÉDIO COMPLETO" -> "ensino-medio-completo". */
export const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Valor do TSE para leitura: "ENSINO MÉDIO COMPLETO" -> "Ensino médio completo". */
export function capitalizar(s) {
  const t = String(s ?? '').toLocaleLowerCase('pt-BR');
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1);
}

// palavras que ficam em minúscula no meio do nome, e siglas que o nome de urna traz (JHC, AJ...)
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a']);
const SIGLAS = new Set(['JHC', 'AJ', 'DP', 'JP', 'PT', 'PL', 'PM', 'PRF', 'II', 'III', 'IV']);

/** Nome de urna (o TSE grava em maiúsculas) para leitura: "SAMANDA DE LULA" -> "Samanda de Lula";
 *  "DR. FÁBIO RUEDA" -> "Dr. Fábio Rueda"; "PAULO ABI-ACKEL" -> "Paulo Abi-Ackel"; "JHC" fica "JHC". */
export function nomeProprio(s) {
  const palavras = String(s ?? '').trim().split(/\s+/);
  return palavras.map((p, i) => {
    if (SIGLAS.has(p)) return p;
    const baixa = p.toLocaleLowerCase('pt-BR');
    if (i > 0 && MINUSCULAS.has(baixa)) return baixa;
    return baixa.replace(/(^|[-'’])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase('pt-BR'));
  }).join(' ');
}
