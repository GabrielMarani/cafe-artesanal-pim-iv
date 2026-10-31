// Cadastro de categorias do cardápio.

import { api } from '../../nucleo/api.js';
import {
  $, abrirDialogo, aviso, confirmar, definirCarregando, estadoCarregando, estadoErro, html, icone,
  mostrarErroFormulario, renderizar
} from '../../nucleo/ui.js';

let raiz;
let categorias = [];

export function montar(elemento) {
  raiz = elemento;
  renderizar(raiz, html`
    <div class="linha-entre">
      <p class="texto-suave mb-0">A ordem define a sequência no cardápio, no site e no app.</p>
      <button type="button" class="botao botao-primario" id="nova-categoria">${icone('mais')} Nova categoria</button>
    </div>
    <div id="tabela-categorias" class="mt-2"></div>`);
  $('#nova-categoria', raiz).addEventListener('click', () => abrirFormulario());
  $('#tabela-categorias', raiz).addEventListener('click', tratarClique);
  carregar();
}

export const aoAtivar = () => carregar();

async function carregar() {
  const area = $('#tabela-categorias', raiz);
  if (!categorias.length) renderizar(area, estadoCarregando());
  try {
    categorias = await api.categorias.listar(true);
    renderizar(area, html`<div class="tabela-rolagem"><table class="tabela">
      <caption class="sr-only">Categorias</caption>
      <thead><tr><th scope="col" class="numero-col">Ordem</th><th scope="col">Nome</th><th scope="col">Descrição</th>
        <th scope="col" class="numero-col">Produtos ativos</th><th scope="col">Situação</th><th scope="col" class="numero-col">Ações</th></tr></thead>
      <tbody>${categorias.map((c) => html`<tr data-id="${c.id}" class="${c.ativo ? '' : 'inativo'}">
        <td class="numero-col">${c.ordemExibicao}</td>
        <td><strong>${c.nome}</strong><br><small class="texto-suave">/${c.slug}</small></td>
        <td>${c.descricao ?? '—'}</td>
        <td class="numero-col">${c.quantidadeProdutos}</td>
        <td>${c.ativo ? html`<span class="selo selo-ok">Ativa</span>` : html`<span class="selo">Inativa</span>`}</td>
        <td><div class="acoes-tabela">
          <button type="button" class="botao botao-pequeno" data-acao="editar" aria-label="Editar ${c.nome}">${icone('editar')} Editar</button>
          <button type="button" class="botao botao-pequeno" data-acao="excluir" aria-label="Excluir ${c.nome}">${icone('lixeira')}</button>
        </div></td>
      </tr>`)}</tbody></table></div>`);
  } catch (erro) {
    renderizar(area, estadoErro(erro));
  }
}

async function tratarClique(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
  const botao = e.target.closest('[data-acao]');
  if (!botao) return;
  const categoria = categorias.find((c) => c.id === Number(botao.closest('[data-id]').dataset.id));

  if (botao.dataset.acao === 'editar') return abrirFormulario(categoria);

  const { confirmado } = await confirmar({
    titulo: 'Excluir categoria', mensagem: `Excluir "${categoria.nome}"? Só é possível se não houver produtos nela.`,
    textoConfirmar: 'Excluir', perigo: true
  });
  if (!confirmado) return;
  try {
    await api.categorias.excluir(categoria.id);
    aviso.sucesso('Categoria excluída.');
    carregar();
  } catch (erro) {
    aviso.erro(erro.message);
  }
}

function abrirFormulario(categoria = null) {
  const c = categoria ?? { nome: '', descricao: '', ordemExibicao: categorias.length + 1, ativo: true };
  const dialogo = abrirDialogo({
    titulo: categoria ? `Editar ${categoria.nome}` : 'Nova categoria',
    corpo: html`<form id="form-categoria" novalidate>
      <div class="campo"><label for="cat-nome">Nome</label><input id="cat-nome" name="nome" maxlength="50" required value="${c.nome}"></div>
      <div class="campo"><label for="cat-descricao">Descrição <span class="opcional">(opcional)</span></label>
        <input id="cat-descricao" name="descricao" maxlength="255" value="${c.descricao ?? ''}"></div>
      <div class="campo"><label for="cat-ordem">Ordem de exibição</label>
        <input id="cat-ordem" name="ordemExibicao" type="number" min="0" max="999" value="${c.ordemExibicao}"></div>
      <label class="caixa-verificacao"><input type="checkbox" name="ativo" ${c.ativo ? 'checked' : ''}> Categoria ativa</label>
    </form>`,
    rodape: html`<button type="button" class="botao" data-fechar>Cancelar</button>
      <button type="submit" form="form-categoria" class="botao botao-primario">Salvar</button>`
  });

  const form = dialogo.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return mostrarErroFormulario(form, 'Informe o nome da categoria.');
    const dados = {
      nome: form.elements.nome.value.trim(),
      descricao: form.elements.descricao.value.trim() || null,
      ordemExibicao: Number(form.elements.ordemExibicao.value) || 0,
      ativo: form.elements.ativo.checked
    };
    const botao = dialogo.querySelector('[type=submit]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      if (categoria) await api.categorias.atualizar(categoria.id, dados);
      else await api.categorias.criar(dados);
      dialogo.close();
      aviso.sucesso('Categoria salva.');
      carregar();
    } catch (erro) {
      mostrarErroFormulario(form, erro.message);
      definirCarregando(botao, false);
    }
  });
}
