import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/formatos.dart';
import '../estado/carrinho_estado.dart';
import '../estado/catalogo_estado.dart';
import '../widgets/componentes.dart';
import 'endereco_tela.dart';
import 'pedido_tela.dart';

class CheckoutTela extends StatefulWidget {
  const CheckoutTela({super.key});

  @override
  State<CheckoutTela> createState() => _CheckoutTelaState();
}

class _CheckoutTelaState extends State<CheckoutTela> {
  TipoEntrega _tipo = TipoEntrega.retirada;
  FormaPagamento _pagamento = FormaPagamento.pix;
  List<Endereco> _enderecos = [];
  int? _enderecoId;
  final _observacao = TextEditingController();
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    _carregarEnderecos();
  }

  @override
  void dispose() {
    _observacao.dispose();
    super.dispose();
  }

  Future<void> _carregarEnderecos() async {
    try {
      final lista = await ServicosApi.enderecos();
      if (!mounted) return;
      setState(() {
        _enderecos = lista;
        if (!lista.any((e) => e.id == _enderecoId)) {
          _enderecoId = (lista.where((e) => e.principal).firstOrNull ?? lista.firstOrNull)?.id;
        }
      });
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    }
  }

  Future<void> _novoEndereco() async {
    final criado = await Navigator.of(context).push<Endereco>(MaterialPageRoute(builder: (_) => const EnderecoTela()));
    if (criado == null) return;
    _enderecoId = criado.id;
    await _carregarEnderecos();
  }

  Future<void> _enviar() async {
    final carrinho = context.read<CarrinhoEstado>();
    final catalogo = context.read<CatalogoEstado>();
    setState(() => _enviando = true);
    try {
      final pedido = await ServicosApi.criarPedido(
        itens: [for (final i in carrinho.itens) {'produtoId': i.produtoId, 'quantidade': i.quantidade}],
        tipoEntrega: _tipo,
        formaPagamento: _pagamento,
        enderecoId: _tipo == TipoEntrega.entrega ? _enderecoId : null,
        observacao: _observacao.text.trim().isEmpty ? null : _observacao.text.trim(),
      );
      carrinho.limpar();
      catalogo.sincronizar(); // o estoque mudou: atualiza a cópia local
      if (!mounted) return;
      // Fecha o checkout e abre o acompanhamento do pedido.
      Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => PedidoTela(pedidoId: pedido.id, recemCriado: true)));
    } on ErroApi catch (e) {
      if (mounted) {
        await showDialog<void>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Não foi possível enviar o pedido'),
            content: Text(e.mensagem),
            actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final carrinho = context.watch<CarrinhoEstado>();
    final loja = context.watch<CatalogoEstado>().loja;
    final taxa = _tipo == TipoEntrega.entrega ? (loja?.taxaEntrega ?? 0) : 0.0;
    final podeEnviar = !carrinho.vazio && (_tipo == TipoEntrega.retirada || _enderecoId != null) && !_enviando;

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar pedido')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _Secao(
          titulo: 'Como você quer receber?',
          child: RadioGroup<TipoEntrega>(
            groupValue: _tipo,
            onChanged: (v) => setState(() => _tipo = v!),
            child: Column(children: [
              const RadioListTile(
                value: TipoEntrega.retirada,
                title: Text('Retirar no balcão'),
                subtitle: Text('Grátis'),
                secondary: Icon(Icons.storefront_outlined),
              ),
              RadioListTile(
                value: TipoEntrega.entrega,
                title: const Text('Entrega'),
                subtitle: Text('Taxa de ${formatarMoeda(loja?.taxaEntrega ?? 0)}'),
                secondary: const Icon(Icons.delivery_dining_outlined),
              ),
            ]),
          ),
        ),
        if (_tipo == TipoEntrega.entrega)
          _Secao(
            titulo: 'Endereço',
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (_enderecos.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text('Cadastre um endereço para receber em casa.'),
                ),
              RadioGroup<int>(
                groupValue: _enderecoId,
                onChanged: (v) => setState(() => _enderecoId = v),
                child: Column(children: [
                  for (final e in _enderecos)
                    RadioListTile(value: e.id, title: Text(e.apelido), subtitle: Text(e.descricao)),
                ]),
              ),
              OutlinedButton.icon(onPressed: _novoEndereco, icon: const Icon(Icons.add), label: const Text('Novo endereço')),
            ]),
          ),
        _Secao(
          titulo: 'Pagamento (na ${_tipo == TipoEntrega.entrega ? 'entrega' : 'retirada'})',
          child: RadioGroup<FormaPagamento>(
            groupValue: _pagamento,
            onChanged: (v) => setState(() => _pagamento = v!),
            child: Column(children: [
              for (final forma in FormaPagamento.values) RadioListTile(value: forma, title: Text(forma.rotulo)),
            ]),
          ),
        ),
        TextField(
          controller: _observacao,
          maxLength: 300,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Observações (opcional)', hintText: 'Ex.: sem açúcar, interfone 52'),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              LinhaValor('Subtotal', carrinho.subtotal),
              LinhaValor('Entrega', taxa, gratisQuandoZero: true),
              LinhaValor('Total', carrinho.subtotal + taxa, destaque: true),
              const SizedBox(height: 4),
              Text('O valor final é confirmado pelo servidor com os preços atuais.',
                  style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ),
        FilledButton.icon(
          onPressed: podeEnviar ? _enviar : null,
          icon: _enviando
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.check),
          label: Text(_enviando ? 'Enviando...' : 'Confirmar pedido'),
        ),
      ]),
    );
  }
}

class _Secao extends StatelessWidget {
  const _Secao({required this.titulo, required this.child});

  final String titulo;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Semantics(header: true, child: Text(titulo, style: Theme.of(context).textTheme.titleMedium)),
            ),
            child,
          ]),
        ),
      );
}
