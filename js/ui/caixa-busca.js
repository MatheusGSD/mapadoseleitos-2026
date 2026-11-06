// Caixa de busca do topo do painel (#6): sugere parlamentares e municípios enquanto se digita; Enter sem escolher
// uma sugestão abre a lista dos eleitos com o texto. Segue o padrão de combobox da WAI-ARIA. A mesma caixa, só com
// municípios, é o "Cobrar: qual é o seu município?" da entrada (#43): Enter sem escolher abre o primeiro.
import { h } from './html.js';
import { foto, href, rotaDoParlamentar } from './componentes.js';
import { nomeProprio } from '../nucleo/texto.js';
import { cargoDe } from '../nucleo/formato.js';

/**
 * id: o prefixo dos ids da caixa (cada caixa da página tem o seu). Com `rotaDoMunicipio`, a caixa só acha municípios
 * e leva cada um para lá; `rotulo` aparece acima dela, e `dica` vai dentro.
 */
export function montarBusca(el, { busca, navegar, rotaDaLista, id = 'busca', rotaDoMunicipio = null,
  rotulo = 'Buscar parlamentar ou município', dica = rotulo }) {
  const soMunicipios = Boolean(rotaDoMunicipio);
  el.innerHTML = String(h`
    <label class="${soMunicipios ? 'rotulo-busca' : 'so-leitor'}" for="${id}-q">${rotulo}</label>
    <input id="${id}-q" type="search" placeholder="${dica}" autocomplete="off" spellcheck="false"
      role="combobox" aria-expanded="false" aria-controls="${id}-res" aria-autocomplete="list" enterkeyhint="search">
    <ul id="${id}-res" class="busca-res" role="listbox" aria-label="Sugestões" hidden></ul>`);
  const input = el.querySelector('input');
  const lista = el.querySelector('ul');
  let opcoes = [], ativa = -1;

  function fechar() {
    lista.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    ativa = -1;
  }
  function marcar(i) {
    ativa = i;
    opcoes.forEach((o, k) => o.el.setAttribute('aria-selected', String(k === i)));
    if (i >= 0) { input.setAttribute('aria-activedescendant', opcoes[i].el.id); opcoes[i].el.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }
  function ir(rota) {
    fechar();
    input.value = '';
    input.blur();
    navegar(rota);
  }

  function sugerir() {
    const texto = input.value;
    const r = busca.sugerir(texto, soMunicipios ? { parlamentares: 0, municipios: 8 } : undefined);
    const itens = [
      ...r.parlamentares.map((e) => ({
        rota: rotaDoParlamentar(e),
        html: h`${foto(e, 'foto-p')}<span>${nomeProprio(e.nome)}<small>${cargoDe(e)} · ${e.partido} · ${e.uf}</small></span>`,
      })),
      ...r.municipios.map((m) => ({
        rota: rotaDoMunicipio ? rotaDoMunicipio(m) : { vista: 'territorio', uf: m.uf, m: m.ibge, params: {} },
        html: h`<span class="foto foto-p icone-municipio" aria-hidden="true"></span><span>${m.nome}<small>Município · ${m.uf}</small></span>`,
      })),
    ];
    if (!soMunicipios && texto.trim().length >= 2) {
      itens.push({ rota: rotaDaLista(texto.trim()), html: h`<span class="ver-todos">Ver os eleitos com “${texto.trim()}”</span>` });
    }
    lista.innerHTML = String(h`${itens.map((x, i) => h`<li role="option" id="${id}-op-${i}" aria-selected="false"><a href="${href(x.rota)}" tabindex="-1">${x.html}</a></li>`)}`);
    opcoes = itens.map((x, i) => ({ ...x, el: lista.children[i] }));
    for (const o of opcoes) o.el.addEventListener('mousedown', (ev) => { ev.preventDefault(); ir(o.rota); });
    const ha = itens.length > 0;
    lista.hidden = !ha;
    input.setAttribute('aria-expanded', String(ha));
    marcar(-1);
  }

  input.addEventListener('input', sugerir);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) sugerir(); });
  input.addEventListener('blur', () => setTimeout(fechar, 120));
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' && opcoes.length) { ev.preventDefault(); marcar((ativa + 1) % opcoes.length); }
    else if (ev.key === 'ArrowUp' && opcoes.length) { ev.preventDefault(); marcar(ativa <= 0 ? opcoes.length - 1 : ativa - 1); }
    else if (ev.key === 'Escape') fechar();
    else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (ativa >= 0) ir(opcoes[ativa].rota);
      else if (soMunicipios) { if (opcoes.length) ir(opcoes[0].rota); }
      else if (input.value.trim().length >= 2) ir(rotaDaLista(input.value.trim()));
    }
  });
  return { focar: () => input.focus() };
}
