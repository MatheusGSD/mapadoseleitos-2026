// Busca e filtros (#6): a lista dos eleitos em blocos por cargo, agrupada por UF, com os filtros combinados por E entre
// critérios e OU dentro de cada um. Tudo fica no endereço. Os filtros não pintam o mapa: a cor do mapa pertence sempre
// a um parlamentar.
import { h } from '../ui/html.js';
import { linhaEleito } from '../ui/componentes.js';
import { CRITERIOS, lerFiltros, escreverFiltros, filtrar, contar, alternar, opcoes, idadeNaPosse } from '../nucleo/filtros.js';
import { agrupar, ORDENS } from '../nucleo/lista.js';
import { UFS } from '../nucleo/ufs.js';
import { numero, casaDe } from '../nucleo/formato.js';
import { oQueE } from '../ui/o-que-e.js';

const umaUF = (f) => (f.get('uf')?.size === 1 ? [...f.get('uf')][0].toUpperCase() : null);
const ROTULO_ORDEM = { votos: 'Mais votados', nome: 'Nome', idade: 'Mais novos' };
let filtrosAbertos = false; // o painel de filtros continua aberto entre um clique e outro

export async function abrir(ctx, rota, anterior) {
  const { indice, busca } = ctx;
  const params = rota.params;
  const q = (params.q ?? '').trim();
  const ordem = ORDENS.includes(params.ord) ? params.ord : 'votos';
  const filtros = lerFiltros(params);

  const daBusca = q ? busca.eleitos(q) : null;
  const base = daBusca ? indice.eleitos.filter((e) => daBusca.has(e.sq)) : indice.eleitos;
  const achados = filtrar(base, filtros);
  const contagem = contar(base, filtros);
  const municipios = q ? busca.sugerir(q, { parlamentares: 0, municipios: 8 }).municipios : [];

  const ir = (mudanca) => ({ vista: 'eleitos', params: { ...(q ? { q } : {}), ...escreverFiltros(filtros), ...(ordem !== 'votos' ? { ord: ordem } : {}), ...mudanca } });
  const rotuloDe = new Map(CRITERIOS.map((c) => [c.chave, new Map(opcoes(indice.eleitos, c.chave).map((o) => [o.valor, o.rotulo]))]));
  const ligados = [...filtros].flatMap(([chave, valores]) => [...valores].map((valor) => ({ chave, valor })));

  const criterio = (c) => {
    const n = contagem.get(c.chave);
    const ops = opcoes(indice.eleitos, c.chave);
    return h`<fieldset class="criterio criterio-${c.chave}">
      <legend>${c.rotulo}${c.nota ? h` <small>${c.nota}</small>` : ''}${c.chave === 'trajetoria' ? h` <small>${oQueE('trajetoria')}</small>` : ''}</legend>
      <div class="opcoes">${ops.map((o) => {
        const k = n.get(o.valor) ?? 0;
        const ligado = filtros.get(c.chave)?.has(o.valor) ?? false;
        return h`<button type="button" class="opcao${k ? '' : ' zero'}" aria-pressed="${ligado}" data-chave="${c.chave}"
          data-valor="${o.valor}">${o.rotulo} <span class="n">${numero(k)}</span></button>`;
      })}</div></fieldset>`;
  };

  const blocos = agrupar(achados, ordem);
  const extra = (e) => (ordem === 'idade' ? `${idadeNaPosse(e.nascimento)} anos` : '');

  ctx.conteudo.innerHTML = String(h`
    <h1 class="titulo">Eleitos</h1>
    <p class="contagem">${numero(achados.length)} de ${numero(indice.eleitos.length)} eleitos${q ? h` com “${q}”` : ''}</p>
    ${municipios.length ? h`<p class="municipios-achados">Municípios: ${municipios.map((m, i) => h`${i ? ', ' : ''}<a
      href="${ctx.href({ vista: 'territorio', uf: m.uf, m: m.ibge, params: {} })}">${m.nome} (${m.uf})</a>`)}</p>` : ''}
    ${q || ligados.length ? h`<div class="ligados" aria-label="Filtros ligados">
      ${q ? h`<a class="ligado" href="${ctx.href(ir({ q: '' }))}" aria-label="Tirar a busca por ${q}">“${q}” <span aria-hidden="true">✕</span></a>` : ''}
      ${ligados.map(({ chave, valor }) => h`<button type="button" class="ligado" data-chave="${chave}" data-valor="${valor}"
        aria-label="Tirar o filtro ${rotuloDe.get(chave).get(valor) ?? valor}">${rotuloDe.get(chave).get(valor) ?? valor} <span aria-hidden="true">✕</span></button>`)}
      ${ligados.length ? h`<a class="limpar" href="${ctx.href({ vista: 'eleitos', params: q ? { q } : {} })}">Limpar os filtros</a>` : ''}
    </div>` : ''}
    <details class="filtros"${filtrosAbertos ? ' open' : ''}>
      <summary>Filtrar${ligados.length ? ` (${ligados.length} ${ligados.length === 1 ? 'filtro ligado' : 'filtros ligados'})` : ''}</summary>
      <p class="nota">Valores de um mesmo critério se somam (PT ou PL); critérios diferentes se cruzam (PT ou PL, e mulheres).</p>
      ${CRITERIOS.map(criterio)}
    </details>
    <div class="ordem">
      <span class="ordem-rotulo" id="ordem-rotulo">Dentro de cada UF:</span>
      <div class="segmentado" role="group" aria-labelledby="ordem-rotulo">${ORDENS.map((o) => h`<a href="${ctx.href(ir({ ord: o === 'votos' ? '' : o }))}"
        aria-current="${o === ordem}" data-ordem="${o}">${ROTULO_ORDEM[o]}</a>`)}</div>
    </div>
    ${achados.length ? blocos.map((b) => h`
      <section class="bloco-cargo" aria-labelledby="b-${b.cargo}">
        <h2 class="bloco-titulo" id="b-${b.cargo}">${casaDe(b.cargo)}</h2>
        ${b.ufs.map((g) => h`<h3 class="grupo-uf"><a href="${ctx.href({ vista: 'uf', uf: g.uf })}">${UFS.get(g.uf).nome}</a>
          <span class="n">${g.eleitos.length}</span></h3>
          <ul class="lista-eleitos">${g.eleitos.map((e) => linhaEleito(e, { extra: extra(e) }))}</ul>`)}
      </section>`)
    : h`<p class="vazio">Nenhum eleito passa em todos esses filtros. Tire um deles ou
        <a href="${ctx.href({ vista: 'eleitos', params: {} })}">limpe a busca e os filtros</a>.</p>`}`);

  // trocar um filtro redesenha o painel, e uma região viva dentro dele nasceria de novo, sem ser lida: a contagem vai
  // para a região de status fixa do painel (#33)
  if (anterior?.vista === 'eleitos') ctx.anunciar?.(`${numero(achados.length)} de ${numero(indice.eleitos.length)} eleitos`);

  const detalhes = ctx.conteudo.querySelector('details.filtros');
  detalhes.addEventListener('toggle', () => { filtrosAbertos = detalhes.open; });
  for (const b of ctx.conteudo.querySelectorAll('button[data-chave]')) {
    b.addEventListener('click', () => {
      const novo = alternar(filtros, b.dataset.chave, b.dataset.valor);
      const foco = b.classList.contains('opcao') ? `.opcao[data-chave="${b.dataset.chave}"][data-valor="${b.dataset.valor}"]` : null;
      ctx.navegar({ vista: 'eleitos', params: { ...(q ? { q } : {}), ...escreverFiltros(novo), ...(ordem !== 'votos' ? { ord: ordem } : {}) } }, { substituir: true });
      if (foco) requestAnimationFrame(() => ctx.conteudo.querySelector(foco)?.focus());
    });
  }
  for (const a of ctx.conteudo.querySelectorAll('a[data-ordem]')) {
    a.addEventListener('click', (ev) => { ev.preventDefault(); ctx.navegar(ir({ ord: a.dataset.ordem === 'votos' ? '' : a.dataset.ordem }), { substituir: true }); });
  }

  const soUma = umaUF(filtros);
  // trocar um filtro não move o mapa, a não ser que mude a UF única do filtro
  const moveu = anterior?.vista !== 'eleitos' || umaUF(lerFiltros(anterior.params)) !== soUma;
  return {
    titulo: q ? `Eleitos com “${q}”` : 'Eleitos',
    mapa(m, { animar }) {
      m.neutro();
      m.mostrarLocais(null, null);
      m.focarUF(soUma);
      m.destacar({});
      if (moveu) m.enquadrar(soUma ? { uf: soUma } : {}, { animar });
    },
  };
}
