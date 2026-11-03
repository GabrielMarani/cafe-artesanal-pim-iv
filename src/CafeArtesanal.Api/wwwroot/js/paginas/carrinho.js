import { api } from '../nucleo/api.js';
import { carrinho } from '../nucleo/carrinho.js';
import { abrirFormularioEndereco } from '../nucleo/formulario-endereco.js';
import { formatarMoeda, rotulosPagamento } from '../nucleo/formatos.js';
import { montarLayout } from '../nucleo/layout.js';
import { sessao } from '../nucleo/sessao.js';
import {
  $, IMAGEM_PADRAO, anunciar, aviso, confirmar, definirCarregando, estadoVazio, html, icone,
  mostrarErroFormulario, renderizar
} from '../nucleo/ui.js';

if (sessao.ehEquipe()) location.replace('admin.html');
montarLayout();

const area = $('#area-carrinho');
const estado = {
  loja: { taxaEntrega: 5, pedidoMinimo: 10 },
  enderecos: [],
  tipoEntrega: 'retirada',
  formaPagamento: 'pix',
  enderecoId: null,
  observacao: '',
  avisoIndisponiveis: []
};

async function iniciar() {
  const [loja, catalogo, enderecos] = await Promise.allSettled([
    api.loja(),
    api.catalogoCompleto(),
    sessao.estaLogado() ? api.conta.enderecos() : Promise.resolve([])
  ]);

  if (loja.status === 'fulfilled') estado.loja = loja.value;
  if (catalogo.status === 'fulfilled') estado.avisoIndisponiveis = carrinho.conciliar(catalogo.value.produtos);
  if (enderecos.status === 'fulfilled') {
    estado.enderecos = enderecos.value;
    estado.enderecoId = enderecos.value.find((e) => e.principal)?.id ?? enderecos.value[0]?.id ?? null;
  }
  desenhar();
}

const taxaAtual = () => (estado.tipoEntrega === 'entrega' ? estado.loja.taxaEntrega : 0);

function desenhar() {
  const itens = carrinho.itens();
  if (!itens.length) {
    renderizar(area, estadoVazio({
      icone: 'carrinho',
      titulo: 'Seu carrinho está vazio',
      texto: 'Que tal um café especial?',
      acao: html`<a class="botao botao-primario" href="cardapio.html">Ver cardápio</a>`
    }));
    return;
  }

  renderizar(area, html`
    ${estado.avisoIndisponiveis.length ? html`<div class="alerta alerta-aviso" role="alert">${icone('alerta')}
      <span>Alguns itens ficaram indisponíveis e não serão enviados: ${estado.avisoIndisponiveis.join(', ')}.</span></div>` : ''}
    <div class="layout-carrinho">
      <div class="pilha">
        <section class="cartao" aria-labelledby="titulo-itens">
          <div class="linha-entre">
            <h2 id="titulo-itens" class="mb-0">Itens (${carrinho.quantidadeTotal()})</h2>
            <button type="button" class="botao botao-texto" data-acao="limpar">${icone('lixeira')} Esvaziar carrinho</button>
          </div>
          <ul class="lista-itens mt-2">${itens.map(desenharItem)}</ul>
        </section>
        ${desenharCheckout()}
      </div>
      ${desenharResumo(itens)}
    </div>`);
}

function desenharItem(item) {
  return html`<li class="item-carrinho ${item.indisponivel ? 'inativo' : ''}" data-id="${item.produtoId}">
    <img src="${item.imagemUrl || IMAGEM_PADRAO}" alt="" width="84" height="84" loading="lazy">
    <div>
      <h3>${item.nome}</h3>
      <span class="texto-suave">${formatarMoeda(item.preco)} cada</span>
      ${item.indisponivel ? html`<div><span class="selo selo-erro">Indisponível</span></div>` : ''}
    </div>
    <div class="acoes-item">
      <div class="quantidade" role="group" aria-label="Quantidade de ${item.nome}">
        <button type="button" data-acao="diminuir" aria-label="Diminuir quantidade de ${item.nome}">−</button>
        <output aria-live="polite">${item.quantidade}</output>
        <button type="button" data-acao="aumentar" aria-label="Aumentar quantidade de ${item.nome}"
          ${item.quantidade >= (item.estoque ?? 99) || item.indisponivel ? 'disabled' : ''}>+</button>
      </div>
      <strong>${formatarMoeda(item.preco * item.quantidade)}</strong>
      <button type="button" class="botao botao-texto botao-pequeno" data-acao="remover">Remover</button>
    </div>
  </li>`;
}

