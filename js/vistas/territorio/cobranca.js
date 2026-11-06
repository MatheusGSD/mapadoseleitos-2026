// "Quem cobrar em <município>" (#43): a parte da cobrança na vista do município, carregada só quando ela abre. O estilo
// vai em estilo/territorio.css. A lógica fica em nucleo/cobranca.js (testes em testes/cobranca/); este módulo só
// desenha.
//
// Os deputados federais eleitos com voto no município (5 linhas e "Ver todos") e os senadores eleitos pela UF, na
// ordem do seletor "Mais votados aqui | Mais dependem daqui". O problema, escrito uma vez na caixa, entra na mensagem de
// cada "Cobrar" e não sai do navegador. O contato (c/<UF>.json) só é pedido no primeiro "Cobrar".
import { h } from '../../ui/html.js';
import { marcaRecurso } from '../../ui/componentes.js';
import { oQueE } from '../../ui/o-que-e.js';
import { nomeProprio } from '../../nucleo/texto.js';
import { numero, pct, dataBR } from '../../nucleo/formato.js';
import { pelaUF } from '../../nucleo/ufs.js';
import { ENDERECO } from '../../config.js';
import { quemCobrar, mostrarLista, lerEstado, escreverEstado, ORDENS, mensagem, mailto, linkDoTelefone,
  decodificarContatos } from '../../nucleo/cobranca.js';

// o problema cabe no e-mail pronto: com acentos codificados, o endereço do mailto fica abaixo de 2 mil caracteres, o
// limite de alguns programas de e-mail
const MAXIMO = 600;
const REDE = { instagram: 'Instagram', facebook: 'Facebook', x: 'X', youtube: 'YouTube', tiktok: 'TikTok' };
const CASA = { c: 'Gabinete na Câmara', s: 'Gabinete no Senado' };
// o texto da caixa de cada município, enquanto a página estiver aberta: fica no navegador, e o site não o envia
const problemas = new Map();
// o controle que a vista foca quando terminar de se redesenhar (a ordem ou o "Ver todos" trocam o endereço, e a vista
// volta a abrir depois de um import: um requestAnimationFrame chegaria antes dela)
let focarDepois = null;

