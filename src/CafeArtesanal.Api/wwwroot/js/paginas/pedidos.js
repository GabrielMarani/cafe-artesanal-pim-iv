import { api } from '../nucleo/api.js';
import { itensETotais, linhaDoTempo, progressoPedido, seloStatus } from '../nucleo/componentes.js';
import { formatarData, formatarMoeda } from '../nucleo/formatos.js';
import { montarLayout } from '../nucleo/layout.js';
import { exigirLogin, sessao } from '../nucleo/sessao.js';
import {
  $, aviso, confirmar, definirCarregando, estadoCarregando, estadoErro, estadoVazio, html, icone, renderizar
} from '../nucleo/ui.js';

const INTERVALO_ATUALIZACAO = 20000;

const estado = {
  filtro: '', pagina: 1, totalPaginas: 1, pedidos: [],
  detalhes: new Map(),  // id → pedido completo (com linha do tempo)
  abertos: new Set(),   // ids expandidos na tela
  novoId: Number(new URLSearchParams(location.search).get('novo')) || null
};

if (exigirLogin()) {
  if (sessao.ehEquipe()) location.replace('admin.html');
  montarLayout();
  iniciar();
}

function iniciar() {
  if (estado.novoId) {
    renderizar($('#mensagem'), html`<div class="alerta alerta-sucesso" role="status">${icone('checkCirculo')}
      <span>Pedido <strong>#${String(estado.novoId).padStart(5, '0')}</strong> enviado! Você pode acompanhar o andamento aqui.</span></div>`);
    estado.abertos.add(estado.novoId);
    history.replaceState(null, '', location.pathname);
  }

  $('#filtros').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filtro]');
    if (!chip) return;
    estado.filtro = chip.dataset.filtro;
    document.querySelectorAll('#filtros .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    carregar();
  });
  $('#atualizar').addEventListener('click', () => carregar());
  $('#mais').addEventListener('click', () => carregar(estado.pagina + 1));
  $('#lista').addEventListener('click', tratarClique);
  $('#lista').addEventListener('toggle', tratarAbertura, true);

  carregar();
  // Sincronização: busca o status mais recente periodicamente se houver pedidos abertos.
  setInterval(() => {
    const temAberto = estado.pedidos.some((p) => !['entregue', 'cancelado'].includes(p.status));
    if (temAberto && document.visibilityState === 'visible') carregar(1, { silencioso: true });
  }, INTERVALO_ATUALIZACAO);
}

async function carregar(pagina = 1, { silencioso = false } = {}) {
  const lista = $('#lista');
  if (!silencioso && pagina === 1) renderizar(lista, estadoCarregando('Carregando seus pedidos...'));
  try {
    const resultado = await api.pedidos.pesquisar({ status: estado.filtro, pagina, tamanhoPagina: 10 });
    estado.pedidos = pagina === 1 ? resultado.itens : [...estado.pedidos, ...resultado.itens];
    estado.pagina = pagina;
    estado.totalPaginas = resultado.totalPaginas;

    // Detalhes abertos são recarregados para refletir a linha do tempo atual.
    await Promise.all([...estado.abertos].map(async (id) => {
      try { estado.detalhes.set(id, await api.pedidos.obter(id)); } catch { estado.abertos.delete(id); }
    }));
    desenhar();
  } catch (erro) {
    if (!silencioso) renderizar(lista, estadoErro(erro));
  }
}

function desenhar() {
  const lista = $('#lista');
  $('#mais').hidden = estado.pagina >= estado.totalPaginas;

  if (!estado.pedidos.length) {
    renderizar(lista, estadoVazio({
      icone: 'pedidos',
      titulo: estado.filtro ? 'Nenhum pedido em andamento' : 'Você ainda não fez pedidos',
      acao: html`<a class="botao botao-primario" href="cardapio.html">Ver cardápio</a>`
    }));
    return;
  }
  renderizar(lista, html`${estado.pedidos.map(cartao)}`);
}

