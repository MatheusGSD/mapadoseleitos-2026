// O texto da página "Como funciona" (#32), com o vocabulário do GLOSSARY.md. Lógica pura (nada de DOM): recebe os
// números do índice (numeros.js) e, se vierem, as datas dos arquivos do TSE (versao.json), e devolve o HTML. Os ids
// das seções são os de secoes.js. Os exemplos da escala de cor saem de escalaDe, a mesma função que pinta o mapa.
//
// O que não está no índice fica em FIXOS, com a fonte de cada número. Nada aqui usa um candidato como exemplo.
import { h } from '../../ui/html.js';
import { numero, pct, dataBR } from '../../nucleo/formato.js';
import { escalaDe, COR_SEM_VOTO } from '../parlamentar/escala.js';
import { intervalo } from '../parlamentar/comum.js';
import { SECOES } from './secoes.js';
import { FIM_DA_NOITE_DA_ELEICAO } from './numeros.js';

const FIXOS = {
  // a conferência do build da versão publicada (data/site/conferencia.json; pipeline/mede.py para a coordenada)
  locais: 94056, semPonto: 1409, semCoordenada: 593, coordenadaRepetida: 816,
  // a destinação do voto nos arquivos da UF publicados com a totalização de 24/10/2026 (#10, #13)
  destinacao: { data: '24/10/2026', subJudice: { 5: 17, 6: 176 }, anulado: { 5: 6, 6: 35 }, legendas: 13 },
  // comparecimento no Brasil, cargo de senador (docs/research/fontes-tse-2026.md, §5)
  comparecimento: 124768485,
  // o núcleo da votação calculado sobre a versão publicada (js/vistas/parlamentar/votacao.js)
  nucleo: { 6: { min: 1, mediana: 21, max: 300 }, 5: { mediana: 70 } },
  // docs/research/reduto.md (#12): 2026, deputados federais
  reduto: { capitalSem4x: 11, pequenosNoNucleo: '25,8%', pequenosNoBrasil: '25,7%', amesOito: '49%', amesSPMG: '99%' },
};

// a escala de cor nos dois exemplos: perto da mediana da força na UF dos deputados (2,0%) e dos senadores (26,9%)
const EXEMPLO = { 6: 0.02, 5: 0.27 };

const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;
const decimal = (x, casas) => x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const parte = (id, titulo) => h`<h3 id="${id}" tabindex="-1">${titulo}</h3>`;
const tituloDe = (id) => SECOES.find((s) => s.id === id).titulo;
const secao = (id, corpo) => h`<section class="cf-secao" aria-labelledby="${id}">
  <h2 id="${id}" tabindex="-1">${tituloDe(id)}</h2>${corpo}</section>`;
