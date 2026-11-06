// Endereço que não leva a nenhuma tela: diz o que fazer, sem pedir desculpa.
import { h } from '../ui/html.js';

export async function abrir(ctx) {
  ctx.conteudo.innerHTML = String(h`
    <h1 class="titulo">Este endereço não leva a nenhuma página</h1>
    <p>Ele pode estar incompleto, ou o parlamentar ou o município não está entre os eleitos de 2026.
      Busque pelo nome no alto do painel ou <a href="#/">volte para a entrada</a>.</p>`);
  return {
    titulo: 'Página não encontrada',
    mapa(m, { animar }) { m.neutro(); m.destacar({}); m.mostrarLocais(null, null); m.focarUF(null); m.enquadrar({}, { animar }); },
  };
}
