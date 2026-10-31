import { urlApi } from '../config';
import { sessaoArmazenada } from './sessaoArmazenada';
import type { Sessao } from './tipos';

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string, public dados: unknown = null) {
    super(mensagem);
  }

  /** Falha de rede/servidor fora do ar (o app usa os dados salvos offline). */
  get semConexao() {
    return this.status === 0;
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  autenticar?: boolean;
  repetir?: boolean;
  timeoutMs?: number;
}

let renovacao: Promise<boolean> | null = null;

/** Requisição JSON à API; em 401 renova a sessão com o refresh token e tenta de novo. */
export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, autenticar = true, repetir = true, timeoutMs = 12000 } = opcoes;
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  const token = sessaoArmazenada.obter()?.accessToken;
  if (autenticar && token) cabecalhos.Authorization = `Bearer ${token}`;

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), timeoutMs);
  let resposta: Response;
  try {
    resposta = await fetch(urlApi() + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Verifique a internet ou o endereço da API em Conta › Servidor.');
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 401 && autenticar && repetir && sessaoArmazenada.obter()?.refreshToken) {
    if (await renovarSessao()) return requisitar<T>(caminho, { ...opcoes, repetir: false });
    await sessaoArmazenada.limpar();
  }

  if (resposta.status === 204) return null as T;

  const texto = await resposta.text();
  const dados = texto ? safeJson(texto) : null;
  if (!resposta.ok) {
    const problema = dados as { detail?: string; title?: string } | null;
    throw new ErroApi(resposta.status, problema?.detail ?? problema?.title ?? `Erro ${resposta.status}`, dados);
  }
  return dados as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Uma renovação por vez, mesmo que várias chamadas recebam 401 juntas. */
function renovarSessao(): Promise<boolean> {
  renovacao ??= (async () => {
    try {
      const refreshToken = sessaoArmazenada.obter()?.refreshToken;
      const nova = await requisitar<Sessao>('/auth/refresh', { metodo: 'POST', corpo: { refreshToken }, autenticar: false });
      await sessaoArmazenada.salvar(nova);
      return true;
    } catch {
      return false;
    } finally {
      renovacao = null;
    }
  })();
  return renovacao;
}
