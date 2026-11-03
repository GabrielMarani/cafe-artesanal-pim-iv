// Endpoints da API REST agrupados por módulo.

import { requisitar } from './http.js';
import { sessao } from './sessao.js';

const consulta = (parametros = {}) => {
  const p = new URLSearchParams();
  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') p.set(chave, valor);
  });
  const texto = p.toString();
  return texto ? `?${texto}` : '';
};

export const api = {
  auth: {
    entrar: (dados) => requisitar('/auth/login', { metodo: 'POST', corpo: dados, autenticar: false }),
    registrar: (dados) => requisitar('/auth/registrar', { metodo: 'POST', corpo: dados, autenticar: false }),
    eu: () => requisitar('/auth/me'),
    /** Encerra a sessão local na hora e avisa a API (keepalive: conclui mesmo trocando de página). */
    async sair() {
      const refreshToken = sessao.refreshToken();
      sessao.encerrarLocal();
      if (refreshToken) {
        await requisitar('/auth/logout', { metodo: 'POST', corpo: { refreshToken }, autenticar: false, keepalive: true }).catch(() => {});
      }
    }
  },

  conta: {
    perfil: () => requisitar('/conta/perfil'),
    atualizarPerfil: (dados) => requisitar('/conta/perfil', { metodo: 'PUT', corpo: dados }),
    alterarSenha: (dados) => requisitar('/conta/senha', { metodo: 'PUT', corpo: dados }),
    enderecos: () => requisitar('/conta/enderecos'),
    criarEndereco: (dados) => requisitar('/conta/enderecos', { metodo: 'POST', corpo: dados }),
    atualizarEndereco: (id, dados) => requisitar(`/conta/enderecos/${id}`, { metodo: 'PUT', corpo: dados }),
    removerEndereco: (id) => requisitar(`/conta/enderecos/${id}`, { metodo: 'DELETE' })
  },

  loja: () => requisitar('/loja', { autenticar: false }),
  catalogoCompleto: () => requisitar('/sync/catalogo', { autenticar: false }),

  categorias: {
    listar: (incluirInativas = false) => requisitar(`/categorias${consulta({ incluirInativas: incluirInativas || undefined })}`),
    criar: (dados) => requisitar('/categorias', { metodo: 'POST', corpo: dados }),
    atualizar: (id, dados) => requisitar(`/categorias/${id}`, { metodo: 'PUT', corpo: dados }),
    excluir: (id) => requisitar(`/categorias/${id}`, { metodo: 'DELETE' })
  },

  produtos: {
    pesquisar: (filtro = {}) => requisitar(`/produtos${consulta(filtro)}`),
    /** Junta todas as páginas: a API devolve no máximo 100 produtos por vez. */
    async todos(filtro = {}) {
      const buscar = (pagina) => api.produtos.pesquisar({ ...filtro, pagina, tamanhoPagina: 100 });
      const primeira = await buscar(1);
      const demais = await Promise.all(Array.from({ length: primeira.totalPaginas - 1 }, (_, i) => buscar(i + 2)));
      return [primeira, ...demais].flatMap((p) => p.itens);
    },
    obter: (id) => requisitar(`/produtos/${id}`),
    criar: (dados) => requisitar('/produtos', { metodo: 'POST', corpo: dados }),
    atualizar: (id, dados) => requisitar(`/produtos/${id}`, { metodo: 'PUT', corpo: dados }),
    desativar: (id) => requisitar(`/produtos/${id}`, { metodo: 'DELETE' }),
    ajustarEstoque: (id, dados) => requisitar(`/produtos/${id}/estoque`, { metodo: 'POST', corpo: dados })
  },

  pedidos: {
    pesquisar: (filtro = {}) => requisitar(`/pedidos${consulta(filtro)}`),
    obter: (id) => requisitar(`/pedidos/${id}`),
    criar: (dados) => requisitar('/pedidos', { metodo: 'POST', corpo: dados }),
    alterarStatus: (id, status, motivo) => requisitar(`/pedidos/${id}/status`, { metodo: 'PATCH', corpo: { status, motivo } }),
    cancelar: (id, motivo) => requisitar(`/pedidos/${id}/cancelar`, { metodo: 'POST', corpo: { motivo } }),
    confirmarRecebimento: (id) => requisitar(`/pedidos/${id}/confirmar-recebimento`, { metodo: 'POST' })
  },

  usuarios: {
    pesquisar: (filtro = {}) => requisitar(`/usuarios${consulta(filtro)}`),
    alterarPerfil: (id, perfil) => requisitar(`/usuarios/${id}/perfil`, { metodo: 'PATCH', corpo: { perfil } }),
    alterarAtivo: (id, ativo) => requisitar(`/usuarios/${id}/ativo`, { metodo: 'PATCH', corpo: { ativo } })
  },

  relatorios: {
    dashboard: (inicio, fim) => requisitar(`/relatorios/dashboard${consulta({ inicio, fim })}`)
  }
};

/** Consulta de CEP no serviço público ViaCEP (preenche o endereço automaticamente). */
export async function buscarCep(cep) {
  const digitos = String(cep).replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    const dados = await resposta.json();
    return dados.erro ? null : dados;
  } catch {
    return null;
  }
}
