import 'dart:convert';

import 'package:cafe_artesanal/api/cliente_api.dart';
import 'package:cafe_artesanal/api/modelos.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('interpretarResposta', () {
    test('devolve os dados de uma resposta JSON', () {
      expect(interpretarResposta(200, utf8.encode('{"a":1}')), {'a': 1});
    });

    test('resposta sem corpo vira null', () {
      expect(interpretarResposta(204, const []), isNull);
    });

    test('usa a mensagem do ProblemDetails', () {
      expect(
        () => interpretarResposta(422, utf8.encode('{"title":"Regra","detail":"Estoque insuficiente."}')),
        throwsA(isA<ErroApi>().having((e) => e.mensagem, 'mensagem', 'Estoque insuficiente.')),
      );
    });

    test('erro sem corpo também vira ErroApi', () {
      expect(
        () => interpretarResposta(429, const []),
        throwsA(isA<ErroApi>().having((e) => e.status, 'status', 429)),
      );
    });

    test('página HTML no lugar do JSON não derruba o app', () {
      final html = utf8.encode('<html>Bad Gateway</html>');
      expect(() => interpretarResposta(502, html), throwsA(isA<ErroApi>().having((e) => e.mensagem, 'mensagem', 'Erro 502')));
      expect(() => interpretarResposta(200, html), throwsA(isA<ErroApi>()));
    });
  });

  test('só entregue e cancelado são status finalizados', () {
    expect(StatusPedido.values.where((s) => s.finalizado), [StatusPedido.entregue, StatusPedido.cancelado]);
  });
}
