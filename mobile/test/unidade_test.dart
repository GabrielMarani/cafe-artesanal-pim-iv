import 'package:cafe_artesanal/api/modelos.dart';
import 'package:cafe_artesanal/core/formatos.dart';
import 'package:cafe_artesanal/estado/carrinho_estado.dart';
import 'package:cafe_artesanal/estado/catalogo_estado.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> produtoJson(int id, {String nome = 'Café', double preco = 10, int estoque = 10, bool ativo = true}) => {
      'id': id,
      'nome': nome,
      'descricao': null,
      'imagemUrl': null,
      'preco': preco,
      'categoriaId': 1,
      'categoriaNome': 'Cafés',
      'estoque': estoque,
      'disponivel': ativo && estoque > 0,
      'destaque': false,
      'ativo': ativo,
    };

final categoriaJson = {'id': 1, 'nome': 'Cafés', 'ordemExibicao': 1, 'ativo': true};

void main() {
  group('Formatos', () {
    test('valida CPF pelos dígitos verificadores', () {
      expect(cpfValido('529.982.247-25'), isTrue);
      expect(cpfValido('529.982.247-24'), isFalse);
      expect(cpfValido('111.111.111-11'), isFalse);
    });

    test('aplica máscaras', () {
      expect(mascaraCpf('52998224725'), '529.982.247-25');
      expect(mascaraTelefone('11912345678'), '(11) 91234-5678');
      expect(mascaraCep('01310100'), '01310-100');
    });

    test('regra de senha igual à da API', () {
      expect(senhaForte('Senha123'), isTrue);
      expect(senhaForte('senhasemnumero'), isFalse);
      expect(senhaForte('Ab1'), isFalse);
    });

    test('busca ignora acentos e maiúsculas', () {
      expect(normalizarBusca('Pão de Queijo').contains(normalizarBusca('pao')), isTrue);
    });
  });

  group('Modelos', () {
    test('lê o pedido da API com enums em snake_case', () {
      final pedido = Pedido.fromJson({
        'id': 12, 'numero': '#00012', 'dataPedido': '2026-10-31T16:21:00', 'status': 'saiu_para_entrega',
        'statusRotulo': 'Saiu para entrega', 'tipoEntrega': 'entrega', 'formaPagamentoRotulo': 'Pix',
        'subtotal': 19, 'taxaEntrega': 5, 'total': 24.0, 'enderecoEntrega': 'Rua A, 1', 'observacao': null,
        'motivoCancelamento': null, 'itens': [{'produtoId': 2, 'nomeProduto': 'Cappuccino', 'quantidade': 2, 'subtotal': 19}],
        'historico': [], 'acoes': {'podeCancelar': false, 'podeConfirmarRecebimento': true},
      });

      expect(pedido.status, StatusPedido.saiuParaEntrega);
      expect(pedido.total, 24.0);
      expect(pedido.tipoEntrega.etapas.length, 5);
      expect(TipoEntrega.retirada.etapas, isNot(contains(StatusPedido.saiuParaEntrega)));
    });
  });

  group('Sincronização do catálogo', () {
    final local = CatalogoLocal(
      servidorEm: '2026-10-31T10:00:00',
      categorias: [Categoria.fromJson(categoriaJson)],
      produtos: [Produto.fromJson(produtoJson(1, nome: 'Espresso')), Produto.fromJson(produtoJson(2, nome: 'Latte'))],
    );

    test('incremental atualiza só o que mudou e mantém o resto', () {
      final recebido = CatalogoSync.fromJson({
        'servidorEm': '2026-10-31T11:00:00',
        'completo': false,
        'categorias': [],
        'produtos': [produtoJson(2, nome: 'Latte', preco: 12), produtoJson(3, nome: 'Mocha')],
      });

      final mesclado = local.mesclar(recebido);

      expect(mesclado.servidorEm, '2026-10-31T11:00:00');
      expect(mesclado.produtos.map((p) => p.id), unorderedEquals([1, 2, 3]));
      expect(mesclado.produtos.firstWhere((p) => p.id == 2).preco, 12);
    });

    test('produto desativado chega no incremental e substitui o local', () {
      final recebido = CatalogoSync.fromJson({
        'servidorEm': '2026-10-31T11:00:00', 'completo': false, 'categorias': [],
        'produtos': [produtoJson(1, nome: 'Espresso', ativo: false)],
      });
      expect(local.mesclar(recebido).produtos.firstWhere((p) => p.id == 1).ativo, isFalse);
    });

    test('sincronização completa substitui tudo', () {
      final recebido = CatalogoSync.fromJson({
        'servidorEm': '2026-10-31T11:00:00', 'completo': true, 'categorias': [categoriaJson],
        'produtos': [produtoJson(9, nome: 'Novo')],
      });
      expect(local.mesclar(recebido).produtos.single.id, 9);
    });
  });

  group('Carrinho', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('soma itens repetidos e respeita o estoque', () {
      final carrinho = CarrinhoEstado();
      final produto = Produto.fromJson(produtoJson(1, preco: 9.5, estoque: 3));

      expect(carrinho.adicionar(produto, 2), isTrue);
      expect(carrinho.adicionar(produto), isTrue);
      expect(carrinho.adicionar(produto), isFalse, reason: 'só há 3 em estoque');
      expect(carrinho.quantidadeTotal, 3);
      expect(carrinho.subtotal, 28.5);
    });

    test('conciliar atualiza preço e remove o que esgotou', () {
      final carrinho = CarrinhoEstado()
        ..adicionar(Produto.fromJson(produtoJson(1, nome: 'Espresso', preco: 6)))
        ..adicionar(Produto.fromJson(produtoJson(2, nome: 'Latte')));

      final removidos = carrinho.conciliar([
        Produto.fromJson(produtoJson(1, nome: 'Espresso', preco: 7)),
        Produto.fromJson(produtoJson(2, nome: 'Latte', estoque: 0)),
      ]);

      expect(removidos, ['Latte']);
      expect(carrinho.itens.single.preco, 7);
    });
  });
}