const ir = (id, texto) => h`<a href="#/como-funciona/${id}">${texto}</a>`;
const fora = (url, texto) => h`<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;

// o repositório público do site (#31): o código e as issues abertas a todos
const REPOSITORIO = 'https://github.com/MatheusGSD/mapadoseleitos-2026';

/** Uma medida como fração, logo abaixo do título dela: o que se divide pelo quê, em palavras. */
const fracao = (cima, baixo) => h`<p class="fracao" role="math" aria-label="${cima} dividido por ${baixo}">
  <span class="fracao-cima" aria-hidden="true">${cima}</span><span class="fracao-baixo" aria-hidden="true">${baixo}</span></p>`;

/**
 * As faixas de uma escala lado a lado, com o valor de cada corte e a média marcada embaixo. A média é o corte de 1×
 * no deputado e o meio da faixa de 0,9× a 1,1× no senador.
 */
function faixas(cargo, base) {
  const e = escalaDe(cargo, base);
  const n = e.faixas.length;
  const x = (i) => `${((100 * i) / n).toFixed(2)}%`;
  return h`<figure class="faixas" style="--n: ${n}">
    <div class="faixas-cores" aria-hidden="true">${e.faixas.map((f) => h`<span style="background: ${f.cor}"></span>`)}</div>
    <div class="faixas-cortes" aria-hidden="true">${e.faixas.slice(0, -1).map((f, i) => h`<span style="left: ${x(i + 1)}">${pct(f.max)}</span>`)}</div>
    <p class="faixas-media" aria-hidden="true" style="left: ${x(cargo === 6 ? 2 : 2.5)}">média dele</p>
    <figcaption class="so-leitor">${e.faixas.map((f) => `${f.rotulo}: ${intervalo(f)}`).join('; ')}.</figcaption>
  </figure>`;
}

/** Régua da dispersão, de 0% (concentrado) a 50% (espalhado como o eleitorado), com a faixa dos senadores. */
function regua(n) {
  const x = (v) => `${Math.min(100, Math.max(0, (v / 0.5) * 100)).toFixed(1)}%`;
  const { min, max } = n.dispersao[5];
  const dep = n.dispersao[6].mediana;
  return h`<figure class="regua-cf">
    <div class="regua-cf-trilho" aria-hidden="true">
      <span class="regua-cf-senadores" style="left: ${x(min)}; width: calc(${x(max)} - ${x(min)})"></span>
      <span class="regua-cf-deputados" style="left: ${x(dep)}"></span>
    </div>
    <p class="regua-cf-pontas" aria-hidden="true"><span>0%: concentrado</span><span>50%: espalhado</span></p>
    <figcaption>
      <span class="regua-cf-chave"><i class="chave-deputados" aria-hidden="true"></i>Mediana dos ${numero(n.porCargo[6])} deputados
        federais eleitos: ${pct(dep)}</span>
      <span class="regua-cf-chave"><i class="chave-senadores" aria-hidden="true"></i>Os ${numero(n.porCargo[5])} senadores eleitos: de
        ${pct(min)} a ${pct(max)}</span>
    </figcaption>
  </figure>`;
}

// os arquivos do TSE em versao.json (Last-Modified de cada um): o que cada um traz para o site
const ARQUIVOS_DO_TSE = [
  [/^votacao_secao\//, 'Votação por seção, um arquivo por UF: os votos de cada urna'],
  [/^eleitorado_local_votacao/, 'Locais de votação: endereço, coordenada e eleitorado de cada seção'],
  [/^detalhe_votacao_munzona/, 'Totais por município e zona: votos concorrentes e data da totalização'],
  [/^votacao_partido_munzona/, 'Votos de legenda por município e zona'],
  [/^consulta_cand_complementar/, 'Candidatos, complementar: destinação do voto e situação do registro'],
  [/^consulta_cand_/, 'Candidatos: nome, partido, situação de eleito, gênero, cor ou raça, escolaridade'],
  [/^historico_candidatura/, 'Histórico de candidaturas: reeleitos e candidaturas anteriores'],
  [/^bem_candidato/, 'Bens declarados pelos candidatos'],
  [/^fotos\//, 'Fotos dos candidatos, um arquivo por UF'],
  [/^rede_social_candidato/, 'Redes sociais declaradas pelos candidatos'],
  [/^municipio_tse_ibge/, 'Códigos dos municípios no TSE e no IBGE'],
];
const diaBR = (http) => new Date(http).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Os arquivos do TSE desta versão, agrupados pelo que trazem, com a data (ou o intervalo de datas) de cada grupo. */
export function arquivosDoTSE(fontes = {}) {
  const grupos = new Map();
  for (const [arquivo, data] of Object.entries(fontes)) {
    const rotulo = ARQUIVOS_DO_TSE.find(([re]) => re.test(arquivo))?.[1] ?? arquivo;
    if (!grupos.has(rotulo)) grupos.set(rotulo, []);
    grupos.get(rotulo).push(new Date(data));
  }
  const ordem = (r) => { const i = ARQUIVOS_DO_TSE.findIndex(([, x]) => x === r); return i < 0 ? 99 : i; };
  return [...grupos].sort(([a], [b]) => ordem(a) - ordem(b)).map(([rotulo, datas]) => {
    const [de, ate] = [Math.min(...datas), Math.max(...datas)].map(diaBR);
    return { rotulo, arquivos: datas.length, data: de === ate ? de : `${de} a ${ate}` };
  });
}

/**
 * pagina(numeros, { fontes, geradoEm }) -> Html
 * numeros: numerosDoIndice(indice); fontes: versao.json "fontes" (sem elas, a lista sai sem datas); geradoEm: a data
 * em que os arquivos do site foram gerados (versao.json "gerado_em").
 */
export function pagina(n, { fontes = null, geradoEm = null } = {}) {
  const foto = dataBR(n.foto);
  const t = n.trajetoria;
  const recurso = n.recurso[5] + n.recurso[6];
  const oito = n.medianas.filter((m) => m.cadeiras === 8).map((m) => m.mediana);
  const [maior, segunda] = [...n.medianas].sort((a, b) => b.cadeiras - a.cadeiras);
  const porEleitor = n.concorrentes[5] / FIXOS.comparecimento;
  const tse = fontes ? arquivosDoTSE(fontes) : ARQUIVOS_DO_TSE.map(([, rotulo]) => ({ rotulo, data: null }));

  return h`<article class="como-funciona">
  <h1 class="titulo">Como funciona</h1>
  <p class="cf-abre">O site liga cada um dos ${numero(n.eleitos)} parlamentares eleitos em 2026, ${numero(n.porCargo[6])} deputados
    federais e ${numero(n.porCargo[5])} senadores, aos lugares que votaram neles, da UF ao local de votação. Esta página explica de
    onde vêm os números, o que cada medida quer dizer e o que o site não faz.</p>
  <nav class="cf-indice" aria-label="Seções desta página"><ul>${SECOES.map((s) => h`<li>${ir(s.id, s.titulo)}</li>`)}</ul></nav>

  ${secao('territorio', h`
    <p>A eleição de deputado federal e de senador é por UF: cada UF elege os seus, e o voto de uma UF não conta para
      outra. Dentro da UF, o site mostra a votação em três territórios.</p>
    <dl class="termos">
      <div><dt>UF</dt><dd>O estado ou o Distrito Federal.</dd></div>
      <div><dt>Município</dt><dd>Os ${numero(n.municipios)} municípios do IBGE.</dd></div>
      <div><dt>Local de votação</dt><dd>O endereço onde funcionam as seções, quase sempre uma escola, como o TSE o registra.
        Um prédio usado por duas zonas eleitorais conta como dois locais. Em 2026, ${numero(FIXOS.locais)} locais tiveram
        voto.</dd></div>
    </dl>
    <p>A seção, ou a urna, é a menor unidade de apuração do TSE. Ela não tem contorno próprio no mapa: aparece só na tabela
      de cada local de votação.</p>
    ${parte('sem-ponto', 'Locais sem ponto no mapa')}
    <p>Ao aproximar o mapa, cada local de votação vira um círculo, na coordenada que o TSE publica. Quando o local não
      tem um ponto só dele, ele fica sem ponto no mapa:</p>
    <ul class="lista">
      <li>${numero(FIXOS.semCoordenada)} locais não têm coordenada no cadastro do TSE, ou têm uma que cai fora do Brasil.
        Faltam mais no Amapá e em Roraima.</li>
      <li>${numero(FIXOS.coordenadaRepetida)} locais têm a mesma coordenada de outro local. Dois círculos no mesmo ponto
        esconderiam um deles.</li>
    </ul>
    <p>São ${numero(FIXOS.semPonto)} dos ${numero(FIXOS.locais)} locais com voto (${pct(FIXOS.semPonto / FIXOS.locais)}). Eles
      aparecem nas listas e nas tabelas com a marca <span class="selo selo-tracejado">sem ponto no mapa</span>, e os votos
      deles contam no município como os de qualquer local. Só não viram círculo.</p>`)}

  ${secao('medidas', h`
    <p>Cada medida vale para um candidato, um cargo e um território. O site usa quatro, sempre com estes nomes: votos,
      força local, peso na votação e posição. Os votos são os votos nominais do candidato no território, os que o eleitor
      deu digitando o número dele.</p>
    ${parte('votos-concorrentes', 'Votos concorrentes')}
    <p>É o total sobre o qual o TSE calcula os percentuais: os votos dados a candidatos e legendas do cargo. Entram os
      votos válidos, os sub judice e os anulados (veja ${ir('destinacao', 'a destinação do voto')}). Ficam de fora os
      brancos, os nulos e o nulo técnico. Em 2026, os votos concorrentes de deputado federal somaram
      ${numero(n.concorrentes[6])} no Brasil.</p>
    <p>Na eleição de deputado, o eleitor pode votar só no número do partido. É o voto de legenda: entra nos votos
      concorrentes, mas não pertence a nenhum candidato.</p>
    <p class="nota">O site segue a API de resultados do TSE, que é a conta que o TSE divulga. A Resolução TSE nº 23.677
      tira o voto sub judice do percentual na eleição de deputado (art. 22, § 3º), mas a API não tira, e os números do
      site batem com os dela.</p>
    ${parte('forca-local', 'Força local')}
    ${fracao('votos dele no território', 'votos concorrentes do cargo no território')}
    <p>Diz quanto aquele território votou nele. Como divide pelo total do lugar, a força local não depende do tamanho do
      município: um município pequeno pode ser onde um deputado foi mais forte. Na UF inteira, a força mediana dos
      deputados federais eleitos é ${pct(n.forcaNaUF[6])}, e a dos senadores, ${pct(n.forcaNaUF[5])}.</p>
    ${parte('peso', 'Peso na votação')}
    ${fracao('votos dele no território', 'total de votos dele na UF')}
    <p>Diz quanto da votação dele veio dali. Os pesos de todos os municípios somam 100%. A capital costuma ter peso alto e
      força local baixa: deu muitos votos, mas dividiu o voto entre muitos candidatos.</p>
    ${parte('posicao', 'Posição')}
    <p>É o lugar do candidato no ranking de votos do território, entre todos os candidatos do cargo com voto ali, qualquer
      que seja a destinação do voto. Empate dá a mesma posição. O nulo técnico não tem posição.</p>
    <p>No ranking de um município ou local, o filtro "Só eleitos" esconde linhas, mas não muda a posição de ninguém: um
      eleito pode aparecer em 2º, atrás de um candidato que não se elegeu.</p>`)}

  ${secao('senador', h`
    <p>Em 2026, cada UF elegeu 2 senadores, e cada eleitor votou em dois candidatos. Os arquivos do TSE somam os dois
      votos, sem separar o primeiro do segundo. Votar duas vezes no mesmo candidato anula o segundo voto (Resolução TSE
      nº 23.751/2026, art. 206, § 2º), então ninguém recebe dois votos do mesmo eleitor.</p>
    <p>Os votos concorrentes de senador contam os dois votos, como o TSE: foram ${numero(n.concorrentes[5])} no Brasil, quase
      o dobro dos ${numero(n.concorrentes[6])} de deputado federal. Assim, a força local de todos os candidatos a senador num
      território soma 100%, e o número de cada senador bate com o do TSE.</p>
    <p>Por isso a força local de um senador parece baixa. No Brasil, houve ${decimal(porEleitor, 2)} votos concorrentes de
      senador para cada eleitor que foi votar (${numero(FIXOS.comparecimento)} eleitores). Então um senador com 30% dos votos
      concorrentes recebeu o voto de cerca de ${pct(0.3 * porEleitor, 0)} de quem foi votar.</p>
    <p>O senador também tem ${ir('escala', 'faixas de cor próprias')}.</p>`)}

  ${secao('escala', h`
    <p>Na vista do parlamentar, o mapa pinta cada município pela força local dele ali. A escala é só dele: as faixas são
      múltiplos da força dele na UF inteira, que a legenda chama de média dele.</p>
    <p class="cf-exemplo">Deputado federal com ${pct(EXEMPLO[6])} na UF: faixas de metade, 1×, 2× e 4× a média.</p>
    ${faixas(6, EXEMPLO[6])}
    <p class="cf-exemplo">Senador com ${pct(EXEMPLO[5])} na UF: faixas mais estreitas, de 0,75×, 0,9×, 1,1×, 1,25× e 1,5× a
      média.</p>
    ${faixas(5, EXEMPLO[5])}
    <p>Com uma escala fixa para todos, os deputados ficariam pálidos e os senadores, escuros, porque a força de um senador
      na UF é mais de dez vezes a de um deputado. Com a escala de cada um, o mapa mostra onde ele foi melhor ou pior que a
      média dele. E o senador tem faixas mais estreitas porque o voto dele é espalhado: com as faixas do deputado, 99,9%
      dos municípios de um senador ficariam abaixo de 2× e o mapa sairia com duas cores.</p>
    <p><span class="amostra amostra-borda" style="background: ${COR_SEM_VOTO}" aria-hidden="true"></span>Os municípios sem
      nenhum voto dele ficam em cinza. Votos absolutos nunca colorem área: o município grande teria sempre a cor mais
      forte.</p>
    <p>Ao aproximar o mapa, os locais de votação viram círculos, com a mesma escala de cor. A área de cada círculo é
      proporcional aos votos dele no local. A legenda de cada parlamentar mostra os percentuais reais das faixas e
      quantos municípios caíram em cada uma.</p>`)}

  ${secao('nucleo', h`
    <p>São os municípios de maior força local de um eleito que, somados, deram metade dos votos dele. O site acha o
      núcleo assim:</p>
    <ol class="passos">
      <li>Ordena os municípios onde ele teve voto pela força local, da maior para a menor. No empate, vem antes o que deu
        mais votos.</li>
      <li>Soma os votos dele, de cima para baixo.</li>
      <li>O município em que a soma passa da metade entra no núcleo, e a lista para ali.</li>
    </ol>
    <p>Na aba Municípios, a lista "Onde foi mais forte" tem uma linha <span class="cor-nucleo">laranja</span> onde o
      núcleo termina. No mapa, os municípios do núcleo ganham contorno laranja.</p>
    <p>O núcleo diz onde ele foi melhor, não onde ele domina. Quem tem o voto espalhado tem um núcleo grande. Entre os
      deputados federais, o núcleo vai de ${plural(FIXOS.nucleo[6].min, 'município', 'municípios')} a
      ${numero(FIXOS.nucleo[6].max)}, com mediana de ${numero(FIXOS.nucleo[6].mediana)}; o dos senadores tem, na mediana,
      cerca de ${numero(FIXOS.nucleo[5].mediana)}. Quem diz se o voto é concentrado é a
      ${ir('dispersao', 'dispersão da votação')}.</p>
    <p>Não há piso de votos. Um município pequeno onde ele foi forte entra, mesmo com poucos votos, e o peso de cada linha
      mostra quanto ele contou. Um piso tiraria da conta só o município pequeno.</p>
    <p>O senador segue a mesma regra. O Distrito Federal é um município só, e ali não há núcleo: ficam a dispersão da
      votação e os círculos dos locais.</p>
    <h3>Por que não um corte fixo</h3>
    <p>Nos números de 2026, não existe um corte natural que separe os municípios fortes de um eleito dos outros. Um
      corte fixo, como "4× a média", pune a capital: ela tem tantos eleitores que, em ${numero(FIXOS.reduto.capitalSem4x)}
      UFs, não chega a 4× a média de ninguém, nem com todos os votos do eleito. O núcleo não pende para nenhum tamanho:
      somados os núcleos dos deputados, ${FIXOS.reduto.pequenosNoNucleo} das entradas são municípios com menos de 5 mil
      eleitores, que são ${FIXOS.reduto.pequenosNoBrasil} dos municípios do Brasil.</p>`)}

  ${secao('dispersao', h`
    <p>A frase no alto da vista do parlamentar diz: "Metade dos votos de Fulano veio de locais de votação onde vota X% do
      eleitorado da UF." O eleitorado conta os eleitores aptos, inclusive quem não foi votar.</p>
    <p>Para achar o X, o site ordena os locais de votação da UF pela força local dele, da maior para a menor, e soma os
      votos até passar da metade, como no núcleo. O X é a parte do eleitorado da UF que vota nesses locais. Se o voto
      fosse espalhado como o eleitorado, o X seria 50%. Quanto mais abaixo de 50%, mais concentrado o voto.</p>
    ${regua(n)}
    <p>O X depende do número de cadeiras da UF. Com muitas cadeiras, dá para se eleger com o voto de um pedaço pequeno do
      estado; com 8, não. Nas UFs de 8 cadeiras, a mediana dos deputados vai de ${pct(Math.min(...oito))} a
      ${pct(Math.max(...oito))}. Em ${maior.nome}, com ${numero(maior.cadeiras)} cadeiras, é ${pct(maior.mediana)}; em
      ${segunda.nome}, com ${numero(segunda.cadeiras)}, ${pct(segunda.mediana)}. Por isso a vista do deputado mostra também a
      mediana dos deputados eleitos pela UF dele, como referência. O senador fica só com os 50%: a mediana de 2 eleitos não diria nada.</p>
    <details class="cf-tabela">
      <summary>A mediana dos deputados federais em cada UF</summary>
      <table class="tabela num">
        <thead><tr><th scope="col">UF</th><th scope="col">Deputados</th><th scope="col">Mediana do X</th></tr></thead>
        <tbody>${n.medianas.map((m) => h`<tr><th scope="row">${m.nome}</th><td>${numero(m.cadeiras)}</td><td>${pct(m.mediana)}</td></tr>`)}</tbody>
      </table>
    </details>
    <p>A dispersão não diz se o voto concentrado é melhor ou pior, e não serve para comparar eleitos de UFs diferentes.
      Ela troca a frase "metade dos votos veio de N municípios", que não se compara entre UFs: Roraima tem 15
      municípios, e a capital tem 60% do eleitorado; Minas Gerais tem 853.</p>
    <p class="nota">O X precisa do eleitorado de cada local de votação, que o site não baixa. Por isso ele é calculado
      antes, com os arquivos do TSE, e chega pronto, um número por eleito.</p>`)}

  ${secao('literatura', h`
    <p>O site usa nomes em português simples. Na ciência política, as mesmas ideias têm outros nomes.</p>
    <dl class="termos">
      <div><dt>Força local</dt><dd>A "dominância" do candidato no município (Ames, 1995).</dd></div>
      <div><dt>Peso na votação</dt><dd>A "contribuição do município" para a votação do candidato (Borges, Paula &amp; Silva,
        2016; Machado, 2022).</dd></div>
      <div><dt>O múltiplo da escala de cor</dt><dd>A força local dividida pela força na UF é o "quociente locacional"
        (Avelino, Biderman &amp; Silva, 2016).</dd></div>
      <div><dt>Dispersão da votação</dt><dd>Parente das medidas de concentração eleitoral, como o índice G (Avelino, Biderman
        &amp; Silva, 2011). O X é um ponto da curva de concentração dos votos contra o eleitorado.</dd></div>
    </dl>
    <p>Essas obras também classificam o deputado em tipos: concentrado ou disperso, dominante ou compartilhado (Ames,
      1995). O site não usa os tipos. Eles classificam o deputado, e não o município, e dependem do tamanho da UF: em 2026,
      o critério de Ames chama de concentrado ${FIXOS.reduto.amesOito} dos deputados das UFs de 8 cadeiras e
      ${FIXOS.reduto.amesSPMG} dos de São Paulo e Minas Gerais.</p>
    <ul class="referencias">
      <li>Ames, Barry (1995). Electoral Strategy under Open-List Proportional Representation. <i>American Journal of
        Political Science</i>, 39(2), 406–433.</li>
      <li>Avelino, George; Biderman, Ciro; Silva, Glauco Peres da (2011). A concentração eleitoral nas eleições paulistas:
        medidas e aplicações. <i>Dados</i>, 54(2), 319–347.</li>
      <li>Avelino, George; Biderman, Ciro; Silva, Glauco Peres da (2016). A concentração eleitoral no Brasil (1994-2014).
        <i>Dados</i>, 59(4), 1091–1125.</li>
      <li>Borges, André; Paula, Carolina de; Silva, Adriano da Nóbrega (2016). Eleições legislativas e geografia do voto em
        contexto de preponderância do Executivo. <i>Revista de Sociologia e Política</i>, 24(58), 31–58.</li>
      <li>Machado, Diego de Oliveira (2022). Geografia do voto nas eleições de 2018 para a Câmara dos Deputados.
        <i>E-legis</i>, n. 37, 208–223.</li>
    </ul>`)}

  ${secao('foto-do-resultado', h`
    <p>O resultado ainda pode mudar por decisão da Justiça Eleitoral, mesmo depois da diplomação. O site segue o TSE,
      sem congelar numa data: cada atualização usa a última totalização de cada cargo em cada UF.</p>
    <p>O rodapé mostra a data da totalização mais recente, ${foto}. A entrada de cada UF mostra a data de cada cargo, que
      muda de uma UF para outra. Depois da noite da eleição, a totalização foi refeita no Senado de
      ${plural(n.refeitas[5], 'UF', 'UFs')} e na Câmara de ${plural(n.refeitas[6], 'UF', 'UFs')}.</p>
    <details class="cf-tabela">
      <summary>A data da totalização em cada UF</summary>
      <table class="tabela num">
        <thead><tr><th scope="col">UF</th><th scope="col">Senado</th><th scope="col">Câmara</th></tr></thead>
        <tbody>${n.totalizacoes.map((x) => h`<tr><th scope="row">${x.nome}</th>${[5, 6].map((c) => h`<td${x[c] > FIM_DA_NOITE_DA_ELEICAO ? h` class="refeita"` : ''}>${dataBR(x[c])}</td>`)}</tr>`)}</tbody>
      </table>
      <p class="nota">Em negrito, as totalizações refeitas depois da noite da eleição.</p>
    </details>
    <p>Uma verificação automática compara todo dia o resultado do TSE com o que o site mostra, e avisa quando ele muda.
      Depois da posse, a verificação passa a ser semanal. A atualização do site é feita à mão e só sai quando os arquivos do
      TSE batem com o resultado oficial, sem nenhuma divergência.</p>
    ${parte('destinacao', 'Destinação do voto')}
    <p>O voto não muda depois da eleição. Muda o que a Justiça Eleitoral faz com ele, conforme a situação do registro do
      candidato.</p>
    <dl class="termos">
      <div><dt>Válido</dt><dd>Conta para o candidato e, na eleição de deputado, também para o partido dele.</dd></div>
      <div><dt><span class="selo selo-alerta">sub judice</span></dt><dd>O registro foi negado, com recurso pendente. O voto só
        vale se o registro for aceito. Enquanto isso, não elege ninguém, mas entra nos votos concorrentes.</dd></div>
      <div><dt><span class="selo selo-tracejado">anulado</span></dt><dd>O registro foi negado ou cassado em definitivo. O voto
        não vale para ninguém, mas entra nos votos concorrentes, como no TSE.</dd></div>
      <div><dt>Nulo técnico</dt><dd>O candidato renunciou ou morreu, e o nome dele continuou na urna. O voto conta como nulo
        e fica fora de tudo: não tem linha no ranking, posição nem lugar nos votos concorrentes.</dd></div>
    </dl>
    <p>Na totalização de ${FIXOS.destinacao.data}, ${numero(FIXOS.destinacao.subJudice[6])} candidatos a deputado federal e
      ${numero(FIXOS.destinacao.subJudice[5])} a senador tinham voto sub judice. Outros ${numero(FIXOS.destinacao.anulado[6])}
      a deputado federal e ${numero(FIXOS.destinacao.anulado[5])} a senador tinham voto anulado. Em
      ${numero(FIXOS.destinacao.legendas)} casos, o voto de legenda
      de um partido numa UF também era sub judice ou anulado. No ranking do território, todo voto concorrente tem linha,
      com a marca da destinação, e por isso a coluna fecha em 100%.</p>
    ${parte('registro-sob-recurso', 'Registro sob recurso')}
    <p>O registro de candidatura foi aceito, mas há um recurso ainda não julgado. Os votos contam normalmente, e o eleito
      pode ser diplomado. Se o registro for negado, o resultado pode mudar. A marca
      <span class="selo selo-alerta">Registro sob recurso</span> aparece junto ao nome, no alto da vista do parlamentar.
      Hoje, ${recurso === 1 ? 'é 1 eleito' : `são ${numero(recurso)} eleitos`}: ${plural(n.recurso[5], 'senador', 'senadores')} e
      ${plural(n.recurso[6], 'deputado federal', 'deputados federais')}, pela situação atual do julgamento no TSE.</p>
    ${parte('retotalizacao', 'Retotalização')}
    <p>Quando muda a situação de um registro, o TRE refaz a totalização daquele cargo na UF. A retotalização muda a
      destinação dos votos e quem é eleito, mas nunca os votos. Como a posição e a força local contam todo voto
      concorrente, ela não muda nenhum número do mapa: muda só quem é eleito e as marcas.</p>
    <p>Quem deixa de ser eleito sai da busca e das listas, e o endereço dele vira uma página de aviso. Os votos dele
      continuam nos rankings, como os de qualquer candidato. Se um senador eleito perde o registro em definitivo, a lei
      manda fazer nova eleição para a cadeira (Código Eleitoral, art. 224, § 3º), e a lista da UF mostra "Cadeira
      aguardando nova eleição". ${n.ex || n.aguardando
        ? `Até a totalização mais recente, ${plural(n.ex, 'candidato deixou', 'candidatos deixaram')} de ser eleito, e
          ${plural(n.aguardando, 'cadeira aguarda', 'cadeiras aguardam')} nova eleição.`
        : 'Até a totalização mais recente, nenhum eleito deixou de ser eleito.'}</p>`)}

  ${secao('busca-e-filtros', h`
    <p>A busca acha os ${numero(n.eleitos)} eleitos pelo nome de urna, pelo nome completo e pelos nomes de urna de eleições
      anteriores, e acha os municípios. Os candidatos que não se elegeram aparecem só nos rankings dos territórios.</p>
    <p>Os filtros se combinam: valores de um mesmo critério se somam (PT ou PL), e critérios diferentes se cruzam (PT ou
      PL, e mulheres). Gênero e cor ou raça são os que cada um declarou ao TSE. A idade é a da posse, em 1º de fevereiro de
      2027. A lista vem em blocos por cargo, agrupada por UF, com os mais votados primeiro dentro de cada UF.</p>
    <p>Ocupação, bens e votos não são filtros. A ocupação é a declarada (211 eleitos dizem "deputado"), o valor dos bens é
      em geral o de compra, e votos não se comparam entre UFs.</p>
    ${parte('trajetoria', 'Trajetória no cargo')}
    <p>É a relação do eleito com o cargo para o qual foi eleito.</p>
    <table class="tabela num cf-trajetoria">
      <thead><tr><th scope="col"><span class="so-leitor">Trajetória</span></th><th scope="col">Deputados</th><th scope="col">Senadores</th></tr></thead>
      <tbody>
        <tr><th scope="row">Reeleito</th><td>${numero(t[6].reeleito)}</td><td>${numero(t[5].reeleito)}</td></tr>
        <tr><th scope="row">Já exerceu o cargo</th><td>${numero(t[6]['ja-exerceu'])}</td><td>${numero(t[5]['ja-exerceu'])}</td></tr>
        <tr><th scope="row">Novato</th><td>${numero(t[6].novato)}</td><td>${numero(t[5].novato)}</td></tr>
      </tbody>
    </table>
    <dl class="termos">
      <div><dt>Reeleito</dt><dd>Eleito ao mesmo cargo, na mesma UF, na eleição anterior daquela cadeira: 2022 para deputado,
        2018 para senador. Vem do histórico de candidaturas do TSE.</dd></div>
      <div><dt>Já exerceu o cargo</dt><dd>Já ocupou aquela cadeira, como eleito ou como suplente, mas não é reeleito. Vem da
        Câmara e do Senado, que registram quem entrou em exercício, inclusive os suplentes.</dd></div>
      <div><dt>Novato</dt><dd>Nunca exerceu o cargo para o qual foi eleito. Pode ter tido outro mandato: um ex-deputado
        eleito senador é novato no Senado.</dd></div>
    </dl>
    <p>O site não diz "novato na política", porque o histórico do TSE só vai até 2004.</p>`)}

  ${secao('ficha', h`
    <p>A aba Ficha junta o que se sabe do eleito além do voto. Cada bloco mostra a data em que a fonte foi lida.</p>
    <dl class="termos">
      <div><dt>Biografia</dt><dd>O primeiro parágrafo do artigo da Wikipédia, com crédito e licença (CC BY-SA 4.0). O artigo é
        achado pelo Wikidata, a partir do cadastro na Câmara ou da data de nascimento. Sem uma ligação segura, a ficha não
        mostra trecho: a biografia de um homônimo seria o pior erro possível.</dd></div>
      <div><dt>Dados do TSE</dt><dd>Nome completo, partido, idade, naturalidade, ocupação declarada, escolaridade, gênero e cor
        ou raça, bens e candidaturas anteriores. Os bens são os valores declarados ao TSE, os mesmos do Imposto de Renda,
        que em geral registram o preço de compra, e não o valor atual. A foto é a do TSE, para todos.</dd></div>
    </dl>
    ${parte('projetos', 'Projetos e o selo "virou norma"')}
    <p>A ficha mostra só projetos: projeto de lei (PL), de lei complementar (PLP), de decreto legislativo (PDL) e proposta
      de emenda à Constituição (PEC). Requerimentos, indicações e emendas ficam fora. Contam os projetos em que ele é o
      primeiro autor, e uma linha diz de quantos outros ele é coautor. Quem passou pela Câmara e pelo Senado tem uma
      lista só, com a Casa em cada projeto.</p>
    <p>O selo <span class="selo">virou norma</span> marca o projeto que virou lei, lei complementar, decreto legislativo ou
      emenda à Constituição, segundo a Câmara ou o Senado. Um projeto que virou norma por estar apensado a outro fica sem
      selo, porque a Casa registra a norma só no projeto principal.</p>
    <p>Quem ainda não apresentou projeto vê "toma posse em 1º de fevereiro de 2027" e as candidaturas anteriores, do
      histórico do TSE. O histórico tem erros conhecidos, e a ficha aplica 7 correções conferidas à mão.</p>`)}

  ${secao('cobranca', h`
    <p>No município, a parte “Quem cobrar” lista os eleitos que tiveram voto ali, para quem mora lá pedir ajuda com um
      problema: os deputados federais com voto no município e os senadores eleitos em 2026 pela UF, que aparecem sempre,
      porque a UF inteira vota neles. Nada ordena entre municípios.</p>
    <dl class="termos">
      <div><dt>Mais votados aqui</dt><dd>A ordem pelos votos no município: quem o município escolheu. Dá a mesma ordem da
        força local.</dd></div>
      <div><dt>Mais dependem daqui</dt><dd>A ordem pelo ${ir('peso', 'peso na votação')}: quanto da votação de cada um veio do
        município. Na capital, um eleito pode ter muitos votos e pouco peso, porque teve voto no estado inteiro; outro, com
        menos votos, pode ter vindo quase todo dali.</dd></div>
    </dl>
    <p>O problema é escrito uma vez, e cada “Cobrar” monta uma mensagem para um parlamentar, com os votos e o peso dele no
      município e o link da página do município, que mostra de onde vêm os números. Quem envia é a pessoa, pelo próprio
      e-mail ou pela rede social. O texto fica no navegador dela: o site não envia nem guarda nada.</p>
    ${parte('contato', 'O contato dos eleitos')}
    <dl class="termos">
      <div><dt>Gabinete</dt><dd>O e-mail e o telefone que a Câmara e o Senado publicam de quem está em exercício. Quem ainda
        não tomou posse não tem gabinete: o novato só ganha um em 1º de fevereiro de 2027, e o site só o mostra quando os
        dados forem gerados de novo depois disso. Até 31 de janeiro de 2027, vale o gabinete da Casa onde o eleito está
        hoje: o senador eleito que é deputado aparece com o gabinete da Câmara, e o deputado eleito que é senador, com o
        do Senado.</dd></div>
      <div><dt>Redes declaradas ao TSE</dt><dd>Os perfis no Instagram, no Facebook, no X, no YouTube e no TikTok que o
        candidato declarou no registro da candidatura, um por rede. Ficam de fora os grupos de WhatsApp, os sites, o que não
        é endereço e o endereço que a rede só acha com as maiúsculas certas e que o TSE gravou todo em maiúsculas. O e-mail
        do candidato o TSE não divulga.</dd></div>
    </dl>`)}

  ${secao('limites', h`
    <ul class="lista">
      <li><b>Não compara parlamentares.</b> Não há ranking de quem tem mais voto num lugar, nem sobreposição entre eleitos.</li>
      <li><b>Não ordena entre UFs.</b> A eleição é por UF, e as UFs não pesam igual: são 2 cadeiras de senador em cada uma,
        e de 8 a 70 de deputado, conforme a população. Votos absolutos favoreceriam as UFs grandes, e a força na UF, as
        pequenas. Toda lista é ordenada dentro da UF.</li>
      <li><b>Não mostra suplentes</b> nem parlamentares em exercício que não foram eleitos. Um suplente que assume a cadeira
        não é eleito.</li>
      <li><b>Não chama município de reduto</b> nem de base eleitoral. O ${ir('nucleo', 'núcleo da votação')} diz onde o eleito
        foi melhor, e mais nada.</li>
      <li><b>Não cobre outras eleições:</b> deputados estaduais e distritais, vereadores e as eleições de 2022 ficam de fora.</li>
      <li><b>Não publica CPF</b> nem o nome de registro de quem usa nome social.</li>
    </ul>`)}

  ${secao('fontes', h`
    <dl class="termos fontes">
      <div><dt>TSE, dados abertos</dt><dd>Os votos do 1º turno, em 4 de outubro de 2026, os candidatos e os locais de
        votação. A soma dos votos por seção confere com os totais do TSE, sem nenhuma divergência.
        <ul class="arquivos">${tse.map((a) => h`<li>${a.rotulo}${a.data ? h`<span class="arquivo-data">${a.arquivos > 1 ? `${numero(a.arquivos)} arquivos, ` : ''}versão do TSE de ${a.data}</span>` : ''}</li>`)}</ul></dd></div>
      <div><dt>TSE, API de resultados</dt><dd>Os percentuais oficiais, quem é eleito e a destinação de cada voto. A
        verificação diária compara o site com ela.</dd></div>
      <div><dt>IBGE</dt><dd>O contorno dos municípios, da Malha Municipal 2025, que já tem os ${numero(n.municipios)}
        municípios.</dd></div>
      <div><dt>Câmara dos Deputados e Senado Federal</dt><dd>Os projetos de cada eleito, quem já entrou em exercício e o
        contato dos gabinetes, pelos dados abertos das duas Casas.</dd></div>
      <div><dt>Wikipédia e Wikidata</dt><dd>O trecho da biografia e a ligação entre o eleito e o artigo.</dd></div>
      <div><dt>OpenFreeMap</dt><dd>As ruas e os nomes do mapa, que aparecem ao aproximar, com dados do OpenStreetMap.</dd></div>
    </dl>
    <p>Os dados do site podem ser reusados livremente, citando as fontes: TSE, IBGE, Câmara dos Deputados e Senado
      Federal. Os trechos da Wikipédia seguem a licença CC BY-SA 4.0, com o crédito em cada um.</p>
    ${geradoEm ? h`<p class="nota">Os arquivos do site foram gerados em ${dataBR(geradoEm)}, com a totalização de ${foto}.</p>` : ''}`)}

  ${secao('autoria', h`
    <p>Feito por Matheus Dalmolin. O código do site é aberto, com licença MIT, e está no
      ${fora(REPOSITORIO, 'repositório mapadoseleitos-2026')}, no GitHub.</p>
    <p>Achou um erro? ${fora(`${REPOSITORIO}/issues`, 'Abra uma issue')} no repositório. É preciso ter uma conta no GitHub.</p>`)}
</article>`;
}
