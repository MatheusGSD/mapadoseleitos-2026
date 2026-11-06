// Vista do parlamentar: ticket #22 (cabeçalho, abas Mapa e Municípios e a pintura do mapa) e #24 (aba Ficha, em
// aba-ficha.js). Rota: #/parlamentar/<sq>[/<ibge>[/<zona>-<número>]][?aba=municipios|ficha].
//
// O cabeçalho sai do índice (votos, força na UF, dispersão da votação, "Registro sob recurso") e aparece na hora; a
// votação por município e local (votacao.js) espera o arquivo da UF e o dele. O mapa fica pintado nas três abas.
// Cada aba é um módulo com o mesmo contrato:
//   export async function abrir(ctx, rota, eleito, alvo, votacao) -> { mapa?(mapa, { animar }), dica?(alvo) } | undefined
// em que `alvo` é o elemento onde a aba escreve e `votacao` é { votacao, uf, l, local } (o local de votação aberto:
// o dele no arquivo da UF e o arquivo dele, com as seções).
import { h } from '../../ui/html.js';
import { foto, marcaRecurso } from '../../ui/componentes.js';
import { oQueE } from '../../ui/o-que-e.js';
import { nomeProprio } from '../../nucleo/texto.js';
import { numero, pct, cargoDe, situacaoDe, trajetoriaDe } from '../../nucleo/formato.js';
import { chaveLocal } from '../../nucleo/arquivos.js';
import { lerRota, vistaDe } from '../../nucleo/rotas.js';
import { naUF, pelaUF } from '../../nucleo/ufs.js';
import { forcaLocal } from '../../nucleo/medidas.js';
import { votacaoDe } from './votacao.js';
import { fraseDaDispersao } from './dispersao.js';
import { pintar, despintar } from './pintura.js';
import { dele } from './comum.js';
import * as abaMapa from './aba-mapa.js';
import * as abaMunicipios from './aba-municipios.js';
import * as abaFicha from './aba-ficha.js';

const ABAS = [['mapa', 'Mapa', abaMapa], ['municipios', 'Municípios', abaMunicipios], ['ficha', 'Ficha', abaFicha]];

// a votação de cada eleito é calculada uma vez por visita
const votacoes = new Map();
// o que o mapa mostra agora: de quem é a pintura (tocar num território do mesmo parlamentar não repinta os 11 mil
// locais de SP) e o lugar enquadrado (trocar de aba não mexe no mapa)
const noMapa = { sq: null, lugar: null };

