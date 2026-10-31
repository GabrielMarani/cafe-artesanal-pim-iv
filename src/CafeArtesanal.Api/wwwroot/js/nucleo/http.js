// Cliente HTTP da API REST: JSON, timeout, token JWT e renovação automática da sessão.

import { sessao } from './sessao.js';

export const API_BASE = '/api/v1';

export class ErroApi extends Error {
  constructor(status, mensagem, dados = null) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

let renovacaoEmAndamento = null;

/**
 * Faz uma requisição à API. Em caso de 401 tenta renovar a sessão uma vez
 * (refresh token) e repete a chamada.
 */
export async function requisitar(caminho, { metodo = 'GET', corpo, autenticar = true, repetir = true, timeoutMs = 15000, keepalive = false } = {}) {
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  const token = sessao.accessToken();
  if (autenticar && token) cabecalhos.Authorization = `Bearer ${token}`;

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), timeoutMs);
  let resposta;
  try {
    resposta = await fetch(API_BASE + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
      keepalive
    });
  } catch (erro) {
    throw new ErroApi(0, erro.name === 'AbortError'
      ? 'O servidor demorou para responder. Tente novamente.'
      : 'Sem conexão com o servidor. Verifique sua internet ou se a API está rodando.');
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 401 && autenticar && repetir && sessao.refreshToken()) {
    if (await renovarSessao()) {
      return requisitar(caminho, { metodo, corpo, autenticar, repetir: false, timeoutMs });
    }
    sessao.encerrarLocal();
    window.dispatchEvent(new CustomEvent('sessao:expirada'));
  }

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = dados?.detail || dados?.title || `Erro ${resposta.status}`;
    throw new ErroApi(resposta.status, mensagem, dados);
  }
  return dados;
}

/** Uma única renovação por vez, mesmo com várias requisições falhando juntas. */
export function renovarSessao() {
  renovacaoEmAndamento ??= (async () => {
    const tokenUsado = sessao.refreshToken();
    try {
      const nova = await requisitar('/auth/refresh', { metodo: 'POST', corpo: { refreshToken: tokenUsado }, autenticar: false });
      sessao.salvar(nova);
      return true;
    } catch {
      // Outra aba pode ter renovado primeiro: nesse caso o token salvo já é outro.
      return sessao.refreshToken() !== null && sessao.refreshToken() !== tokenUsado;
    } finally {
      renovacaoEmAndamento = null;
    }
  })();
  return renovacaoEmAndamento;
}
