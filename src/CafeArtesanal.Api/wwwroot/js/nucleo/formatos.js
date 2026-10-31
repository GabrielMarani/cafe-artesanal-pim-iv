// Formatação, máscaras e rótulos usados em todas as páginas.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0);

export function formatarData(valor, comHora = true) {
  if (!valor) return '';
  const data = new Date(valor);
  return data.toLocaleString('pt-BR', comHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const formatarDiaMes = (valor) =>
  new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Data local no formato yyyy-mm-dd (para inputs type=date e a API). */
export function dataIso(data = new Date()) {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function mascaraCpf(v) {
  const d = somenteDigitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraTelefone(v) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v) {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Aplica uma máscara enquanto a pessoa digita. */
export function aplicarMascara(input, mascara) {
  input?.addEventListener('input', () => { input.value = mascara(input.value); });
}

export function cpfValido(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function debounce(fn, espera = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), espera); };
}

export const rotulosStatus = {
  pendente: 'Pendente',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

/** Etapas exibidas na barra de progresso do pedido. */
export function etapasDoPedido(tipoEntrega) {
  return tipoEntrega === 'entrega'
    ? ['pendente', 'em_preparo', 'pronto', 'saiu_para_entrega', 'entregue']
    : ['pendente', 'em_preparo', 'pronto', 'entregue'];
}

export const rotulosPagamento = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro'
};

export const rotulosPerfil = { cliente: 'Cliente', atendente: 'Atendente', admin: 'Administrador' };
