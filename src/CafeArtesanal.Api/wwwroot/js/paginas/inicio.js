import { api } from '../nucleo/api.js';
import { carrinho } from '../nucleo/carrinho.js';
import { cartaoProduto } from '../nucleo/componentes.js';
import { montarLayout } from '../nucleo/layout.js';
import { sessao } from '../nucleo/sessao.js';
import { $, aviso, estadoErro, estadoVazio, html, icone, renderizar } from '../nucleo/ui.js';

montarLayout();

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

let destaques = [];
const grade = $('#destaques');

async function carregarDestaques() {
  try {
    const pagina = await api.produtos.pesquisar({ destaque: true, tamanhoPagina: 3 });
    destaques = pagina.itens;
    renderizar(grade, destaques.length
      ? html`${destaques.map((p) => cartaoProduto(p, { podeComprar: !sessao.ehEquipe() }))}`
      : estadoVazio({ icone: 'cafe', titulo: 'Nenhum destaque no momento' }));
  } catch (erro) {
    renderizar(grade, estadoErro(erro));
  }
}

grade.addEventListener('click', (e) => {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregarDestaques();
  const botao = e.target.closest('[data-acao="adicionar"]');
  if (!botao) return;
  const produto = destaques.find((p) => p.id === Number(botao.dataset.id));
  if (!produto) return;
  carrinho.adicionar(produto);
  aviso.sucesso(`${produto.nome} adicionado ao carrinho.`);
});

carregarDestaques();
