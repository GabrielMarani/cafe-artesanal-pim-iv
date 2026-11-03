// Cadastro de produtos e ajuste de estoque (procedure sp_ajustar_estoque).

import { api } from '../../nucleo/api.js';
import { debounce, formatarMoeda } from '../../nucleo/formatos.js';
import {
  $, IMAGEM_PADRAO, abrirDialogo, aviso, confirmar, definirCarregando, estadoCarregando, estadoErro, estadoVazio,
  html, icone, mostrarErroFormulario, renderizar
} from '../../nucleo/ui.js';

let raiz;
let produtos = [];
let categorias = [];
const filtro = { busca: '', incluirInativos: true };

export function montar(elemento) {
  raiz = elemento;
  renderizar(raiz, html`
    <div class="linha-entre mb-0">
      <div class="linha">
        <div class="campo mb-0"><label for="busca-produtos">Buscar</label>
          <input id="busca-produtos" type="search" placeholder="Nome, descrição ou categoria"></div>
        <label class="caixa-verificacao" style="align-self:flex-end"><input type="checkbox" id="mostrar-inativos" checked> Mostrar desativados</label>
      </div>
      <button type="button" class="botao botao-primario" id="novo-produto">${icone('mais')} Novo produto</button>
    </div>
    <p class="texto-suave mt-2" id="info-produtos" aria-live="polite"></p>
    <div id="tabela-produtos"></div>`);

  $('#busca-produtos', raiz).addEventListener('input', debounce((e) => { filtro.busca = e.target.value.trim(); carregar(); }, 350));
  $('#mostrar-inativos', raiz).addEventListener('change', (e) => { filtro.incluirInativos = e.target.checked; carregar(); });
  $('#novo-produto', raiz).addEventListener('click', () => abrirFormulario());
  $('#tabela-produtos', raiz).addEventListener('click', tratarClique);
  carregar();
}

export const aoAtivar = () => carregar();

async function carregar() {
  const area = $('#tabela-produtos', raiz);
  if (!produtos.length) renderizar(area, estadoCarregando());
  try {
    const [lista, cats] = await Promise.all([
      api.produtos.todos({ busca: filtro.busca, incluirInativos: filtro.incluirInativos, ordenar: 'nome' }),
      api.categorias.listar(true)
    ]);
    produtos = lista;
    categorias = cats;
    $('#info-produtos', raiz).textContent = `${produtos.length} produto(s).`;
    desenhar(area);
  } catch (erro) {
    renderizar(area, estadoErro(erro));
  }
}

function desenhar(area) {
  if (!produtos.length) {
    renderizar(area, estadoVazio({ icone: 'caixa', titulo: 'Nenhum produto encontrado' }));
    return;
  }
  renderizar(area, html`<div class="tabela-rolagem"><table class="tabela">
    <caption class="sr-only">Produtos cadastrados</caption>
    <thead><tr>
      <th scope="col"><span class="sr-only">Imagem</span></th><th scope="col">Produto</th><th scope="col">Categoria</th>
      <th scope="col" class="numero-col">Preço</th><th scope="col" class="numero-col">Estoque</th><th scope="col">Situação</th>
      <th scope="col" class="numero-col">Ações</th>
    </tr></thead>
    <tbody>${produtos.map((p) => html`<tr data-id="${p.id}" class="${p.ativo ? '' : 'inativo'}">
      <td><img class="miniatura" src="${p.imagemUrl || IMAGEM_PADRAO}" alt="" loading="lazy"></td>
      <td><strong>${p.nome}</strong> ${p.destaque ? html`<span class="selo selo-destaque">${icone('estrela')} Destaque</span>` : ''}</td>
      <td>${p.categoriaNome ?? '—'}</td>
      <td class="numero-col">${formatarMoeda(p.preco)}</td>
      <td class="numero-col"><span class="selo ${p.estoque === 0 ? 'selo-erro' : p.estoqueBaixo ? 'selo-alerta' : ''}">${p.estoque}</span>
        <br><small class="texto-suave">mín. ${p.estoqueMinimo}</small></td>
      <td>${p.ativo ? html`<span class="selo selo-ok">Ativo</span>` : html`<span class="selo">Desativado</span>`}</td>
      <td><div class="acoes-tabela">
        <button type="button" class="botao botao-pequeno" data-acao="editar" aria-label="Editar ${p.nome}">${icone('editar')}</button>
        <button type="button" class="botao botao-pequeno" data-acao="estoque" aria-label="Ajustar estoque de ${p.nome}">${icone('caixa')} Estoque</button>
        ${p.ativo
          ? html`<button type="button" class="botao botao-pequeno" data-acao="desativar" aria-label="Desativar ${p.nome}">${icone('lixeira')}</button>`
          : html`<button type="button" class="botao botao-pequeno" data-acao="reativar">Reativar</button>`}
      </div></td>
    </tr>`)}</tbody>
  </table></div>`);
}

