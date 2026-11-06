// Todas as vistas do site, já com rota (js/nucleo/rotas.js). Cada uma é um módulo carregado quando abre, com a
// própria folha de estilo, para que as vistas que faltam (#22, #23, #24) entrem sem mexer neste arquivo, no
// index.html nem no principal.js.
//
// Contrato de uma vista (ver README.md, "Como uma vista entra"):
//
//   export async function abrir(ctx, rota, anterior) -> {
//     titulo?,                 // título da aba do navegador (o nome do site vem depois)
//     local?,                  // nome do local de votação, para a trilha
//     mapa?(mapa, { animar }), // pinta e enquadra; chamado quando o mapa existir (agora ou quando ficar pronto)
//     aoClicarNoMapa?(alvo),   // -> rota para onde ir, null para nada, undefined para o padrão (território)
//     dica?(alvo),             // -> HTML da dica ao passar o mouse, ou undefined para a dica padrão
//     fechar?(),               // antes de outra vista abrir
//   }
//
// ctx: { indice, dados, busca, mapa, conteudo, href(rota), navegar(rota, { substituir }) }
export const VISTAS = {
  inicio: { modulo: () => import('./inicio.js') },
  uf: { modulo: () => import('./uf.js') },
  eleitos: { modulo: () => import('./eleitos.js') },
  aviso: { modulo: () => import('./aviso.js') },
  'nao-encontrado': { modulo: () => import('./nao-encontrado.js') },
  // #22: vista do parlamentar (abas Mapa e Municípios); a aba Ficha é do #24 (parlamentar/aba-ficha.js)
  parlamentar: { modulo: () => import('./parlamentar/index.js'), estilos: ['estilo/parlamentar.css', 'estilo/ficha.css'] },
  // #23: vista do território (município e local de votação)
  territorio: { modulo: () => import('./territorio/index.js'), estilos: ['estilo/territorio.css'] },
  // #32: a página "Como funciona"
  'como-funciona': { modulo: () => import('./como-funciona/index.js'), estilos: ['estilo/como-funciona.css'] },
};
