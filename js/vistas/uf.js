// Entrada da UF (#7): o mapa neutro da UF e a lista dos eleitos por cargo, os mais votados primeiro. Cada bloco
// mostra a data da própria totalização (#10), e a cadeira de senador sem eleito aparece como "aguardando nova eleição".
import { h } from '../ui/html.js';
import { linhaEleito } from '../ui/componentes.js';
import { pelaUF, daUF } from '../nucleo/ufs.js';
import { agrupar } from '../nucleo/lista.js';
import { dataBR, casaDe } from '../nucleo/formato.js';
import { oQueE } from '../ui/o-que-e.js';

export async function abrir(ctx, rota) {
  const { indice } = ctx;
  const uf = rota.uf;
  const info = indice.ufs.get(uf);
  const blocos = agrupar(indice.eleitos.filter((e) => e.uf === uf));
  const doCargo = (cargo) => blocos.find((b) => b.cargo === cargo)?.ufs[0].eleitos ?? [];

  const bloco = (cargo) => {
    const eleitos = doCargo(cargo);
    const vagas = eleitos.length + (cargo === 5 ? info.senadoresAguardando : 0);
    const aguardando = cargo === 5 ? Array.from({ length: info.senadoresAguardando }) : [];
    return h`
      <section class="bloco-cargo" aria-labelledby="c-${cargo}">
        <h2 class="bloco-titulo" id="c-${cargo}">${casaDe(cargo)}: ${vagas} ${vagas === 1 ? 'vaga' : 'vagas'}</h2>
        <p class="bloco-data">Totalização: ${dataBR(info.totalizacao[cargo])}${cargo === 5
          ? h`. ${oQueE('foto-do-resultado', 'Por que cada cargo tem uma data?')}` : ''}</p>
        <ul class="lista-eleitos">${eleitos.map((e) => linhaEleito(e))}${aguardando.map(() => h`
          <li><div class="eleito eleito-vago"><span class="foto foto-vaga" aria-hidden="true"></span>
            <span class="eleito-nome">Cadeira aguardando nova eleição</span>
            <span class="eleito-sub">O registro do eleito foi negado em definitivo, e a lei manda fazer nova eleição.
              ${oQueE('retotalizacao')}</span>
          </div></li>`)}</ul>
      </section>`;
  };

  ctx.conteudo.innerHTML = String(h`
    <h1 class="titulo">De onde vieram os votos dos eleitos ${pelaUF(uf)}</h1>
    <p class="nota">Escolha um parlamentar para ver no mapa onde ele foi votado. Ou toque num município para ver como
      ele votou.</p>
    ${bloco(5)}${bloco(6)}
    <p class="todos"><a class="botao leve" href="${ctx.href({ vista: 'eleitos', params: { uf: uf.toLowerCase() } })}">Filtrar os
      eleitos ${daUF(uf)}</a></p>`);

  let aberta = true;
  return {
    titulo: `Eleitos ${pelaUF(uf)}`,
    async mapa(m, { animar }) {
      m.neutro();
      m.focarUF(uf);
      m.destacar({});
      m.enquadrar({ uf }, { animar });
      const dadosUF = await ctx.dados.uf(uf);
      if (aberta) m.mostrarLocais(uf, dadosUF);
    },
    fechar() { aberta = false; },
  };
}
