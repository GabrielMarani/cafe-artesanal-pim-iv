import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/armazenamento.dart';

/// Sessão do usuário. Os tokens ficam no armazenamento seguro do aparelho.
class SessaoEstado extends ChangeNotifier {
  SessaoEstado() {
    _api.aoAlterarSessao = (nova) {
      _persistir(nova);
      notifyListeners();
    };
  }

  static const _chave = 'cafe.sessao';
  final _api = ClienteApi.instancia;

  Usuario? get usuario => _api.sessao?.usuario;
  bool get estaLogado => _api.sessao != null;

  Future<void> carregar() async {
    final texto = await Armazenamento.lerSeguro(_chave);
    if (texto == null) return;
    try {
      _api.sessao = Sessao.fromJson(jsonDecode(texto) as Map<String, dynamic>);
    } on Object {
      await Armazenamento.removerSeguro(_chave);
    }
  }

  Future<Usuario> entrar(String login, String senha) async => _iniciar(await ServicosApi.entrar(login, senha));

  Future<Usuario> registrar(Map<String, dynamic> dados) async => _iniciar(await ServicosApi.registrar(dados));

  Future<void> atualizarPerfil(Map<String, dynamic> dados) async {
    final usuario = await ServicosApi.atualizarPerfil(dados);
    final atual = _api.sessao;
    if (atual != null) {
      await _iniciar(Sessao(accessToken: atual.accessToken, refreshToken: atual.refreshToken, usuario: usuario));
    }
  }

  Future<void> alterarSenha(String senhaAtual, String novaSenha) async =>
      _iniciar(await ServicosApi.alterarSenha(senhaAtual, novaSenha));

  Future<void> sair() async {
    final refreshToken = _api.sessao?.refreshToken;
    _api.sessao = null;
    await _persistir(null);
    notifyListeners();
    if (refreshToken != null) {
      try {
        await ServicosApi.sair(refreshToken);
      } on ErroApi {
        // A sessão local já foi encerrada; falha de rede aqui não importa.
      }
    }
  }

  Future<Usuario> _iniciar(Sessao sessao) async {
    _api.sessao = sessao;
    await _persistir(sessao);
    notifyListeners();
    return sessao.usuario;
  }

  Future<void> _persistir(Sessao? sessao) => sessao == null
      ? Armazenamento.removerSeguro(_chave)
      : Armazenamento.gravarSeguro(_chave, jsonEncode(sessao.toJson()));
}