async function tratarClique(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
  const botao = e.target.closest('[data-acao]');
  if (!botao) return;
  const produto = produtos.find((p) => p.id === Number(botao.closest('[data-id]').dataset.id));

  switch (botao.dataset.acao) {
    case 'editar': return abrirFormulario(produto);
    case 'estoque':
      if (await abrirAjusteEstoque(produto)) carregar();
      return;
    case 'desativar': {
      const { confirmado } = await confirmar({
        titulo: 'Desativar produto',
        mensagem: `"${produto.nome}" sairá do cardápio, mas continuará nos pedidos antigos. Você pode reativar depois.`,
        textoConfirmar: 'Desativar', perigo: true
      });
      if (!confirmado) return;
      return executar(() => api.produtos.desativar(produto.id), 'Produto desativado.');
    }
    case 'reativar':
      return executar(() => api.produtos.atualizar(produto.id, { ...dadosDoProduto(produto), ativo: true }), 'Produto reativado.');
    default:
  }
}

async function executar(operacao, mensagem) {
  try {
    await operacao();
    aviso.sucesso(mensagem);
    carregar();
  } catch (erro) {
    aviso.erro(erro.message);
  }
}

const dadosDoProduto = (p) => ({
  nome: p.nome, descricao: p.descricao, imagemUrl: p.imagemUrl, preco: p.preco, categoriaId: p.categoriaId,
  estoqueMinimo: p.estoqueMinimo, destaque: p.destaque, ativo: p.ativo
});

function abrirFormulario(produto = null) {
  const p = produto ?? { nome: '', preco: '', estoqueMinimo: 5, destaque: false, ativo: true };
  const dialogo = abrirDialogo({
    titulo: produto ? `Editar ${produto.nome}` : 'Novo produto',
    corpo: html`<form id="form-produto" novalidate>
      <div class="campo"><label for="prod-nome">Nome</label>
        <input id="prod-nome" name="nome" maxlength="100" required value="${p.nome}"></div>
      <div class="campo"><label for="prod-descricao">Descrição <span class="opcional">(opcional)</span></label>
        <textarea id="prod-descricao" name="descricao" maxlength="500">${p.descricao ?? ''}</textarea></div>
      <div class="grade-campos">
        <div class="campo"><label for="prod-preco">Preço (R$)</label>
          <input id="prod-preco" name="preco" type="number" min="0.01" step="0.01" required value="${p.preco}"></div>
        <div class="campo"><label for="prod-categoria">Categoria</label>
          <select id="prod-categoria" name="categoriaId">
            <option value="">Sem categoria</option>
            ${categorias.map((c) => html`<option value="${c.id}" ${c.id === p.categoriaId ? 'selected' : ''}>${c.nome}${c.ativo ? '' : ' (inativa)'}</option>`)}
          </select></div>
      </div>
      <div class="campo"><label for="prod-imagem">URL da imagem <span class="opcional">(opcional)</span></label>
        <input id="prod-imagem" name="imagemUrl" type="url" maxlength="500" placeholder="https://..." value="${p.imagemUrl ?? ''}"></div>
      <div class="grade-campos">
        ${produto ? '' : html`<div class="campo"><label for="prod-estoque">Estoque inicial</label>
          <input id="prod-estoque" name="estoqueInicial" type="number" min="0" step="1" value="0" required></div>`}
        <div class="campo"><label for="prod-minimo">Estoque mínimo</label>
          <input id="prod-minimo" name="estoqueMinimo" type="number" min="0" step="1" value="${p.estoqueMinimo}" required aria-describedby="ajuda-minimo">
          <span id="ajuda-minimo" class="ajuda">Abaixo disso o painel mostra um alerta.</span></div>
      </div>
      ${produto ? html`<p class="ajuda">Para mudar o estoque use o botão "Estoque" — assim tudo fica registrado no histórico.</p>` : ''}
      <label class="caixa-verificacao"><input type="checkbox" name="destaque" ${p.destaque ? 'checked' : ''}> Mostrar nos destaques da página inicial</label>
      <label class="caixa-verificacao"><input type="checkbox" name="ativo" ${p.ativo ? 'checked' : ''}> Produto ativo (aparece no cardápio)</label>
    </form>`,
    rodape: html`<button type="button" class="botao" data-fechar>Cancelar</button>
      <button type="submit" form="form-produto" class="botao botao-primario">Salvar</button>`
  });

  const form = dialogo.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      mostrarErroFormulario(form, 'Confira os campos: nome e preço são obrigatórios.');
      form.querySelector(':invalid')?.focus();
      return;
    }
    const f = form.elements;
    const dados = {
      nome: f.nome.value.trim(),
      descricao: f.descricao.value.trim() || null,
      imagemUrl: f.imagemUrl.value.trim() || null,
      preco: Number(f.preco.value),
      categoriaId: f.categoriaId.value ? Number(f.categoriaId.value) : null,
      estoqueInicial: f.estoqueInicial ? Number(f.estoqueInicial.value) : 0,
      estoqueMinimo: Number(f.estoqueMinimo.value),
      destaque: f.destaque.checked,
      ativo: f.ativo.checked
    };
    const botao = dialogo.querySelector('[type=submit]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      if (produto) await api.produtos.atualizar(produto.id, dados);
      else await api.produtos.criar(dados);
      dialogo.close();
      aviso.sucesso(produto ? 'Produto atualizado.' : 'Produto cadastrado.');
      carregar();
    } catch (erro) {
      mostrarErroFormulario(form, erro.message);
      definirCarregando(botao, false);
    }
  });
}