function cartao(resumo) {
  const p = estado.detalhes.get(resumo.id) ?? resumo;
  const aberto = estado.abertos.has(p.id);
  const qtdItens = p.itens.reduce((s, i) => s + i.quantidade, 0);

  return html`<details class="cartao cartao-pedido ${p.id === estado.novoId ? 'novo' : ''}"
      data-id="${p.id}" ${aberto ? 'open' : ''}>
    <summary>
      <div>
        <span class="numero">Pedido ${p.numero}</span>
        <div class="meta">${formatarData(p.dataPedido)} · ${qtdItens} item(ns) · ${p.tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada'}</div>
      </div>
      <div class="linha" style="justify-content:flex-end">
        ${seloStatus(p.status, p.statusRotulo)}
        <span class="valor">${formatarMoeda(p.total)}</span>
        ${icone('setaBaixo')}
      </div>
    </summary>
    <div class="detalhes">
      ${progressoPedido(p)}
      ${itensETotais(p)}
      <p class="mt-2 mb-0"><strong>Pagamento:</strong> ${p.formaPagamentoRotulo} (na ${p.tipoEntrega === 'entrega' ? 'entrega' : 'retirada'})</p>
      ${p.enderecoEntrega ? html`<p class="mb-0"><strong>Endereço:</strong> ${p.enderecoEntrega}</p>` : ''}
      ${p.observacao ? html`<p class="mb-0"><strong>Observação:</strong> ${p.observacao}</p>` : ''}
      ${p.motivoCancelamento ? html`<p class="mb-0"><strong>Motivo do cancelamento:</strong> ${p.motivoCancelamento}</p>` : ''}
      ${estado.detalhes.has(p.id) ? linhaDoTempo(p.historico) : html`<p class="texto-suave mt-2">Carregando linha do tempo...</p>`}
      <div class="linha mt-2">
        ${p.acoes.podeConfirmarRecebimento ? html`<button type="button" class="botao botao-primario" data-acao="confirmar">${icone('check')} Confirmar recebimento</button>` : ''}
        ${p.acoes.podeCancelar ? html`<button type="button" class="botao botao-perigo" data-acao="cancelar">Cancelar pedido</button>` : ''}
      </div>
    </div>
  </details>`;
}

async function tratarAbertura(e) {
  const detalhes = e.target;
  if (!(detalhes instanceof HTMLDetailsElement)) return;
  const id = Number(detalhes.dataset.id);
  if (!detalhes.open) { estado.abertos.delete(id); return; }

  estado.abertos.add(id);
  if (estado.detalhes.has(id)) return;
  try {
    estado.detalhes.set(id, await api.pedidos.obter(id));
    desenhar();
    $(`[data-id="${id}"] summary`)?.focus();
  } catch (erro) {
    aviso.erro(erro.message);
  }
}

async function tratarClique(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
  const botao = e.target.closest('[data-acao]');
  if (!botao) return;
  const id = Number(botao.closest('[data-id]').dataset.id);
  const numero = `#${String(id).padStart(5, '0')}`;

  let operacao;
  if (botao.dataset.acao === 'cancelar') {
    const resposta = await confirmar({
      titulo: `Cancelar pedido ${numero}`,
      mensagem: 'O pedido será cancelado e os itens voltam para o estoque.',
      textoConfirmar: 'Cancelar pedido',
      perigo: true,
      motivo: { rotulo: 'Motivo', obrigatorio: false }
    });
    if (!resposta.confirmado) return;
    operacao = () => api.pedidos.cancelar(id, resposta.motivo);
  } else if (botao.dataset.acao === 'confirmar') {
    const { confirmado } = await confirmar({ titulo: `Confirmar recebimento`, mensagem: `Você recebeu o pedido ${numero}?`, textoConfirmar: 'Sim, recebi' });
    if (!confirmado) return;
    operacao = () => api.pedidos.confirmarRecebimento(id);
  } else {
    return;
  }

  definirCarregando(botao, true);
  try {
    const atualizado = await operacao();
    estado.detalhes.set(id, atualizado);
    estado.pedidos = estado.pedidos.map((p) => (p.id === id ? atualizado : p));
    aviso.sucesso(`Pedido ${numero}: ${atualizado.statusRotulo}.`);
    desenhar();
  } catch (erro) {
    definirCarregando(botao, false);
    aviso.erro(erro.message);
  }
}
