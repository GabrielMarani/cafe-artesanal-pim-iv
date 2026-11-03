import 'package:flutter/foundation.dart';

import 'armazenamento.dart';

/// Endereço da API REST.
///
/// Ordem de prioridade:
///  1. endereço salvo na tela "Servidor da API";
///  2. `--dart-define=API_URL=http://192.168.0.10:5000/api/v1`;
///  3. padrão da plataforma: emulador Android usa 10.0.2.2 (o "localhost" do PC);
///     Na web usa localhost.
class ConfigApi {
  ConfigApi._();

  static const _chave = 'cafe.apiUrl';
  static const _porta = 5000;
  static const _deAmbiente = String.fromEnvironment('API_URL');

  static String _atual = urlPadrao;

  static String get url => _atual;

  static String get urlPadrao {
    if (_deAmbiente.isNotEmpty) return _limpar(_deAmbiente);
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:$_porta/api/v1';
    }
    return 'http://localhost:$_porta/api/v1';
  }

  static Future<void> carregar() async {
    _atual = await Armazenamento.lerTexto(_chave) ?? urlPadrao;
  }

  /// Salva um endereço manual; `null` volta para o padrão.
  static Future<void> salvar(String? url) async {
    if (url == null || url.trim().isEmpty) {
      _atual = urlPadrao;
      await Armazenamento.remover(_chave);
    } else {
      _atual = _limpar(url);
      await Armazenamento.gravarTexto(_chave, _atual);
    }
  }

  static String _limpar(String url) => url.trim().replaceAll(RegExp(r'/+$'), '');
}