/** Entrada ou saída manual de estoque. @returns {Promise<boolean>} se ajustou */
export function abrirAjusteEstoque(produto) {
  return new Promise((resolver) => {
    let ajustou = false;
    const dialogo = abrirDialogo({
      titulo: `Estoque: ${produto.nome}`,
      corpo: html`<form id="form-estoque" novalidate>
        <p>Estoque atual: <strong>${produto.estoque}</strong> (mínimo ${produto.estoqueMinimo})</p>
        <fieldset><legend>Tipo de movimentação</legend>
          <div class="opcoes">
            <label class="opcao"><input type="radio" name="tipo" value="1" checked><span>Entrada (reposição)</span></label>
            <label class="opcao"><input type="radio" name="tipo" value="-1"><span>Saída (perda, consumo)</span></label>
          </div></fieldset>
        <div class="campo"><label for="est-quantidade">Quantidade</label>
          <input id="est-quantidade" name="quantidade" type="number" min="1" max="10000" step="1" required></div>
        <div class="campo"><label for="est-motivo">Motivo</label>
          <input id="est-motivo" name="motivo" maxlength="255" required placeholder="Ex.: compra do fornecedor, produto vencido"></div>
      </form>`,
      rodape: html`<button type="button" class="botao" data-fechar>Cancelar</button>
        <button type="submit" form="form-estoque" class="botao botao-primario">Registrar</button>`
    });

    const form = dialogo.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        mostrarErroFormulario(form, 'Informe a quantidade e o motivo.');
        return;
      }
      const quantidade = Number(form.elements.quantidade.value) * Number(form.elements.tipo.value);
      const botao = dialogo.querySelector('[type=submit]');
      definirCarregando(botao, true, 'Registrando...');
      try {
        const resultado = await api.produtos.ajustarEstoque(produto.id, { quantidade, motivo: form.elements.motivo.value.trim() });
        ajustou = true;
        aviso.sucesso(`Estoque de ${produto.nome} agora é ${resultado.estoqueAtual}.`);
        dialogo.close();
      } catch (erro) {
        mostrarErroFormulario(form, erro.message);
        definirCarregando(botao, false);
      }
    });
    dialogo.addEventListener('close', () => resolver(ajustou));
  });
}
