import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';

class SenhaTela extends StatefulWidget {
  const SenhaTela({super.key});

  @override
  State<SenhaTela> createState() => _SenhaTelaState();
}

class _SenhaTelaState extends State<SenhaTela> {
  final _form = GlobalKey<FormState>();
  final _atual = TextEditingController();
  final _nova = TextEditingController();
  final _repetir = TextEditingController();
  bool _enviando = false;

  @override
  void dispose() {
    for (final c in [_atual, _nova, _repetir]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _validarNova(String? valor) {
    final senha = valor ?? '';
    final forte = senha.length >= 8 && senha.contains(RegExp(r'[A-Za-z]')) && senha.contains(RegExp(r'\d'));
    return forte ? null : 'Use ao menos 8 caracteres, com letras e números.';
  }

  Future<void> _salvar() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _enviando = true);
    try {
      await context.read<SessaoEstado>().alterarSenha(_atual.text, _nova.text);
      if (!mounted) return;
      mostrarAviso(context, 'Senha alterada. Os outros aparelhos precisarão entrar de novo.');
      Navigator.of(context).pop();
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Alterar senha')),
        body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(24), children: [
            TextFormField(
              controller: _atual,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Senha atual'),
              validator: (v) => (v ?? '').isEmpty ? 'Informe a senha atual.' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nova,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'Nova senha', helperText: 'Mínimo de 8 caracteres, com letras e números.'),
              validator: _validarNova,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _repetir,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'Repita a nova senha'),
              validator: (v) => v == _nova.text ? null : 'As senhas não são iguais.',
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _enviando ? null : _salvar,
              child: Text(_enviando ? 'Salvando...' : 'Alterar senha'),
            ),
          ]),
        ),
      );
}
