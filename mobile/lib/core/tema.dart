import 'package:flutter/material.dart';

import '../api/modelos.dart';

/// Identidade visual do site (café, creme e caramelo), com contraste WCAG AA
/// nos modos claro e escuro. O app respeita o tamanho de fonte do celular.
class TemaCafe {
  TemaCafe._();

  static const cafe = Color(0xFF4B2E2B);
  static const caramelo = Color(0xFFC27B40);
  static const creme = Color(0xFFFFF8F0);
  static const bege = Color(0xFFF5E6D3);
  static const destaqueTexto = Color(0xFF8A5426);

  static ThemeData get claro => _criar(ColorScheme.fromSeed(
        seedColor: cafe,
        primary: cafe,
        onPrimary: creme,
        secondary: const Color(0xFF556B2F),
        tertiary: caramelo,
        surface: Colors.white,
        brightness: Brightness.light,
      ), fundo: creme);

  static ThemeData get escuro => _criar(ColorScheme.fromSeed(
        seedColor: cafe,
        primary: const Color(0xFFD9A57A),
        onPrimary: const Color(0xFF1F1A17),
        secondary: const Color(0xFFA9C47A),
        tertiary: caramelo,
        surface: const Color(0xFF241E1B),
        brightness: Brightness.dark,
      ), fundo: const Color(0xFF171311));

  static ThemeData _criar(ColorScheme cores, {required Color fundo}) => ThemeData(
        useMaterial3: true,
        colorScheme: cores,
        scaffoldBackgroundColor: fundo,
        appBarTheme: AppBarTheme(backgroundColor: cores.surface, foregroundColor: cores.onSurface, centerTitle: false),
        cardTheme: CardThemeData(
          color: cores.surface,
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: cores.outlineVariant),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: cores.surface,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
      );

  /// Cores dos selos de status (texto escuro sobre fundo claro: contraste AA).
  static (Color fundo, Color texto) corStatus(StatusPedido status) => switch (status) {
        StatusPedido.pendente => (const Color(0xFFFFF1D6), const Color(0xFF7A4F00)),
        StatusPedido.emPreparo => (const Color(0xFFE3EEFA), const Color(0xFF1D5FA8)),
        StatusPedido.pronto => (const Color(0xFFEFE3FA), const Color(0xFF6A2E9E)),
        StatusPedido.saiuParaEntrega => (const Color(0xFFE0F4F4), const Color(0xFF1F6B6B)),
        StatusPedido.entregue => (const Color(0xFFE3F1E3), const Color(0xFF2E6B30)),
        StatusPedido.cancelado => (const Color(0xFFFBE7E5), const Color(0xFFA8231B)),
      };
}
