// Fila de pedidos da equipe: filtra, avança o status com um clique e cancela com motivo.
// Atualiza sozinha a cada 20 s e avisa quando chegam pedidos novos.

import { api } from '../../nucleo/api.js';
import { itensETotais, linhaDoTempo, progressoPedido, seloStatus } from '../../nucleo/componentes.js';
import { debounce, formatarData, formatarMoeda, rotulosStatus } from '../../nucleo/formatos.js';
import {
  $, aviso, confirmar, definirCarregando, estadoCarregando, estadoErro, estadoVazio, html, icone, renderizar
} from '../../nucleo/ui.js';

const FILTROS = [
  ['abertos', 'Em aberto'], ['pendente', 'Pendentes'], ['em_preparo', 'Em preparo'], ['pronto', 'Prontos'],
  ['saiu_para_entrega', 'Saiu para entrega'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['', 'Todos']
];
const INTERVALO = 20000;
const POR_PAGINA = 15;
const MAXIMO_API = 100;

let raiz;
let requisicaoAtual = 0;
const estado = { status: 'abertos', busca: '', pagina: 1, totalPaginas: 1, pedidos: [], assinatura: '', idsConhecidos: null, detalhes: new Map() };

export function montar(elemento) {
  raiz = elemento;
  renderizar(raiz, html`
    <div class="filtros">
      <div class="linha-busca">
        <div class="campo mb-0">
          <label for="busca-pedidos">Buscar por número ou cliente</label>
          <input id="busca-pedidos" type="search" placeholder="Ex.: 12 ou Carla">
        </div>
        <div class="campo mb-0" style="justify-content:flex-end">
          <button type="button" class="botao" id="recarregar-pedidos">${icone('atualizar')} Atualizar</button>
        </div>
      </div>
      <div class="chips" role="group" aria-label="Filtrar por status" id="filtros-status">
        ${FILTROS.map(([valor, rotulo]) => html`<button type="button" class="chip" data-status="${valor}" aria-pressed="${valor === estado.status}">${rotulo}</button>`)}
      </div>
    </div>
    <p class="texto-suave" id="info-pedidos" aria-live="polite"></p>
    <div class="pilha" id="lista-pedidos"></div>
    <p class="texto-centro mt-2"><button type="button" class="botao" id="mais-pedidos" hidden>Carregar mais</button></p>`);

  $('#filtros-status', raiz).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-status]');
    if (!chip) return;
    estado.status = chip.dataset.status;
    raiz.querySelectorAll('[data-status]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    carregar();
  });
  $('#busca-pedidos', raiz).addEventListener('input', debounce((e) => { estado.busca = e.target.value.trim(); carregar(); }, 400));
  $('#recarregar-pedidos', raiz).addEventListener('click', () => carregar());
  $('#mais-pedidos', raiz).addEventListener('click', () => carregar(estado.pagina + 1));
  $('#lista-pedidos', raiz).addEventListener('click', tratarClique);
  $('#lista-pedidos', raiz).addEventListener('toggle', carregarDetalhe, true);

  carregar();
  setInterval(() => {
    if (!raiz.hidden && document.visibilityState === 'visible') carregar(1, { silencioso: true });
  }, INTERVALO);
}

export const aoAtivar = () => carregar(1, { silencioso: true });

