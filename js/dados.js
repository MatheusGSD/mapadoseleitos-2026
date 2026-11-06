// Carregamento dos dados (#9): dados/atual.json (sem cache) diz a versão; os arquivos da versão nunca mudam, e cada um
// é pedido uma vez só por visita. A malha tem o próprio ponteiro e versão, malha/atual.json (`pipeline malha`).
import { caminhos, decodificarIndice, decodificarUF, decodificarParlamentar, decodificarMunicipio, decodificarLocal }
  from './nucleo/arquivos.js';
import { paraGeoJSON, caixa, juntarCaixas } from './nucleo/topojson.js';

export function criarDados({ dados = 'dados/', malha = 'malha/', buscar = (...a) => fetch(...a) } = {}) {
  const cache = new Map();

  async function pedir(url, opcoes) {
    const r = await buscar(url, opcoes);
    if (!r.ok) throw new Error(`não consegui carregar ${url} (HTTP ${r.status})`);
    return r.json();
  }
  // uma promessa por arquivo: dois pedidos ao mesmo tempo esperam o mesmo download
  function uma(chave, carregar) {
    if (!cache.has(chave)) {
      const p = carregar();
      p.catch(() => cache.delete(chave));
      cache.set(chave, p);
    }
    return cache.get(chave);
  }

  const versao = () => uma('versao', () => pedir(`${dados}atual.json`, { cache: 'no-cache' }).then((j) => j.versao));
  const versaoMalha = () => uma('versao-malha', () => pedir(`${malha}atual.json`, { cache: 'no-cache' }).then((j) => j.versao));
  const caixas = (fc) => new Map(fc.features.map((f) => [f.id, caixa(f.geometry, { principal: true })]));
  const c = async () => caminhos(await versao());
  const arquivo = (nome, decodificar) => uma(nome, async () => decodificar(await pedir(dados + nome)));

  return {
    versao,
    indice: async () => arquivo((await c()).indice, decodificarIndice),
    uf: async (sigla) => arquivo((await c()).uf(sigla), decodificarUF),
    parlamentar: async (sq) => arquivo((await c()).parlamentar(sq), decodificarParlamentar),
    municipio: async (ibge) => arquivo((await c()).municipio(ibge), decodificarMunicipio),
    local: async (ibge, zona, numero) => arquivo((await c()).local(ibge, zona, numero), decodificarLocal),
    /** Um arquivo da versão sem decodificar, para os tipos que vierem depois (a ficha, #19). */
    json: async (caminho) => arquivo(`${await versao()}/${caminho}`, (j) => j),
    /** A malha leve do Brasil (entrada), em GeoJSON, com a caixa de enquadrar de cada município e UF. */
    malha: () => uma('malha', async () => {
      const topo = await pedir(`${malha}${await versaoMalha()}/brasil.json`);
      const municipios = paraGeoJSON(topo, 'municipios');
      const ufs = paraGeoJSON(topo, 'ufs');
      const uf = caixas(ufs);
      return { municipios, ufs, caixas: { municipio: caixas(municipios), uf, brasil: juntarCaixas(uf.values()) } };
    }),
    /** Os municípios de uma UF com mais detalhe, para o zoom de município. */
    malhaUF: (sigla) => uma(`malha-${sigla}`, async () => {
      const municipios = paraGeoJSON(await pedir(`${malha}${await versaoMalha()}/uf/${sigla}.json`), 'municipios');
      return { municipios, caixas: caixas(municipios) };
    }),
  };
}
