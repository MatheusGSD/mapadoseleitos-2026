// A votação de um eleito na UF dele, como a vista do parlamentar mostra (#5, #7, #12). Lógica pura: recebe os
// arquivos já decodificados (js/nucleo/arquivos.js) e devolve as linhas que o painel e o mapa usam. As divisões
// ficam no navegador (#9), com as medidas de js/nucleo/medidas.js.
import { forcaLocal, pesoNaVotacao } from '../../nucleo/medidas.js';
import { escalaDe } from './escala.js';

/**
 * votacaoDe({ eleito, concorrentesUF, uf, parlamentar }) -> {
 *   escala,                 // a escala de cor dele (escala.js), em múltiplos da força dele na UF
 *   maisVotos, maisForte,   // as listas do #7: só os municípios onde ele teve voto
 *   nucleo,                 // o começo de maisForte que deu metade dos votos (#12); vazio no DF
 *   contagem,               // { faixas: [municípios em cada faixa], zero: municípios sem voto }
 * }
 * eleito: do índice (sq, uf, cargo, votos); concorrentesUF: votos concorrentes do cargo na UF (índice);
 * uf: o arquivo da UF; parlamentar: o arquivo dele.
 */
export function votacaoDe({ eleito, concorrentesUF, uf, parlamentar }) {
  const { cargo, votos: total } = eleito;
  const escala = escalaDe(cargo, forcaLocal(total, concorrentesUF));
  // as medidas de um território; o arquivo dele só traz os territórios onde teve voto
  function medidas(territorio, p) {
    const votos = p?.votos ?? 0;
    const forca = forcaLocal(votos, territorio.concorrentes[cargo]);
    return { votos, forca, peso: pesoNaVotacao(votos, total), posicao: p?.posicao ?? null, faixa: escala.faixa(forca) };
  }
  const noMunicipio = new Map(parlamentar.municipios.map((x) => [x.mi, x]));
  const municipios = uf.municipios.map((m) => ({ ibge: m.ibge, mi: m.mi, ...medidas(m, noMunicipio.get(m.mi)) }));
  const porIbge = new Map(municipios.map((m) => [m.ibge, m]));
  const noLocal = new Map(parlamentar.locais.map((x) => [x.li, x]));
  const locais = uf.locais.map((l) => ({
    li: l.li, ibge: l.ibge, zona: l.zona, numero: l.numero, ponto: l.ponto, ...medidas(l, noLocal.get(l.li)),
  }));
  const semPonto = { locais: 0, votos: 0 };
  for (const l of locais) {
    if (l.ponto || !l.votos) continue;
    semPonto.locais++;
    semPonto.votos += l.votos;
  }
  const comVoto = municipios.filter((m) => m.votos > 0);
  const maisVotos = [...comVoto].sort((a, b) => b.votos - a.votos);
  // empate na força local: quem deu mais votos (#12)
  const maisForte = [...comVoto].sort((a, b) => b.forca - a.forca || b.votos - a.votos);
  // no DF, o núcleo seria sempre Brasília: ficam a dispersão e os círculos dos locais (#12)
  const nucleo = uf.municipios.length > 1 ? nucleoDaVotacao(maisForte, total) : [];

  const contagem = { faixas: escala.faixas.map(() => 0), zero: 0 };
  for (const m of municipios) {
    if (m.faixa < 0) contagem.zero++; else contagem.faixas[m.faixa]++;
  }
  return {
    escala, maisVotos, maisForte, nucleo, contagem, municipios, locais, semPonto,
    candidatos: uf.candidatos.filter((c) => c.cargo === cargo).length,
    municipio: (ibge) => porIbge.get(ibge),
    local: (li) => locais[li],
  };
}

// Núcleo da votação (#12): os primeiros de "Onde foi mais forte" que, somados, deram metade dos votos dele. Entra o
// município em que a soma passa da metade (ou chega a ela); sem piso de votos.
function nucleoDaVotacao(maisForte, total) {
  let soma = 0, n = 0;
  while (n < maisForte.length && soma < total / 2) soma += maisForte[n++].votos;
  return maisForte.slice(0, n);
}
