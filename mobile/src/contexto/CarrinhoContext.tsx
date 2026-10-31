import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Produto } from '../api/tipos';
import { armazenamento } from '../armazenamento';

export interface ItemCarrinho {
  produtoId: number;
  nome: string;
  preco: number;
  imagemUrl: string | null;
  estoque: number;
  quantidade: number;
}

interface ValorCarrinho {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  subtotal: number;
  adicionar: (produto: Produto, quantidade?: number) => boolean;
  definirQuantidade: (produtoId: number, quantidade: number) => void;
  remover: (produtoId: number) => void;
  limpar: () => void;
  /** Atualiza preço/estoque com o catálogo sincronizado e tira o que ficou indisponível. */
  conciliar: (produtos: Produto[]) => string[];
}

const CHAVE = 'cafe.carrinho';
const CarrinhoContext = createContext<ValorCarrinho | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    armazenamento.lerJson<ItemCarrinho[]>(CHAVE).then((salvos) => {
      if (salvos) setItens(salvos);
      setCarregado(true);
    });
  }, []);

  useEffect(() => {
    if (carregado) armazenamento.gravarJson(CHAVE, itens);
  }, [itens, carregado]);

  const valor = useMemo<ValorCarrinho>(() => ({
    itens,
    quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
    subtotal: itens.reduce((s, i) => s + i.preco * i.quantidade, 0),

    adicionar(produto, quantidade = 1) {
      const existente = itens.find((i) => i.produtoId === produto.id);
      const novaQuantidade = (existente?.quantidade ?? 0) + quantidade;
      if (!produto.disponivel || novaQuantidade > Math.min(99, produto.estoque)) return false;

      setItens((atuais) => existente
        ? atuais.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: novaQuantidade } : i))
        : [...atuais, {
            produtoId: produto.id, nome: produto.nome, preco: produto.preco,
            imagemUrl: produto.imagemUrl, estoque: produto.estoque, quantidade
          }]);
      return true;
    },

    definirQuantidade(produtoId, quantidade) {
      setItens((atuais) => quantidade <= 0
        ? atuais.filter((i) => i.produtoId !== produtoId)
        : atuais.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.min(quantidade, i.estoque, 99) } : i)));
    },

    remover: (produtoId) => setItens((atuais) => atuais.filter((i) => i.produtoId !== produtoId)),
    limpar: () => setItens([]),

    conciliar(produtos) {
      const porId = new Map(produtos.map((p) => [p.id, p]));
      const removidos: string[] = [];
      const atualizados = itens.flatMap((item) => {
        const p = porId.get(item.produtoId);
        if (!p || !p.disponivel) {
          removidos.push(item.nome);
          return [];
        }
        return [{ ...item, nome: p.nome, preco: p.preco, imagemUrl: p.imagemUrl, estoque: p.estoque, quantidade: Math.min(item.quantidade, p.estoque) }];
      });
      if (JSON.stringify(atualizados) !== JSON.stringify(itens)) setItens(atualizados);
      return removidos;
    }
  }), [itens]);

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho() {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider');
  return contexto;
}
