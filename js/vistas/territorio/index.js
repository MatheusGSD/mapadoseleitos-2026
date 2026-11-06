// Vista do território (município e local de votação): ticket #23. O estilo vai em estilo/territorio.css.
//
// "Como este território votou" (#5, #7, #10): o ranking de um cargo (deputado federal | senador, nunca misturados),
// com o filtro "Só eleitos | Todos", que só esconde linhas; a posição e a força local contam todos os candidatos e
// o voto de legenda, como o TSE, e cada linha leva a marca da destinação do voto. No município, a lista dos locais
// de votação; no local, a tabela das seções. O mapa não pinta medida aqui: só destaca o território (#5).
// A lógica fica em ranking.js e listas.js (testes em testes/territorio/); este módulo só desenha.
//
// No município, a vista tem duas partes: "Como votou" e "Quem cobrar" (#43, em cobranca.js, carregado só quando ela
// abre). O local de votação não tem cobrança.
//
// Endereço: #/<UF>/<ibge>[/<zona>-<número>][?c=5&f=todos&todos=1&de=<sq>] (ver lerEstado em ranking.js);
// a cobrança: #/<UF>/<ibge>?aba=cobrar[&ord=peso&todos=1&de=<sq>] (ver lerEstado em nucleo/cobranca.js).
import { h } from '../../ui/html.js';
import { chaveLocal } from '../../nucleo/arquivos.js';
import { nomeProprio } from '../../nucleo/texto.js';
import { numero, pct, dataBR } from '../../nucleo/formato.js';
import { daUF } from '../../nucleo/ufs.js';
import { ranking, mostrar, rotuloOutros, lerEstado, escreverEstado } from './ranking.js';
import { locaisDoMunicipio, tabelaDasSecoes, contagemDosLocais } from './listas.js';
import { oQueE } from '../../ui/o-que-e.js';

// a marca da destinação do voto, com o texto do #10 na dica e na nota embaixo do ranking
const MARCAS = {
  sub_judice: { rotulo: 'sub judice', texto: 'Registro negado, com recurso pendente. Estes votos só valem se o registro for aceito.' },
  anulado: { rotulo: 'anulado', texto: 'Registro negado ou cassado em definitivo. Estes votos não valem para ninguém.' },
};
const CARGO = { 6: 'Deputado federal', 5: 'Senador' };
const PARA = { 6: 'deputado federal', 5: 'senador' };
const LOCAIS = 8; // locais de votação antes de "Ver todos (N)", como no protótipo
const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;

