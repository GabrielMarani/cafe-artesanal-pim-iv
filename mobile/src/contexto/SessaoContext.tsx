import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { sessaoArmazenada } from '../api/sessaoArmazenada';
import type { Sessao, Usuario } from '../api/tipos';

interface ValorSessao {
  carregando: boolean;
  usuario: Usuario | null;
  estaLogado: boolean;
  entrar: (login: string, senha: string) => Promise<Usuario>;
  registrar: (dados: Parameters<typeof api.auth.registrar>[0]) => Promise<Usuario>;
  sair: () => Promise<void>;
  atualizarUsuario: (usuario: Usuario) => Promise<void>;
}

const SessaoContext = createContext<ValorSessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const cancelar = sessaoArmazenada.assinar(setSessao);
    sessaoArmazenada.carregar().finally(() => setCarregando(false));
    return cancelar;
  }, []);

  const valor = useMemo<ValorSessao>(() => ({
    carregando,
    usuario: sessao?.usuario ?? null,
    estaLogado: Boolean(sessao?.refreshToken),
    async entrar(login, senha) {
      const nova = await api.auth.entrar(login, senha);
      await sessaoArmazenada.salvar(nova);
      return nova.usuario;
    },
    async registrar(dados) {
      const nova = await api.auth.registrar(dados);
      await sessaoArmazenada.salvar(nova);
      return nova.usuario;
    },
    async sair() {
      const refreshToken = sessaoArmazenada.obter()?.refreshToken;
      await sessaoArmazenada.limpar();
      if (refreshToken) await api.auth.sair(refreshToken).catch(() => undefined);
    },
    atualizarUsuario: (usuario) => sessaoArmazenada.atualizarUsuario(usuario)
  }), [sessao, carregando]);

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const contexto = useContext(SessaoContext);
  if (!contexto) throw new Error('useSessao deve ser usado dentro de SessaoProvider');
  return contexto;
}
