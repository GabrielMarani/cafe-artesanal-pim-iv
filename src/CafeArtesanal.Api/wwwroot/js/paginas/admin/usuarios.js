// Gestão de usuários: perfis de acesso (cliente, atendente, admin) e ativação.

import { api } from '../../nucleo/api.js';
import { debounce, formatarData, rotulosPerfil } from '../../nucleo/formatos.js';
import { sessao } from '../../nucleo/sessao.js';
import { $, aviso, confirmar, estadoCarregando, estadoErro, estadoVazio, html, renderizar } from '../../nucleo/ui.js';

let raiz;
let usuarios = [];
const filtro = { busca: '', perfil: '', pagina: 1 };

export function montar(elemento) {
  raiz = elemento;
  renderizar(raiz, html`
    <div class="linha">
      <div class="campo mb-0"><label for="busca-usuarios">Buscar</label>
        <input id="busca-usuarios" type="search" placeholder="Nome, nome social, e-mail ou CPF"></div>
      <div class="campo mb-0"><label for="filtro-perfil">Perfil</label>
        <select id="filtro-perfil"><option value="">Todos</option>
          ${Object.entries(rotulosPerfil).map(([v, r]) => html`<option value="${v}">${r}</option>`)}</select></div>
    </div>
    <p class="texto-suave mt-2" id="info-usuarios" aria-live="polite"></p>
    <div id="tabela-usuarios"></div>
    <div class="linha mt-2" style="justify-content:center" id="paginacao-usuarios"></div>`);

  $('#busca-usuarios', raiz).addEventListener('input', debounce((e) => { filtro.busca = e.target.value.trim(); filtro.pagina = 1; carregar(); }, 400));
  $('#filtro-perfil', raiz).addEventListener('change', (e) => { filtro.perfil = e.target.value; filtro.pagina = 1; carregar(); });
  $('#tabela-usuarios', raiz).addEventListener('click', tratarClique);
  $('#tabela-usuarios', raiz).addEventListener('change', alterarPerfil);
  $('#paginacao-usuarios', raiz).addEventListener('click', (e) => {
    const pagina = Number(e.target.closest('[data-pagina]')?.dataset.pagina);
    if (pagina) { filtro.pagina = pagina; carregar(); }
  });
  carregar();
}

export const aoAtivar = () => carregar();

async function carregar() {
  const area = $('#tabela-usuarios', raiz);
  if (!usuarios.length) renderizar(area, estadoCarregando());
  try {
    const pagina = await api.usuarios.pesquisar({ ...filtro, tamanhoPagina: 20 });
    usuarios = pagina.itens;
    $('#info-usuarios', raiz).textContent = `${pagina.totalItens} usuário(s).`;
    renderizar($('#paginacao-usuarios', raiz), pagina.totalPaginas > 1 ? html`
      <button type="button" class="botao botao-pequeno" data-pagina="${pagina.pagina - 1}" ${pagina.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${pagina.pagina} de ${pagina.totalPaginas}</span>
      <button type="button" class="botao botao-pequeno" data-pagina="${pagina.pagina + 1}" ${pagina.pagina >= pagina.totalPaginas ? 'disabled' : ''}>Próxima</button>` : '');
    desenhar(area);
  } catch (erro) {
    renderizar(area, estadoErro(erro));
  }
}

function desenhar(area) {
  if (!usuarios.length) return renderizar(area, estadoVazio({ icone: 'usuarios', titulo: 'Nenhum usuário encontrado' }));
  const eu = sessao.usuario()?.id;
  renderizar(area, html`<div class="tabela-rolagem"><table class="tabela">
    <caption class="sr-only">Usuários cadastrados</caption>
    <thead><tr><th scope="col">Pessoa</th><th scope="col">Contato</th><th scope="col">Perfil</th>
      <th scope="col" class="numero-col">Pedidos</th><th scope="col">Último acesso</th><th scope="col">Situação</th></tr></thead>
    <tbody>${usuarios.map((u) => html`<tr data-id="${u.id}" class="${u.ativo ? '' : 'inativo'}">
      <td><strong>${u.nomeExibicao}</strong>${u.nomeSocial ? html`<br><small class="texto-suave">Registro: ${u.nome}</small>` : ''}
        <br><small class="texto-suave">CPF ${u.cpf}</small></td>
      <td>${u.email ?? '—'}<br><small class="texto-suave">${u.telefone ?? ''}</small></td>
      <td><label class="sr-only" for="perfil-${u.id}">Perfil de ${u.nomeExibicao}</label>
        <select id="perfil-${u.id}" class="campo-perfil" data-perfil-atual="${u.perfil}" ${u.id === eu ? 'disabled' : ''}>
          ${Object.entries(rotulosPerfil).map(([v, r]) => html`<option value="${v}" ${v === u.perfil ? 'selected' : ''}>${r}</option>`)}
        </select></td>
      <td class="numero-col">${u.quantidadePedidos}</td>
      <td>${u.ultimoLogin ? formatarData(u.ultimoLogin) : 'Nunca'}</td>
      <td>${u.id === eu ? html`<span class="selo selo-ok">Você</span>` : html`<button type="button" class="botao botao-pequeno"
          data-acao="ativo" aria-label="${u.ativo ? 'Conta ativa. Desativar' : 'Conta desativada. Ativar'} ${u.nomeExibicao}">
          ${u.ativo ? 'Ativo' : 'Desativado'}</button>`}</td>
    </tr>`)}</tbody></table></div>`);
}

async function alterarPerfil(e) {
  const select = e.target.closest('select[data-perfil-atual]');
  if (!select) return;
  const usuario = usuarios.find((u) => u.id === Number(select.closest('[data-id]').dataset.id));
  const { confirmado } = await confirmar({
    titulo: 'Alterar perfil de acesso',
    mensagem: `Mudar ${usuario.nomeExibicao} de "${rotulosPerfil[usuario.perfil]}" para "${rotulosPerfil[select.value]}"? A pessoa precisará entrar de novo.`
  });
  if (!confirmado) { select.value = usuario.perfil; return; }
  try {
    await api.usuarios.alterarPerfil(usuario.id, select.value);
    aviso.sucesso('Perfil alterado.');
    carregar();
  } catch (erro) {
    select.value = usuario.perfil;
    aviso.erro(erro.message);
  }
}

async function tratarClique(e) {
  if (e.target.closest('[data-acao="tentar-novamente"]')) return carregar();
  const botao = e.target.closest('[data-acao="ativo"]');
  if (!botao) return;
  const usuario = usuarios.find((u) => u.id === Number(botao.closest('[data-id]').dataset.id));
  const ativar = !usuario.ativo;
  const { confirmado } = await confirmar({
    titulo: ativar ? 'Ativar conta' : 'Desativar conta',
    mensagem: ativar ? `Reativar a conta de ${usuario.nomeExibicao}?` : `${usuario.nomeExibicao} não conseguirá mais entrar no site nem no app.`,
    textoConfirmar: ativar ? 'Ativar' : 'Desativar',
    perigo: !ativar
  });
  if (!confirmado) return;
  try {
    await api.usuarios.alterarAtivo(usuario.id, ativar);
    aviso.sucesso(ativar ? 'Conta ativada.' : 'Conta desativada.');
    carregar();
  } catch (erro) {
    aviso.erro(erro.message);
  }
}
