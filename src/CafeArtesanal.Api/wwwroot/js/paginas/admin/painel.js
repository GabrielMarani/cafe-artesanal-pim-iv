// Indicadores do negócio. Os dados vêm das stored procedures do banco
// (sp_dashboard_resumo, sp_vendas_por_dia, sp_produtos_mais_vendidos, sp_pedidos_por_status)
// e da view vw_produtos_estoque_baixo.

import { api } from '../../nucleo/api.js';
import { seloStatus } from '../../nucleo/componentes.js';
import { dataIso, formatarDiaMes, formatarMoeda } from '../../nucleo/formatos.js';
import { $, estadoCarregando, estadoErro, html, icone, renderizar } from '../../nucleo/ui.js';
import { abrirAjusteEstoque } from './produtos.js';

let raiz;
let dados = null;

export function montar(elemento) {
  raiz = elemento;
  const hoje = new Date();
  const seteDias = new Date(hoje); seteDias.setDate(hoje.getDate() - 6);

  renderizar(raiz, html`
    <form class="periodo" id="form-periodo" aria-label="Período do relatório">
      <div class="campo"><label for="inicio">De</label><input type="date" id="inicio" value="${dataIso(seteDias)}" max="${dataIso(hoje)}"></div>
      <div class="campo"><label for="fim">Até</label><input type="date" id="fim" value="${dataIso(hoje)}" max="${dataIso(hoje)}"></div>
      <div class="linha">
        <button type="button" class="botao botao-pequeno" data-dias="7">7 dias</button>
        <button type="button" class="botao botao-pequeno" data-dias="30">30 dias</button>
        <button type="button" class="botao botao-pequeno" data-dias="90">90 dias</button>
        <button type="submit" class="botao botao-primario botao-pequeno">Aplicar</button>
        <button type="button" class="botao botao-texto botao-pequeno" id="exportar">${icone('baixar')} Exportar CSV</button>
      </div>
    </form>
    <div id="conteudo-painel" aria-live="polite"></div>`);

  $('#form-periodo', raiz).addEventListener('submit', (e) => { e.preventDefault(); carregar(); });
  $('#form-periodo', raiz).addEventListener('click', (e) => {
    const dias = Number(e.target.closest('[data-dias]')?.dataset.dias);
    if (!dias) return;
    const fim = new Date();
    const inicio = new Date(fim); inicio.setDate(fim.getDate() - (dias - 1));
    $('#inicio', raiz).value = dataIso(inicio);
    $('#fim', raiz).value = dataIso(fim);
    carregar();
  });
  $('#exportar', raiz).addEventListener('click', exportarCsv);
  raiz.addEventListener('click', async (e) => {
    if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
    const botao = e.target.closest('[data-ajustar]');
    if (!botao) return;
    const produto = await api.produtos.obter(Number(botao.dataset.ajustar));
    if (await abrirAjusteEstoque(produto)) carregar();
  });
  carregar();
}

export const aoAtivar = () => carregar();

async function carregar() {
  const area = $('#conteudo-painel', raiz);
  renderizar(area, estadoCarregando('Calculando indicadores...'));
  try {
    dados = await api.relatorios.dashboard($('#inicio', raiz).value, $('#fim', raiz).value);
    desenhar(area);
  } catch (erro) {
    renderizar(area, estadoErro(erro));
  }
}

