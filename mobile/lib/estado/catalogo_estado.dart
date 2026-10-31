import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/armazenamento.dart';

/// Cópia local do catálogo.
class CatalogoLocal {
  const CatalogoLocal({this.servidorEm, this.categorias = const [], this.produtos = const []});

  final String? servidorEm;
  final List<Categoria> categorias;
  final List<Produto> produtos;

  Map<String, dynamic> toJson() => {
        'servidorEm': servidorEm,
        'categorias': categorias.map((c) => c.json).toList(),
        'produtos': produtos.map((p) => p.json).toList(),
      };

  factory CatalogoLocal.fromJson(Map<String, dynamic> j) => CatalogoLocal(
        servidorEm: j['servidorEm'] as String?,
        categorias: (j['categorias'] as List).map((c) => Categoria.fromJson(c as Map<String, dynamic>)).toList(),
        produtos: (j['produtos'] as List).map((p) => Produto.fromJson(p as Map<String, dynamic>)).toList(),
      );

  /// Aplica o que veio da API: no modo completo substitui tudo; no incremental
  /// atualiza/insere por id (itens desativados chegam com ativo = false).
  CatalogoLocal mesclar(CatalogoSync recebido) {
    if (recebido.completo) {
      return CatalogoLocal(servidorEm: recebido.servidorEm, categorias: recebido.categorias, produtos: recebido.produtos);
    }
    final categorias = {for (final c in this.categorias) c.id: c, for (final c in recebido.categorias) c.id: c};
    final produtos = {for (final p in this.produtos) p.id: p, for (final p in recebido.produtos) p.id: p};
    return CatalogoLocal(
      servidorEm: recebido.servidorEm,
      categorias: categorias.values.toList(),
      produtos: produtos.values.toList(),
    );
  }
}

/// Catálogo com SINCRONIZAÇÃO OFFLINE-FIRST:
///  1. abre na hora com a cópia salva no aparelho;
///  2. pede à API só o que mudou desde a última vez (GET /sync/catalogo?desde=...);
///  3. mescla as mudanças e salva de novo;
///  4. sincroniza outra vez quando a internet volta ou ao puxar a lista para baixo.
class CatalogoEstado extends ChangeNotifier {
  static const _chave = 'cafe.catalogo';
  static const _chaveLoja = 'cafe.loja';

  CatalogoLocal _local = const CatalogoLocal();
  Loja? loja;
  bool online = true;
  bool sincronizando = false;
  String? erro;
  StreamSubscription<List<ConnectivityResult>>? _conexao;

  String? get ultimaSincronizacao => _local.servidorEm;

  List<Categoria> get categorias =>
      _local.categorias.where((c) => c.ativo).toList()..sort((a, b) => a.ordemExibicao.compareTo(b.ordemExibicao));

  /// Produtos ativos de categorias ativas, na ordem do cardápio.
  List<Produto> get produtos {
    final ordem = {for (final c in categorias) c.id: c.ordemExibicao};
    return _local.produtos
        .where((p) => p.ativo && (p.categoriaId == null || ordem.containsKey(p.categoriaId)))
        .toList()
      ..sort((a, b) {
        final porCategoria = (ordem[a.categoriaId] ?? 999).compareTo(ordem[b.categoriaId] ?? 999);
        return porCategoria != 0 ? porCategoria : a.nome.compareTo(b.nome);
      });
  }

  Produto? produto(int id) => produtos.where((p) => p.id == id).firstOrNull;

  Future<void> iniciar() async {
    final salvo = await Armazenamento.lerJson(_chave);
    if (salvo is Map<String, dynamic>) _local = CatalogoLocal.fromJson(salvo);
    final lojaSalva = await Armazenamento.lerJson(_chaveLoja);
    if (lojaSalva is Map<String, dynamic>) loja = Loja.fromJson(lojaSalva);
    notifyListeners();

    _conexao = Connectivity().onConnectivityChanged.listen((resultados) {
      final conectado = !resultados.contains(ConnectivityResult.none);
      final voltou = conectado && !online;
      online = conectado;
      notifyListeners();
      if (voltou) sincronizar();
    });

    await sincronizar();
  }

  Future<void> sincronizar() async {
    if (sincronizando) return;
    sincronizando = true;
    notifyListeners();
    try {
      final recebido = await ServicosApi.sincronizarCatalogo(_local.servidorEm);
      _local = _local.mesclar(recebido);
      await Armazenamento.gravarJson(_chave, _local.toJson());

      loja = await ServicosApi.loja();
      await Armazenamento.gravarJson(_chaveLoja, loja!.json);
      erro = null;
    } on ErroApi catch (e) {
      erro = e.mensagem;
    } on Object {
      erro = 'Não foi possível sincronizar o cardápio.';
    } finally {
      sincronizando = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _conexao?.cancel();
    super.dispose();
  }
}
