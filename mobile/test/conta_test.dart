import 'dart:convert';

import 'package:cafe_artesanal/api/cliente_api.dart';
import 'package:cafe_artesanal/api/modelos.dart';
import 'package:cafe_artesanal/estado/sessao_estado.dart';
import 'package:cafe_artesanal/telas/conta_tela.dart';
import 'package:cafe_artesanal/telas/pedidos_tela.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> usuarioJson({String nome = 'Carla Souza'}) => {
      'id': 3,
      'nome': nome,
      'nomeSocial': null,
      'nomeExibicao': nome,
      'cpf': '390.533.447-05',
      'email': null,
      'telefone': null,
      'perfil': 'cliente',
    };

Map<String, dynamic> sessaoJson({String token = 'token-1', String nome = 'Carla Souza'}) =>
    {'accessToken': token, 'refreshToken': 'refresh-$token', 'usuario': usuarioJson(nome: nome)};

http.Response json(Object? corpo, [int status = 200]) =>
    http.Response(jsonEncode(corpo), status, headers: {'content-type': 'application/json; charset=utf-8'});

void main() {
  final api = ClienteApi.instancia;
  late List<http.Request> chamadas;
  late List<Map<String, dynamic>> enderecos;

  /// Servidor simulado: registra as chamadas e responde como a API real.
  http.Response responder(http.Request r) {
    final caminho = r.url.path;
    if (caminho.endsWith('/conta/enderecos')) return json(enderecos);
    if (r.method == 'DELETE' && caminho.contains('/conta/enderecos/')) {
      enderecos = [];
      return http.Response('', 204);
    }
    if (caminho.endsWith('/conta/perfil')) {
      return json(usuarioJson(nome: (jsonDecode(r.body) as Map<String, dynamic>)['nome'] as String));
    }
    if (caminho.endsWith('/conta/senha')) return json(sessaoJson(token: 'token-2'));
    if (caminho.endsWith('/pedidos')) return json({'itens': <Object>[]});
    if (caminho.endsWith('/auth/logout')) return http.Response('', 204);
    return json({'title': 'Não encontrado'}, 404);
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    chamadas = [];
    enderecos = [
      {'id': 7, 'apelido': 'Casa', 'principal': true, 'descricao': 'Rua A, 1'},
    ];
    api.sessao = Sessao.fromJson(sessaoJson());
    api.httpCliente = MockClient((r) async {
      chamadas.add(r);
      return responder(r);
    });
  });

  tearDown(() {
    api.sessao = null;
    api.aoAlterarSessao = null;
  });

  Future<void> abrir(WidgetTester tester, Widget tela) async {
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => SessaoEstado(),
      child: MaterialApp(home: Scaffold(body: tela)),
    ));
    await tester.pumpAndSettle();
  }

  Future<void> tocar(WidgetTester tester, Finder alvo) async {
    await tester.ensureVisible(alvo);
    await tester.pumpAndSettle();
    await tester.tap(alvo);
    await tester.pumpAndSettle();
  }

  testWidgets('editar os dados envia à API e atualiza o nome na tela', (tester) async {
    await abrir(tester, const ContaTela());
    await tocar(tester, find.text('Editar meus dados'));

    await tester.enterText(find.widgetWithText(TextFormField, 'Nome completo'), 'Carla Lima');
    await tocar(tester, find.widgetWithText(FilledButton, 'Salvar'));

    final envio = chamadas.singleWhere((c) => c.method == 'PUT');
    expect((jsonDecode(envio.body) as Map<String, dynamic>)['nome'], 'Carla Lima');
    expect(find.text('Carla Lima'), findsOneWidget);
    expect(api.sessao!.accessToken, 'token-1');
  });

  testWidgets('alterar a senha confere a repetição e guarda a nova sessão', (tester) async {
    await abrir(tester, const ContaTela());
    await tocar(tester, find.text('Alterar senha'));

    await tester.enterText(find.widgetWithText(TextFormField, 'Senha atual'), 'Antiga123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Nova senha'), 'Nova12345');
    await tester.enterText(find.widgetWithText(TextFormField, 'Repita a nova senha'), 'Diferente1');
    await tocar(tester, find.widgetWithText(FilledButton, 'Alterar senha'));
    expect(find.text('As senhas não são iguais.'), findsOneWidget);
    expect(chamadas.where((c) => c.method == 'PUT'), isEmpty);

    await tester.enterText(find.widgetWithText(TextFormField, 'Repita a nova senha'), 'Nova12345');
    await tocar(tester, find.widgetWithText(FilledButton, 'Alterar senha'));

    final envio = chamadas.singleWhere((c) => c.method == 'PUT');
    expect(jsonDecode(envio.body), {'senhaAtual': 'Antiga123', 'novaSenha': 'Nova12345'});
    expect(api.sessao!.accessToken, 'token-2');
  });

  testWidgets('remover endereço pede confirmação e atualiza a lista', (tester) async {
    await abrir(tester, const ContaTela());
    expect(find.text('Rua A, 1'), findsOneWidget);

    await tocar(tester, find.byTooltip('Remover endereço Casa'));
    expect(chamadas.where((c) => c.method == 'DELETE'), isEmpty);
    await tocar(tester, find.widgetWithText(FilledButton, 'Remover'));

    expect(chamadas.where((c) => c.method == 'DELETE').single.url.path, endsWith('/conta/enderecos/7'));
    expect(find.text('Nenhum endereço cadastrado.'), findsOneWidget);
  });

  testWidgets('ao sair da conta a lista de pedidos some e a sincronização para', (tester) async {
    await abrir(tester, const PedidosTela(visivel: true));
    expect(find.text('Nenhum pedido ainda'), findsOneWidget);

    await tester.element(find.byType(PedidosTela)).read<SessaoEstado>().sair();
    await tester.pumpAndSettle();
    expect(find.text('Acompanhe seus pedidos'), findsOneWidget);

    chamadas.clear();
    await tester.pump(const Duration(seconds: 20));
    expect(chamadas, isEmpty);
  });

  test('sem internet na renovação do token a sessão continua aberta', () async {
    api.httpCliente = MockClient((r) async {
      if (r.url.path.endsWith('/auth/refresh')) throw http.ClientException('sem rede');
      return json({'title': 'Não autenticado'}, 401);
    });

    await expectLater(api.get('/pedidos'), throwsA(isA<ErroApi>().having((e) => e.semConexao, 'semConexao', isTrue)));
    expect(api.sessao, isNotNull);
  });

  test('refresh token recusado encerra a sessão', () async {
    api.httpCliente = MockClient((r) async => json({'title': 'Não autenticado'}, 401));

    await expectLater(api.get('/pedidos'), throwsA(isA<ErroApi>().having((e) => e.status, 'status', 401)));
    expect(api.sessao, isNull);
  });
}