function desenhar(area) {
  const r = dados.resumo;
  const maiorDia = Math.max(1, ...dados.vendasPorDia.map((d) => d.faturamento));
  const maiorProduto = Math.max(1, ...dados.maisVendidos.map((p) => p.quantidadeVendida));
  const kpi = (rotulo, valor, detalhe = '') =>
    html`<div class="kpi"><div class="rotulo">${rotulo}</div><div class="valor">${valor}</div>${detalhe ? html`<div class="detalhe">${detalhe}</div>` : ''}</div>`;

  renderizar(area, html`
    <h2 class="sr-only">Resumo do período</h2>
    <div class="kpis">
      ${kpi('Faturamento', formatarMoeda(r.faturamento), 'sem pedidos cancelados')}
      ${kpi('Pedidos', r.totalPedidos, `${r.pedidosCancelados} cancelado(s)`)}
      ${kpi('Ticket médio', formatarMoeda(r.ticketMedio))}
      ${kpi('Em aberto agora', r.pedidosEmAberto, 'aguardando a equipe')}
      ${kpi('Clientes atendidos', r.clientesAtendidos)}
      ${kpi('Novos clientes', r.novosClientes)}
    </div>

    <div class="grade-2">
      <section class="cartao" aria-labelledby="t-vendas">
        <h3 id="t-vendas">Faturamento por dia</h3>
        <div class="grafico-colunas" aria-hidden="true">
          ${dados.vendasPorDia.map((d) => html`<div class="coluna" title="${formatarDiaMes(d.dia)}: ${formatarMoeda(d.faturamento)}">
            ${dados.vendasPorDia.length <= 14 ? html`<span class="valor-barra">${d.faturamento ? formatarMoeda(d.faturamento) : ''}</span>` : ''}
            <div class="barra" style="height:${Math.round((d.faturamento / maiorDia) * 100)}%"></div></div>`)}
        </div>
        <div class="eixo-x" aria-hidden="true">${dados.vendasPorDia.map((d, i) => html`<span>${
          dados.vendasPorDia.length <= 14 || i % Math.ceil(dados.vendasPorDia.length / 10) === 0 ? formatarDiaMes(d.dia) : ''}</span>`)}</div>
        <details class="mt-2">
          <summary>Ver os dados em tabela</summary>
          <div class="tabela-rolagem mt-1"><table class="tabela">
            <caption class="sr-only">Faturamento por dia</caption>
            <thead><tr><th scope="col">Dia</th><th scope="col" class="numero-col">Pedidos</th><th scope="col" class="numero-col">Faturamento</th></tr></thead>
            <tbody>${dados.vendasPorDia.map((d) => html`<tr><td>${formatarDiaMes(d.dia)}</td>
              <td class="numero-col">${d.quantidadePedidos}</td><td class="numero-col">${formatarMoeda(d.faturamento)}</td></tr>`)}</tbody>
          </table></div>
        </details>
      </section>

      <section class="cartao" aria-labelledby="t-top">
        <h3 id="t-top">Produtos mais vendidos</h3>
        ${dados.maisVendidos.length ? html`<ol class="barras-horizontais">
          ${dados.maisVendidos.map((p) => html`<li>
            <div class="rotulos"><span>${p.nome}</span><span>${p.quantidadeVendida} un. · ${formatarMoeda(p.faturamento)}</span></div>
            <div class="trilho" aria-hidden="true"><div class="preenchido" style="width:${Math.round((p.quantidadeVendida / maiorProduto) * 100)}%"></div></div>
          </li>`)}</ol>` : html`<p class="texto-suave">Sem vendas no período.</p>`}
      </section>

      <section class="cartao" aria-labelledby="t-status">
        <h3 id="t-status">Pedidos por status</h3>
        ${dados.porStatus.length ? html`<ul class="itens-pedido">${dados.porStatus.map((s) => html`<li>
          ${seloStatus(s.status, s.rotulo)}<span>${s.quantidade} · ${formatarMoeda(s.valor)}</span></li>`)}</ul>`
          : html`<p class="texto-suave">Nenhum pedido no período.</p>`}
      </section>

      <section class="cartao" aria-labelledby="t-estoque">
        <h3 id="t-estoque">${icone('alerta')} Estoque baixo</h3>
        ${dados.estoqueBaixo.length ? html`<div class="tabela-rolagem"><table class="tabela">
          <caption class="sr-only">Produtos com estoque no limite mínimo</caption>
          <thead><tr><th scope="col">Produto</th><th scope="col" class="numero-col">Estoque</th><th scope="col" class="numero-col">Mínimo</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
          <tbody>${dados.estoqueBaixo.map((p) => html`<tr>
            <td>${p.nome}<br><small class="texto-suave">${p.categoria ?? ''}</small></td>
            <td class="numero-col"><span class="selo ${p.estoque === 0 ? 'selo-erro' : 'selo-alerta'}">${p.estoque}</span></td>
            <td class="numero-col">${p.estoqueMinimo}</td>
            <td><button type="button" class="botao botao-pequeno" data-ajustar="${p.produtoId}">Repor</button></td></tr>`)}</tbody>
        </table></div>` : html`<p class="texto-suave">${icone('checkCirculo')} Todos os produtos estão com estoque adequado.</p>`}
      </section>
    </div>`);
}

function exportarCsv() {
  if (!dados) return;
  const linhas = [['Dia', 'Pedidos', 'Faturamento'],
    ...dados.vendasPorDia.map((d) => [formatarDiaMes(d.dia), d.quantidadePedidos, d.faturamento.toFixed(2).replace('.', ',')])];
  const csv = '﻿' + linhas.map((l) => l.join(';')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `vendas_${$('#inicio', raiz).value}_a_${$('#fim', raiz).value}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
