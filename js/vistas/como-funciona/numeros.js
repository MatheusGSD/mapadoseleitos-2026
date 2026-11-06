// Os números da página "Como funciona" (#32) que saem do índice publicado, para o texto seguir a versão no ar sem
// ninguém reescrever a página a cada atualização: eleitos, trajetória no cargo, registro sob recurso, datas de
// totalização, mediana da dispersão por UF e votos concorrentes. Lógica pura, testada em node.
import { UFS } from '../../nucleo/ufs.js';

// A totalização da noite da eleição (4/10/2026) terminou na madrugada de 5/10 nas UFs mais lentas (AM, BA, MA).
// Uma data depois disso é uma totalização refeita pelo TRE (#10).
export const FIM_DA_NOITE_DA_ELEICAO = '2026-10-06';

const TRAJETORIAS = ['reeleito', 'ja-exerceu', 'novato'];

function mediana(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return null;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/**
 * numerosDoIndice(indice) -> {
 *   foto, eleitos, porCargo: { 5, 6 }, municipios,
 *   trajetoria: { 5: { reeleito, 'ja-exerceu', novato }, 6: {...} },
 *   recurso: { 5, 6 }, ex, aguardando,
 *   totalizacoes: [{ uf, nome, 5: data, 6: data }] (UFs pela ordem do nome), refeitas: { 5, 6 },
 *   medianas: [{ uf, nome, cadeiras, mediana }] (mediana da dispersão dos deputados da UF, pela ordem do nome),
 *   dispersao: { 5: { min, max }, 6: { mediana } }, forcaNaUF: { 5: mediana, 6: mediana }, concorrentes: { 5, 6 },
 * }
 * indice: o índice decodificado (js/nucleo/arquivos.js).
 */
export function numerosDoIndice(indice) {
  const doCargo = (c) => indice.eleitos.filter((e) => e.cargo === c);
  const contarTrajetoria = (lista) => Object.fromEntries(TRAJETORIAS.map((t) => [t, lista.filter((e) => e.trajetoria === t).length]));
  const ufs = [...indice.ufs.keys()].sort((a, b) => (UFS.get(a)?.nome ?? a).localeCompare(UFS.get(b)?.nome ?? b, 'pt-BR'));
  const nome = (uf) => UFS.get(uf)?.nome ?? uf;
  const totalizacoes = ufs.map((uf) => ({ uf, nome: nome(uf), ...indice.ufs.get(uf).totalizacao }));
  const refeitas = (c) => totalizacoes.filter((t) => t[c] > FIM_DA_NOITE_DA_ELEICAO).length;
  const dispersoes = (c) => doCargo(c).map((e) => e.dispersao);
  const forcas = (c) => doCargo(c).map((e) => e.votos / indice.ufs.get(e.uf).concorrentes[c]);
  const somaConcorrentes = (c) => [...indice.ufs.values()].reduce((s, u) => s + u.concorrentes[c], 0);
  return {
    foto: indice.foto,
    eleitos: indice.eleitos.length,
    porCargo: { 5: doCargo(5).length, 6: doCargo(6).length },
    municipios: indice.municipios.length,
    trajetoria: { 5: contarTrajetoria(doCargo(5)), 6: contarTrajetoria(doCargo(6)) },
    recurso: { 5: doCargo(5).filter((e) => e.recurso).length, 6: doCargo(6).filter((e) => e.recurso).length },
    ex: indice.ex.length,
    aguardando: [...indice.ufs.values()].reduce((s, u) => s + u.senadoresAguardando, 0),
    totalizacoes,
    refeitas: { 5: refeitas(5), 6: refeitas(6) },
    medianas: ufs.map((uf) => ({
      uf, nome: nome(uf), cadeiras: doCargo(6).filter((e) => e.uf === uf).length, mediana: indice.ufs.get(uf).medianaDispersao,
    })),
    dispersao: { 5: { min: Math.min(...dispersoes(5)), max: Math.max(...dispersoes(5)) }, 6: { mediana: mediana(dispersoes(6)) } },
    forcaNaUF: { 5: mediana(forcas(5)), 6: mediana(forcas(6)) },
    concorrentes: { 5: somaConcorrentes(5), 6: somaConcorrentes(6) },
  };
}
