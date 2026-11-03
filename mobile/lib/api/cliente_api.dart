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

/// Transforma a resposta em dados, ou em [ErroApi] quando há erro ou o corpo não é o JSON
/// esperado (ex.: uma página HTML porque o endereço do servidor está errado).
dynamic interpretarResposta(int status, List<int> corpo) {
  dynamic dados;
  try {
    dados = corpo.isEmpty ? null : jsonDecode(utf8.decode(corpo));
  } on FormatException {
    if (status < 400) {
      throw ErroApi(status, 'O servidor respondeu em um formato inesperado. Confira o endereço em Conta › Servidor da API.');
    }
  }
  if (status >= 400) {
    final problema = dados is Map<String, dynamic> ? dados : const <String, dynamic>{};
    throw ErroApi(status, (problema['detail'] ?? problema['title'] ?? 'Erro $status') as String);
  }
  return dados;
}

/// Cliente HTTP da API REST: JSON, timeout, token JWT e renovação automática
/// da sessão com o refresh token quando a API responde 401.
class ClienteApi {
  ClienteApi._();

  static final ClienteApi instancia = ClienteApi._();

  static const _timeout = Duration(seconds: 12);

  /// Substituível nos testes por um cliente simulado.
  http.Client httpCliente = http.Client();
  Sessao? sessao;

  /// Chamado quando a sessão muda por renovação ou expiração (o estado salva e avisa a tela).
  void Function(Sessao? nova)? aoAlterarSessao;

  Future<bool>? _renovacao;

  Future<dynamic> get(String caminho, {bool autenticar = true}) => _enviar('GET', caminho, autenticar: autenticar);

  Future<dynamic> post(String caminho, [Object? corpo, bool autenticar = true]) =>
      _enviar('POST', caminho, corpo: corpo, autenticar: autenticar);

  Future<dynamic> put(String caminho, Object? corpo) => _enviar('PUT', caminho, corpo: corpo);

  Future<dynamic> delete(String caminho) => _enviar('DELETE', caminho);

  Future<dynamic> _enviar(String metodo, String caminho,
      {Object? corpo, bool autenticar = true, bool repetir = true}) async {
    final cabecalhos = {'Accept': 'application/json', if (corpo != null) 'Content-Type': 'application/json'};
    final token = sessao?.accessToken;
    if (autenticar && token != null) cabecalhos['Authorization'] = 'Bearer $token';

    final requisicao = http.Request(metodo, Uri.parse('${ConfigApi.url}$caminho'))..headers.addAll(cabecalhos);
    if (corpo != null) requisicao.body = jsonEncode(corpo);

    http.Response resposta;
    try {
      resposta = await http.Response.fromStream(await httpCliente.send(requisicao).timeout(_timeout));
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

    return interpretarResposta(resposta.statusCode, resposta.bodyBytes);
  }

  /// Uma renovação por vez, mesmo que várias chamadas recebam 401 juntas.
  Future<bool> _renovarSessao() => _renovacao ??= () async {
        try {
          final json = await _enviar('POST', '/auth/refresh',
              corpo: {'refreshToken': sessao!.refreshToken}, autenticar: false);
          sessao = Sessao.fromJson(json as Map<String, dynamic>);
          aoAlterarSessao?.call(sessao);
          return true;
        } on ErroApi catch (e) {
          // Sem internet a sessão continua valendo: não desconecta a pessoa por causa disso.
          if (e.semConexao) rethrow;
          return false;
        } finally {
          _renovacao = null;
        }
      }();
}