export async function abrir(ctx, rota) {
  const e = ctx.indice.eleitosPorSq.get(rota.sq);
  const info = ctx.indice.ufs.get(e.uf);
  const nome = nomeProprio(e.nome);
  const rotaDaAba = (aba) => ({ vista: 'parlamentar', sq: e.sq, m: rota.m, l: rota.l, aba, params: {} });
  const situacao = situacaoDe(e);

  ctx.conteudo.innerHTML = String(h`
    <header class="cabeca-parlamentar">
      ${foto(e, 'foto-g')}
      <div>
        <h1 class="nome">${nome}</h1>
        <p class="sub">${cargoDe(e)} ${pelaUF(e.uf)}<br>${e.partido}, ${situacao}</p>
        <p class="selos"><span class="selo">${trajetoriaDe(e)}</span> ${marcaRecurso(e)}</p>
      </div>
    </header>
    <dl class="numeros">
      <div><dt>votos ${naUF(e.uf)}</dt><dd>${numero(e.votos)}</dd></div>
      <div><dt>força ${naUF(e.uf)}</dt><dd>${pct(forcaLocal(e.votos, info.concorrentes[e.cargo]))}</dd></div>
    </dl>
    ${dispersao(e, info.medianaDispersao)}
    <nav class="abas" aria-label="Partes da vista">${ABAS.map(([k, rotulo]) =>
      h`<a href="${ctx.href(rotaDaAba(k))}"${k === rota.aba ? h` aria-current="page"` : ''}>${rotulo}</a>`)}</nav>
    <div class="aba"><p class="carregando">Carregando a votação ${pelaUF(e.uf)}…</p></div>`);
  const alvo = ctx.conteudo.querySelector('.aba');

  const [uf, arquivo] = await Promise.all([ctx.dados.uf(e.uf), ctx.dados.parlamentar(e.sq)]);
  const l = rota.l ? uf.localPorChave.get(chaveLocal(rota.m, rota.l.zona, rota.l.numero)) : null;
  if (rota.l && !l) {
    const mun = ctx.indice.municipiosPorIbge.get(rota.m)?.nome;
    throw new Error(`o local de votação ${rota.l.zona}-${rota.l.numero} não está entre os locais de ${mun}`);
  }
  const local = l ? await ctx.dados.local(l.ibge, l.zona, l.numero) : null;
  if (!votacoes.has(e.sq)) {
    votacoes.set(e.sq, votacaoDe({ eleito: e, concorrentesUF: info.concorrentes[e.cargo], uf, parlamentar: arquivo }));
  }
  const v = votacoes.get(e.sq);

  const [, , mod] = ABAS.find(([k]) => k === rota.aba);
  const aba = (await mod.abrir(ctx, rota, e, alvo, { votacao: v, uf, l, local })) ?? {};

  const lugar = `${e.sq}/${rota.m ?? ''}/${l?.li ?? ''}`;
  let aberta = true;
  return {
    titulo: nome,
    local: local?.nome,
    mapa(m, opcoes) {
      if (!aberta) return;
      m.focarUF(e.uf);
      m.mostrarLocais(e.uf, uf);
      if (noMapa.sq !== e.sq) {
        pintar(m, v);
        noMapa.sq = e.sq;
      }
      m.destacar({ m: rota.m ?? null, li: l?.li ?? null });
      if (noMapa.lugar !== lugar) {
        m.enquadrar(l?.ponto ? { ponto: l.ponto } : rota.m ? { m: rota.m } : { uf: e.uf }, opcoes);
        noMapa.lugar = lugar;
        // no computador, o cartão do território tocado sobe para o alto do painel, logo abaixo das abas
        const abas = ctx.conteudo.querySelector('.abas');
        if (rota.m && rota.aba === 'mapa' && abas && matchMedia('(min-width: 900px)').matches) {
          ctx.conteudo.scrollTop = abas.offsetTop - ctx.conteudo.offsetTop - 4;
        }
      }
      aba.mapa?.(m, opcoes);
    },
    // na vista do parlamentar, tocar num território abre o cartão dele sem sair do parlamentar (#7)
    aoClicarNoMapa(alvo) {
      if (!alvo?.m || alvo.uf !== e.uf) return null;
      const lAlvo = alvo.li !== undefined ? { zona: alvo.zona, numero: alvo.numero } : undefined;
      return { vista: 'parlamentar', sq: e.sq, m: alvo.m, l: lAlvo, aba: 'mapa', params: {} };
    },
    dica(alvo) {
      if (!alvo?.m || alvo.uf !== e.uf) return aba.dica?.(alvo);
      const municipio = ctx.indice.municipiosPorIbge.get(alvo.m)?.nome;
      const doLocal = alvo.li !== undefined;
      const x = doLocal ? v.local(alvo.li) : v.municipio(alvo.m);
      const onde = doLocal ? h`<b>Local de votação</b><br>${municipio}, zona ${alvo.zona}` : h`<b>${municipio}</b>`;
      const quanto = x?.votos
        ? h`${numero(x.votos)} ${x.votos === 1 ? 'voto' : 'votos'} · força local ${pct(x.forca)} · ${x.posicao}º lugar`
        : `Nenhum voto ${dele(e)} aqui`;
      return h`${onde}<br>${quanto}`;
    },
    fechar() {
      aberta = false;
      aba.fechar?.();
      // o próximo endereço já está na barra: se ele sai deste parlamentar, a pintura deixa de ser dele
      const proxima = lerRota(location.hash);
      const fica = vistaDe(proxima, ctx.indice) === 'parlamentar';
      if (!fica || proxima.sq !== e.sq) Object.assign(noMapa, { sq: null, lugar: null });
      if (!fica) despintar(ctx.mapa);
    },
  };
}

// Dispersão da votação (#12): a frase e uma régua de 0% (concentrado) a 50% (espalhado como o eleitorado), com a
// mediana dos deputados da UF como referência, só para deputado.
function dispersao(e, mediana) {
  const f = fraseDaDispersao(e, mediana);
  const pos = (x) => `left: ${Math.min(100, Math.max(0, (x / 0.5) * 100)).toFixed(1)}%`;
  return h`<figure class="dispersao">
    <p class="dispersao-frase">${f.antes}<b>${f.x}</b>${f.depois} ${f.espalhado} ${oQueE('dispersao')}</p>
    <div class="regua" aria-hidden="true">
      <span class="regua-trilho"></span>
      ${f.referencia ? h`<span class="regua-mediana" style="${pos(mediana)}"></span>` : ''}
      <span class="regua-ponto" style="${pos(e.dispersao)}"></span>
    </div>
    <p class="regua-pontas" aria-hidden="true"><span>concentrado</span><span>50%: espalhado</span></p>
    ${f.referencia ? h`<figcaption class="nota"><span class="regua-marca" aria-hidden="true"></span>${f.referencia}</figcaption>` : ''}
  </figure>`;
}
