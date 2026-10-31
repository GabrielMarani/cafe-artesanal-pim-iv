import 'package:intl/intl.dart';

final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: r'R$');

String formatarMoeda(num valor) => _moeda.format(valor);

String _dois(int n) => n.toString().padLeft(2, '0');

/// "31/10/2026 16:21" — a API envia horário local sem fuso (horário de Brasília).
String formatarData(DateTime data) =>
    '${_dois(data.day)}/${_dois(data.month)}/${data.year} ${_dois(data.hour)}:${_dois(data.minute)}';

String somenteDigitos(String texto) => texto.replaceAll(RegExp(r'\D'), '');

String mascaraCpf(String texto) {
  final d = somenteDigitos(texto);
  final s = d.length > 11 ? d.substring(0, 11) : d;
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i == 3 || i == 6) b.write('.');
    if (i == 9) b.write('-');
    b.write(s[i]);
  }
  return b.toString();
}

String mascaraTelefone(String texto) {
  final d = somenteDigitos(texto);
  final s = d.length > 11 ? d.substring(0, 11) : d;
  if (s.isEmpty) return '';
  if (s.length <= 2) return '($s';
  if (s.length <= 6) return '(${s.substring(0, 2)}) ${s.substring(2)}';
  if (s.length <= 10) return '(${s.substring(0, 2)}) ${s.substring(2, 6)}-${s.substring(6)}';
  return '(${s.substring(0, 2)}) ${s.substring(2, 7)}-${s.substring(7)}';
}

String mascaraCep(String texto) {
  final d = somenteDigitos(texto);
  final s = d.length > 8 ? d.substring(0, 8) : d;
  return s.length > 5 ? '${s.substring(0, 5)}-${s.substring(5)}' : s;
}

/// Valida os dígitos verificadores do CPF (mesma regra da API).
bool cpfValido(String texto) {
  final cpf = somenteDigitos(texto);
  if (cpf.length != 11 || RegExp(r'^(\d)\1{10}$').hasMatch(cpf)) return false;
  final d = cpf.split('').map(int.parse).toList();
  int digito(int quantidade) {
    var soma = 0;
    for (var i = 0; i < quantidade; i++) {
      soma += d[i] * (quantidade + 1 - i);
    }
    final resto = soma * 10 % 11;
    return resto == 10 ? 0 : resto;
  }

  return d[9] == digito(9) && d[10] == digito(10);
}

/// Mínimo de 8 caracteres, com letras e números (mesma regra da API).
bool senhaForte(String senha) =>
    senha.length >= 8 && RegExp(r'\p{L}', unicode: true).hasMatch(senha) && RegExp(r'\d').hasMatch(senha);

/// Remove acentos e deixa minúsculo — a busca "pao" encontra "Pão".
String normalizarBusca(String texto) {
  const de = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ';
  const para = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC';
  final b = StringBuffer();
  for (final c in texto.split('')) {
    final i = de.indexOf(c);
    b.write(i >= 0 ? para[i] : c);
  }
  return b.toString().toLowerCase();
}
