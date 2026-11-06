// Aba Mapa da vista do parlamentar: ticket #22.
// O cartão do município ou do local tocado (votos, força local, peso, posição, "Como X votou" e, no local, as seções)
// e a legenda da força local em faixas da escala dele (#5, #7, #12), com a contagem de municípios por faixa. A
// pintura do mapa fica em pintura.js, porque vale para as três abas.
import { h } from '../../ui/html.js';
import { numero, pct, cargoNome } from '../../nucleo/formato.js';
import { daUF, naUF } from '../../nucleo/ufs.js';
import { dele, intervalo, doCargo } from './comum.js';
import { COR_SEM_VOTO } from './escala.js';
import { oQueE } from '../../ui/o-que-e.js';

export async function abrir(ctx, rota, e, alvo, { votacao: v, uf, l, local }) {
  const municipio = rota.m ? ctx.indice.municipiosPorIbge.get(rota.m) : null;
  alvo.innerHTML = String(h`${municipio ? cartao(ctx, rota, e, v, { municipio, uf, l, local }) : ''}${legenda(e, v)}`);
}

const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;

function cartao(ctx, rota, e, v, { municipio, uf, l, local }) {
  const x = l ? v.local(l.li) : v.municipio(municipio.ibge);
  const noNucleo = !l && v.nucleo.some((m) => m.ibge === municipio.ibge);
  const deParlamentar = (t) => ctx.href({ vista: 'parlamentar', sq: e.sq, ...t, aba: 'mapa', params: {} });
  const comoVotou = ctx.href({
    vista: 'territorio', uf: e.uf, m: municipio.ibge, l: rota.l, params: { c: String(e.cargo), de: String(e.sq) },
  });
  const sub = l
    ? h`Local de votação em ${municipio.nome}, zona ${l.zona} · ${plural(local.secoes.length, 'seção', 'seções')} ·
        eleitorado de ${numero(local.eleitorado)}`
    : h`Município ${daUF(e.uf)}`;
  return h`<section class="cartao cartao-territorio" aria-labelledby="cartao-nome">
    <h2 id="cartao-nome">${l ? local.nome : municipio.nome}</h2>
    <p class="sub">${sub}</p>
    ${l && (local.endereco || local.bairro) ? h`<p class="endereco">${[local.endereco, local.bairro].filter(Boolean).join(', ')}</p>` : ''}
    ${noNucleo || (l && !l.ponto) ? h`<p class="selos">${noNucleo ? h`<span class="selo selo-nucleo">núcleo da votação</span>` : ''}
      ${l && !l.ponto ? h`<span class="selo" title="Sem coordenada, ou com a mesma coordenada de outro local">sem ponto no mapa</span>` : ''}</p>` : ''}
    <dl class="numeros pequenos">
      <div><dt>votos</dt><dd>${numero(x.votos)}</dd></div>
      <div><dt>força local</dt><dd>${pct(x.forca)}</dd></div>
      <div><dt>peso na votação</dt><dd>${pct(x.peso)}</dd></div>
      <div><dt>posição</dt><dd>${x.posicao ? h`${x.posicao}º <small>de ${numero(v.candidatos)}</small>` : '—'}</dd></div>
    </dl>
    <p class="acoes"><a class="botao" href="${comoVotou}">Como ${l ? 'este local' : municipio.nome} votou</a>
      ${l ? h`<a class="botao leve" href="${deParlamentar({ m: municipio.ibge })}">Voltar a ${municipio.nome}</a>`
        : h`<a class="botao leve" href="${deParlamentar({})}">Voltar ${aUF(e.uf)}</a>`}</p>
    ${l ? secoes(e, uf, local) : h`<p class="nota">A posição conta os ${numero(v.candidatos)} candidatos a
      ${cargoNome(e.cargo).toLowerCase()} ${naUF(e.uf)}. Ao aproximar o mapa, os locais de votação viram círculos: toque
      num para ver as seções. ${oQueE('medidas', 'O que são estas medidas?')}</p>`}
  </section>`;
}

