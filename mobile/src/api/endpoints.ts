import { requisitar } from './cliente';
import type {
  CatalogoSync, Endereco, FormaPagamento, Loja, Pagina, Pedido, Sessao, TipoEntrega, Usuario
} from './tipos';

const consulta = (parametros: Record<string, string | number | undefined | null>) => {
  const partes = Object.entries(parametros)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
};

export interface NovoEndereco {
  apelido: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  referencia?: string | null;
  principal: boolean;
}

export interface NovoPedido {
  itens: { produtoId: number; quantidade: number }[];
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  enderecoId: number | null;
  observacao: string | null;
}

export const api = {
  auth: {
    entrar: (login: string, senha: string) =>
      requisitar<Sessao>('/auth/login', { metodo: 'POST', corpo: { login, senha }, autenticar: false }),
    registrar: (dados: { nome: string; nomeSocial: string | null; cpf: string; email: string | null; telefone: string | null; senha: string }) =>
      requisitar<Sessao>('/auth/registrar', { metodo: 'POST', corpo: dados, autenticar: false }),
    sair: (refreshToken: string) =>
      requisitar<null>('/auth/logout', { metodo: 'POST', corpo: { refreshToken }, autenticar: false })
  },
  conta: {
    perfil: () => requisitar<Usuario>('/conta/perfil'),
    enderecos: () => requisitar<Endereco[]>('/conta/enderecos'),
    criarEndereco: (dados: NovoEndereco) => requisitar<Endereco>('/conta/enderecos', { metodo: 'POST', corpo: dados })
  },
  loja: () => requisitar<Loja>('/loja', { autenticar: false }),
  sincronizarCatalogo: (desde?: string | null) =>
    requisitar<CatalogoSync>(`/sync/catalogo${consulta({ desde })}`, { autenticar: false }),
  pedidos: {
    listar: (pagina = 1, status?: string) => requisitar<Pagina<Pedido>>(`/pedidos${consulta({ pagina, tamanhoPagina: 15, status })}`),
    obter: (id: number) => requisitar<Pedido>(`/pedidos/${id}`),
    criar: (dados: NovoPedido) => requisitar<Pedido>('/pedidos', { metodo: 'POST', corpo: dados }),
    cancelar: (id: number, motivo: string | null) => requisitar<Pedido>(`/pedidos/${id}/cancelar`, { metodo: 'POST', corpo: { motivo } }),
    confirmarRecebimento: (id: number) => requisitar<Pedido>(`/pedidos/${id}/confirmar-recebimento`, { metodo: 'POST' })
  }
};

/** ViaCEP: preenche o endereço automaticamente a partir do CEP. */
export async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    const dados = await resposta.json();
    return dados.erro ? null : dados;
  } catch {
    return null;
  }
}
