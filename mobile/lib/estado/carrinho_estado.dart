import 'dart:math';

import 'package:flutter/foundation.dart';

import '../api/modelos.dart';
import '../core/armazenamento.dart';

class ItemCarrinho {
  ItemCarrinho({
    required this.produtoId,
    required this.nome,
    required this.preco,
    required this.imagemUrl,
    required this.estoque,
    required this.quantidade,
  });

  final int produtoId;
  final String nome;
  final double preco;
  final String? imagemUrl;
  final int estoque;
  final int quantidade;

  double get total => preco * quantidade;
  int get maximo => min(99, estoque);

  ItemCarrinho copiar({String? nome, double? preco, String? imagemUrl, int? estoque, int? quantidade}) => ItemCarrinho(
        produtoId: produtoId,
        nome: nome ?? this.nome,
        preco: preco ?? this.preco,
        imagemUrl: imagemUrl ?? this.imagemUrl,
        estoque: estoque ?? this.estoque,
        quantidade: quantidade ?? this.quantidade,
      );

  factory ItemCarrinho.fromJson(Map<String, dynamic> j) => ItemCarrinho(
        produtoId: j['produtoId'] as int,
        nome: j['nome'] as String,
        preco: (j['preco'] as num).toDouble(),
        imagemUrl: j['imagemUrl'] as String?,
        estoque: j['estoque'] as int,
        quantidade: j['quantidade'] as int,
      );

  Map<String, dynamic> toJson() => {
        'produtoId': produtoId,
        'nome': nome,
        'preco': preco,
        'imagemUrl': imagemUrl,
        'estoque': estoque,
        'quantidade': quantidade,
      };
}

/// Carrinho salvo no aparelho. Os preços são só para exibição:
/// ao finalizar, a API recalcula tudo com os valores do banco.
class CarrinhoEstado extends ChangeNotifier {
  static const _chave = 'cafe.carrinho';

  List<ItemCarrinho> _itens = [];

  List<ItemCarrinho> get itens => List.unmodifiable(_itens);
  int get quantidadeTotal => _itens.fold(0, (s, i) => s + i.quantidade);
  double get subtotal => _itens.fold(0, (s, i) => s + i.total);
  bool get vazio => _itens.isEmpty;

  int quantidadeDe(int produtoId) =>
      _itens.where((i) => i.produtoId == produtoId).fold(0, (s, i) => s + i.quantidade);

  Future<void> carregar() async {
    final json = await Armazenamento.lerJson(_chave);
    if (json is List) {
      _itens = json.map((i) => ItemCarrinho.fromJson(i as Map<String, dynamic>)).toList();
    }
  }

  /// Devolve `false` quando não há estoque suficiente.
  bool adicionar(Produto produto, [int quantidade = 1]) {
    final novaQuantidade = quantidadeDe(produto.id) + quantidade;
    if (!produto.disponivel || novaQuantidade > min(99, produto.estoque)) return false;

    final indice = _itens.indexWhere((i) => i.produtoId == produto.id);
    if (indice >= 0) {
      _itens[indice] = _itens[indice].copiar(quantidade: novaQuantidade);
    } else {
      _itens.add(ItemCarrinho(
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagemUrl: produto.imagemUrl,
        estoque: produto.estoque,
        quantidade: quantidade,
      ));
    }
    _salvar();
    return true;
  }

  void definirQuantidade(int produtoId, int quantidade) {
    if (quantidade <= 0) {
      _itens.removeWhere((i) => i.produtoId == produtoId);
    } else {
      _itens = _itens
          .map((i) => i.produtoId == produtoId ? i.copiar(quantidade: min(quantidade, i.maximo)) : i)
          .toList();
    }
    _salvar();
  }

  void limpar() {
    _itens = [];
    _salvar();
  }

  /// Atualiza preço/estoque com o catálogo sincronizado e retira o que ficou indisponível.
  /// Devolve os nomes removidos para avisar a pessoa.
  List<String> conciliar(List<Produto> produtos) {
    final porId = {for (final p in produtos) p.id: p};
    final removidos = <String>[];
    final atualizados = <ItemCarrinho>[];
    for (final item in _itens) {
      final p = porId[item.produtoId];
      if (p == null || !p.disponivel) {
        removidos.add(item.nome);
        continue;
      }
      atualizados.add(item.copiar(
        nome: p.nome,
        preco: p.preco,
        imagemUrl: p.imagemUrl,
        estoque: p.estoque,
        quantidade: min(item.quantidade, p.estoque),
      ));
    }
    _itens = atualizados;
    _salvar();
    return removidos;
  }

  void _salvar() {
    notifyListeners();
    Armazenamento.gravarJson(_chave, _itens.map((i) => i.toJson()).toList());
  }
}
