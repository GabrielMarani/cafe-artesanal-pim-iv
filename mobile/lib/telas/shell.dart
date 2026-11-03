import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../estado/carrinho_estado.dart';
import 'cardapio_tela.dart';
import 'carrinho_tela.dart';
import 'conta_tela.dart';
import 'pedidos_tela.dart';

/// Estrutura principal com a barra de navegação inferior (4 abas).
class Shell extends StatefulWidget {
  const Shell({super.key});

  /// Permite que outras telas troquem de aba (ex.: "Ver cardápio" no carrinho vazio).
  static void irPara(BuildContext context, int aba) => context.findAncestorStateOfType<_ShellState>()?._selecionar(aba);

  static const abaCardapio = 0;

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _aba = 0;

  void _selecionar(int aba) => setState(() => _aba = aba);

  @override
  Widget build(BuildContext context) {
    final quantidade = context.watch<CarrinhoEstado>().quantidadeTotal;
    const titulos = ['Cardápio', 'Carrinho', 'Meus pedidos', 'Minha conta'];

    return Scaffold(
      appBar: AppBar(title: Text(titulos[_aba])),
      body: IndexedStack(index: _aba, children: [
        const CardapioTela(),
        const CarrinhoTela(),
        PedidosTela(visivel: _aba == 2),
        const ContaTela(),
      ]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _aba,
        onDestinationSelected: _selecionar,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.coffee_outlined), selectedIcon: Icon(Icons.coffee), label: 'Cardápio'),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: quantidade > 0,
              label: Text('$quantidade'),
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: quantidade > 0,
              label: Text('$quantidade'),
              child: const Icon(Icons.shopping_cart),
            ),
            label: 'Carrinho',
            tooltip: 'Carrinho, $quantidade itens',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Pedidos'),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Conta'),
        ],
      ),
    );
  }
}
