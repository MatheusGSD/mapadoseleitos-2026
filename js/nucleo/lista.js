// Lista dos eleitos (#6): um bloco por cargo (senadores e deputados nunca se misturam), agrupado por UF. A eleição é
// por UF: a ordem (mais votados, nome ou idade) vale só dentro de cada UF, e as UFs vêm na ordem do nome, que não
// mede ninguém. Nada ordena parlamentares entre UFs.
import { UFS } from './ufs.js';
import { semAcento } from './texto.js';

export const CARGOS = [5, 6]; // Senado primeiro, como no protótipo
export const ORDENS = ['votos', 'nome', 'idade'];

const porNome = (a, b) => semAcento(a.nome).localeCompare(semAcento(b.nome), 'pt-BR') || a.sq - b.sq;
const COMPARA = {
  votos: (a, b) => b.votos - a.votos || porNome(a, b),
  nome: porNome,
  // mais novo primeiro: nascimento mais recente
  idade: (a, b) => b.nascimento.localeCompare(a.nascimento) || porNome(a, b),
};
const nomeDaUF = (uf) => UFS.get(uf)?.nome ?? uf;

/** [{ cargo, ufs: [{ uf, eleitos }] }] */
export function agrupar(eleitos, ordem = 'votos') {
  const compara = COMPARA[ordem] ?? COMPARA.votos;
  const blocos = [];
  for (const cargo of CARGOS) {
    const porUF = new Map();
    for (const e of eleitos) {
      if (e.cargo !== cargo) continue;
      if (!porUF.has(e.uf)) porUF.set(e.uf, []);
      porUF.get(e.uf).push(e);
    }
    if (!porUF.size) continue;
    const ufs = [...porUF.keys()].sort((a, b) => nomeDaUF(a).localeCompare(nomeDaUF(b), 'pt-BR'))
      .map((uf) => ({ uf, eleitos: porUF.get(uf).sort(compara) }));
    blocos.push({ cargo, ufs });
  }
  return blocos;
}
