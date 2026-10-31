import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/config.dart';
import 'modelos.dart';

class ErroApi implements Exception {
  ErroApi(this.status, this.mensagem);

  final int status;
  final String mensagem;

  /// Servidor fora do alcance (o app continua com os dados salvos).
  bool get semConexao => status == 0;

  @override
  String toString() => mensagem;
}

/// Cliente HTTP da API REST: JSON, timeout, token JWT e renovação automática
/// da sessão com o refresh token quando a API responde 401.
class ClienteApi {
  ClienteApi._();

  static final ClienteApi instancia = ClienteApi._();

  static const _timeout = Duration(seconds: 12);

  final http.Client _http = http.Client();
  Sessao? sessao;

  /// Chamado quando a sessão muda por renovação ou expiração (o estado salva e avisa a tela).
  void Function(Sessao? nova)? aoAlterarSessao;

  Future<bool>? _renovacao;

  Future<dynamic> get(String caminho, {bool autenticar = true}) => _enviar('GET', caminho, autenticar: autenticar);

  Future<dynamic> post(String caminho, [Object? corpo, bool autenticar = true]) =>
      _enviar('POST', caminho, corpo: corpo, autenticar: autenticar);

  Future<dynamic> _enviar(String metodo, String caminho,
      {Object? corpo, bool autenticar = true, bool repetir = true}) async {
    final cabecalhos = {'Accept': 'application/json', if (corpo != null) 'Content-Type': 'application/json'};
    final token = sessao?.accessToken;
    if (autenticar && token != null) cabecalhos['Authorization'] = 'Bearer $token';

    final requisicao = http.Request(metodo, Uri.parse('${ConfigApi.url}$caminho'))..headers.addAll(cabecalhos);
    if (corpo != null) requisicao.body = jsonEncode(corpo);

    http.Response resposta;
    try {
      resposta = await http.Response.fromStream(await _http.send(requisicao).timeout(_timeout));
    } on TimeoutException {
      throw ErroApi(0, 'O servidor demorou para responder. Tente novamente.');
    } catch (_) {
      throw ErroApi(0, 'Sem conexão com o servidor. Verifique a internet ou o endereço em Conta › Servidor da API.');
    }

    if (resposta.statusCode == 401 && autenticar && repetir && sessao != null) {
      if (await _renovarSessao()) {
        return _enviar(metodo, caminho, corpo: corpo, autenticar: autenticar, repetir: false);
      }
      sessao = null;
      aoAlterarSessao?.call(null);
    }

    if (resposta.statusCode == 204 || resposta.body.isEmpty) return null;

    final dados = jsonDecode(utf8.decode(resposta.bodyBytes));
    if (resposta.statusCode >= 400) {
      final problema = dados is Map<String, dynamic> ? dados : const <String, dynamic>{};
      throw ErroApi(resposta.statusCode,
          (problema['detail'] ?? problema['title'] ?? 'Erro ${resposta.statusCode}') as String);
    }
    return dados;
  }

  /// Uma renovação por vez, mesmo que várias chamadas recebam 401 juntas.
  Future<bool> _renovarSessao() => _renovacao ??= () async {
        try {
          final json = await _enviar('POST', '/auth/refresh',
              corpo: {'refreshToken': sessao!.refreshToken}, autenticar: false);
          sessao = Sessao.fromJson(json as Map<String, dynamic>);
          aoAlterarSessao?.call(sessao);
          return true;
        } catch (_) {
          return false;
        } finally {
          _renovacao = null;
        }
      }();
}
