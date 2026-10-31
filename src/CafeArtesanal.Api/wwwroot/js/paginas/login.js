import { api } from '../nucleo/api.js';
import { aplicarMascara, cpfValido, mascaraCpf, mascaraTelefone } from '../nucleo/formatos.js';
import { montarLayout } from '../nucleo/layout.js';
import { destinoSeguro, sessao } from '../nucleo/sessao.js';
import { $, $$, aviso, definirCarregando, icone, limparErroFormulario, mostrarErroFormulario, renderizar } from '../nucleo/ui.js';

const parametros = new URLSearchParams(location.search);
const destinoPadrao = () => (sessao.ehEquipe() ? 'admin.html' : 'index.html');
const irParaDestino = () => location.replace(destinoSeguro(parametros.get('voltar'), destinoPadrao()));

if (sessao.estaLogado()) irParaDestino();
montarLayout({ minimo: true });

// ------------------------------------------------------------------ Abas (com setas do teclado)

const abas = $$('[role="tab"]');

function selecionarAba(nome, focar = false) {
  abas.forEach((aba) => {
    const ativa = aba.id === `aba-${nome}`;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
    $(`#${aba.getAttribute('aria-controls')}`).hidden = !ativa;
    if (ativa && focar) aba.focus();
  });
  document.title = nome === 'entrar' ? 'Entrar | Café Artesanal' : 'Criar conta | Café Artesanal';
  $(`#painel-${nome} input`)?.focus();
}

abas.forEach((aba, i) => {
  aba.addEventListener('click', () => selecionarAba(aba.id.replace('aba-', '')));
  aba.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const proxima = abas[(i + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length];
    selecionarAba(proxima.id.replace('aba-', ''), true);
  });
});
$$('[data-ir-para]').forEach((b) => b.addEventListener('click', () => selecionarAba(b.dataset.irPara, true)));
if (parametros.get('aba') === 'cadastro') selecionarAba('cadastro');

// ------------------------------------------------------------------ Mostrar/ocultar senha

$$('[data-mostrar-senha]').forEach((botao) => {
  const campo = $(`#${botao.dataset.mostrarSenha}`);
  const atualizar = () => {
    const visivel = campo.type === 'text';
    renderizar(botao, icone(visivel ? 'olhoFechado' : 'olho'));
    botao.setAttribute('aria-pressed', String(visivel));
    botao.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
  };
  botao.addEventListener('click', () => { campo.type = campo.type === 'password' ? 'text' : 'password'; atualizar(); });
  atualizar();
});

// ------------------------------------------------------------------ Login

const formEntrar = $('#form-entrar');
formEntrar.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErroFormulario(formEntrar);
  if (!formEntrar.checkValidity()) {
    mostrarErroFormulario(formEntrar, 'Informe seu CPF (ou e-mail) e a senha.');
    return;
  }
  const botao = formEntrar.querySelector('[type=submit]');
  definirCarregando(botao, true, 'Entrando...');
  try {
    const dados = Object.fromEntries(new FormData(formEntrar));
    const sessaoNova = await api.auth.entrar(dados);
    sessao.salvar(sessaoNova);
    aviso.sucesso(`Olá, ${sessaoNova.usuario.nomeExibicao.split(' ')[0]}!`);
    irParaDestino();
  } catch (erro) {
    mostrarErroFormulario(formEntrar, erro.message);
    definirCarregando(botao, false);
    $('#senha-login').select();
  }
});

// ------------------------------------------------------------------ Cadastro

const formCadastro = $('#form-cadastro');
const campoCpf = $('#cpf');
const campoSenha = $('#senha-cadastro');
aplicarMascara(campoCpf, mascaraCpf);
aplicarMascara($('#telefone'), mascaraTelefone);

campoCpf.addEventListener('blur', () => {
  const invalido = campoCpf.value && !cpfValido(campoCpf.value);
  campoCpf.setAttribute('aria-invalid', String(Boolean(invalido)));
  $('#erro-cpf').textContent = invalido ? 'CPF inválido. Confira os números.' : '';
});

const regras = {
  tamanho: (s) => s.length >= 8,
  letra: (s) => /\p{L}/u.test(s),
  numero: (s) => /\d/.test(s)
};
campoSenha.addEventListener('input', () => {
  $$('#requisitos-senha [data-regra]').forEach((li) => li.classList.toggle('ok', regras[li.dataset.regra](campoSenha.value)));
});

formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErroFormulario(formCadastro);
  const dados = Object.fromEntries(new FormData(formCadastro));

  const erro =
    !dados.nome.trim() ? 'Informe seu nome completo.' :
    !cpfValido(dados.cpf) ? 'CPF inválido.' :
    !Object.values(regras).every((r) => r(dados.senha)) ? 'A senha não atende aos requisitos.' :
    dados.senha !== dados.confirmar ? 'As senhas não coincidem.' : null;
  if (erro) {
    mostrarErroFormulario(formCadastro, erro);
    return;
  }

  const botao = formCadastro.querySelector('[type=submit]');
  definirCarregando(botao, true, 'Criando conta...');
  try {
    const sessaoNova = await api.auth.registrar({
      nome: dados.nome,
      nomeSocial: dados.nomeSocial || null,
      cpf: dados.cpf,
      email: dados.email || null,
      telefone: dados.telefone || null,
      senha: dados.senha
    });
    sessao.salvar(sessaoNova);
    aviso.sucesso(`Conta criada! Bem-vindo(a), ${sessaoNova.usuario.nomeExibicao.split(' ')[0]}.`);
    irParaDestino();
  } catch (falha) {
    mostrarErroFormulario(formCadastro, falha.message);
    definirCarregando(botao, false);
  }
});
