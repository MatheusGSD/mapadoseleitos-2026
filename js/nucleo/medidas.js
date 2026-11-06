// As medidas do #5, como o GLOSSARY.md as define. Ficam num lugar só para que a vista do parlamentar e a do
// território arredondem igual (#9: as divisões são feitas no navegador).

/** Força local: votos de um candidato num território ÷ votos concorrentes do cargo ali. */
export const forcaLocal = (votos, concorrentes) => (concorrentes ? votos / concorrentes : 0);

/** Peso na votação: votos de um candidato num território ÷ total de votos dele. */
export const pesoNaVotacao = (votos, total) => (total ? votos / total : 0);
