import { armazenamento } from '../armazenamento';
import type { Sessao, Usuario } from './tipos';

// Guarda a sessão em memória (acesso rápido pelo cliente HTTP) e no SecureStore.
// O contexto React assina as mudanças para atualizar a interface.

const CHAVE = 'cafe.sessao';
type Ouvinte = (sessao: Sessao | null) => void;

let atual: Sessao | null = null;
const ouvintes = new Set<Ouvinte>();

function notificar() {
  ouvintes.forEach((o) => o(atual));
}

export const sessaoArmazenada = {
  async carregar(): Promise<Sessao | null> {
    const texto = await armazenamento.lerSeguro(CHAVE);
    try {
      atual = texto ? (JSON.parse(texto) as Sessao) : null;
    } catch {
      atual = null;
    }
    notificar();
    return atual;
  },

  obter: () => atual,

  async salvar(sessao: Sessao): Promise<void> {
    atual = sessao;
    notificar();
    await armazenamento.gravarSeguro(CHAVE, JSON.stringify(sessao));
  },

  async atualizarUsuario(usuario: Usuario): Promise<void> {
    if (!atual) return;
    await sessaoArmazenada.salvar({ ...atual, usuario });
  },

  async limpar(): Promise<void> {
    atual = null;
    notificar();
    await armazenamento.removerSeguro(CHAVE);
  },

  assinar(ouvinte: Ouvinte): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  }
};
