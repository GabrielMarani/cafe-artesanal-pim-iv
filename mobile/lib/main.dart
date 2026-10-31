import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'core/config.dart';
import 'core/tema.dart';
import 'estado/carrinho_estado.dart';
import 'estado/catalogo_estado.dart';
import 'estado/sessao_estado.dart';
import 'telas/shell.dart';

/// App mobile do Café Artesanal (PIM IV) — Flutter/Dart.
/// Consome a API REST .NET (CafeArtesanal.Api).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await ConfigApi.carregar();
  final sessao = SessaoEstado();
  final carrinho = CarrinhoEstado();
  await Future.wait([sessao.carregar(), carrinho.carregar()]);
  final catalogo = CatalogoEstado();

  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider.value(value: sessao),
      ChangeNotifierProvider.value(value: carrinho),
      ChangeNotifierProvider.value(value: catalogo),
    ],
    child: const CafeArtesanalApp(),
  ));

  // Abre com o catálogo salvo e sincroniza em segundo plano.
  catalogo.iniciar();
}

class CafeArtesanalApp extends StatelessWidget {
  const CafeArtesanalApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Café Artesanal',
        debugShowCheckedModeBanner: false,
        theme: TemaCafe.claro,
        darkTheme: TemaCafe.escuro,
        themeMode: ThemeMode.system,
        locale: const Locale('pt', 'BR'),
        supportedLocales: const [Locale('pt', 'BR')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: const Shell(),
      );
}