function desenharCheckout() {
  if (!sessao.estaLogado()) {
    return html`<section class="cartao" aria-labelledby="titulo-finalizar">
      <h2 id="titulo-finalizar">Finalizar pedido</h2>
      <p>Para finalizar, entre na sua conta ou crie uma em menos de um minuto.</p>
      <a class="botao botao-primario" href="login.html?voltar=carrinho.html">${icone('entrar')} Entrar para finalizar</a>
    </section>`;
  }

  const opcao = (nome, valor, rotulo, nomeIcone, atual) => html`<label class="opcao">
    <input type="radio" name="${nome}" value="${valor}" ${valor === atual ? 'checked' : ''}>
    <span>${nomeIcone ? icone(nomeIcone) : ''}${rotulo}</span></label>`;

  return html`<form class="cartao" id="form-checkout" aria-labelledby="titulo-finalizar" novalidate>
    <h2 id="titulo-finalizar">Como você quer receber?</h2>
    <fieldset>
      <legend>Entrega</legend>
      <div class="opcoes">
        ${opcao('tipoEntrega', 'retirada', 'Retirar no balcão (grátis)', 'loja', estado.tipoEntrega)}
        ${opcao('tipoEntrega', 'entrega', `Entrega (${formatarMoeda(estado.loja.taxaEntrega)})`, 'entrega', estado.tipoEntrega)}
      </div>
    </fieldset>

    ${estado.tipoEntrega === 'entrega' ? html`<fieldset>
      <legend>Endereço de entrega</legend>
      ${estado.enderecos.length
        ? html`<div class="opcoes" style="grid-template-columns:1fr">
            ${estado.enderecos.map((e) => html`<label class="opcao">
              <input type="radio" name="enderecoId" value="${e.id}" ${e.id === estado.enderecoId ? 'checked' : ''}>
              <span>${icone('local')}<span><strong>${e.apelido}</strong><br><small>${e.descricao}</small></span></span></label>`)}
          </div>`
        : html`<p class="texto-suave">Você ainda não tem endereço cadastrado.</p>`}
      <button type="button" class="botao botao-pequeno mt-2" data-acao="novo-endereco">${icone('mais')} Cadastrar endereço</button>
    </fieldset>` : ''}

    <fieldset>
      <legend>Pagamento <span class="texto-suave" style="font-weight:400">(na entrega ou na retirada)</span></legend>
      <div class="opcoes">
        ${Object.entries(rotulosPagamento).map(([valor, rotulo]) => opcao('formaPagamento', valor, rotulo, null, estado.formaPagamento))}
      </div>
    </fieldset>

    <div class="campo">
      <label for="observacao">Observações <span class="opcional">(opcional)</span></label>
      <textarea id="observacao" name="observacao" maxlength="300" placeholder="Ex.: sem açúcar, leite sem lactose, interfone 52...">${estado.observacao}</textarea>
    </div>
  </form>`;
}

