import { api } from '../nucleo/api.js';
import { carrinho } from '../nucleo/carrinho.js';
import { cartaoProduto } from '../nucleo/componentes.js';
import { debounce } from '../nucleo/formatos.js';
import { montarLayout } from '../nucleo/layout.js';
import { sessao } from '../nucleo/sessao.js';
import { $, aviso, estadoErro, estadoVazio, html, renderizar } from '../nucleo/ui.js';

montarLayout();

const parametros = new URLSearchParams(location.search);
const filtro = {
  categoria: parametros.get('categoria') ?? '',
  busca: parametros.get('busca') ?? '',
  ordenar: parametros.get('ordenar') ?? ''
};

const elBusca = $('#busca');
const elOrdenar = $('#ordenar');
const elCategorias = $('#categorias');
const elProdutos = $('#produtos');
const elResumo = $('#resumo-resultados');
let produtos = [];
let requisicaoAtual = 0;

elBusca.value = filtro.busca;
elOrdenar.value = filtro.ordenar;

async function carregarCategorias() {
  try {
    const categorias = await api.categorias.listar();
    const chip = (slug, nome, quantidade) => html`<button type="button" class="chip" data-categoria="${slug}"
        aria-pressed="${filtro.categoria === slug}">${nome}${quantidade !== undefined ? html`<span class="contagem">(${quantidade})</span>` : ''}</button>`;
    renderizar(elCategorias, html`${chip('', 'Todas')}${categorias.map((c) => chip(c.slug, c.nome, c.quantidadeProdutos))}`);
  } catch {
    elCategorias.hidden = true;
  }
}

async function carregarProdutos() {
  const numero = ++requisicaoAtual; // ignora respostas antigas se a pessoa digitar rápido
  elProdutos.setAttribute('aria-busy', 'true');
  try {
    const pagina = await api.produtos.pesquisar({ ...filtro, tamanhoPagina: 100 });
    if (numero !== requisicaoAtual) return;
    produtos = pagina.itens;

    renderizar(elProdutos, produtos.length
      ? html`${produtos.map((p) => cartaoProduto(p, { podeComprar: !sessao.ehEquipe() }))}`
      : estadoVazio({ icone: 'busca', titulo: 'Nenhum produto encontrado', texto: 'Tente outra palavra ou escolha outra categoria.' }));
    elResumo.textContent = `${pagina.totalItens} produto(s) encontrado(s).`;
  } catch (erro) {
    if (numero === requisicaoAtual) renderizar(elProdutos, estadoErro(erro));
  } finally {
    elProdutos.removeAttribute('aria-busy');
  }
}

function atualizarUrl() {
  const p = new URLSearchParams();
  Object.entries(filtro).forEach(([chave, valor]) => valor && p.set(chave, valor));
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

elBusca.addEventListener('input', debounce(() => {
  filtro.busca = elBusca.value.trim();
  atualizarUrl();
  carregarProdutos();
}, 350));

elOrdenar.addEventListener('change', () => {
  filtro.ordenar = elOrdenar.value;
  atualizarUrl();
  carregarProdutos();
});

elCategorias.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-categoria]');
  if (!chip) return;
  filtro.categoria = chip.dataset.categoria;
  elCategorias.querySelectorAll('[data-categoria]').forEach((c) =>
    c.setAttribute('aria-pressed', String(c.dataset.categoria === filtro.categoria)));
  atualizarUrl();
  carregarProdutos();
});

elProdutos.addEventListener('click', (e) => {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregarProdutos();
  const botao = e.target.closest('[data-acao="adicionar"]');
  if (!botao) return;
  const produto = produtos.find((p) => p.id === Number(botao.dataset.id));
  if (!produto) return;

  const noCarrinho = carrinho.itens().find((i) => i.produtoId === produto.id)?.quantidade ?? 0;
  if (noCarrinho >= produto.estoque) {
    aviso.info(`Você já adicionou todo o estoque disponível de ${produto.nome}.`);
    return;
  }
  carrinho.adicionar(produto);
  aviso.sucesso(`${produto.nome} adicionado ao carrinho.`);
});

carregarCategorias();
carregarProdutos();
