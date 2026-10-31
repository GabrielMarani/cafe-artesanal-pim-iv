// Estrutura comum a todas as páginas: barra de acessibilidade, menu, rodapé,
// atalhos de teclado e o widget VLibras (tradução para Libras).

import { api } from './api.js';
import { carrinho } from './carrinho.js';
import { preferencias } from './acessibilidade.js';
import { sessao, exigirLogin } from './sessao.js';
import { $, aviso, anunciar, cru, html, icone, renderizar } from './ui.js';

export const LOGO = cru(`<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <circle cx="20" cy="20" r="18" fill="#4B2E2B"/>
  <path d="M20 10C15 10 12 12 12 15V18C12 21 15 23 20 23C25 23 28 21 28 18V15C28 12 25 10 20 10Z" fill="#F5E6D3"/>
  <ellipse cx="20" cy="25" rx="6" ry="2" fill="#C27B40"/>
  <path d="M14 25V28C14 29 16 30 20 30C24 30 26 29 26 28V25" stroke="#F5E6D3" stroke-width="1.5" fill="none"/>
</svg>`);

const PAGINA_ATUAL = location.pathname.split('/').pop() || 'index.html';

/**
 * Monta topo, rodapé e recursos de acessibilidade. Chame no início de cada página.
 * Com { minimo: true } (tela de login) monta só a barra de acessibilidade e o VLibras.
 */
export function montarLayout({ minimo = false } = {}) {
  montarBarraAcessibilidade();
  instalarAtalhos();
  carregarVLibras();
  if (minimo) return;

  montarTopo();
  montarRodape();

  window.addEventListener('carrinho:alterado', atualizarContador);
  window.addEventListener('sessao:alterada', montarTopo);
  window.addEventListener('sessao:expirada', () => {
    aviso.info('Sua sessão expirou. Entre novamente.');
    setTimeout(exigirLogin, 1200);
  });
}

// ------------------------------------------------------------------ Barra de acessibilidade

function montarBarraAcessibilidade() {
  const barra = document.createElement('div');
  barra.className = 'barra-acessibilidade';
  barra.setAttribute('role', 'region');
  barra.setAttribute('aria-label', 'Recursos de acessibilidade');
  document.body.prepend(barra);
  desenharBarra(barra);
  window.addEventListener('preferencias:alteradas', () => desenharBarra(barra));

  barra.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-a11y]');
    if (!botao) return;
    const acao = botao.dataset.a11y;
    if (acao === 'fonte-menos') anunciar(`Fonte em ${Math.round(preferencias.alterarFonte(-1) * 100)}%`);
    if (acao === 'fonte-normal') anunciar(`Fonte em ${Math.round(preferencias.alterarFonte(0) * 100)}%`);
    if (acao === 'fonte-mais') anunciar(`Fonte em ${Math.round(preferencias.alterarFonte(1) * 100)}%`);
    if (acao === 'contraste') anunciar(preferencias.alternarContraste() ? 'Alto contraste ativado' : 'Alto contraste desativado');
    if (acao === 'tema') anunciar(preferencias.alternarTema() === 'escuro' ? 'Tema escuro ativado' : 'Tema claro ativado');
    barra.querySelector(`[data-a11y="${acao}"]`)?.focus();
  });
}

function desenharBarra(barra) {
  const p = preferencias.ler();
  const escuro = document.documentElement.dataset.tema === 'escuro';
  renderizar(barra, html`<div class="container">
    <nav class="atalhos" aria-label="Atalhos">
      <a href="#conteudo">Ir para o conteúdo <kbd>[Alt+1]</kbd></a>
      <a href="#menu-principal">Ir para o menu <kbd>[Alt+2]</kbd></a>
      <a href="#rodape">Ir para o rodapé <kbd>[Alt+3]</kbd></a>
    </nav>
    <div class="controles-a11y">
      <a href="acessibilidade.html">${icone('acessibilidade')} Acessibilidade</a>
      <button type="button" data-a11y="fonte-menos" aria-label="Diminuir tamanho da fonte">A−</button>
      <button type="button" data-a11y="fonte-normal" aria-label="Tamanho de fonte padrão">A</button>
      <button type="button" data-a11y="fonte-mais" aria-label="Aumentar tamanho da fonte">A+</button>
      <button type="button" data-a11y="contraste" aria-pressed="${Boolean(p.altoContraste)}">${icone('contraste')} Alto contraste</button>
      <button type="button" data-a11y="tema" aria-pressed="${escuro}">${icone(escuro ? 'sol' : 'lua')} ${escuro ? 'Tema claro' : 'Tema escuro'}</button>
    </div>
  </div>`);
}

// ------------------------------------------------------------------ Topo e menu

function itemMenu(href, rotulo, nomeIcone, extra = '') {
  const atual = href === PAGINA_ATUAL ? 'page' : null;
  return html`<li><a href="${href}" ${atual ? cru('aria-current="page"') : ''}>${icone(nomeIcone)}<span>${rotulo}</span>${extra}</a></li>`;
}

