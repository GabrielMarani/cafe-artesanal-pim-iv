import 'package:flutter/material.dart';

import '../api/cliente_api.dart';
import '../api/servicos_api.dart';
import '../core/formatos.dart';
import '../widgets/componentes.dart';
import '../widgets/formatador_mascara.dart';

/// Cadastro de endereço. Ao digitar o CEP, preenche rua, bairro, cidade e UF (ViaCEP).
/// Devolve o endereço criado para a tela anterior.
class EnderecoTela extends StatefulWidget {
  const EnderecoTela({super.key});

  @override
  State<EnderecoTela> createState() => _EnderecoTelaState();
}

class _EnderecoTelaState extends State<EnderecoTela> {
  final _form = GlobalKey<FormState>();
  final _campos = {
    for (final nome in ['apelido', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'referencia'])
      nome: TextEditingController(text: nome == 'apelido' ? 'Casa' : ''),
  };
  bool _principal = false;
  bool _enviando = false;
  String _ajudaCep = 'Preenchemos o endereço automaticamente.';

  @override
  void dispose() {
    for (final c in _campos.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _aoMudarCep(String cep) async {
    if (somenteDigitos(cep).length != 8) return;
    setState(() => _ajudaCep = 'Buscando CEP...');
    final dados = await ServicosApi.buscarCep(cep);
    if (!mounted) return;
    setState(() {
      if (dados == null) {
        _ajudaCep = 'CEP não encontrado. Preencha manualmente.';
        return;
      }
      _campos['logradouro']!.text = (dados['logradouro'] as String?) ?? _campos['logradouro']!.text;
      _campos['bairro']!.text = (dados['bairro'] as String?) ?? _campos['bairro']!.text;
      _campos['cidade']!.text = (dados['localidade'] as String?) ?? '';
      _campos['uf']!.text = (dados['uf'] as String?) ?? '';
      _ajudaCep = 'Endereço encontrado. Informe o número.';
    });
  }

  Future<void> _salvar() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _enviando = true);
    String? opcional(String nome) => _campos[nome]!.text.trim().isEmpty ? null : _campos[nome]!.text.trim();
    try {
      final criado = await ServicosApi.criarEndereco({
        for (final nome in ['apelido', 'cep', 'logradouro', 'numero', 'bairro', 'cidade']) nome: _campos[nome]!.text.trim(),
        'uf': _campos['uf']!.text.trim().toUpperCase(),
        'complemento': opcional('complemento'),
        'referencia': opcional('referencia'),
        'principal': _principal,
      });
      if (mounted) Navigator.of(context).pop(criado);
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  Widget _campo(String nome, String rotulo, {bool obrigatorio = true, String? ajuda, TextInputType? teclado}) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: TextFormField(
          controller: _campos[nome],
          keyboardType: teclado,
          inputFormatters: nome == 'cep' ? [FormatadorMascara(mascaraCep)] : null,
          onChanged: nome == 'cep' ? _aoMudarCep : null,
          decoration: InputDecoration(labelText: obrigatorio ? rotulo : '$rotulo (opcional)', helperText: ajuda),
          validator: obrigatorio ? (v) => (v ?? '').trim().isEmpty ? 'Campo obrigatório.' : null : null,
        ),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Novo endereço')),
        body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(24), children: [
            _campo('cep', 'CEP', ajuda: _ajudaCep, teclado: TextInputType.number),
            _campo('apelido', 'Nome do endereço (Casa, Trabalho...)'),
            _campo('logradouro', 'Rua / Avenida'),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: _campo('numero', 'Número')),
              const SizedBox(width: 12),
              Expanded(flex: 2, child: _campo('complemento', 'Complemento', obrigatorio: false)),
            ]),
            _campo('bairro', 'Bairro'),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(flex: 3, child: _campo('cidade', 'Cidade')),
              const SizedBox(width: 12),
              Expanded(child: _campo('uf', 'UF')),
            ]),
            _campo('referencia', 'Ponto de referência', obrigatorio: false),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Usar como endereço principal'),
              value: _principal,
              onChanged: (v) => setState(() => _principal = v),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _enviando ? null : _salvar,
              icon: const Icon(Icons.save_outlined),
              label: Text(_enviando ? 'Salvando...' : 'Salvar endereço'),
            ),
          ]),
        ),
      );
}