function desenharResumo(itens) {
  const subtotal = itens.filter((i) => !i.indisponivel).reduce((s, i) => s + i.preco * i.quantidade, 0);
  const taxa = taxaAtual();
  const abaixoDoMinimo = subtotal < estado.loja.pedidoMinimo;
  const podeFinalizar = sessao.estaLogado() && !abaixoDoMinimo &&
    (estado.tipoEntrega === 'retirada' || estado.enderecoId);

  return html`<aside class="cartao resumo" aria-labelledby="titulo-resumo">
    <h2 id="titulo-resumo">Resumo</h2>
    <dl>
      <dt>Subtotal</dt><dd>${formatarMoeda(subtotal)}</dd>
      <dt>Taxa de entrega</dt><dd>${taxa ? formatarMoeda(taxa) : 'Grátis'}</dd>
      <dt class="total">Total</dt><dd class="total">${formatarMoeda(subtotal + taxa)}</dd>
    </dl>
    ${abaixoDoMinimo ? html`<p class="alerta alerta-info">${icone('info')} Pedido mínimo de ${formatarMoeda(estado.loja.pedidoMinimo)}.</p>` : ''}
    ${sessao.estaLogado() ? html`<button type="button" class="botao botao-primario botao-grande botao-bloco" data-acao="finalizar"
        ${podeFinalizar ? '' : 'disabled'}>${icone('check')} Finalizar pedido</button>` : ''}
    <a class="botao botao-texto botao-bloco mt-1" href="cardapio.html">Continuar comprando</a>
  </aside>`;
}

// ------------------------------------------------------------------ Eventos

area.addEventListener('click', async (e) => {
  const alvo = e.target.closest('[data-acao]');
  if (!alvo) return;
  const id = Number(alvo.closest('[data-id]')?.dataset.id);
  const item = carrinho.itens().find((i) => i.produtoId === id);

  switch (alvo.dataset.acao) {
    case 'aumentar':
      carrinho.definirQuantidade(id, item.quantidade + 1);
      break;
    case 'diminuir':
      carrinho.definirQuantidade(id, item.quantidade - 1);
      if (item.quantidade - 1 <= 0) anunciar(`${item.nome} removido do carrinho.`);
      break;
    case 'remover':
      carrinho.remover(id);
      anunciar(`${item.nome} removido do carrinho.`);
      break;
    case 'limpar': {
      const { confirmado } = await confirmar({ titulo: 'Esvaziar carrinho', mensagem: 'Remover todos os itens do carrinho?', textoConfirmar: 'Esvaziar', perigo: true });
      if (confirmado) carrinho.limpar();
      break;
    }
    case 'novo-endereco': {
      const novo = await abrirFormularioEndereco();
      if (novo) {
        estado.enderecos = await api.conta.enderecos();
        estado.enderecoId = novo.id;
        aviso.sucesso('Endereço cadastrado.');
        desenhar();
      }
      return;
    }
    case 'finalizar':
      await finalizar(alvo);
      return;
    default:
      return;
  }
  desenhar();
  area.querySelector(`[data-id="${id}"] [data-acao="${alvo.dataset.acao}"]`)?.focus();
});

area.addEventListener('change', (e) => {
  const campo = e.target;
  if (campo.name === 'tipoEntrega') estado.tipoEntrega = campo.value;
  else if (campo.name === 'formaPagamento') estado.formaPagamento = campo.value;
  else if (campo.name === 'enderecoId') estado.enderecoId = Number(campo.value);
  else return;
  desenhar();
  area.querySelector(`input[name="${campo.name}"][value="${campo.value}"]`)?.focus();
});

area.addEventListener('input', (e) => {
  if (e.target.name === 'observacao') estado.observacao = e.target.value;
});

async function finalizar(botao) {
  const itens = carrinho.itens().filter((i) => !i.indisponivel);
  const pedido = {
    itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
    tipoEntrega: estado.tipoEntrega,
    formaPagamento: estado.formaPagamento,
    enderecoId: estado.tipoEntrega === 'entrega' ? estado.enderecoId : null,
    observacao: estado.observacao.trim() || null
  };

  definirCarregando(botao, true, 'Enviando pedido...');
  try {
    const criado = await api.pedidos.criar(pedido);
    carrinho.limpar();
    location.href = `pedidos.html?novo=${criado.id}`;
  } catch (erro) {
    definirCarregando(botao, false);
    const form = $('#form-checkout');
    if (form) mostrarErroFormulario(form, erro.message);
    aviso.erro(erro.message);
  }
}

window.addEventListener('carrinho:alterado', () => { if (!area.contains(document.activeElement)) desenhar(); });

iniciar();
