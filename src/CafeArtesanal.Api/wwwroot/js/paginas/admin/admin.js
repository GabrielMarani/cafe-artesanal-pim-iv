// Painel administrativo: abas acessíveis carregadas sob demanda.
// Atendentes veem só "Pedidos"; administradores veem tudo (controle de acesso por perfil).

import { montarLayout } from '../../nucleo/layout.js';
import { exigirEquipe, sessao } from '../../nucleo/sessao.js';
import { $, html, icone, renderizar } from '../../nucleo/ui.js';
import * as painel from './painel.js';
import * as pedidos from './pedidos.js';
import * as produtos from './produtos.js';
import * as categorias from './categorias.js';
import * as usuarios from './usuarios.js';

const SECOES = [
  { id: 'painel', rotulo: 'Indicadores', icone: 'grafico', modulo: painel, somenteAdmin: true },
  { id: 'pedidos', rotulo: 'Pedidos', icone: 'pedidos', modulo: pedidos, somenteAdmin: false },
  { id: 'produtos', rotulo: 'Produtos', icone: 'caixa', modulo: produtos, somenteAdmin: true },
  { id: 'categorias', rotulo: 'Categorias', icone: 'etiqueta', modulo: categorias, somenteAdmin: true },
  { id: 'usuarios', rotulo: 'Usuários', icone: 'usuarios', modulo: usuarios, somenteAdmin: true }
];

if (exigirEquipe()) {
  montarLayout();
  iniciar();
}

function iniciar() {
  const usuario = sessao.usuario();
  const secoes = SECOES.filter((s) => !s.somenteAdmin || sessao.ehAdmin());
  const montadas = new Set();

  $('#saudacao').textContent = `Olá, ${usuario.nomeExibicao.split(' ')[0]}! Você está como ${sessao.ehAdmin() ? 'administrador(a)' : 'atendente'}.`;

  renderizar($('#abas'), html`${secoes.map((s) => html`<button type="button" role="tab" id="aba-${s.id}"
      aria-controls="painel-${s.id}" aria-selected="false" tabindex="-1">${icone(s.icone)} ${s.rotulo}</button>`)}`);
  renderizar($('#paineis'), html`${secoes.map((s) => html`<section role="tabpanel" id="painel-${s.id}"
      aria-labelledby="aba-${s.id}" tabindex="0" hidden></section>`)}`);

  function ativar(id, focar = false) {
    secoes.forEach((s) => {
      const aba = $(`#aba-${s.id}`);
      const ativa = s.id === id;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      $(`#painel-${s.id}`).hidden = !ativa;
      if (ativa && focar) aba.focus();
    });
    const secao = secoes.find((s) => s.id === id);
    if (!montadas.has(id)) {
      montadas.add(id);
      secao.modulo.montar($(`#painel-${id}`));
    } else {
      secao.modulo.aoAtivar?.();
    }
    history.replaceState(null, '', `#${id}`);
  }

  const abas = [...document.querySelectorAll('#abas [role="tab"]')];
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => ativar(aba.id.replace('aba-', '')));
    aba.addEventListener('keydown', (e) => {
      const mapa = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      const proxima = abas[(mapa[e.key] + abas.length) % abas.length];
      ativar(proxima.id.replace('aba-', ''), true);
    });
  });

  const inicial = location.hash.slice(1);
  ativar(secoes.some((s) => s.id === inicial) ? inicial : secoes[0].id);
}
