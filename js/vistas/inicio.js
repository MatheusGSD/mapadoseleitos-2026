// Entrada do Brasil: o mapa neutro e as 27 UFs, por região. A eleição de deputado e senador é por UF, então a
// entrada pede uma UF antes de qualquer lista (#7: sem mapa do mais votado). Em cima, a entrada da cobrança (#43):
// o município escolhido abre já em "Quem cobrar".
import { h } from '../ui/html.js';
import { montarBusca } from '../ui/caixa-busca.js';
import { UFS, REGIOES } from '../nucleo/ufs.js';
import { numero } from '../nucleo/formato.js';
import { DESCRICAO } from '../config.js';

export async function abrir(ctx) {
  const { indice } = ctx;
  const deputados = new Map();
  for (const e of indice.eleitos) if (e.cargo === 6) deputados.set(e.uf, (deputados.get(e.uf) || 0) + 1);
  const porRegiao = REGIOES.map((r) => [r, [...UFS.values()].filter((u) => u.regiao === r)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))]);

  ctx.conteudo.innerHTML = String(h`
    <h1 class="titulo">${DESCRICAO}</h1>
    <p class="nota">Escolha uma UF para ver os eleitos dela e, no mapa, de onde veio cada voto. Ou busque um
      parlamentar ou um município. Cada UF elegeu 2 senadores; o número de deputados segue a população.</p>
    <div class="cobrar-entrada">
      <div class="busca" id="cobrar-busca"></div>
      <p class="nota">Veja quem teve voto no seu município e mande a cada um uma mensagem pronta, com os números dele.</p>
    </div>
    ${porRegiao.map(([regiao, ufs]) => h`
      <section class="regiao" aria-labelledby="r-${regiao}">
        <h2 class="regiao-nome" id="r-${regiao}">${regiao}</h2>
        <ul class="ufs">${ufs.map((u) => h`
          <li><a href="${ctx.href({ vista: 'uf', uf: u.sigla })}" data-uf="${u.sigla}">
            <span class="uf-sigla">${u.sigla}</span><span class="uf-nome">${u.nome}</span>
            <span class="uf-vagas">${deputados.get(u.sigla) ?? 0} deputados</span></a></li>`)}</ul>
      </section>`)}
    <p class="todos"><a class="botao leve" href="${ctx.href({ vista: 'eleitos', params: {} })}">Ver os ${numero(indice.eleitos.length)}
      eleitos, com filtros</a></p>`);

  montarBusca(ctx.conteudo.querySelector('#cobrar-busca'), {
    busca: ctx.busca, navegar: (r) => ctx.navegar(r), id: 'cobrar',
    rotulo: 'Cobrar: qual é o seu município?', dica: 'Nome do município',
    rotaDoMunicipio: (m) => ({ vista: 'territorio', uf: m.uf, m: m.ibge, params: { aba: 'cobrar' } }),
  });

  // passar o mouse numa UF da lista acende a UF no mapa
  let mapa = null;
  for (const a of ctx.conteudo.querySelectorAll('[data-uf]')) {
    a.addEventListener('mouseenter', () => mapa?.map?.setFeatureState({ source: 'ufs', id: a.dataset.uf }, { hover: true }));
    a.addEventListener('mouseleave', () => mapa?.map?.setFeatureState({ source: 'ufs', id: a.dataset.uf }, { hover: false }));
  }

  return {
    mapa(m, { animar }) {
      mapa = m;
      m.neutro();
      m.mostrarLocais(null, null);
      m.focarUF(null);
      m.destacar({});
      m.enquadrar({}, { animar });
    },
    // no Brasil inteiro, um toque escolhe a UF
    aoClicarNoMapa: (alvo) => (alvo?.uf ? { vista: 'uf', uf: alvo.uf } : null),
    dica: (alvo) => h`<b>${UFS.get(alvo.uf)?.nome}</b><br>Ver os eleitos`,
  };
}
