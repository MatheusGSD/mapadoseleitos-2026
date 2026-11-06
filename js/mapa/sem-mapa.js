// O mapa quando ele não abre (navegador sem WebGL 2, MapLibre fora do ar): mesma API, sem efeito. O painel segue
// funcionando, com a busca, as listas e os números.
export function semMapa() {
  const nada = () => {};
  return {
    map: null, temMapaBase: false, definirInteracao: nada, neutro: nada, pintarMunicipios: nada, pintarLocais: nada,
    mostrarLocais: nada, focarUF: nada, destacar: nada, enquadrar: nada, camadas: nada, redimensionar: nada,
  };
}
