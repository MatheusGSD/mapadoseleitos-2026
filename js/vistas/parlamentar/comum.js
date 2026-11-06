// Peças de texto que as abas da vista do parlamentar dividem.
import { pct, cargoNome } from '../../nucleo/formato.js';

/** "dele" ou "dela", pelo gênero do registro no TSE. */
export const dele = (e) => (e.genero === 'FEMININO' ? 'dela' : 'dele');

/** O intervalo de força local de uma faixa: "menos de 2,5%", "2,5% a 5,0%", "16,0% ou mais". */
export function intervalo(f) {
  if (!f.min) return `menos de ${pct(f.max)}`;
  return f.max === null ? `${pct(f.min)} ou mais` : `${pct(f.min)} a ${pct(f.max)}`;
}

/** "de deputado federal", "de senador": o cargo dos votos concorrentes. */
export const doCargo = (cargo) => `de ${cargoNome(cargo).toLowerCase()}`;
