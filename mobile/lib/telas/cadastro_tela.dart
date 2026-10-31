import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../core/formatos.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import '../widgets/formatador_mascara.dart';

class CadastroTela extends StatefulWidget {
  const CadastroTela({super.key});

  @override
  State<CadastroTela> createState() => _CadastroTelaState();
}

class _CadastroTelaState extends State<CadastroTela> {
  final _form = GlobalKey<FormState>();
  final _nome = TextEditingController();
  final _nomeSocial = TextEditingController();
  final _cpf = TextEditingController();
  final _email = TextEditingController();
  final _telefone = TextEditingController();
  final _senha = TextEditingController();
  bool _enviando = false;

  @override
  void dispose() {
    for (final c in [_nome, _nomeSocial, _cpf, _email, _telefone, _senha]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _opcional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _enviar() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _enviando = true);
    try {
      final usuario = await context.read<SessaoEstado>().registrar({
        'nome': _nome.text.trim(),
        'nomeSocial': _opcional(_nomeSocial),
        'cpf': _cpf.text,
        'email': _opcional(_email),
        'telefone': _opcional(_telefone),
        'senha': _senha.text,
      });
      if (!mounted) return;
      mostrarAviso(context, 'Conta criada! Bem-vindo(a), ${usuario.primeiroNome}.');
      Navigator.of(context).pop();
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Criar conta')),
        body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(24), children: [
            const Text('Usamos seus dados só para processar seus pedidos (LGPD).'),
            const SizedBox(height: 20),
            TextFormField(
              controller: _nome,
              decoration: const InputDecoration(labelText: 'Nome completo'),
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              validator: (v) => (v ?? '').trim().isEmpty ? 'Informe o nome completo.' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nomeSocial,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Nome social (opcional)',
                helperText: 'Como você gostaria de ser chamado(a)? Se preencher, usaremos este nome em todo o atendimento.',
                helperMaxLines: 3,
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _cpf,
              decoration: const InputDecoration(labelText: 'CPF'),
              keyboardType: TextInputType.number,
              inputFormatters: [FormatadorMascara(mascaraCpf)],
              validator: (v) => cpfValido(v ?? '') ? null : 'CPF inválido.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'E-mail (opcional)'),
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _telefone,
              decoration: const InputDecoration(labelText: 'Celular (opcional)'),
              keyboardType: TextInputType.phone,
              inputFormatters: [FormatadorMascara(mascaraTelefone)],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _senha,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Senha', helperText: 'Mínimo de 8 caracteres, com letras e números.'),
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => senhaForte(v ?? '') ? null : 'Use 8 ou mais caracteres, com letras e números.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirmar senha'),
              validator: (v) => v == _senha.text ? null : 'As senhas não coincidem.',
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _enviando ? null : _enviar,
              icon: const Icon(Icons.person_add_alt),
              label: Text(_enviando ? 'Criando conta...' : 'Criar minha conta'),
            ),
          ]),
        ),
      );
}