// "ao Rio Grande do Norte", "à Bahia", "a Minas Gerais"
function aUF(sigla) {
  const d = daUF(sigla);
  return d.startsWith('do ') ? 'ao ' + d.slice(3) : d.startsWith('da ') ? 'à ' + d.slice(3) : 'a ' + d.slice(3);
}

// as seções do local, com os votos dele e os votos concorrentes do cargo em cada uma (o arquivo do local, #9)
function secoes(e, uf, local) {
  const coluna = local.eleitos.indexOf(uf.candidatoPorSq.get(e.sq).ci);
  const linhas = local.secoes.map((s) => {
    const votos = coluna < 0 ? 0 : s.votos[coluna];
    const conc = s.concorrentes[e.cargo];
    return h`<tr><td>${s.secao}</td><td>${numero(votos)}</td><td>${numero(conc)}</td><td>${pct(conc ? votos / conc : 0)}</td></tr>`;
  });
  return h`<h3 class="secoes-titulo">Seções deste local</h3>
    <div class="rolagem"><table class="tabela num secoes">
      <thead><tr><th>Seção</th><th>votos ${dele(e)}</th><th>votos concorrentes</th><th>força local</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>`;
}

function legenda(e, v) {
  const { escala, contagem, nucleo, semPonto } = v;
  const linhas = escala.faixas.map((f, i) => ({ ...f, n: contagem.faixas[i] })).reverse();
  return h`<section class="legenda" aria-labelledby="legenda-titulo">
    <h2 id="legenda-titulo">Força local em cada município</h2>
    <p class="nota">Votos ${dele(e)} ÷ votos concorrentes ${doCargo(e.cargo)} no município. A escala é só ${dele(e)}: as
      faixas são múltiplos da média ${dele(e)} ${naUF(e.uf)}, ${pct(escala.base)}. ${oQueE('escala')}</p>
    <table class="tabela legenda-tabela">
      <thead><tr><th><span class="so-leitor">Cor</span></th><th>força local</th><th><span class="so-leitor">Faixa</span></th>
        <th class="num">municípios</th></tr></thead>
      <tbody>${linhas.map((f) => h`<tr${f.n ? '' : h` class="vazia"`}>
        <td><span class="amostra" style="background: ${f.cor}"></span></td><td>${intervalo(f)}</td><td>${f.rotulo}</td>
        <td class="num">${numero(f.n)}</td></tr>`)}
        <tr><td><span class="amostra amostra-sem-voto" style="background: ${COR_SEM_VOTO}"></span></td><td>nenhum voto</td><td></td>
          <td class="num">${numero(contagem.zero)}</td></tr>
      </tbody>
    </table>
    ${nucleo.length ? h`<p class="legenda-nucleo"><span class="amostra amostra-nucleo" aria-hidden="true"></span>
      <span><b>Núcleo da votação:</b> ${nucleo.length === 1 ? 'o município' : h`os ${numero(nucleo.length)} municípios`} de maior
      força local que, ${nucleo.length === 1 ? 'sozinho, deu' : 'somados, deram'} metade dos votos ${dele(e)}. Diz onde
      ${e.genero === 'FEMININO' ? 'ela' : 'ele'} foi melhor, não onde domina. ${oQueE('nucleo')}</span></p>`
      : h`<p class="nota">No Distrito Federal, que é um município só, não há núcleo da votação: os círculos dos locais
      mostram de onde vieram os votos. ${oQueE('nucleo')}</p>`}
    <p class="nota">Ao aproximar o mapa, os locais de votação viram círculos com as mesmas cores, e a área de cada um é
      proporcional aos votos ${dele(e)} ali.${semPonto.locais ? h` Dos locais com voto ${dele(e)},
      ${numero(semPonto.locais)} ${semPonto.locais === 1 ? 'não tem' : 'não têm'} ponto no mapa (sem coordenada, ou com a
      de outro local): são ${plural(semPonto.votos, 'voto', 'votos')} que contam no município, mas não viram círculo.
      ${oQueE('sem-ponto')}` : ''}</p>
  </section>`;
}
