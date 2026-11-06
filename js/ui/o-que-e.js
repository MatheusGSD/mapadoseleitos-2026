// O link "o que é isto?" que as vistas põem junto de um termo: abre a página "Como funciona" (#32) na seção dele.
// Escreva a seção por extenso (oQueE('nucleo')): testes/como-funciona/ancoras.test.js lê as vistas e confere que
// cada uma existe em js/vistas/como-funciona/secoes.js.
import { h } from './html.js';
import { escreverRota } from '../nucleo/rotas.js';

export const oQueE = (secao, texto = 'O que é isto?') =>
  h`<a class="o-que-e" href="${escreverRota({ vista: 'como-funciona', secao })}">${texto}</a>`;
