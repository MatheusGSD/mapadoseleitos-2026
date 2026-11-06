// A página "Como funciona" (#32): de onde vêm os dados, o que cada medida quer dizer e o que o site não faz. O texto
// fica em pagina.js; os números que mudam com cada versão vêm do índice (numeros.js) e do versao.json da versão.
// Endereço: #/como-funciona[/<seção>]. Com seção, a página abre nela (os links "o que é isto?" das vistas).
import { h } from '../../ui/html.js';
import { nomeProprio } from '../../nucleo/texto.js';
import { UFS, daUF } from '../../nucleo/ufs.js';
import { numerosDoIndice } from './numeros.js';
import { pagina } from './pagina.js';

// de onde se veio, para o "Voltar": continua o mesmo enquanto se anda de uma seção para outra da página
let volta = null;

function rotuloDaVolta(ctx, r) {
  if (r.vista === 'parlamentar') {
    const e = ctx.indice.eleitosPorSq.get(r.sq);
    return e ? nomeProprio(e.nome) : null;
  }
  if (r.vista === 'territorio') return ctx.indice.municipiosPorIbge.get(r.m)?.nome ?? null;
  if (r.vista === 'uf') return UFS.has(r.uf) ? `os eleitos ${daUF(r.uf)}` : null;
  if (r.vista === 'eleitos') return 'a lista dos eleitos';
  if (r.vista === 'inicio') return 'a entrada';
  return null;
}

/** Rola o painel (no computador) ou a página (no celular) até o elemento, abaixo do topo, e põe o foco nele. */
function rolarAte(ctx, el) {
  const largo = matchMedia('(min-width: 900px)').matches;
  if (largo) {
    // no computador, o "Voltar" fica preso no alto do painel
    const voltar = ctx.conteudo.querySelector('.cf-voltar')?.getBoundingClientRect().height ?? 0;
    ctx.conteudo.scrollTop += el.getBoundingClientRect().top - ctx.conteudo.getBoundingClientRect().top - voltar - 14;
  } else {
    // no celular, o topo do painel (busca e trilha) fica preso no alto da tela
    const topo = document.querySelector('.topo')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - topo - 10 });
  }
  el.focus({ preventScroll: true });
  el.classList.add('cf-alvo');
}

export async function abrir(ctx, rota, anterior) {
  if (anterior && anterior.vista !== 'como-funciona') volta = anterior;
  if (!anterior) volta = null;
  // as datas dos arquivos do TSE: a página abre sem elas se o versao.json não vier
  const versao = await ctx.dados.json('versao.json').catch(() => null);
  const rotulo = volta && rotuloDaVolta(ctx, volta);

  ctx.conteudo.innerHTML = String(h`
    ${rotulo ? h`<p class="cf-voltar"><a class="voltar" href="${ctx.href(volta)}">‹ Voltar para ${rotulo}</a></p>` : ''}
    ${pagina(numerosDoIndice(ctx.indice), { fontes: versao?.fontes, geradoEm: versao?.gerado_em })}`);

  // a seção pedida no endereço; uma seção que a página não tem (um link antigo) abre a página do começo
  const alvo = rota.secao ? ctx.conteudo.querySelector(`.como-funciona [id="${rota.secao}"]`) : null;
  // o principal.js volta a rolagem para o alto depois que a vista abre: a página rola no quadro seguinte
  if (alvo) requestAnimationFrame(() => rolarAte(ctx, alvo));

  return {
    titulo: 'Como funciona',
    // o mapa fica onde estava, só sem a pintura da vista anterior; na primeira tela da visita, o Brasil
    mapa(m, { animar }) {
      m.neutro();
      m.destacar({});
      if (!animar) {
        m.mostrarLocais(null, null);
        m.focarUF(null);
        m.enquadrar({}, { animar });
      }
    },
  };
}
