// Tipos espelhando os DTOs da API REST (CafeArtesanal.Application.DTOs).

export type Perfil = 'cliente' | 'atendente' | 'admin';
export type StatusPedido = 'pendente' | 'em_preparo' | 'pronto' | 'saiu_para_entrega' | 'entregue' | 'cancelado';
export type TipoEntrega = 'entrega' | 'retirada';
export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';

export interface Usuario {
  id: number;
  nome: string;
  nomeSocial: string | null;
  nomeExibicao: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  perfil: Perfil;
}

export interface Sessao {
  accessToken: string;
  accessTokenExpiraEm: string;
  refreshToken: string;
  refreshTokenExpiraEm: string;
  usuario: Usuario;
}

export interface Categoria {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  ordemExibicao: number;
  ativo: boolean;
  quantidadeProdutos: number;
  dataAtualizacao: string;
}

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  preco: number;
  categoriaId: number | null;
  categoriaNome: string | null;
  categoriaSlug: string | null;
  estoque: number;
  estoqueMinimo: number;
  disponivel: boolean;
  estoqueBaixo: boolean;
  destaque: boolean;
  ativo: boolean;
  dataAtualizacao: string;
}

export interface CatalogoSync {
  servidorEm: string;
  completo: boolean;
  categorias: Categoria[];
  produtos: Produto[];
}

export interface Loja {
  nome: string;
  taxaEntrega: number;
  pedidoMinimo: number;
  telefone: string;
  endereco: string;
  horarios: string[];
}

export interface Endereco {
  id: number;
  apelido: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string | null;
  principal: boolean;
  descricao: string;
}

export interface ItemPedido {
  produtoId: number;
  nomeProduto: string;
  imagemUrl: string | null;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface HistoricoStatus {
  statusAnterior: StatusPedido | null;
  statusNovo: StatusPedido;
  rotulo: string;
  responsavel: string | null;
  observacao: string | null;
  data: string;
}

export interface Pedido {
  id: number;
  numero: string;
  dataPedido: string;
  dataAtualizacao: string;
  status: StatusPedido;
  statusRotulo: string;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  formaPagamentoRotulo: string;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  enderecoEntrega: string | null;
  observacao: string | null;
  motivoCancelamento: string | null;
  cliente: { id: number; nome: string; telefone: string | null } | null;
  itens: ItemPedido[];
  historico: HistoricoStatus[];
  acoes: { podeCancelar: boolean; podeConfirmarRecebimento: boolean };
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}