function montarTopo() {
  let topo = document.querySelector('header.topo');
  if (!topo) {
    topo = document.createElement('header');
    topo.className = 'topo';
    document.querySelector('.barra-acessibilidade').after(topo);
  }

  const usuario = sessao.usuario();
  const logado = sessao.estaLogado();
  const equipe = sessao.ehEquipe();
  const quantidade = carrinho.quantidadeTotal();

  renderizar(topo, html`<div class="container">
    <a class="marca" href="index.html" aria-label="Café Artesanal - página inicial">${LOGO}<span>Café Artesanal</span></a>
    <button type="button" class="botao botao-texto botao-icone botao-menu" aria-expanded="false" aria-controls="menu-principal" aria-label="Abrir menu">${icone('menu')}</button>
    <nav aria-label="Menu principal">
      <ul class="menu" id="menu-principal">
        ${itemMenu('index.html', 'Início', 'cafe')}
        ${itemMenu('cardapio.html', 'Cardápio', 'sacola')}
        ${logado && !equipe ? itemMenu('pedidos.html', 'Meus pedidos', 'pedidos') : ''}
        ${!equipe ? itemMenu('carrinho.html', 'Carrinho', 'carrinho',
            html` <span class="contador-carrinho" data-contador-carrinho aria-label="${quantidade} itens">${quantidade}</span>`) : ''}
        ${equipe ? itemMenu('admin.html', 'Painel', 'grafico') : ''}
        ${logado
          ? html`${itemMenu('conta.html', usuario?.nomeExibicao?.split(' ')[0] ?? 'Minha conta', 'usuario')}
              <li><button type="button" class="link-menu" data-acao="sair">${icone('sair')}<span>Sair</span></button></li>`
          : itemMenu('login.html', 'Entrar', 'entrar')}
      </ul>
    </nav>
  </div>`);

  const botaoMenu = $('.botao-menu', topo);
  const menu = $('#menu-principal', topo);
  botaoMenu.addEventListener('click', () => {
    const aberto = menu.classList.toggle('aberto');
    botaoMenu.setAttribute('aria-expanded', String(aberto));
    botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('aberto')) { botaoMenu.click(); botaoMenu.focus(); }
  });
  $('[data-acao="sair"]', topo)?.addEventListener('click', async () => {
    await api.auth.sair();
    location.href = 'index.html';
  });
}

function atualizarContador() {
  const quantidade = carrinho.quantidadeTotal();
  document.querySelectorAll('[data-contador-carrinho]').forEach((el) => {
    el.textContent = quantidade;
    el.setAttribute('aria-label', `${quantidade} itens`);
  });
}

// ------------------------------------------------------------------ Rodapé

async function montarRodape() {
  const rodape = document.createElement('footer');
  rodape.className = 'rodape';
  rodape.id = 'rodape';
  rodape.tabIndex = -1;
  document.body.append(rodape);

  const desenhar = (loja) => renderizar(rodape, html`<div class="container">
    <div class="grade-rodape">
      <div>
        <a class="marca" href="index.html" style="color:inherit">${LOGO}<span>Café Artesanal</span></a>
        <p class="mt-1">Cafés especiais, torra artesanal e atendimento para todas as pessoas.</p>
      </div>
      <div>
        <h2>Navegação</h2>
        <ul>
          <li><a href="cardapio.html">Cardápio</a></li>
          <li><a href="pedidos.html">Meus pedidos</a></li>
          <li><a href="conta.html">Minha conta</a></li>
          <li><a href="acessibilidade.html">Acessibilidade e inclusão</a></li>
        </ul>
      </div>
      <div>
        <h2>Contato</h2>
        <ul>
          <li>${icone('local')} ${loja.endereco}</li>
          <li>${icone('telefone')} ${loja.telefone}</li>
        </ul>
      </div>
      <div>
        <h2>Horário</h2>
        <ul>${loja.horarios.map((h) => html`<li>${icone('relogio')} ${h}</li>`)}</ul>
      </div>
    </div>
    <div class="base">
      <span>© ${new Date().getFullYear()} ${loja.nome}. Projeto acadêmico — PIM IV (ADS/UNIP).</span>
      <a href="/swagger" target="_blank" rel="noopener">Documentação da API</a>
    </div>
  </div>`);

  const padrao = { nome: 'Café Artesanal', endereco: 'Rua do Café, 123 - São Paulo/SP', telefone: '(11) 98765-4321', horarios: [] };
  desenhar(padrao);
  try { desenhar({ ...padrao, ...(await api.loja()) }); } catch { /* mantém o padrão */ }
}

// ------------------------------------------------------------------ Atalhos (padrão gov.br) e VLibras

function instalarAtalhos() {
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const destino = { 1: '#conteudo', 2: '#menu-principal a', 3: '#rodape' }[e.key];
    if (!destino) return;
    e.preventDefault();
    const alvo = document.querySelector(destino);
    alvo?.focus();
    alvo?.scrollIntoView({ block: 'start' });
  });
}

function carregarVLibras() {
  if (document.querySelector('[vw]')) return;
  const widget = document.createElement('div');
  widget.setAttribute('vw', '');
  widget.className = 'enabled';
  widget.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.append(widget);

  const script = document.createElement('script');
  script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  script.async = true;
  script.onload = () => {
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
      // O plugin inicializa no "load" da janela; se ele já passou, dispara manualmente.
      if (document.readyState === 'complete' && typeof window.onload === 'function') window.onload();
    } catch { /* VLibras indisponível: o restante da página funciona normalmente */ }
  };
  document.body.append(script);
}
