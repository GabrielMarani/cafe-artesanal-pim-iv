import 'dart:convert';

import 'package:http/http.dart' as http;

import 'cliente_api.dart';
import 'modelos.dart';

/// Endpoints usados pelo app, agrupados por assunto.
class ServicosApi {
  ServicosApi._();

  static final _api = ClienteApi.instancia;

  // ------------------------------------------------------------------ Autenticação

  static Future<Sessao> entrar(String login, String senha) async =>
      Sessao.fromJson(await _api.post('/auth/login', {'login': login, 'senha': senha}, false) as Map<String, dynamic>);

  static Future<Sessao> registrar(Map<String, dynamic> dados) async =>
      Sessao.fromJson(await _api.post('/auth/registrar', dados, false) as Map<String, dynamic>);

  static Future<void> sair(String refreshToken) => _api.post('/auth/logout', {'refreshToken': refreshToken}, false);

  // ------------------------------------------------------------------ Catálogo (sincronização incremental)

  static Future<CatalogoSync> sincronizarCatalogo(String? desde) async {
    final parametro = desde == null ? '' : '?desde=${Uri.encodeQueryComponent(desde)}';
    return CatalogoSync.fromJson(await _api.get('/sync/catalogo$parametro', autenticar: false) as Map<String, dynamic>);
  }

  static Future<Loja> loja() async => Loja.fromJson(await _api.get('/loja', autenticar: false) as Map<String, dynamic>);

  // ------------------------------------------------------------------ Conta

  static Future<List<Endereco>> enderecos() async =>
      (await _api.get('/conta/enderecos') as List).map((e) => Endereco.fromJson(e as Map<String, dynamic>)).toList();

  static Future<Endereco> criarEndereco(Map<String, dynamic> dados) async =>
      Endereco.fromJson(await _api.post('/conta/enderecos', dados) as Map<String, dynamic>);

  static Future<void> removerEndereco(int id) => _api.delete('/conta/enderecos/$id');

  static Future<Usuario> atualizarPerfil(Map<String, dynamic> dados) async =>
      Usuario.fromJson(await _api.put('/conta/perfil', dados) as Map<String, dynamic>);

  /// A API encerra as outras sessões e devolve uma nova para este aparelho.
  static Future<Sessao> alterarSenha(String senhaAtual, String novaSenha) async => Sessao.fromJson(
      await _api.put('/conta/senha', {'senhaAtual': senhaAtual, 'novaSenha': novaSenha}) as Map<String, dynamic>);

  // ------------------------------------------------------------------ Pedidos

  static Future<List<Pedido>> pedidos() async {
    final pagina = await _api.get('/pedidos?pagina=1&tamanhoPagina=20') as Map<String, dynamic>;
    return (pagina['itens'] as List).map((p) => Pedido.fromJson(p as Map<String, dynamic>)).toList();
  }

  static Future<Pedido> pedido(int id) async => Pedido.fromJson(await _api.get('/pedidos/$id') as Map<String, dynamic>);

  static Future<Pedido> criarPedido({
    required List<Map<String, int>> itens,
    required TipoEntrega tipoEntrega,
    required FormaPagamento formaPagamento,
    required int? enderecoId,
    required String? observacao,
  }) async =>
      Pedido.fromJson(await _api.post('/pedidos', {
        'itens': itens,
        'tipoEntrega': tipoEntrega.codigo,
        'formaPagamento': formaPagamento.codigo,
        'enderecoId': enderecoId,
        'observacao': observacao,
      }) as Map<String, dynamic>);

  static Future<Pedido> cancelarPedido(int id) async =>
      Pedido.fromJson(await _api.post('/pedidos/$id/cancelar', {'motivo': null}) as Map<String, dynamic>);

  static Future<Pedido> confirmarRecebimento(int id) async =>
      Pedido.fromJson(await _api.post('/pedidos/$id/confirmar-recebimento') as Map<String, dynamic>);

  // ------------------------------------------------------------------ ViaCEP

  /// Preenche o endereço automaticamente a partir do CEP (serviço público ViaCEP).
  static Future<Map<String, dynamic>?> buscarCep(String cep) async {
    final digitos = cep.replaceAll(RegExp(r'\D'), '');
    if (digitos.length != 8) return null;
    try {
      final resposta = await http.get(Uri.parse('https://viacep.com.br/ws/$digitos/json/'));
      final dados = jsonDecode(utf8.decode(resposta.bodyBytes)) as Map<String, dynamic>;
      return dados['erro'] == null ? dados : null;
    } catch (_) {
      return null;
    }
  }
}
