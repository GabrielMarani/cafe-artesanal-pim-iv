// Utilitários de interface: HTML seguro (anti-XSS), ícones, avisos, diálogos e estados.

// ------------------------------------------------------------------ HTML seguro

/** Trecho de HTML já confiável (não será escapado de novo). */
export class Html {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

export function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function converter(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (valor instanceof Html) return valor.texto;
  if (Array.isArray(valor)) return valor.map(converter).join('');
  return escapar(valor);
}

/**
 * Template tag: todo valor interpolado é escapado automaticamente.
 * Uso: html`<p>${produto.nome}</p>` — protege contra XSS vindo dos dados.
 */
export function html(partes, ...valores) {
  let saida = partes[0];
  valores.forEach((valor, i) => { saida += converter(valor) + partes[i + 1]; });
  return new Html(saida);
}

/** Marca um texto como HTML confiável (use só com conteúdo fixo do próprio código). */
export const cru = (texto) => new Html(texto);

export const renderizar = (elemento, conteudo) => { elemento.innerHTML = String(conteudo); };
export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

// ------------------------------------------------------------------ Ícones (traço estilo Feather)

const ICONES = {
  carrinho: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  usuario: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  entrar: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  fechar: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  sol: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  lua: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  contraste: '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/>',
  busca: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  mais: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  lixeira: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>',
  editar: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  checkCirculo: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alerta: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  setaBaixo: '<polyline points="6 9 12 15 18 9"/>',
  setaDireita: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  pedidos: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  grafico: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  caixa: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  etiqueta: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  local: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cafe: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  entrega: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  loja: '<path d="M3 9l1-5h16l1 5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  olho: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  mao: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  acessibilidade: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/><path d="M7 10l5 1 5-1"/><path d="M12 11v4l-2.5 4"/><path d="M12 15l2.5 4"/>',
  atualizar: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  estrela: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  coracao: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  texto: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  teclado: '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/>',
  sacola: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'
};

/** Ícone decorativo (aria-hidden) ou com rótulo para leitores de tela. */
export function icone(nome, rotulo) {
  const a11y = rotulo ? `role="img" aria-label="${escapar(rotulo)}"` : 'aria-hidden="true" focusable="false"';
  return cru(`<svg class="icone" viewBox="0 0 24 24" ${a11y}>${ICONES[nome] ?? ''}</svg>`);
}

// ------------------------------------------------------------------ Avisos (toasts) e anúncios

const ICONE_AVISO = { sucesso: 'checkCirculo', erro: 'alerta', info: 'info' };

function mostrarAviso(tipo, mensagem, duracao = 5000) {
  let caixa = document.getElementById('avisos');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'avisos';
    caixa.className = 'avisos';
    caixa.setAttribute('aria-live', 'polite');
    document.body.append(caixa);
  }
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  renderizar(el, html`${icone(ICONE_AVISO[tipo])}<p>${mensagem}</p>
    <button type="button" aria-label="Fechar aviso">${icone('fechar')}</button>`);
  el.querySelector('button').addEventListener('click', () => el.remove());
  caixa.append(el);
  setTimeout(() => el.remove(), duracao);
}

export const aviso = {
  sucesso: (m) => mostrarAviso('sucesso', m),
  erro: (m) => mostrarAviso('erro', m, 7000),
  info: (m) => mostrarAviso('info', m)
};

/** Fala um texto para leitores de tela sem mostrar nada na tela. */
export function anunciar(texto) {
  let regiao = document.getElementById('anunciador');
  if (!regiao) {
    regiao = document.createElement('div');
    regiao.id = 'anunciador';
    regiao.className = 'sr-only';
    regiao.setAttribute('aria-live', 'polite');
    document.body.append(regiao);
  }
  regiao.textContent = '';
  setTimeout(() => { regiao.textContent = texto; }, 50);
}

// ------------------------------------------------------------------ Diálogos (elemento <dialog> nativo: foco preso e ESC)

let contadorDialogo = 0;

