import 'package:cafe_artesanal/estado/carrinho_estado.dart';
import 'package:cafe_artesanal/estado/catalogo_estado.dart';
import 'package:cafe_artesanal/estado/sessao_estado.dart';
import 'package:cafe_artesanal/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('abre o app com as 4 abas e navega até o carrinho vazio', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SessaoEstado()),
        ChangeNotifierProvider(create: (_) => CarrinhoEstado()),
        ChangeNotifierProvider(create: (_) => CatalogoEstado()),
      ],
      child: const CafeArtesanalApp(),
    ));
    await tester.pump();

    for (final aba in ['Cardápio', 'Carrinho', 'Pedidos', 'Conta']) {
      expect(find.descendant(of: find.byType(NavigationBar), matching: find.text(aba)), findsOneWidget);
    }

    await tester.tap(find.text('Carrinho'));
    await tester.pumpAndSettle();
    expect(find.text('Seu carrinho está vazio'), findsOneWidget);

    await tester.tap(find.text('Pedidos'));
    await tester.pumpAndSettle();
    expect(find.text('Acompanhe seus pedidos'), findsOneWidget);
  });
}
