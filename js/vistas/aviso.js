// Quem deixou de ser eleito numa retotalização (#10): o endereço continua, como página de aviso, e não como 404.
// O aviso não diz quem herdou a cadeira, porque com duas mudanças na mesma UF o par fica ambíguo.
import { h } from '../ui/html.js';
import { nomeProprio } from '../nucleo/texto.js';
import { daUF } from '../nucleo/ufs.js';
import { dataBR } from '../nucleo/formato.js';

export async function abrir(ctx, rota) {
  const ex = ctx.indice.exPorSq.get(rota.sq);
  const nome = nomeProprio(ex.nome);
  ctx.conteudo.innerHTML = String(h`
    <div class="aviso-ex">
      <h1 class="titulo">${nome} deixou de ser eleito(a)</h1>
      <p>${nome} deixou de ser eleito(a) na totalização de ${dataBR(ex.totalizacao)}.
        <a href="${ctx.href({ vista: 'uf', uf: ex.uf })}">Veja os eleitos ${daUF(ex.uf)}</a>.</p>
      <p class="nota">Os votos continuam nos rankings de cada município e local de votação, como os de qualquer
        candidato não eleito.</p>
    </div>`);
  return {
    titulo: `${nome} deixou de ser eleito(a)`,
    mapa(m, { animar }) { m.neutro(); m.destacar({}); m.mostrarLocais(null, null); m.focarUF(ex.uf); m.enquadrar({ uf: ex.uf }, { animar }); },
  };
}
