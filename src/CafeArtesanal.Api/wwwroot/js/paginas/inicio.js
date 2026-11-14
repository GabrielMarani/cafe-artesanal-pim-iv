import { api } from '../nucleo/api.js';
import { carrinho } from '../nucleo/carrinho.js';
import { cartaoProduto } from '../nucleo/componentes.js';
import { montarLayout } from '../nucleo/layout.js';
import { sessao } from '../nucleo/sessao.js';
import { $, $$, aviso, estadoErro, estadoVazio, html, icone, renderizar } from '../nucleo/ui.js';

montarLayout();

$$('[data-marca-secao]').forEach((elemento) => renderizar(elemento, icone('graos')));

if ('IntersectionObserver' in window) {
  const entradas = new IntersectionObserver((eventos) => {
    for (const { isIntersecting, target } of eventos) {
      if (!isIntersecting) continue;
      target.classList.add('secao-em-vista');
      entradas.unobserve(target);
    }
  }, { threshold: .08 });
  $$('[data-entrada]').forEach((secao) => entradas.observe(secao));
}

const RECURSOS = [
  ['mao', 'Tradução em Libras', 'Widget VLibras (Governo Federal) traduz o conteúdo para a Língua Brasileira de Sinais.'],
  ['usuario', 'Nome social', 'No cadastro você informa como quer ser chamado(a). É esse nome que aparece no site, no app e para a equipe.'],
  ['contraste', 'Alto contraste e tema escuro', 'Modos de cor para baixa visão e sensibilidade à luz, com contraste mínimo WCAG AA.'],
  ['texto', 'Tamanho da fonte', 'Aumente ou diminua o texto em todas as páginas. A preferência fica salva.'],
  ['teclado', 'Navegação por teclado', 'Todos os recursos funcionam sem mouse, com atalhos Alt+1, Alt+2 e Alt+3.'],
  ['coracao', 'Respeito e não discriminação', 'Atendimento igual para todas as pessoas, sem perguntas sobre gênero, raça ou origem.']
];

renderizar($('#recursos-inclusao'), html`${RECURSOS.map(([nomeIcone, titulo, texto]) => html`
  <div class="cartao recurso">${icone(nomeIcone)}<div><h3>${titulo}</h3><p>${texto}</p></div></div>`)}`);

function montarVitrine(id, buscarProdutos, tituloVazio) {
  const faixa = document.getElementById(id);
  const controles = $('.vitrine-controles', faixa.parentElement);
  const setas = controles ? $$('[data-deslocamento]', controles) : [];
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  let produtos = [];

  function atualizarControles() {
    const limite = faixa.scrollWidth - faixa.clientWidth;
    const desliza = limite > 1 && produtos.length > 0;
    faixa.tabIndex = desliza ? 0 : -1;
    if (!controles) return;
    controles.hidden = !desliza;
    setas[0].setAttribute('aria-disabled', String(faixa.scrollLeft <= 1));
    setas[1].setAttribute('aria-disabled', String(faixa.scrollLeft >= limite - 1));
  }

  function deslocar(direcao) {
    const [primeiro, segundo] = faixa.children;
    if (!segundo) return;
    const passo = segundo.offsetLeft - primeiro.offsetLeft;
    faixa.scrollBy({ left: passo * direcao, behavior: reduzirMovimento.matches ? 'auto' : 'smooth' });
  }

  async function carregar() {
    faixa.setAttribute('aria-busy', 'true');
    try {
      produtos = await buscarProdutos();
      renderizar(faixa, produtos.length
        ? html`${produtos.map((p) => cartaoProduto(p, { podeComprar: !sessao.ehEquipe(), vitrine: true }))}`
        : estadoVazio({ icone: 'cafe', titulo: tituloVazio }));
    } catch (erro) {
      produtos = [];
      renderizar(faixa, estadoErro(erro));
    } finally {
      faixa.setAttribute('aria-busy', 'false');
      atualizarControles();
    }
  }

  setas.forEach((seta) => {
    renderizar(seta, icone('setaDireita'));
    seta.addEventListener('click', () => {
      if (seta.getAttribute('aria-disabled') !== 'true') deslocar(Number(seta.dataset.deslocamento));
    });
  });
  faixa.addEventListener('scroll', atualizarControles, { passive: true });
  new ResizeObserver(atualizarControles).observe(faixa);
  faixa.addEventListener('keydown', (e) => {
    if (e.target !== faixa || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    deslocar(e.key === 'ArrowLeft' ? -1 : 1);
  });
  faixa.addEventListener('click', (e) => {
    if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
    const botao = e.target.closest('[data-acao="adicionar"]');
    if (!botao) return;
    const produto = produtos.find((p) => p.id === Number(botao.dataset.id));
    if (!produto) return;
    aviso.carrinho(produto.nome, botao, carrinho.adicionar(produto));
  });

  carregar();
}

montarVitrine('destaques', () => api.produtos.todos({ destaque: true }), 'Nenhum destaque no momento');
montarVitrine('produtos-da-casa', async () => {
  const pagina = await api.produtos.pesquisar({ destaque: false, tamanhoPagina: 4 });
  return pagina.itens;
}, 'Nenhum outro produto no momento');
