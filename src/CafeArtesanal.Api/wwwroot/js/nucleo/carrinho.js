// Carrinho local (localStorage). Os preços são apenas para exibição:
// no fechamento, a API recalcula tudo com os valores do banco.

const CHAVE = 'cafe.carrinho';
const MAXIMO_POR_ITEM = 99;

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) ?? []; } catch { return []; }
}

function gravar(itens) {
  localStorage.setItem(CHAVE, JSON.stringify(itens));
  window.dispatchEvent(new CustomEvent('carrinho:alterado', { detail: itens }));
}

export const carrinho = {
  itens: ler,

  adicionar(produto, quantidade = 1) {
    const itens = ler();
    const existente = itens.find((i) => i.produtoId === produto.id);
    const limite = Math.min(MAXIMO_POR_ITEM, produto.estoque ?? MAXIMO_POR_ITEM);
    const atual = existente?.quantidade ?? 0;
    if (atual >= limite) return 0;

    const novaQuantidade = Math.min(limite, atual + quantidade);
    if (existente) {
      existente.quantidade = novaQuantidade;
    } else {
      itens.push({
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagemUrl: produto.imagemUrl,
        estoque: produto.estoque,
        quantidade: novaQuantidade
      });
    }
    gravar(itens);
    return novaQuantidade;
  },

  definirQuantidade(produtoId, quantidade) {
    const itens = ler();
    const item = itens.find((i) => i.produtoId === produtoId);
    if (!item) return;
    if (quantidade <= 0) return this.remover(produtoId);
    item.quantidade = Math.min(quantidade, MAXIMO_POR_ITEM, item.estoque ?? MAXIMO_POR_ITEM);
    gravar(itens);
  },

  remover(produtoId) {
    gravar(ler().filter((i) => i.produtoId !== produtoId));
  },

  limpar() { gravar([]); },

  quantidadeTotal: () => ler().reduce((total, i) => total + i.quantidade, 0),
  subtotal: () => ler().reduce((total, i) => total + i.preco * i.quantidade, 0),

  /**
   * Confere o carrinho com o catálogo atual: atualiza preço/estoque e
   * devolve os itens que ficaram indisponíveis.
   */
  conciliar(produtos) {
    const porId = new Map(produtos.map((p) => [p.id, p]));
    const indisponiveis = [];
    const itens = ler().map((item) => {
      const atual = porId.get(item.produtoId);
      if (!atual || !atual.disponivel) {
        indisponiveis.push(item.nome);
        return { ...item, indisponivel: true };
      }
      return {
        ...item,
        nome: atual.nome,
        preco: atual.preco,
        imagemUrl: atual.imagemUrl,
        estoque: atual.estoque,
        quantidade: Math.min(item.quantidade, atual.estoque),
        indisponivel: false
      };
    });
    gravar(itens);
    return indisponiveis;
  }
};

// Mantém abas abertas em sincronia.
window.addEventListener('storage', (e) => {
  if (e.key === CHAVE) window.dispatchEvent(new CustomEvent('carrinho:alterado', { detail: ler() }));
});
