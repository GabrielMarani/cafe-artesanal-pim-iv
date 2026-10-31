import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/config.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import 'cadastro_tela.dart';
import 'endereco_tela.dart';
import 'login_tela.dart';
import 'servidor_tela.dart';

class ContaTela extends StatefulWidget {
  const ContaTela({super.key});

  @override
  State<ContaTela> createState() => _ContaTelaState();
}

class _ContaTelaState extends State<ContaTela> {
  List<Endereco> _enderecos = [];
  bool? _logadoAntes;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Recarrega os endereços quando a pessoa entra na conta.
    final logado = context.watch<SessaoEstado>().estaLogado;
    if (logado != _logadoAntes) {
      _logadoAntes = logado;
      if (logado) _carregarEnderecos();
    }
  }

  Future<void> _carregarEnderecos() async {
    try {
      final lista = await ServicosApi.enderecos();
      if (mounted) setState(() => _enderecos = lista);
    } on ErroApi {
      // Sem conexão: a lista fica como está.
    }
  }

  Future<void> _abrir(Widget tela) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => tela));

  @override
  Widget build(BuildContext context) {
    final sessao = context.watch<SessaoEstado>();
    final usuario = sessao.usuario;
    final tema = Theme.of(context);

    return ListView(padding: const EdgeInsets.all(16), children: [
      if (usuario == null)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              const EstadoVazio(
                icone: Icons.account_circle_outlined,
                titulo: 'Entre ou crie sua conta',
                texto: 'Com uma conta você faz pedidos, salva endereços e acompanha a entrega.',
              ),
              FilledButton.icon(icon: const Icon(Icons.login), label: const Text('Entrar'), onPressed: () => _abrir(const LoginTela())),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: () => _abrir(const CadastroTela()), child: const Text('Criar conta')),
            ]),
          ),
        )
      else ...[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Semantics(header: true, child: Text(usuario.nomeExibicao, style: tema.textTheme.titleLarge)),
              if (usuario.nomeSocial != null) Text('Nome social em uso · registro: ${usuario.nome}'),
              Text('CPF ${usuario.cpf}'),
              if (usuario.email != null) Text(usuario.email!),
              if (usuario.telefone != null) Text(usuario.telefone!),
              if (!usuario.ehCliente)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Perfil ${usuario.perfil}: use o painel web para gerenciar a loja.',
                      style: const TextStyle(color: Color(0xFF7A4F00))),
                ),
            ]),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Semantics(header: true, child: Text('Endereços', style: tema.textTheme.titleMedium)),
              const SizedBox(height: 8),
              if (_enderecos.isEmpty) const Text('Nenhum endereço cadastrado.'),
              for (final e in _enderecos)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.location_on_outlined),
                  title: Text(e.principal ? '${e.apelido} · principal' : e.apelido),
                  subtitle: Text(e.descricao),
                ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                icon: const Icon(Icons.add),
                label: const Text('Adicionar endereço'),
                onPressed: () async {
                  await _abrir(const EnderecoTela());
                  _carregarEnderecos();
                },
              ),
            ]),
          ),
        ),
      ],
      Card(
        child: Column(children: [
          ListTile(
            leading: const Icon(Icons.dns_outlined),
            title: const Text('Servidor da API'),
            subtitle: Text(ConfigApi.url),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              await _abrir(const ServidorTela());
              setState(() {});
            },
          ),
          const ListTile(
            leading: Icon(Icons.accessibility_new),
            title: Text('Acessibilidade'),
            subtitle: Text('O app segue o tamanho de fonte, o modo escuro e o leitor de tela (TalkBack/VoiceOver) do celular.'),
          ),
        ]),
      ),
      if (usuario != null)
        FilledButton.icon(
          style: FilledButton.styleFrom(backgroundColor: tema.colorScheme.error, foregroundColor: tema.colorScheme.onError),
          icon: const Icon(Icons.logout),
          label: const Text('Sair da conta'),
          onPressed: () async {
            if (await confirmar(context, titulo: 'Sair', mensagem: 'Deseja sair da sua conta?', confirmar: 'Sair')) {
              await sessao.sair();
              if (mounted) setState(() => _enderecos = []);
            }
          },
        ),
    ]);
  }
}
