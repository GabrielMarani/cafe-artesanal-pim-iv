// Sessão do usuário (tokens + dados básicos) guardada no navegador.

const CHAVE = 'cafe.sessao';

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) ?? null; } catch { return null; }
}

function notificar() {
  window.dispatchEvent(new CustomEvent('sessao:alterada'));
}

export const sessao = {
  salvar({ accessToken, refreshToken, usuario }) {
    localStorage.setItem(CHAVE, JSON.stringify({ accessToken, refreshToken, usuario }));
    notificar();
  },

  atualizarUsuario(usuario) {
    const atual = ler();
    if (!atual) return;
    localStorage.setItem(CHAVE, JSON.stringify({ ...atual, usuario }));
    notificar();
  },

  encerrarLocal() {
    localStorage.removeItem(CHAVE);
    notificar();
  },

  accessToken: () => ler()?.accessToken ?? null,
  refreshToken: () => ler()?.refreshToken ?? null,
  usuario: () => ler()?.usuario ?? null,

  /** Logado = tem refresh token (o access token é renovado automaticamente). */
  estaLogado: () => Boolean(ler()?.refreshToken),
  ehEquipe: () => ['atendente', 'admin'].includes(ler()?.usuario?.perfil),
  ehAdmin: () => ler()?.usuario?.perfil === 'admin'
};

/** Aceita só páginas internas como destino de retorno (evita redirecionamento aberto). */
export function destinoSeguro(valor, padrao = 'index.html') {
  return /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(valor ?? '') ? valor : padrao;
}

export function exigirLogin() {
  if (sessao.estaLogado()) return true;
  const atual = location.pathname.split('/').pop() || 'index.html';
  location.replace(`login.html?voltar=${encodeURIComponent(atual + location.search)}`);
  return false;
}

export function exigirEquipe() {
  if (!exigirLogin()) return false;
  if (sessao.ehEquipe()) return true;
  location.replace('index.html');
  return false;
}
