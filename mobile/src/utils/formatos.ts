import type { FormaPagamento, StatusPedido, TipoEntrega } from '../api/tipos';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (valor: number) => moeda.format(valor || 0);

export function formatarData(valor: string) {
  const d = new Date(valor);
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export const somenteDigitos = (v: string) => v.replace(/\D/g, '');

export function mascaraCpf(v: string) {
  return somenteDigitos(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v: string) {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export const senhaForte = (s: string) => s.length >= 8 && /\p{L}/u.test(s) && /\d/.test(s);

export const rotulosStatus: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

export const rotulosPagamento: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro'
};

export const etapasDoPedido = (tipo: TipoEntrega): StatusPedido[] =>
  tipo === 'entrega'
    ? ['pendente', 'em_preparo', 'pronto', 'saiu_para_entrega', 'entregue']
    : ['pendente', 'em_preparo', 'pronto', 'entregue'];
