// Componentes visuais reutilizados em várias páginas.

import { etapasDoPedido, formatarData, formatarMoeda, rotulosStatus } from './formatos.js';
import { IMAGEM_PADRAO, html, icone } from './ui.js';

/** Cartão de produto do cardápio. */
export function cartaoProduto(p, { podeComprar = true } = {}) {
  const ultimas = p.disponivel && p.estoque <= 5;
  return html`<article class="cartao-produto" aria-labelledby="produto-${p.id}">
    <div class="imagem">
      <img src="${p.imagemUrl || IMAGEM_PADRAO}" alt="${p.nome}" loading="lazy" width="400" height="300">
      <div class="selos">
        ${p.destaque ? html`<span class="selo selo-destaque">${icone('estrela')} Destaque</span>` : ''}
        ${!p.disponivel ? html`<span class="selo selo-erro">Esgotado</span>` : ''}
        ${ultimas ? html`<span class="selo selo-alerta">Últimas ${p.estoque} unidades</span>` : ''}
      </div>
    </div>
    <div class="corpo">
      <span class="categoria">${p.categoriaNome ?? 'Outros'}</span>
      <h3 id="produto-${p.id}">${p.nome}</h3>
      <p class="descricao">${p.descricao ?? ''}</p>
      <div class="rodape-produto">
        <span class="preco">${formatarMoeda(p.preco)}</span>
        ${podeComprar ? html`<button type="button" class="botao botao-primario botao-pequeno" data-acao="adicionar" data-id="${p.id}"
            ${p.disponivel ? '' : 'disabled'} aria-label="Adicionar ${p.nome} ao carrinho">
            ${icone('mais')} Adicionar</button>` : ''}
      </div>
    </div>
  </article>`;
}

export const seloStatus = (status, rotulo) =>
  html`<span class="status status-${status}">${rotulo ?? rotulosStatus[status] ?? status}</span>`;

/** Barra de progresso visual + texto para leitores de tela. */
export function progressoPedido(pedido) {
  if (pedido.status === 'cancelado') return '';
  const etapas = etapasDoPedido(pedido.tipoEntrega);
  const indice = etapas.indexOf(pedido.status);
  return html`<div class="progresso-pedido" role="img" aria-label="Etapa ${indice + 1} de ${etapas.length}: ${rotulosStatus[pedido.status]}">
    ${etapas.map((_, i) => html`<span class="${i <= indice ? 'feito' : ''}"></span>`)}
  </div>`;
}

export function linhaDoTempo(historico = []) {
  if (!historico.length) return '';
  return html`<h4>Linha do tempo</h4>
    <ol class="linha-tempo">
      ${historico.map((h) => html`<li>
        <strong>${h.rotulo}</strong>
        <small>${formatarData(h.data)}${h.responsavel ? html` · por ${h.responsavel}` : ''}</small>
        ${h.observacao && h.observacao !== 'Pedido criado' ? html`<div class="texto-suave">${h.observacao}</div>` : ''}
      </li>`)}
    </ol>`;
}

export function itensETotais(pedido) {
  return html`<ul class="itens-pedido">
      ${pedido.itens.map((i) => html`<li><span>${i.quantidade}× ${i.nomeProduto}</span><span>${formatarMoeda(i.subtotal)}</span></li>`)}
    </ul>
    <dl class="totais-pedido">
      <dt>Subtotal</dt><dd>${formatarMoeda(pedido.subtotal)}</dd>
      <dt>Taxa de entrega</dt><dd>${pedido.taxaEntrega > 0 ? formatarMoeda(pedido.taxaEntrega) : 'Grátis'}</dd>
      <dt class="total-final">Total</dt><dd class="total-final">${formatarMoeda(pedido.total)}</dd>
    </dl>`;
}
