// Aba Ficha da vista do parlamentar: ticket #24, como decidiu "Conteúdo da ficha" (#11). O estilo vai em
// estilo/ficha.css (carregado com a vista). O que cada bloco diz sai de ficha.js, sem DOM; aqui só se escreve o HTML.
//
// O arquivo `ficha` (f/<sq>.json, sexto tipo, gerado pelo pipeline ficha do #19) só é pedido quando a aba abre. A
// foto do TSE é a mesma do cabeçalho (js/ui/componentes.js), e já está no cache. Parâmetro no endereço: todos=1 (a
// lista inteira dos projetos).
import { h } from '../../ui/html.js';
import { urlDaFoto } from '../../ui/componentes.js';
import { nomeProprio } from '../../nucleo/texto.js';
import { fichaDe } from './ficha.js';

const fora = (url, texto) => h`<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;
const dominio = (url) => new URL(url).hostname.replace(/^www\d*\./, '');
// ao recolher a lista inteira pelo link do fim, a ficha volta ao começo dos projetos
let rolarParaProjetos = false;

export async function abrir(ctx, rota, e, alvo) {
  alvo.innerHTML = String(h`<p class="carregando">Carregando a ficha…</p>`);
  let arquivo;
  try {
    arquivo = await ctx.dados.json(`f/${e.sq}.json`);
  } catch (erro) {
    alvo.innerHTML = String(h`<div class="aviso-erro"><p><b>A ficha não carregou.</b> ${erro.message}.</p>
      <p>Confira a conexão e abra a aba de novo.</p></div>`);
    return;
  }
  const todos = rota.params.todos === '1';
  const f = fichaDe(e, arquivo, { todos });
  const nome = nomeProprio(e.nome);
  const ir = (params) => ctx.href({ vista: 'parlamentar', sq: e.sq, m: rota.m, l: rota.l, aba: 'ficha', params });

  alvo.innerHTML = String(h`<div class="ficha">
    ${f.recurso ? h`<section class="ficha-recurso" aria-label="Registro sob recurso">
      <h2>Registro sob recurso</h2><p>${f.recurso}</p></section>` : ''}
    ${biografia(f.biografia)}
    ${projetos(f, { ir, todos })}
    ${candidatura(f, e, nome)}
    <section class="ficha-bloco ficha-links">
      <h2>Em outros sites</h2>
      <ul>${f.links.map((l) => h`<li>${fora(l.url, l.rotulo)} <span class="dominio">${dominio(l.url)}</span></li>`)}</ul>
    </section>
  </div>`);

  for (const a of alvo.querySelectorAll('[data-menos]')) a.addEventListener('click', () => { rolarParaProjetos = true; });
  if (rolarParaProjetos) {
    rolarParaProjetos = false;
    alvo.querySelector('.ficha-projetos')?.scrollIntoView({ block: 'start' });
  }
}

function biografia(b) {
  return h`<section class="ficha-bloco ficha-bio">
    <h2>Biografia</h2>
    ${b.texto ? h`<p class="bio">${b.texto}</p>
      <p class="credito">Trecho da Wikipédia, “${fora(b.url, b.titulo)}”,
        ${fora('https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br', 'CC BY-SA 4.0')}. ${b.captura}.</p>`
    : h`<p class="nota">${b.semTrecho}</p>`}
  </section>`;
}

function projetos(f, { ir, todos }) {
  const p = f.projetos;
  if (p.semProjeto) {
    return h`<section class="ficha-bloco ficha-projetos">
      <h2>Projetos</h2>
      <p class="vazio">${p.semProjeto}</p>
      ${p.coautor ? h`<p class="projetos-coautor">${p.coautor}.</p>` : ''}
      <p class="credito">${p.captura}.</p>
      <h3 class="cand-titulo">${f.candidaturas.titulo}</h3>
      ${listaDeCandidaturas(f.candidaturas)}
    </section>`;
  }
  const menos = (rotulo) => h`<a class="botao leve" href="${ir({})}" data-menos>${rotulo}</a>`;
  return h`<section class="ficha-bloco ficha-projetos">
    <h2>Projetos</h2>
    <p class="projetos-resumo">${p.resumo}${p.normas ? h`<span class="projetos-normas">${p.normas}</span>` : ''}</p>
    <p class="nota">${p.nota} ${p.verTodos ? 'Os mais recentes:' : ''}</p>
    ${p.verMenos ? h`<p class="projetos-acoes"><a href="${ir({})}">${p.verMenos}</a></p>` : ''}
    ${todos ? porAno(p.itens) : h`<ol class="projetos">${p.itens.map(item)}</ol>`}
    <p class="projetos-acoes">${p.verTodos ? h`<a class="botao leve" href="${ir({ todos: '1' })}">${p.verTodos}</a>` : ''}${p.verMenos
      ? menos(p.verMenos) : ''}</p>
    ${p.coautor ? h`<p class="projetos-coautor">${p.coautor}.</p>` : ''}
    ${p.links.length ? h`<p class="projetos-casas">${p.links.map((l) => fora(l.url, l.rotulo))}</p>` : ''}
    <p class="credito">${p.captura}.</p>
  </section>`;
}

// a lista inteira, com o ano de apresentação como divisória (Amom Mandel tem 1.222 projetos)
function porAno(itens) {
  const anos = [];
  for (const x of itens) {
    const ano = x.data.slice(-4);
    if (anos.at(-1)?.ano !== ano) anos.push({ ano, itens: [] });
    anos.at(-1).itens.push(x);
  }
  return anos.map((a) => h`<div class="projetos-do-ano">
    <h3 class="projetos-ano">${a.ano}<span>${a.itens.length} ${a.itens.length === 1 ? 'projeto' : 'projetos'}</span></h3>
    <ol class="projetos">${a.itens.map(item)}</ol></div>`);
}

const item = (x) => h`<li class="projeto">
  <p class="projeto-cab">${fora(x.url, x.rotulo)}${x.norma ? h`<span class="selo selo-norma">virou norma</span>` : ''}
    <span class="projeto-casa">${x.casa}, ${x.data}</span></p>
  <p class="projeto-ementa">${x.ementa}</p>
