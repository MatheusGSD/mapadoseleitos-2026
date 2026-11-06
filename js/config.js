// O que muda de um ambiente para outro, num lugar só.

/**
 * Nome do site (#31): aparece no título da aba e no topo do painel. O index.html repete o nome e a descrição nas etiquetas
 * do cartão de compartilhamento, porque o robô da prévia não roda JavaScript; testes/cartao.test.js confere que batem.
 */
export const NOME_DO_SITE = 'Mapa dos eleitos';
export const DESCRICAO = 'De onde vieram os votos de cada deputado federal e senador eleito em 2026';
/** O endereço público (#31): o das etiquetas do cartão e o link dos números na mensagem da cobrança (#43). */
export const ENDERECO = 'https://mapadoseleitos.dalmolin.dev/';

/** Pastas dos dados (relativas ao index.html). O servidor local mapeia as duas para data/site/ (ver README). */
export const DADOS = 'dados/';
export const MALHA = 'malha/';

/** Mapa base opcional (#4): sem chave, sem SLA. Se não responder em TEMPO_MAPA_BASE ms, o mapa segue sem ele. */
export const MAPA_BASE = 'https://tiles.openfreemap.org/styles/positron';
export const TEMPO_MAPA_BASE = 4000;