export async function abrir(ctx, rota, anterior) {
  const { indice } = ctx;
  const mun = indice.municipiosPorIbge.get(rota.m);
  const de = rota.params.de ? indice.eleitosPorSq.get(Number(rota.params.de)) : undefined;
  const estado = lerEstado(rota.params, de);
  const { cargo } = estado;

  // o arquivo da UF e o do território vêm juntos: no primeiro clique numa UF, é um pedido a menos na fila
  const pUF = ctx.dados.uf(rota.uf);
  const pArquivo = rota.l ? ctx.dados.local(rota.m, rota.l.zona, rota.l.numero) : ctx.dados.municipio(rota.m);
  pArquivo.catch(() => {});
  const dadosUF = await pUF;
  const l = rota.l && dadosUF.localPorChave.get(chaveLocal(rota.m, rota.l.zona, rota.l.numero));
  if (rota.l && !l) throw new Error(`o local ${rota.l.zona}-${rota.l.numero} não está entre os locais de ${mun.nome}`);
  const arquivo = await pArquivo;
  const local = rota.l ? arquivo : null;

  const territorio = l ?? dadosUF.municipioPorIbge.get(rota.m);
  const eleitos = indice.eleitos.filter((e) => e.uf === rota.uf && e.cargo === cargo);
  const r = ranking({ arquivo, uf: dadosUF, cargo, concorrentes: territorio.concorrentes[cargo], eleitos });
  const v = mostrar(r, estado);
  const doIndice = new Map(eleitos.map((e) => [e.sq, e]));
  const nCandidatos = r.linhas.filter((x) => x.tipo === 'candidato').length;
  const maxForca = Math.max(0, ...r.linhas.map((x) => x.forca));

  const ir = (mudanca) => ({ vista: 'territorio', uf: rota.uf, m: rota.m, l: rota.l,
    params: escreverEstado({ ...estado, ...mudanca }, rota.params, de) });
  // os controles do ranking: cargo, "Só eleitos | Todos" e "Ver todos"
  const DESTINO = {
    c6: ir({ cargo: 6, todas: false }), c5: ir({ cargo: 5, todas: false }),
    eleitos: ir({ soEleitos: true, todas: false }), todos: ir({ soEleitos: false, todas: false }), 'ver-todos': ir({ todas: true }),
  };
  const nomeAqui = local ? 'este local' : mun.nome;

  // ---------- cabeçalho ----------
  const eleitorado = local ? local.eleitorado : arquivo.locais.reduce((s, x) => s + x.eleitorado, 0);
  const sub = local
    ? h`Local de votação em ${mun.nome} · zona ${l.zona} · ${plural(local.secoes.length, 'seção', 'seções')} ·
      ${numero(eleitorado)} eleitores aptos`
    : h`Município ${daUF(rota.uf)} · ${plural(arquivo.locais.length, 'local de votação', 'locais de votação')} ·
      ${numero(eleitorado)} eleitores aptos`;
  const endereco = local && [local.endereco, local.bairro].filter(Boolean).join(' · ');
  const voltar = de ? h`<a class="voltar" href="${ctx.href({ vista: 'parlamentar', sq: de.sq, m: rota.m, l: rota.l, aba: 'mapa', params: {} })}">‹ Voltar para ${nomeProprio(de.nome)}</a>` : '';
  const cabeca = h`<header class="cabeca-territorio">
      <h1 class="nome${local ? ' nome-local' : ''}">${local ? local.nome : mun.nome}</h1>
      <p class="sub">${sub}</p>
      ${endereco ? h`<p class="endereco">${endereco}</p>` : ''}
    </header>`;

  // ---------- as partes do município ----------
  const cobrar = !local && rota.params.aba === 'cobrar';
  const doDe = rota.params.de ? { de: rota.params.de } : {};
  const parte = (aba) => ({ vista: 'territorio', uf: rota.uf, m: rota.m, params: aba ? { aba, ...doDe } : doDe });
  const abas = local ? '' : h`<nav class="abas" aria-label="Partes da vista">${[[null, 'Como votou'], ['cobrar', 'Quem cobrar']]
    .map(([aba, rotulo]) => h`<a href="${ctx.href(parte(aba))}"${(aba === 'cobrar') === cobrar ? h` aria-current="page"` : ''}>${rotulo}</a>`)}</nav>`;

  // trocar de cargo, de filtro ou de parte não move o mapa; só trocar de território
  const mesmoLugar = anterior?.vista === 'territorio' && anterior.m === rota.m
    && anterior.l?.zona === rota.l?.zona && anterior.l?.numero === rota.l?.numero;
  let aberta = true;
  const pintar = (m, opcoes, enquadrar = l?.ponto ? { ponto: l.ponto } : { m: rota.m }) => {
    if (!aberta) return;
    m.neutro();
    m.focarUF(rota.uf);
    m.mostrarLocais(rota.uf, dadosUF);
    m.destacar({ m: rota.m, li: l ? l.li : null });
    if (!mesmoLugar) m.enquadrar(enquadrar, opcoes);
  };

  if (cobrar) {
    ctx.conteudo.innerHTML = String(h`${voltar}${cabeca}${abas}<div class="aba"><p class="carregando">Carregando…</p></div>`);
    const cobranca = await import('./cobranca.js');
    const p = (await cobranca.abrir(ctx, rota, { mun, uf: dadosUF, municipio: arquivo }, ctx.conteudo.querySelector('.aba'))) ?? {};
    return {
      titulo: `Quem cobrar em ${mun.nome} (${rota.uf})`,
      // a UF inteira, com o município destacado: sem o zoom de município, a malha detalhada da UF não vem, e o primeiro
      // clique da entrada na capital paulista fica longe dos 300 KB do #9 (com ela, 299 KB)
      mapa: (m, opcoes) => pintar(m, opcoes, { uf: rota.uf }),
      // tocar noutro município abre a cobrança dele
      aoClicarNoMapa: (alvo) => (alvo?.m ? { vista: 'territorio', uf: alvo.uf, m: alvo.m, params: { aba: 'cobrar' } } : null),
      fechar() { aberta = false; p.fechar?.(); },
    };
  }

  // ---------- ranking ----------
  const linha = (x) => {
    const marca = MARCAS[x.marca];
    const selo = marca ? h` <span class="selo selo-${x.marca}" title="${marca.texto}">${marca.rotulo}</span>` : '';
    if (x.tipo === 'legenda') {
      return h`<li class="rk legenda"><span class="rk-pos"></span>
        <span class="rk-nome">Voto de legenda: ${x.sigla}${selo}</span>
        <span class="rk-val">${numero(x.votos)}</span><span class="rk-sub">força ${pct(x.forca)}</span>
        <span class="barra"><i style="width:${barra(x.forca, maxForca)}"></i></span></li>`;
    }
    const e = doIndice.get(x.sq);
    const nome = nomeProprio(x.nome);
    const classes = ['rk', x.eleito ? 'eleito' : '', de && x.sq === de.sq ? 'de' : ''].filter(Boolean).join(' ');
    return h`<li class="${classes}"><span class="rk-pos">${x.posicao}º</span>
      <span class="rk-nome">${e ? h`<a href="${ctx.href({ vista: 'parlamentar', sq: x.sq, m: rota.m, l: rota.l, aba: 'mapa', params: {} })}">${nome}</a>` : nome}
        <span class="rk-partido">${x.partido}</span>${!estado.soEleitos && e ? h` <span class="selo">${e.genero === 'FEMININO' ? 'eleita' : 'eleito'}</span>` : ''}${selo}</span>
      <span class="rk-val">${numero(x.votos)}</span>
      <span class="rk-sub">força ${pct(x.forca)} · peso ${pct(x.peso)}</span>
      <span class="barra"><i style="width:${barra(x.forca, maxForca)}"></i></span></li>`;
  };
  const outros = v.outros && h`<li class="rk outros"><span class="rk-pos"></span>
    <span class="rk-nome">${rotuloOutros(v.outros)}</span><span class="rk-val">${numero(v.outros.votos)}</span>
    <span class="rk-sub">força ${pct(v.outros.forca)}, somados</span></li>`;
  const marcadas = Object.keys(MARCAS).filter((k) => v.linhas.some((x) => x.marca === k));
  const totalizacao = indice.ufs.get(rota.uf).totalizacao[cargo];

  // ---------- locais do município ou seções do local ----------
  const locais = local ? [] : locaisDoMunicipio(arquivo, dadosUF);
  const secoes = local ? tabelaDasSecoes(local, dadosUF, cargo) : null;
  const rotaDoLocal = (x) => ({ vista: 'territorio', uf: rota.uf, m: rota.m, l: { zona: x.zona, numero: x.numero },
    params: escreverEstado({ ...estado, todas: false }, rota.params, de) });
  const listaDeLocais = (lista, todos) => h`${(todos ? lista : lista.slice(0, LOCAIS)).map((x) => h`
    <li><a href="${ctx.href(rotaDoLocal(x))}"><span class="lc-nome">${x.nome}</span>
      <span class="lc-sub">${[x.bairro, `zona ${x.zona}`, plural(x.secoes, 'seção', 'seções'), `${numero(x.eleitorado)} eleitores`].filter(Boolean).join(' · ')}${x.semPonto ? h` <span class="selo selo-sem-ponto" title="O local não tem coordenada, ou divide a coordenada com outro local, e não vira círculo no mapa.">sem ponto no mapa</span>` : ''}</span></a></li>`)}`;
  const verLocais = (lista) => (lista.length > LOCAIS
    ? h`<button type="button" class="botao leve" data-ver-locais>Ver todos (${numero(lista.length)})</button>` : '');

  ctx.conteudo.innerHTML = String(h`
    ${voltar}
    ${cabeca}
    ${abas}

    <section class="como-votou" aria-labelledby="como-votou">
      <h2 id="como-votou">Como ${nomeAqui} votou para ${PARA[cargo]}</h2>
      <div class="controles">
        <div class="segmentado" role="group" aria-label="Cargo">${[6, 5].map((c) => h`<a href="${ctx.href(DESTINO[`c${c}`])}"
          aria-current="${c === cargo}" data-alterna="c${c}">${CARGO[c]}</a>`)}</div>
        <div class="segmentado" role="group" aria-label="Quem aparece no ranking">
          <a href="${ctx.href(DESTINO.eleitos)}" aria-current="${estado.soEleitos}" data-alterna="eleitos">Só eleitos</a>
          <a href="${ctx.href(DESTINO.todos)}" aria-current="${!estado.soEleitos}" data-alterna="todos">Todos (${numero(nCandidatos)})</a>
        </div>
      </div>
      ${cargo === 5 ? h`<p class="nota">Cada eleitor deu 2 votos para senador. A força local soma os dois, como o TSE.
        ${oQueE('senador')}</p>` : ''}
      ${r.linhas.length
        ? h`<ol class="ranking" id="ranking" tabindex="-1">${v.linhas.map(linha)}${outros}</ol>
          ${v.verTodos ? h`<a class="botao leve" href="${ctx.href(DESTINO['ver-todos'])}" data-alterna="ver-todos">Ver todos (${numero(v.verTodos)})</a>` : ''}`
        : h`<p class="vazio">Nenhum voto para ${PARA[cargo]} ${local ? 'neste local' : 'neste município'}.</p>`}
      ${r.semVoto.length ? semVoto(r.semVoto, local) : ''}
      ${marcadas.length ? h`<dl class="marcas">${marcadas.map((k) => h`<div><dt><span class="selo selo-${k}">${MARCAS[k].rotulo}</span></dt><dd>${MARCAS[k].texto}</dd></div>`)}</dl>
        <p class="nota">${oQueE('destinacao', 'O que é a destinação do voto?')}</p>` : ''}
      <p class="nota">${estado.soEleitos
        ? `A posição e a força local contam todos os ${numero(nCandidatos)} candidatos${cargo === 6 ? ' e o voto de legenda' : ''}, como o TSE. `
        : ''}Eleitos segundo a totalização de ${dataBR(totalizacao)}. ${oQueE('posicao', 'Como se conta a posição?')}</p>
    </section>

    ${local ? h`
      <section class="secoes" aria-labelledby="t-secoes">
        <h2 id="t-secoes">Seções deste local</h2>
        ${secoes.colunas.length ? h`<div class="rolagem" tabindex="0" role="region" aria-labelledby="t-secoes">
          <table class="tabela num tabela-secoes">
            <thead><tr><th scope="col">Seção</th><th scope="col">Votos concorrentes</th>${secoes.colunas.map((c) => h`<th scope="col">${nomeProprio(c.nome)}</th>`)}</tr></thead>
            <tbody>${secoes.linhas.map((s) => h`<tr><th scope="row">${s.secao}</th><td>${numero(s.concorrentes)}</td>${s.votos.map((x) => h`<td>${numero(x)}</td>`)}</tr>`)}</tbody>
          </table></div>
          <p class="nota">Votos dos eleitos de ${PARA[cargo]} em cada seção. Os dos outros candidatos estão só no total do local, no ranking acima.</p>`
        : h`<p class="vazio">Nenhum eleito de ${PARA[cargo]} teve voto neste local.</p>`}
      </section>`
    : h`
      <section class="locais" aria-labelledby="t-locais">
        <h2 id="t-locais">Locais de votação (${numero(locais.length)})</h2>
        ${locais.length > LOCAIS ? h`<input class="filtro-locais" type="search" placeholder="Buscar por nome, bairro ou endereço"
          aria-label="Buscar entre os locais de votação de ${mun.nome}">` : ''}
        <p class="so-leitor" role="status"></p>
        <ul class="lista-locais">${listaDeLocais(locais, false)}</ul>
        <div class="ver-locais">${verLocais(locais)}</div>
      </section>`}`);

  // trocar de cargo, de filtro ou abrir "Ver todos" troca o endereço sem empilhar histórico, e o foco fica no lugar
  for (const a of ctx.conteudo.querySelectorAll('a[data-alterna]')) {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const alvo = a.dataset.alterna;
      ctx.navegar(DESTINO[alvo], { substituir: true });
      requestAnimationFrame(() => (alvo === 'ver-todos' ? ctx.conteudo.querySelector('#ranking')
        : ctx.conteudo.querySelector(`[data-alterna="${alvo}"]`))?.focus());
    });
  }
  // a lista dos locais filtra e abre na hora, sem mudar o endereço
  const secaoLocais = ctx.conteudo.querySelector('.locais');
  if (secaoLocais) {
    const ul = secaoLocais.querySelector('.lista-locais');
    const ver = secaoLocais.querySelector('.ver-locais');
    const filtro = secaoLocais.querySelector('.filtro-locais');
    const contagem = secaoLocais.querySelector('[role="status"]');
    let todos = false;
    const atualizar = () => {
      const lista = filtro?.value.trim() ? locaisDoMunicipio(arquivo, dadosUF, { busca: filtro.value }) : locais;
      ul.innerHTML = lista.length ? String(listaDeLocais(lista, todos))
        : String(h`<li class="nenhum">Nenhum local de votação com “${filtro.value.trim()}”.</li>`);
      ver.innerHTML = todos ? '' : String(verLocais(lista));
      // a região viva é só a contagem: a lista inteira, lida a cada letra, não deixaria ouvir o resultado (#33)
      contagem.textContent = contagemDosLocais(lista.length, filtro?.value ?? '');
    };
    filtro?.addEventListener('input', () => { todos = false; atualizar(); });
    ver.addEventListener('click', (ev) => {
      if (!ev.target.closest('[data-ver-locais]')) return;
      todos = true;
      atualizar();
      ul.querySelector(`li:nth-child(${LOCAIS + 1}) a`)?.focus();
    });
  }

  return {
    titulo: local ? `${local.nome}, ${mun.nome}` : `${mun.nome} (${rota.uf})`,
    local: local?.nome,
    mapa: pintar,
    aoClicarNoMapa(alvo) {
      // mantém o cargo e o filtro ao trocar de território, e de onde veio enquanto for a mesma UF
      if (!alvo?.m) return null;
      const naUF = alvo.uf === rota.uf;
      const params = escreverEstado({ ...estado, todas: false }, naUF ? rota.params : {}, naUF ? de : undefined);
      const lAlvo = alvo.li !== undefined ? { zona: alvo.zona, numero: alvo.numero } : undefined;
      return { vista: 'territorio', uf: alvo.uf, m: alvo.m, l: lAlvo, params };
    },
    fechar() { aberta = false; },
  };
}

const barra = (forca, max) => `${max ? Math.round((1000 * forca) / max) / 10 : 0}%`;

function semVoto(lista, local) {
  const nomes = lista.map((e) => nomeProprio(e.nome));
  const juntos = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
  const onde = local ? 'neste local' : 'neste município';
  const frase = lista.length === 1 ? `1 eleito sem voto ${onde}` : `${numero(lista.length)} eleitos sem voto ${onde}`;
  return lista.length > 6
    ? h`<details class="sem-voto nota"><summary>${frase}</summary><p>${juntos}.</p></details>`
    : h`<p class="sem-voto nota">${frase}: ${juntos}.</p>`;
}