export async function abrir(ctx, rota, { mun, uf, municipio }, alvo) {
  const estado = lerEstado(rota.params);
  const eleitos = ctx.indice.eleitos.filter((e) => e.uf === rota.uf);
  const q = quemCobrar({ municipio, uf, eleitos, ordem: estado.ordem });
  const v = mostrarLista(q.deputados, estado.todas);
  const aguardando = ctx.indice.ufs.get(rota.uf).senadoresAguardando;
  const ir = (mudanca) => ({ vista: 'territorio', uf: rota.uf, m: rota.m,
    params: escreverEstado({ ...estado, ...mudanca }, rota.params) });
  const DESTINO = { votos: ir({ ordem: 'votos', todas: false }), peso: ir({ ordem: 'peso', todas: false }),
    'ver-todos': ir({ todas: true }) };
  // o link dos números na mensagem: a página do município, no endereço público
  const link = ENDERECO + ctx.href({ vista: 'territorio', uf: rota.uf, m: rota.m, params: {} });
  const porSq = new Map([...q.deputados, ...q.senadores].map((l) => [l.eleito.sq, l]));

  const linha = (l) => {
    const e = l.eleito;
    const dele = e.genero === 'FEMININO' ? 'dela' : 'dele';
    return h`<li class="cb">
      <div class="cb-linha">
        <span class="cb-nome"><a href="${ctx.href({ vista: 'parlamentar', sq: e.sq, m: rota.m, aba: 'mapa', params: {} })}">${nomeProprio(e.nome)}</a>
          <span class="rk-partido">${e.partido}</span> ${marcaRecurso(e)}</span>
        <span class="cb-sub">${l.votos ? h`${numero(l.votos)} ${l.votos === 1 ? 'voto' : 'votos'} aqui · ${pct(l.peso)} da votação ${dele}` : 'Nenhum voto aqui'}</span>
        <button type="button" class="botao cb-cobrar" aria-expanded="false" aria-controls="cb-${e.sq}" data-cobrar="${e.sq}">Cobrar</button>
      </div>
      <div class="cb-canais" id="cb-${e.sq}" hidden></div>
    </li>`;
  };

  alvo.innerHTML = String(h`
    <section class="cobranca" aria-labelledby="t-cobrar">
      <h2 id="t-cobrar">Quem cobrar em ${mun.nome}</h2>
      <p class="nota">Os eleitos que tiveram voto aqui. Escreva o problema uma vez: cada “Cobrar” monta uma mensagem
        para aquele parlamentar, com os votos que ele teve em ${mun.nome}. O texto fica no seu navegador; o site não envia
        nem guarda nada. ${oQueE('cobranca')}</p>
      <label class="cb-rotulo" for="problema">Qual é o problema? <span class="cb-opcional">(opcional)</span></label>
      <textarea id="problema" class="cb-problema" rows="4" maxlength="${MAXIMO}"
        placeholder="Por exemplo: o posto de saúde do bairro está sem médico há três meses."></textarea>

      <h3 class="cb-cargo">Deputados federais com voto aqui (${numero(q.deputados.length)})</h3>
      <div class="segmentado" role="group" aria-label="Ordem dos deputados">${Object.entries(ORDENS).map(([k, rotulo]) =>
        h`<a href="${ctx.href(DESTINO[k])}" aria-current="${k === estado.ordem}" data-alterna="${k}">${rotulo}</a>`)}</div>
      ${q.deputados.length
        ? h`<ol class="cobrar-lista" id="cb-deputados" tabindex="-1">${v.linhas.map(linha)}</ol>
          ${v.verTodos ? h`<a class="botao leve" href="${ctx.href(DESTINO['ver-todos'])}" data-alterna="ver-todos">Ver todos (${numero(v.verTodos)})</a>` : ''}`
        : h`<p class="vazio">Nenhum deputado federal eleito teve voto aqui.</p>`}
      <p class="nota">“Mais dependem daqui” ordena pelo peso na votação: quanto da votação de cada um veio de
        ${mun.nome}. ${oQueE('peso')}</p>

      <h3 class="cb-cargo">Senadores eleitos em 2026 ${pelaUF(rota.uf)}</h3>
      <ol class="cobrar-lista">${q.senadores.map(linha)}</ol>
      <p class="nota">Cada UF tem 3 senadores; o site traz os eleitos em 2026.${aguardando
        ? ` ${aguardando === 1 ? 'Uma cadeira aguarda' : `${aguardando} cadeiras aguardam`} nova eleição.` : ''}</p>
    </section>`);

  const caixa = alvo.querySelector('#problema');
  caixa.value = problemas.get(rota.m) ?? '';
  let contatos = null; // c/<UF>.json decodificado, depois do primeiro "Cobrar"
  const abertos = new Map(); // sq -> o bloco de canais aberto, para a mensagem acompanhar a caixa
  caixa.addEventListener('input', () => {
    problemas.set(rota.m, caixa.value);
    for (const [sq, el] of abertos) {
      const lendo = el.querySelector('details')?.open;
      el.innerHTML = String(canais(porSq.get(sq), contatos.porSq.get(sq)));
      if (lendo) el.querySelector('details').open = true;
    }
  });

  // a ordem e o "Ver todos" trocam o endereço sem empilhar histórico, e o foco fica no lugar
  for (const a of alvo.querySelectorAll('a[data-alterna]')) {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const k = a.dataset.alterna;
      focarDepois = k === 'ver-todos' ? '#cb-deputados' : `[data-alterna="${k}"]`;
      ctx.navegar(DESTINO[k], { substituir: true });
      ctx.anunciar(k === 'ver-todos' ? `Os ${numero(q.deputados.length)} deputados com voto aqui`
        : `Deputados em ordem de ${k === 'peso' ? 'peso na votação' : 'votos aqui'}`);
    });
  }
  if (focarDepois) {
    alvo.querySelector(focarDepois)?.focus();
    focarDepois = null;
  }

  // ---------- os canais de cada parlamentar, no "Cobrar" ----------
  const caminho = `c/${rota.uf}.json`;
  const texto = (l) => mensagem({ eleito: l.eleito, votos: l.votos, peso: l.peso, problema: caixa.value, nome: mun.nome, link });

  function canais(l, c) {
    const e = l.eleito;
    const m = texto(l);
    const g = c?.casa ? c : null;
    // o gabinete é o da Casa onde ele está hoje: o senador eleito que é deputado usa o da Câmara, e o deputado eleito
    // que é senador, o do Senado, até o fim do mandato atual
    const outro = g && (e.cargo === 5 ? g.casa === 'c' : g.casa === 's');
    const titulo = g && (outro ? `Gabinete de ${g.casa === 'c' ? 'deputado' : 'senador'}, até 31/1/2027` : CASA[g.casa]);
    return h`
      ${g ? h`<p class="cb-titulo">${titulo}</p>
        <p class="cb-acoes">${g.email ? h`<a class="botao" href="${mailto(g.email, m)}">Escrever para o gabinete</a>` : ''}
          ${g.tel ? h`<a class="botao leve" href="${linkDoTelefone(g.tel)}">Ligar: ${g.tel}</a>` : ''}</p>`
        : h`<p class="nota">O gabinete só existe depois da posse, em 1º/2/2027.</p>`}
      ${c?.redes.length ? h`<p class="cb-titulo">Redes declaradas ao TSE na candidatura</p>
        <ul class="cb-redes">${c.redes.map((r) => h`<li><button type="button" class="botao leve" data-rede="${r.url}"
          data-nome-rede="${REDE[r.rede]}">Copiar mensagem e abrir o ${REDE[r.rede]}</button></li>`)}</ul>` : ''}
      ${!g && !c?.redes.length ? h`<p class="nota">Não declarou ao TSE nenhuma rede que o site mostre.</p>` : ''}
      <p class="cb-aviso" hidden></p>
      <details class="cb-mensagem"><summary>Ver a mensagem</summary><p class="cb-texto">${m.corpo}</p></details>
      <p class="credito">Contato da Câmara, do Senado e do TSE, lido em ${dataBR(contatos.data)}. ${oQueE('contato', 'De onde vem?')}</p>`;
  }

  for (const b of alvo.querySelectorAll('button[data-cobrar]')) {
    b.addEventListener('click', async () => {
      const sq = Number(b.dataset.cobrar);
      const el = alvo.querySelector(`#cb-${sq}`);
      const abrindo = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(abrindo));
      el.hidden = !abrindo;
      if (!abrindo) { abertos.delete(sq); return; }
      if (!contatos) {
        el.innerHTML = String(h`<p class="carregando">Carregando o contato…</p>`);
        try {
          contatos = decodificarContatos(await ctx.dados.json(caminho));
        } catch (erro) {
          el.innerHTML = String(h`<p class="nota">O contato não carregou (${erro.message}). Tente de novo.</p>`);
          b.setAttribute('aria-expanded', 'false');
          return;
        }
      }
      el.innerHTML = String(canais(porSq.get(sq), contatos.porSq.get(sq)));
      abertos.set(sq, el);
    });
  }

  // "Copiar mensagem e abrir o perfil": copia antes de abrir, porque a aba nova tira o foco desta e a cópia falharia
  alvo.addEventListener('click', async (ev) => {
    const b = ev.target.closest?.('button[data-rede]');
    if (!b) return;
    const bloco = b.closest('.cb-canais');
    const l = porSq.get(Number(bloco.id.slice(3)));
    const aviso = bloco.querySelector('.cb-aviso');
    let copiou = true;
    try {
      await navigator.clipboard.writeText(texto(l).corpo);
    } catch {
      copiou = false;
    }
    window.open(b.dataset.rede, '_blank', 'noopener');
    aviso.hidden = false;
    aviso.textContent = copiou ? `Mensagem copiada: cole no ${b.dataset.nomeRede}.`
      : 'Não deu para copiar. A mensagem está abaixo: selecione e copie.';
    if (!copiou) bloco.querySelector('details').open = true;
    ctx.anunciar(aviso.textContent);
  });

  return {};
}
