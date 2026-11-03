import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/formatos.dart';
import '../core/tema.dart';
import '../estado/carrinho_estado.dart';
import '../estado/catalogo_estado.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import 'checkout_tela.dart';
import 'login_tela.dart';
import 'shell.dart';

class CarrinhoTela extends StatefulWidget {
  const CarrinhoTela({super.key});

  @override
  State<CarrinhoTela> createState() => _CarrinhoTelaState();
}

class _CarrinhoTelaState extends State<CarrinhoTela> {
  List<String> _removidos = [];
  String? _sincronizadoEm;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // A cada sincronização do catálogo, confere preço e estoque dos itens.
    // Roda depois do quadro atual: conciliar() notifica ouvintes e não pode acontecer durante o build.
    final catalogo = context.watch<CatalogoEstado>();
    if (catalogo.ultimaSincronizacao != _sincronizadoEm && catalogo.produtos.isNotEmpty) {
      _sincronizadoEm = catalogo.ultimaSincronizacao;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final removidos = context.read<CarrinhoEstado>().conciliar(catalogo.produtos);
        // Também apaga o aviso da sincronização anterior.
        if (removidos.isNotEmpty || _removidos.isNotEmpty) setState(() => _removidos = removidos);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final carrinho = context.watch<CarrinhoEstado>();
    final loja = context.watch<CatalogoEstado>().loja;
    final logado = context.watch<SessaoEstado>().estaLogado;

    if (carrinho.vazio) {
      return Column(children: [
        if (_removidos.isNotEmpty) BannerOffline('Removidos por falta de estoque: ${_removidos.join(', ')}'),
        Expanded(
          child: EstadoVazio(
            icone: Icons.shopping_cart_outlined,
            titulo: 'Seu carrinho está vazio',
            texto: 'Escolha algo gostoso no cardápio.',
            acao: FilledButton.icon(
              icon: const Icon(Icons.coffee),
              label: const Text('Ver cardápio'),
              onPressed: () => Shell.irPara(context, Shell.abaCardapio),
            ),
          ),
        ),
      ]);
    }

    final pedidoMinimo = loja?.pedidoMinimo ?? 0;
    final abaixoDoMinimo = carrinho.subtotal < pedidoMinimo;

    return ListView(padding: const EdgeInsets.all(16), children: [
      if (_removidos.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text('Removidos por falta de estoque: ${_removidos.join(', ')}', style: TextStyle(color: TemaCafe.aviso(context))),
        ),
      for (final item in carrinho.itens)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              ImagemProduto(item.imagemUrl, largura: 72, altura: 72, raio: 8),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.nome, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  Text('${formatarMoeda(item.preco)} cada'),
                  Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, children: [
                    SeletorQuantidade(
                      valor: item.quantidade,
                      maximo: item.maximo,
                      nome: item.nome,
                      aoMudar: (n) => carrinho.definirQuantidade(item.produtoId, n),
                    ),
                    Text(formatarMoeda(item.total), style: const TextStyle(fontWeight: FontWeight.w800)),
                  ]),
                ]),
              ),
            ]),
          ),
        ),
      TextButton.icon(
        icon: const Icon(Icons.delete_outline),
        label: const Text('Esvaziar carrinho'),
        onPressed: () async {
          if (await confirmar(context, titulo: 'Esvaziar carrinho', mensagem: 'Remover todos os itens?', confirmar: 'Esvaziar', destrutivo: true)) {
            carrinho.limpar();
          }
        },
      ),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            LinhaValor('Subtotal', carrinho.subtotal),
            Text('Entrega: ${formatarMoeda(loja?.taxaEntrega ?? 0)} · Retirada no balcão: grátis',
                style: Theme.of(context).textTheme.bodySmall),
            if (abaixoDoMinimo)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Pedido mínimo de ${formatarMoeda(pedidoMinimo)}.',
                    style: TextStyle(color: TemaCafe.aviso(context), fontWeight: FontWeight.w600)),
              ),
          ]),
        ),
      ),
      FilledButton.icon(
        icon: Icon(logado ? Icons.arrow_forward : Icons.login),
        label: Text(logado ? 'Escolher entrega e pagamento' : 'Entrar para finalizar'),
        onPressed: abaixoDoMinimo
            ? null
            : () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => logado ? const CheckoutTela() : const LoginTela())),
      ),
    ]);
  }
}