</li>`;

function listaDeCandidaturas(c) {
  if (!c.itens.length) return h`<p class="nota">${c.vazio}</p>`;
  return h`<ol class="candidaturas">${c.itens.map((x) => h`<li>
    <span class="cand-ano">${x.ano}</span>
    <span class="cand-o-que"><b>${x.cargo}</b>, ${x.onde}<span class="cand-sub">${x.partido}${x.resultado
      ? `, ${x.resultado}` : ''}</span></span>
  </li>`)}</ol>`;
}

function candidatura(f, e, nome) {
  const b = f.bens;
  const url = urlDaFoto(e);
  return h`<section class="ficha-bloco ficha-tse">
    <h2>Dados da candidatura (TSE)</h2>
    <div class="tse-cartao">
      ${url ? h`<figure class="tse-foto"><img src="${url}" alt="Foto de ${nome} na candidatura" width="161" height="225">
        <figcaption class="credito">Foto: TSE</figcaption></figure>` : ''}
      <dl class="fatos">${f.tse.map(([k, v]) => h`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
    </div>
    <div class="tse-bens">
      <h3>Bens declarados</h3>
      <p class="bens-total">${b.resumo}</p>
      ${b.itens.length ? h`<details class="recolhe"><summary>Ver ${b.itens.length === 1 ? 'o bem' : `os ${b.itens.length} bens`}</summary>
        <ul class="bens">${b.itens.map((x) => h`<li><span>${x.tipo}</span><span class="bens-valor">${x.valor}</span></li>`)}</ul>
      </details>
      <p class="nota">${b.ressalva}</p>` : ''}
    </div>
    ${f.candidaturas.aberta ? '' : h`<details class="recolhe tse-candidaturas"><summary>${f.candidaturas.titulo}</summary>
      ${listaDeCandidaturas(f.candidaturas)}</details>`}
  </section>`;
}
