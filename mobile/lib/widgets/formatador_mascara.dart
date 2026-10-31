import 'package:flutter/services.dart';

/// Aplica uma máscara (CPF, telefone, CEP) enquanto a pessoa digita.
class FormatadorMascara extends TextInputFormatter {
  FormatadorMascara(this.mascara);

  final String Function(String) mascara;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue antigo, TextEditingValue novo) {
    final texto = mascara(novo.text);
    return TextEditingValue(text: texto, selection: TextSelection.collapsed(offset: texto.length));
  }
}
