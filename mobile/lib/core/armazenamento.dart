import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persistência local:
///  - dados comuns (catálogo, carrinho, configurações) → SharedPreferences;
///  - dados sensíveis (tokens da sessão) → FlutterSecureStorage (Keystore/Keychain).
///    Na Web usamos SharedPreferences, pois não há armazenamento seguro equivalente.
class Armazenamento {
  Armazenamento._();

  static const _seguro = FlutterSecureStorage();

  static Future<String?> lerTexto(String chave) async =>
      (await SharedPreferences.getInstance()).getString(chave);

  static Future<void> gravarTexto(String chave, String valor) async =>
      (await SharedPreferences.getInstance()).setString(chave, valor);

  static Future<void> remover(String chave) async =>
      (await SharedPreferences.getInstance()).remove(chave);

  static Future<dynamic> lerJson(String chave) async {
    final texto = await lerTexto(chave);
    if (texto == null) return null;
    try {
      return jsonDecode(texto);
    } on FormatException {
      return null;
    }
  }

  static Future<void> gravarJson(String chave, Object? valor) => gravarTexto(chave, jsonEncode(valor));

  static Future<String?> lerSeguro(String chave) =>
      kIsWeb ? lerTexto(chave) : _seguro.read(key: chave);

  static Future<void> gravarSeguro(String chave, String valor) =>
      kIsWeb ? gravarTexto(chave, valor) : _seguro.write(key: chave, value: valor);

  static Future<void> removerSeguro(String chave) =>
      kIsWeb ? remover(chave) : _seguro.delete(key: chave);
}
