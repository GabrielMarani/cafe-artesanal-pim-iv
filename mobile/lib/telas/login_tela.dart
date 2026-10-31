import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../estado/sessao_estado.dart';
import 'cadastro_tela.dart';

class LoginTela extends StatefulWidget {
  const LoginTela({super.key});

  @override
  State<LoginTela> createState() => _LoginTelaState();
}

class _LoginTelaState extends State<LoginTela> {
  final _login = TextEditingController();
  final _senha = TextEditingController();
  bool _senhaVisivel = false;
  bool _enviando = false;
  String? _erro;

  @override
  void dispose() {
    _login.dispose();
    _senha.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    if (_login.text.trim().isEmpty || _senha.text.isEmpty) {
      setState(() => _erro = 'Informe o CPF (ou e-mail) e a senha.');
      return;
    }
    setState(() {
      _enviando = true;
      _erro = null;
    });
    try {
      await context.read<SessaoEstado>().entrar(_login.text.trim(), _senha.text);
      if (mounted) Navigator.of(context).pop();
    } on ErroApi catch (e) {
      if (mounted) setState(() => _erro = e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Entrar')),
        body: AutofillGroup(
          child: ListView(padding: const EdgeInsets.all(24), children: [
            Semantics(
              header: true,
              child: Text('Bem-vindo(a) de volta ☕', style: Theme.of(context).textTheme.headlineSmall),
            ),
            const SizedBox(height: 8),
            const Text('Entre para fazer pedidos e acompanhar a entrega.'),
            const SizedBox(height: 24),
            TextField(
              controller: _login,
              decoration: const InputDecoration(labelText: 'CPF ou e-mail', prefixIcon: Icon(Icons.person_outline)),
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.username],
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _senha,
              obscureText: !_senhaVisivel,
              autofillHints: const [AutofillHints.password],
              onSubmitted: (_) => _entrar(),
              decoration: InputDecoration(
                labelText: 'Senha',
                prefixIcon: const Icon(Icons.lock_outline),
                errorText: _erro,
                errorMaxLines: 3,
                suffixIcon: IconButton(
                  icon: Icon(_senhaVisivel ? Icons.visibility_off : Icons.visibility),
                  tooltip: _senhaVisivel ? 'Ocultar senha' : 'Mostrar senha',
                  onPressed: () => setState(() => _senhaVisivel = !_senhaVisivel),
                ),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _enviando ? null : _entrar,
              icon: _enviando
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.login),
              label: const Text('Entrar'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const CadastroTela())),
              child: const Text('Ainda não tenho conta'),
            ),
          ]),
        ),
      );
}
