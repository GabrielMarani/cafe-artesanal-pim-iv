import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/formatos.dart';
import '../core/tema.dart';
import '../estado/carrinho_estado.dart';
import '../estado/catalogo_estado.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';

class ProdutoTela extends StatefulWidget {
  const ProdutoTela({super.key, required this.produtoId});

  final int produtoId;

  @override
  State<ProdutoTela> createState() => _ProdutoTelaState();
}

class _ProdutoTelaState extends State<ProdutoTela> {
  int _quantidade = 1;

  @override
  Widget build(BuildContext context) {
    final produto = context.watch<CatalogoEstado>().produto(widget.produtoId);
    final carrinho = context.watch<CarrinhoEstado>();
    final usuario = context.watch<SessaoEstado>().usuario;
    final tema = Theme.of(context);

    if (produto == null) {
      return Scaffold(appBar: AppBar(), body: const EstadoVazio(icone: Icons.help_outline, titulo: 'Produto não encontrado'));
    }

    final maximo = max(0, min(99, produto.estoque) - carrinho.quantidadeDe(produto.id));
    final podeComprar = usuario == null || usuario.ehCliente;

    return Scaffold(
      appBar: AppBar(title: Text(produto.nome)),
      body: ListView(children: [
        Semantics(
          label: 'Foto de ${produto.nome}',
          image: true,
          child: AspectRatio(aspectRatio: 4 / 3, child: ImagemProduto(produto.imagemUrl)),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text((produto.categoriaNome ?? '').toUpperCase(),
                style: TextStyle(color: TemaCafe.destaque(context), fontWeight: FontWeight.w700)),
            Semantics(
              header: true,
              child: Text(produto.nome, style: tema.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: [
              if (produto.destaque) const Selo('Destaque da casa', fundo: TemaCafe.caramelo, cor: Color(0xFF1F1A17)),
              if (!produto.disponivel)
                const Selo('Esgotado', fundo: Color(0xFFFBE7E5), cor: Color(0xFFA8231B))
              else if (produto.ultimasUnidades)
                Selo('Últimas ${produto.estoque} unidades', fundo: const Color(0xFFFFF1D6), cor: const Color(0xFF7A4F00)),
            ]),
            if (produto.descricao != null) ...[
              const SizedBox(height: 12),
              Text(produto.descricao!, style: tema.textTheme.bodyLarge),
            ],
            const SizedBox(height: 12),
            Text(formatarMoeda(produto.preco),
                style: tema.textTheme.headlineSmall?.copyWith(color: tema.colorScheme.primary, fontWeight: FontWeight.w800)),
            const SizedBox(height: 20),
            if (!podeComprar)
              const SizedBox.shrink()
            else if (produto.disponivel && maximo > 0) ...[
              SeletorQuantidade(
                valor: _quantidade,
                maximo: maximo,
                nome: produto.nome,
                aoMudar: (n) => setState(() => _quantidade = n.clamp(1, maximo)),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                icon: const Icon(Icons.add_shopping_cart),
                label: Text('Adicionar · ${formatarMoeda(produto.preco * _quantidade)}'),
                onPressed: () {
                  carrinho.adicionar(produto, _quantidade);
                  mostrarAviso(context, '$_quantidade × ${produto.nome} no carrinho.');
                  Navigator.of(context).pop();
                },
              ),
            ] else
              Text(
                produto.disponivel ? 'Você já colocou todo o estoque disponível no carrinho.' : 'Produto indisponível no momento.',
                style: TextStyle(color: TemaCafe.aviso(context), fontWeight: FontWeight.w600),
              ),
          ]),
        ),
      ]),
    );
  }
}
