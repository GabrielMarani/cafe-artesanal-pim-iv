import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import type { Categoria, CatalogoSync, Loja, Produto } from '../api/tipos';
import { armazenamento } from '../armazenamento';

/**
 * Catálogo com SINCRONIZAÇÃO OFFLINE-FIRST:
 *  1. abre instantaneamente com a cópia salva no aparelho;
 *  2. pede à API só o que mudou desde a última sincronização (GET /sync/catalogo?desde=...);
 *  3. mescla as mudanças (inclusive remoção de itens desativados) e salva de novo;
 *  4. sincroniza outra vez quando a internet volta (NetInfo) ou ao puxar a lista para baixo.
 */

interface CatalogoLocal {
  servidorEm: string | null;
  categorias: Categoria[];
  produtos: Produto[];
}

interface ValorCatalogo {
  categorias: Categoria[];
  produtos: Produto[];
  loja: Loja | null;
  online: boolean;
  sincronizando: boolean;
  ultimaSincronizacao: string | null;
  erro: string | null;
  sincronizar: () => Promise<void>;
}

const CHAVE = 'cafe.catalogo';
const CHAVE_LOJA = 'cafe.loja';
const CatalogoContext = createContext<ValorCatalogo | null>(null);

function mesclar(local: CatalogoLocal, recebido: CatalogoSync): CatalogoLocal {
  if (recebido.completo) {
    return { servidorEm: recebido.servidorEm, categorias: recebido.categorias, produtos: recebido.produtos };
  }
  const porId = <T extends { id: number }>(lista: T[], novos: T[]) => {
    const mapa = new Map(lista.map((x) => [x.id, x]));
    novos.forEach((x) => mapa.set(x.id, x));
    return [...mapa.values()];
  };
  return {
    servidorEm: recebido.servidorEm,
    categorias: porId(local.categorias, recebido.categorias),
    produtos: porId(local.produtos, recebido.produtos)
  };
}

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<CatalogoLocal>({ servidorEm: null, categorias: [], produtos: [] });
  const [loja, setLoja] = useState<Loja | null>(null);
  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const localRef = useRef(local);
  localRef.current = local;

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const recebido = await api.sincronizarCatalogo(localRef.current.servidorEm);
      const mesclado = mesclar(localRef.current, recebido);
      setLocal(mesclado);
      await armazenamento.gravarJson(CHAVE, mesclado);

      const dadosLoja = await api.loja();
      setLoja(dadosLoja);
      await armazenamento.gravarJson(CHAVE_LOJA, dadosLoja);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao sincronizar.');
    } finally {
      setSincronizando(false);
    }
  }, []);

  // Abre com o que está salvo e depois sincroniza.
  useEffect(() => {
    (async () => {
      const salvo = await armazenamento.lerJson<CatalogoLocal>(CHAVE);
      if (salvo) setLocal(salvo);
      localRef.current = salvo ?? localRef.current;
      setLoja(await armazenamento.lerJson<Loja>(CHAVE_LOJA));
      await sincronizar();
    })();
  }, [sincronizar]);

  // Quando a conexão volta, sincroniza automaticamente.
  useEffect(() => {
    let estavaOffline = false;
    return NetInfo.addEventListener((estado) => {
      const conectado = estado.isConnected !== false;
      setOnline(conectado);
      if (conectado && estavaOffline) sincronizar();
      estavaOffline = !conectado;
    });
  }, [sincronizar]);

  const valor = useMemo<ValorCatalogo>(() => {
    const categoriasAtivas = local.categorias.filter((c) => c.ativo).sort((a, b) => a.ordemExibicao - b.ordemExibicao);
    const idsAtivos = new Set(categoriasAtivas.map((c) => c.id));
    const ordem = new Map(categoriasAtivas.map((c) => [c.id, c.ordemExibicao]));
    const produtos = local.produtos
      .filter((p) => p.ativo && (p.categoriaId === null || idsAtivos.has(p.categoriaId)))
      .sort((a, b) => (ordem.get(a.categoriaId ?? -1) ?? 999) - (ordem.get(b.categoriaId ?? -1) ?? 999) || a.nome.localeCompare(b.nome));
    return {
      categorias: categoriasAtivas,
      produtos,
      loja,
      online,
      sincronizando,
      ultimaSincronizacao: local.servidorEm,
      erro,
      sincronizar
    };
  }, [local, loja, online, sincronizando, erro, sincronizar]);

  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo() {
  const contexto = useContext(CatalogoContext);
  if (!contexto) throw new Error('useCatalogo deve ser usado dentro de CatalogoProvider');
  return contexto;
}
