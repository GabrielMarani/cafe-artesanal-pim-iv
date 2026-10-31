import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../api/servicos_api.dart';
import '../core/config.dart';
import '../estado/catalogo_estado.dart';

/// Endereço da API. No celular, use o IP do computador onde a API está rodando
/// (mesma rede Wi-Fi), por exemplo http://192.168.0.10:5000/api/v1.
class ServidorTela extends StatefulWidget {
  const ServidorTela({super.key});

  @override
  State<ServidorTela> createState() => _ServidorTelaState();
}

class _ServidorTelaState extends State<ServidorTela> {
  final _url = TextEditingController(text: ConfigApi.url);
  bool _testando = false;
  (bool ok, String texto)? _resultado;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _testarESalvar() async {
    setState(() {
      _testando = true;
      _resultado = null;
    });
    await ConfigApi.salvar(_url.text);
    try {
      final loja = await ServicosApi.loja();
      if (!mounted) return;
      setState(() => _resultado = (true, 'Conectado a "${loja.nome}". Endereço salvo.'));
      context.read<CatalogoEstado>().sincronizar();
    } on ErroApi catch (e) {
      if (mounted) setState(() => _resultado = (false, e.mensagem));
    } finally {
      if (mounted) setState(() => _testando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final resultado = _resultado;
    return Scaffold(
      appBar: AppBar(title: const Text('Servidor da API')),
      body: ListView(padding: const EdgeInsets.all(24), children: [
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'No computador, rode a API com:\n'
              'dotnet run --launch-profile rede-local\n\n'
              'Depois informe aqui o IP do computador na mesma rede Wi-Fi. '
              'Exemplo: http://192.168.0.10:5000/api/v1\n'
              'No emulador Android use http://10.0.2.2:5000/api/v1.',
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _url,
          keyboardType: TextInputType.url,
          autocorrect: false,
          decoration: const InputDecoration(labelText: 'Endereço da API'),
        ),
        const SizedBox(height: 12),
        if (resultado != null)
          Semantics(
            liveRegion: true,
            child: Text(resultado.$2,
                style: TextStyle(
                  color: resultado.$1 ? const Color(0xFF2E6B30) : Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w600,
                )),
          ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _testando ? null : _testarESalvar,
          icon: const Icon(Icons.wifi),
          label: Text(_testando ? 'Testando...' : 'Testar e salvar'),
        ),
        TextButton(
          onPressed: () async {
            await ConfigApi.salvar(null);
            setState(() {
              _url.text = ConfigApi.url;
              _resultado = (true, 'Usando o endereço padrão.');
            });
          },
          child: const Text('Voltar ao endereço padrão'),
        ),
      ]),
    );
  }
}
