// Escala de cor da vista do parlamentar (#5, #12): a força local de cada território em faixas que são múltiplos da
// força dele na UF, a "média dele". A escala é só dele: equivale ao desempenho relativo, que neutraliza o tamanho
// do território. Votos absolutos nunca colorem área.

// Uma cor só, do claro ao escuro (a rampa do protótipo, #7). As duas rampas terminam nos mesmos dois tons escuros, e
// a do senador ganha um passo no meio; o passo de luminosidade entre vizinhas é de pelo menos 0,06 (OKLCH).
const ESCALAS = {
  // deputado federal (#5, #7): metade, 1×, 2× e 4× a média
  6: {
    multiplos: [0.5, 1, 2, 4],
    rotulos: ['menos da metade da média', 'da metade à média', 'da média ao dobro', 'do dobro a 4×', '4× a média ou mais'],
    cores: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'],
  },
  // senador (#12): com as faixas do deputado, 99,9% dos municípios ficariam abaixo de 2× e o mapa sairia com duas
  // cores. Nos dados de 2026, estes cortes põem 15%, 15%, 29%, 24%, 15% e 3% dos municípios em cada faixa.
  5: {
    multiplos: [0.75, 0.9, 1.1, 1.25, 1.5],
    rotulos: ['menos de 0,75× a média', '0,75× a 0,9×', 'na média (0,9× a 1,1×)', '1,1× a 1,25×', '1,25× a 1,5×',
      '1,5× a média ou mais'],
    cores: ['#cde2fb', '#9cc3f2', '#62a0ea', '#3179d6', '#1c5cab', '#0d366b'],
  },
};

/** Municípios e locais sem voto dele: cinza, sem azul, para não se confundir com a faixa mais clara. */
export const COR_SEM_VOTO = '#e2e1da';
export const COR_LOCAL_SEM_VOTO = '#a8a79f';
/** Contorno do núcleo da votação (#12): aparece sobre o azul claro e sobre o escuro, e não é a cor da seleção. */
export const COR_NUCLEO = '#e8590c';

/**
 * escalaDe(cargo, forcaNaUF) -> { base, faixas: [{ min, max, rotulo, cor }], faixa(forca) }
 * faixa(forca) dá o índice da faixa (0 = a mais clara), ou -1 para nenhum voto. O corte fica com a faixa de cima.
 */
export function escalaDe(cargo, base) {
  const { multiplos, rotulos, cores } = ESCALAS[cargo];
  const cortes = multiplos.map((k) => k * base);
  const faixas = rotulos.map((rotulo, i) => ({ min: i ? cortes[i - 1] : 0, max: cortes[i] ?? null, rotulo, cor: cores[i] }));
  function faixa(forca) {
    if (!(forca > 0)) return -1;
    let i = 0;
    while (i < cortes.length && forca >= cortes[i]) i++;
    return i;
  }
  return { base, faixas, faixa };
}

// Círculos dos locais de votação (#5): a área é proporcional aos votos dele, e o maior local da referência tem o raio
// máximo. O raio é o do zoom 10; o mapa o aumenta ao aproximar (aba-mapa.js).
export const RAIO_MAXIMO = 12;
const RAIO_MINIMO = 1.5; // um local com poucos votos continua visível
const RAIO_SEM_VOTO = 1; // o local sem voto dele fica como um ponto, para se ver onde ele não teve voto

export function raioDoCirculo(votos, maximo) {
  if (!(votos > 0)) return RAIO_SEM_VOTO;
  return Math.max(RAIO_MINIMO, RAIO_MAXIMO * Math.sqrt(votos / maximo));
}
