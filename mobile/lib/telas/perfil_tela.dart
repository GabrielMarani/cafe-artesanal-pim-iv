import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../core/formatos.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import '../widgets/formatador_mascara.dart';

/// Edição dos dados pessoais. O CPF identifica a conta e não pode ser alterado.
class PerfilTela extends StatefulWidget {
  const PerfilTela({super.key});

  @override
  State<PerfilTela> createState() => _PerfilTelaState();
}

class _PerfilTelaState extends State<PerfilTela> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _nome;
  late final TextEditingController _nomeSocial;
  late final TextEditingController _email;
  late final TextEditingController _telefone;
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    final usuario = context.read<SessaoEstado>().usuario;
    _nome = TextEditingController(text: usuario?.nome);
    _nomeSocial = TextEditingController(text: usuario?.nomeSocial);
    _email = TextEditingController(text: usuario?.email);
    _telefone = TextEditingController(text: usuario?.telefone);
  }

  @override
  void dispose() {
    for (final c in [_nome, _nomeSocial, _email, _telefone]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _opcional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _salvar() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _enviando = true);
    try {
      await context.read<SessaoEstado>().atualizarPerfil({
        'nome': _nome.text.trim(),
        'nomeSocial': _opcional(_nomeSocial),
        'email': _opcional(_email),
        'telefone': _opcional(_telefone),
      });
      if (!mounted) return;
      mostrarAviso(context, 'Dados atualizados.');
      Navigator.of(context).pop();
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Editar meus dados')),
        body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(24), children: [
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
                helperText: 'Se preencher, usaremos este nome em todo o atendimento.',
                helperMaxLines: 2,
              ),
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
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _enviando ? null : _salvar,
              child: Text(_enviando ? 'Salvando...' : 'Salvar'),
            ),
          ]),
        ),
      );
}
