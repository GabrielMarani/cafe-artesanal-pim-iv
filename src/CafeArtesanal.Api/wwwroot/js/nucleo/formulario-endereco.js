// Diálogo de cadastro/edição de endereço, usado no carrinho e na conta.
// Ao digitar o CEP, preenche rua, bairro, cidade e UF pelo ViaCEP.

import { api, buscarCep } from './api.js';
import { aplicarMascara, mascaraCep } from './formatos.js';
import { abrirDialogo, definirCarregando, html, mostrarErroFormulario } from './ui.js';

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

/** @returns {Promise<object|null>} endereço salvo, ou null se cancelado */
export function abrirFormularioEndereco(endereco = null) {
  return new Promise((resolver) => {
    let salvo = null;
    const e = endereco ?? { apelido: 'Casa', principal: false };

    const dialogo = abrirDialogo({
      titulo: endereco ? 'Editar endereço' : 'Novo endereço',
      corpo: html`<form id="form-endereco" novalidate>
        <div class="grade-campos">
          <div class="campo">
            <label for="end-cep">CEP</label>
            <input id="end-cep" name="cep" inputmode="numeric" autocomplete="postal-code" required value="${mascaraCep(e.cep ?? '')}" aria-describedby="ajuda-cep">
            <span id="ajuda-cep" class="ajuda" aria-live="polite">Preenchemos o endereço automaticamente.</span>
          </div>
          <div class="campo">
            <label for="end-apelido">Nome do endereço</label>
            <input id="end-apelido" name="apelido" maxlength="40" required value="${e.apelido ?? ''}" placeholder="Casa, Trabalho...">
          </div>
        </div>
        <div class="campo">
          <label for="end-logradouro">Rua / Avenida</label>
          <input id="end-logradouro" name="logradouro" maxlength="150" required autocomplete="address-line1" value="${e.logradouro ?? ''}">
        </div>
        <div class="grade-campos">
          <div class="campo">
            <label for="end-numero">Número</label>
            <input id="end-numero" name="numero" maxlength="10" required value="${e.numero ?? ''}">
          </div>
          <div class="campo">
            <label for="end-complemento">Complemento <span class="opcional">(opcional)</span></label>
            <input id="end-complemento" name="complemento" maxlength="60" autocomplete="address-line2" value="${e.complemento ?? ''}">
          </div>
        </div>
        <div class="grade-campos">
          <div class="campo">
            <label for="end-bairro">Bairro</label>
            <input id="end-bairro" name="bairro" maxlength="80" required value="${e.bairro ?? ''}">
          </div>
          <div class="campo">
            <label for="end-cidade">Cidade</label>
            <input id="end-cidade" name="cidade" maxlength="80" required autocomplete="address-level2" value="${e.cidade ?? ''}">
          </div>
          <div class="campo">
            <label for="end-uf">UF</label>
            <select id="end-uf" name="uf" required>
              <option value="">Selecione</option>
              ${UFS.map((uf) => html`<option value="${uf}" ${uf === e.uf ? 'selected' : ''}>${uf}</option>`)}
            </select>
          </div>
        </div>
        <div class="campo">
          <label for="end-referencia">Ponto de referência <span class="opcional">(opcional)</span></label>
          <input id="end-referencia" name="referencia" maxlength="120" value="${e.referencia ?? ''}">
        </div>
        <label class="caixa-verificacao"><input type="checkbox" name="principal" ${e.principal ? 'checked' : ''}> Usar como endereço principal</label>
      </form>`,
      rodape: html`<button type="button" class="botao" data-fechar>Cancelar</button>
        <button type="submit" form="form-endereco" class="botao botao-primario">Salvar endereço</button>`
    });

    const form = dialogo.querySelector('#form-endereco');
    const campoCep = form.elements.cep;
    aplicarMascara(campoCep, mascaraCep);

    campoCep.addEventListener('input', async () => {
      if (campoCep.value.replace(/\D/g, '').length !== 8) return;
      const ajuda = dialogo.querySelector('#ajuda-cep');
      ajuda.textContent = 'Buscando CEP...';
      const dados = await buscarCep(campoCep.value);
      if (!dados) { ajuda.textContent = 'CEP não encontrado. Preencha o endereço manualmente.'; return; }
      form.elements.logradouro.value = dados.logradouro || form.elements.logradouro.value;
      form.elements.bairro.value = dados.bairro || form.elements.bairro.value;
      form.elements.cidade.value = dados.localidade || form.elements.cidade.value;
      form.elements.uf.value = dados.uf || form.elements.uf.value;
      ajuda.textContent = 'Endereço encontrado. Confira e informe o número.';
      form.elements.numero.focus();
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) {
        mostrarErroFormulario(form, 'Preencha todos os campos obrigatórios.');
        form.querySelector(':invalid')?.focus();
        return;
      }
      const dados = Object.fromEntries(new FormData(form));
      dados.principal = form.elements.principal.checked;

      const botao = dialogo.querySelector('button[type=submit]');
      definirCarregando(botao, true, 'Salvando...');
      try {
        salvo = endereco
          ? await api.conta.atualizarEndereco(endereco.id, dados)
          : await api.conta.criarEndereco(dados);
        dialogo.close();
      } catch (erro) {
        mostrarErroFormulario(form, erro.message);
        definirCarregando(botao, false);
      }
    });

    dialogo.addEventListener('close', () => resolver(salvo));
  });
}
