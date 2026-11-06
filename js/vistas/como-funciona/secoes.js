// As seções da página "Como funciona" (#32), na ordem do texto. O id de cada seção e de cada parte é a âncora do
// endereço (#/como-funciona/<id>) e o id do elemento na página (pagina.js). Os links "o que é isto?" das vistas
// (js/ui/o-que-e.js) apontam para estes ids, e testes/como-funciona/ancoras.test.js confere que todos existem.
// Os ids não podem repetir os do casco do site (index.html: mapa, busca, trilha, conteudo, rodape, camadas).
export const SECOES = [
  { id: 'territorio', titulo: 'Do estado ao local de votação', partes: [{ id: 'sem-ponto', titulo: 'Locais sem ponto no mapa' }] },
  {
    id: 'medidas', titulo: 'As medidas',
    partes: [
      { id: 'votos-concorrentes', titulo: 'Votos concorrentes' }, { id: 'forca-local', titulo: 'Força local' },
      { id: 'peso', titulo: 'Peso na votação' }, { id: 'posicao', titulo: 'Posição' },
    ],
  },
  { id: 'senador', titulo: 'Senador: dois votos por eleitor' },
  { id: 'escala', titulo: 'As cores do mapa' },
  { id: 'nucleo', titulo: 'Núcleo da votação' },
  { id: 'dispersao', titulo: 'Dispersão da votação' },
  { id: 'literatura', titulo: 'Os nomes na literatura' },
  {
    id: 'foto-do-resultado', titulo: 'A foto do resultado',
    partes: [
      { id: 'destinacao', titulo: 'Destinação do voto' }, { id: 'registro-sob-recurso', titulo: 'Registro sob recurso' },
      { id: 'retotalizacao', titulo: 'Retotalização' },
    ],
  },
  { id: 'busca-e-filtros', titulo: 'A busca e os filtros', partes: [{ id: 'trajetoria', titulo: 'Trajetória no cargo' }] },
  { id: 'ficha', titulo: 'A ficha', partes: [{ id: 'projetos', titulo: 'Projetos e o selo "virou norma"' }] },
  { id: 'cobranca', titulo: 'Quem cobrar', partes: [{ id: 'contato', titulo: 'O contato dos eleitos' }] },
  { id: 'limites', titulo: 'O que o site não faz' },
  { id: 'fontes', titulo: 'De onde vêm os dados' },
  { id: 'autoria', titulo: 'Quem fez o site' },
];

/** Os ids de todas as seções e partes, na ordem da página. */
export const todasAsAncoras = () => SECOES.flatMap((s) => [s.id, ...(s.partes ?? []).map((p) => p.id)]);