async function carregar(pagina = 1, { silencioso = false } = {}) {
  const lista = $('#lista-pedidos', raiz);
  // A atualização automática relê tudo o que já está na tela, sem voltar para a primeira página.
  const tamanhoPagina = silencioso ? POR_PAGINA * estado.pagina : POR_PAGINA;
  if (tamanhoPagina > MAXIMO_API) return;
  if (!silencioso && pagina === 1) renderizar(lista, estadoCarregando('Carregando pedidos...'));
  const numero = ++requisicaoAtual; // ignora respostas antigas se o filtro mudar nesse meio-tempo
  try {
    const resultado = await api.pedidos.pesquisar({ status: estado.status, busca: estado.busca, pagina, tamanhoPagina });
    if (numero !== requisicaoAtual) return;
    avisarNovos(resultado.itens);
    estado.pedidos = pagina === 1 ? resultado.itens : [...estado.pedidos, ...resultado.itens];
    if (!silencioso) estado.pagina = pagina;
    estado.totalPaginas = Math.ceil(resultado.totalItens / POR_PAGINA);
    // Status mudou: a linha do tempo guardada ficou velha e é buscada de novo ao redesenhar.
    resultado.itens.forEach((p) => {
      const detalhe = estado.detalhes.get(p.id);
      if (detalhe && detalhe.status !== p.status) estado.detalhes.delete(p.id);
    });
    $('#info-pedidos', raiz).textContent =
      `${resultado.totalItens} pedido(s). Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;

    // Sem novidades a tela não é redesenhada: o foco do teclado e do leitor de tela continuam onde estão.
    const assinatura = JSON.stringify(estado.pedidos);
    if (silencioso && assinatura === estado.assinatura) return;
    estado.assinatura = assinatura;
    desenhar();
  } catch (erro) {
    if (!silencioso) renderizar(lista, estadoErro(erro));
  }
}

function avisarNovos(itens) {
  const pendentes = itens.filter((p) => p.status === 'pendente').map((p) => p.id);
  if (estado.idsConhecidos) {
    const novos = pendentes.filter((id) => !estado.idsConhecidos.has(id));
    if (novos.length) aviso.info(`${novos.length} pedido(s) novo(s) chegaram!`);
  }
  estado.idsConhecidos = new Set([...(estado.idsConhecidos ?? []), ...pendentes]);
}

function desenhar() {
  const lista = $('#lista-pedidos', raiz);
  $('#mais-pedidos', raiz).hidden = estado.pagina >= estado.totalPaginas;
  if (!estado.pedidos.length) {
    renderizar(lista, estadoVazio({ icone: 'pedidos', titulo: 'Nenhum pedido aqui', texto: 'Quando chegarem pedidos com este filtro, eles aparecem nesta lista.' }));
    return;
  }
  const abertos = new Set([...lista.querySelectorAll('details[open]')].map((d) => Number(d.closest('[data-id]').dataset.id)));
  renderizar(lista, html`${estado.pedidos.map((p) => cartao(p, abertos.has(p.id)))}`);
}

function cartao(p, aberto) {
  const detalhe = estado.detalhes.get(p.id);
  const proxima = p.acoes.proximaEtapa;
  return html`<article class="cartao" data-id="${p.id}" aria-labelledby="pedido-${p.id}">
    <div class="linha-entre">
      <div>
        <h2 id="pedido-${p.id}" class="mb-0 titulo-pedido">Pedido ${p.numero} ${seloStatus(p.status, p.statusRotulo)}</h2>
        <div class="texto-suave">${p.cliente?.nome ?? 'Cliente removido'}${p.cliente?.telefone ? ` · ${p.cliente.telefone}` : ''} · ${formatarData(p.dataPedido)}</div>
        <div class="texto-suave">${icone(p.tipoEntrega === 'entrega' ? 'entrega' : 'loja')} ${p.tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada no balcão'} · ${p.formaPagamentoRotulo}</div>
      </div>
      <div class="linha">
        <strong class="preco">${formatarMoeda(p.total)}</strong>
        ${proxima ? html`<button type="button" class="botao botao-primario" data-acao="avancar" data-status="${proxima}">
          ${icone('setaDireita')} ${rotulosStatus[proxima]}</button>` : ''}
        ${p.acoes.podeCancelar ? html`<button type="button" class="botao botao-texto" data-acao="cancelar">Cancelar</button>` : ''}
      </div>
    </div>
    ${progressoPedido(p)}
    <p class="mb-0">${p.itens.map((i, n) => html`${n ? ', ' : ''}<strong>${i.quantidade}×</strong> ${i.nomeProduto}`)}</p>
    ${p.observacao ? html`<p class="alerta alerta-info mt-1 mb-0">${icone('info')} ${p.observacao}</p>` : ''}
    ${p.enderecoEntrega ? html`<p class="texto-suave mt-1 mb-0">${icone('local')} ${p.enderecoEntrega}</p>` : ''}
    <details class="mt-1" ${aberto ? 'open' : ''}>
      <summary>Detalhes e linha do tempo</summary>
      ${itensETotais(p)}
      ${p.motivoCancelamento ? html`<p><strong>Motivo do cancelamento:</strong> ${p.motivoCancelamento}</p>` : ''}
      ${detalhe ? linhaDoTempo(detalhe.historico) : html`<p class="texto-suave">Carregando...</p>`}
    </details>
  </article>`;
}

async function carregarDetalhe(e) {
  const detalhes = e.target;
  if (!(detalhes instanceof HTMLDetailsElement) || !detalhes.open) return;
  const id = Number(detalhes.closest('[data-id]').dataset.id);
  // Redesenhar recria o <details> já aberto, o que dispara "toggle" de novo: só busca uma vez.
  if (estado.detalhes.has(id)) return;
  estado.detalhes.set(id, null);
  try {
    estado.detalhes.set(id, await api.pedidos.obter(id));
    desenhar();
  } catch (erro) {
    estado.detalhes.delete(id);
    aviso.erro(erro.message);
  }
}

async function tratarClique(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
  const botao = e.target.closest('[data-acao]');
  if (!botao) return;
  const id = Number(botao.closest('[data-id]').dataset.id);
  const pedido = estado.pedidos.find((p) => p.id === id);

  let operacao;
  if (botao.dataset.acao === 'avancar') {
    operacao = () => api.pedidos.alterarStatus(id, botao.dataset.status);
  } else if (botao.dataset.acao === 'cancelar') {
    const resposta = await confirmar({
      titulo: `Cancelar pedido ${pedido.numero}`,
      mensagem: 'O cliente verá o motivo informado. Os itens voltam automaticamente para o estoque.',
      textoConfirmar: 'Cancelar pedido',
      perigo: true,
      motivo: { rotulo: 'Motivo do cancelamento', obrigatorio: true }
    });
    if (!resposta.confirmado) return;
    operacao = () => api.pedidos.alterarStatus(id, 'cancelado', resposta.motivo);
  } else {
    return;
  }

  definirCarregando(botao, true);
  try {
    const atualizado = await operacao();
    estado.detalhes.set(id, atualizado);
    aviso.sucesso(`Pedido ${atualizado.numero}: ${atualizado.statusRotulo}.`);
    await carregar(1, { silencioso: true });
  } catch (erro) {
    aviso.erro(erro.message);
  } finally {
    definirCarregando(botao, false);
  }
}