export function abrirDialogo({ titulo, corpo, rodape }) {
  const dialogo = document.createElement('dialog');
  const idTitulo = `dialogo-titulo-${++contadorDialogo}`;
  dialogo.className = 'dialogo';
  dialogo.setAttribute('aria-labelledby', idTitulo);
  renderizar(dialogo, html`
    <div class="dialogo-cabecalho">
      <h2 id="${idTitulo}">${titulo}</h2>
      <button type="button" class="botao botao-texto botao-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button>
    </div>
    <div class="dialogo-corpo">${corpo}</div>
    ${rodape ? html`<div class="dialogo-rodape">${rodape}</div>` : ''}`);

  const focoAnterior = document.activeElement;
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo || e.target.closest('[data-fechar]')) dialogo.close();
  });
  dialogo.addEventListener('close', () => {
    dialogo.remove();
    focoAnterior?.focus?.();
  });

  document.body.append(dialogo);
  dialogo.showModal();
  dialogo.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  return dialogo;
}

/**
 * Confirmação acessível. Com "motivo", mostra um campo de texto.
 * @returns {Promise<{confirmado: boolean, motivo?: string|null}>}
 */
export function confirmar({ titulo, mensagem, textoConfirmar = 'Confirmar', perigo = false, motivo = null }) {
  return new Promise((resolver) => {
    let resultado = { confirmado: false };
    const dialogo = abrirDialogo({
      titulo,
      corpo: html`<p>${mensagem}</p>
        ${motivo ? html`<div class="campo mb-0">
          <label for="motivo-confirmacao">${motivo.rotulo}${motivo.obrigatorio ? '' : html` <span class="opcional">(opcional)</span>`}</label>
          <textarea id="motivo-confirmacao" maxlength="255"></textarea>
        </div>` : ''}`,
      rodape: html`<button type="button" class="botao" data-fechar>Voltar</button>
        <button type="button" class="botao ${perigo ? 'botao-perigo' : 'botao-primario'}" data-confirmar>${textoConfirmar}</button>`
    });

    dialogo.querySelector('[data-confirmar]').addEventListener('click', () => {
      const campo = dialogo.querySelector('textarea');
      if (campo && motivo?.obrigatorio && !campo.value.trim()) {
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }
      resultado = { confirmado: true, motivo: campo?.value.trim() || null };
      dialogo.close();
    });
    dialogo.addEventListener('close', () => resolver(resultado));
  });
}

// ------------------------------------------------------------------ Estados de tela

export const estadoCarregando = (texto = 'Carregando...') =>
  html`<div class="carregando" role="status"><div class="giratorio" aria-hidden="true"></div><p>${texto}</p></div>`;

export const estadoVazio = ({ icone: nomeIcone = 'info', titulo, texto = '', acao = '' }) =>
  html`<div class="vazio">${icone(nomeIcone)}<h2>${titulo}</h2>${texto ? html`<p>${texto}</p>` : ''}${acao}</div>`;

export const estadoErro = (erro, rotuloAcao = 'Tentar novamente') =>
  html`<div class="vazio" role="alert">${icone('alerta')}<h2>Não foi possível carregar</h2>
    <p>${erro?.message ?? erro}</p>
    <button type="button" class="botao" data-acao="tentar-novamente">${icone('atualizar')} ${rotuloAcao}</button></div>`;

/** Desabilita o botão e mostra que algo está em andamento. */
export function definirCarregando(botao, carregando, textoCarregando = 'Aguarde...') {
  if (!botao) return;
  if (carregando) {
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    botao.textContent = textoCarregando;
  } else {
    botao.disabled = false;
    botao.removeAttribute('aria-busy');
    if (botao.dataset.textoOriginal) botao.innerHTML = botao.dataset.textoOriginal;
  }
}

/** Mostra erros de validação no formulário (mensagem geral + campo inválido). */
export function mostrarErroFormulario(formulario, mensagem) {
  let caixa = formulario.querySelector('.alerta-erro');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'alerta alerta-erro';
    caixa.setAttribute('role', 'alert');
    formulario.prepend(caixa);
  }
  renderizar(caixa, html`${icone('alerta')}<span>${mensagem}</span>`);
  caixa.hidden = !mensagem;
}

export const limparErroFormulario = (formulario) => {
  const caixa = formulario.querySelector('.alerta-erro');
  if (caixa) caixa.hidden = true;
};

// ------------------------------------------------------------------ Imagens

export const IMAGEM_PADRAO = 'img/sem-imagem.svg';

// Troca imagens quebradas pela ilustração padrão (sem handlers inline no HTML).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && !img.dataset.falhou) {
    img.dataset.falhou = '1';
    img.src = IMAGEM_PADRAO;
  }
}, true);
