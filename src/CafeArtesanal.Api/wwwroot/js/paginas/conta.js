import { api } from '../nucleo/api.js';
import { preferencias } from '../nucleo/acessibilidade.js';
import { abrirFormularioEndereco } from '../nucleo/formulario-endereco.js';
import { aplicarMascara, mascaraTelefone } from '../nucleo/formatos.js';
import { montarLayout } from '../nucleo/layout.js';
import { exigirLogin, sessao } from '../nucleo/sessao.js';
import {
  $, aviso, confirmar, definirCarregando, estadoErro, html, icone, limparErroFormulario, mostrarErroFormulario, renderizar
} from '../nucleo/ui.js';

if (exigirLogin()) {
  montarLayout();
  iniciar();
}

async function iniciar() {
  aplicarMascara($('#perfil-telefone'), mascaraTelefone);
  $('#form-perfil').addEventListener('submit', salvarPerfil);
  $('#form-senha').addEventListener('submit', alterarSenha);
  $('#novo-endereco').addEventListener('click', async () => {
    if (await abrirFormularioEndereco()) { aviso.sucesso('Endereço cadastrado.'); carregarEnderecos(); }
  });
  $('#enderecos').addEventListener('click', tratarEndereco);
  desenharPreferencias();
  window.addEventListener('preferencias:alteradas', desenharPreferencias);

  try {
    preencherPerfil(await api.conta.perfil());
  } catch (erro) {
    aviso.erro(erro.message);
  }
  carregarEnderecos();
}

function preencherPerfil(u) {
  const form = $('#form-perfil');
  form.elements.nome.value = u.nome;
  form.elements.nomeSocial.value = u.nomeSocial ?? '';
  form.elements.email.value = u.email ?? '';
  form.elements.telefone.value = u.telefone ?? '';
  $('#perfil-cpf').value = u.cpf;
  $('#saudacao').textContent = `Olá, ${u.nomeExibicao}! Gerencie seus dados, endereços e preferências.`;
}

async function salvarPerfil(e) {
  e.preventDefault();
  const form = e.currentTarget;
  limparErroFormulario(form);
  const dados = Object.fromEntries(new FormData(form));
  if (!dados.nome.trim()) return mostrarErroFormulario(form, 'Informe o nome completo.');

  const botao = form.querySelector('[type=submit]');
  definirCarregando(botao, true, 'Salvando...');
  try {
    const usuario = await api.conta.atualizarPerfil({
      nome: dados.nome, nomeSocial: dados.nomeSocial || null, email: dados.email || null, telefone: dados.telefone || null
    });
    sessao.atualizarUsuario(usuario);
    preencherPerfil(usuario);
    aviso.sucesso('Dados atualizados.');
  } catch (erro) {
    mostrarErroFormulario(form, erro.message);
  } finally {
    definirCarregando(botao, false);
  }
}

async function alterarSenha(e) {
  e.preventDefault();
  const form = e.currentTarget;
  limparErroFormulario(form);
  const dados = Object.fromEntries(new FormData(form));
  if (!dados.senhaAtual || !dados.novaSenha) return mostrarErroFormulario(form, 'Preencha a senha atual e a nova senha.');

  const botao = form.querySelector('[type=submit]');
  definirCarregando(botao, true, 'Alterando...');
  try {
    sessao.salvar(await api.conta.alterarSenha(dados));
    form.reset();
    aviso.sucesso('Senha alterada. As outras sessões foram encerradas.');
  } catch (erro) {
    mostrarErroFormulario(form, erro.message);
  } finally {
    definirCarregando(botao, false);
  }
}

let enderecos = [];

async function carregarEnderecos() {
  const area = $('#enderecos');
  try {
    enderecos = await api.conta.enderecos();
    renderizar(area, enderecos.length
      ? html`<ul class="lista-itens">${enderecos.map((e) => html`<li class="cartao" data-id="${e.id}" style="padding:.85rem 1rem">
          <div class="linha-entre">
            <strong>${icone('local')} ${e.apelido}</strong>
            ${e.principal ? html`<span class="selo selo-ok">Principal</span>` : ''}
          </div>
          <p class="texto-suave mt-1 mb-0">${e.descricao}</p>
          <div class="linha mt-1">
            <button type="button" class="botao botao-texto botao-pequeno" data-acao="editar" aria-label="Editar endereço ${e.apelido}">${icone('editar')} Editar</button>
            <button type="button" class="botao botao-texto botao-pequeno" data-acao="remover" aria-label="Remover endereço ${e.apelido}">${icone('lixeira')} Remover</button>
          </div>
        </li>`)}</ul>`
      : html`<p class="texto-suave mb-0">Nenhum endereço cadastrado.</p>`);
  } catch (erro) {
    renderizar(area, estadoErro(erro));
  }
}

async function tratarEndereco(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregarEnderecos();
  const botao = e.target.closest('[data-acao]');
  if (!botao) return;
  const endereco = enderecos.find((x) => x.id === Number(botao.closest('[data-id]').dataset.id));

  if (botao.dataset.acao === 'editar') {
    if (await abrirFormularioEndereco(endereco)) { aviso.sucesso('Endereço atualizado.'); carregarEnderecos(); }
    return;
  }
  const { confirmado } = await confirmar({
    titulo: 'Remover endereço', mensagem: `Remover o endereço "${endereco.apelido}"?`, textoConfirmar: 'Remover', perigo: true
  });
  if (!confirmado) return;
  try {
    await api.conta.removerEndereco(endereco.id);
    aviso.sucesso('Endereço removido.');
    carregarEnderecos();
  } catch (erro) {
    aviso.erro(erro.message);
  }
}

function desenharPreferencias() {
  const p = preferencias.ler();
  const escuro = document.documentElement.dataset.tema === 'escuro';
  const area = $('#preferencias');
  renderizar(area, html`
    <button type="button" class="botao botao-pequeno" data-pref="menos">A− Diminuir fonte</button>
    <button type="button" class="botao botao-pequeno" data-pref="mais">A+ Aumentar fonte</button>
    <button type="button" class="botao botao-pequeno" data-pref="contraste" aria-pressed="${Boolean(p.altoContraste)}">${icone('contraste')} Alto contraste</button>
    <button type="button" class="botao botao-pequeno" data-pref="tema" aria-pressed="${escuro}">${icone('lua')} Tema escuro</button>
    <button type="button" class="botao botao-texto botao-pequeno" data-pref="redefinir">Restaurar padrão</button>`);
  area.onclick = (e) => {
    const acao = e.target.closest('[data-pref]')?.dataset.pref;
    if (acao === 'menos') preferencias.alterarFonte(-1);
    if (acao === 'mais') preferencias.alterarFonte(1);
    if (acao === 'contraste') preferencias.alternarContraste();
    if (acao === 'tema') preferencias.alternarTema();
    if (acao === 'redefinir') preferencias.redefinir();
  };
}
