import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/formatos.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import 'login_tela.dart';
import 'pedido_tela.dart';

/// Lista de pedidos do cliente. Enquanto a aba está visível e há pedido em
/// andamento, os status são sincronizados com a API a cada 15 segundos.
class PedidosTela extends StatefulWidget {
  const PedidosTela({super.key, required this.visivel});

  final bool visivel;

  @override
  State<PedidosTela> createState() => _PedidosTelaState();
}

class _PedidosTelaState extends State<PedidosTela> {
  static const _intervalo = Duration(seconds: 15);

  List<Pedido>? _pedidos;
  String? _erro;
  Timer? _timer;
  int? _usuarioId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Troca de conta: nada do usuário anterior continua na tela.
    final id = context.watch<SessaoEstado>().usuario?.id;
    if (id == _usuarioId) return;
    _usuarioId = id;
    _pedidos = null;
    _erro = null;
    _timer?.cancel();
    if (id != null && widget.visivel) _iniciarSincronizacao();
  }

  @override
  void didUpdateWidget(PedidosTela antigo) {
    super.didUpdateWidget(antigo);
    if (widget.visivel && !antigo.visivel) _iniciarSincronizacao();
    if (!widget.visivel) _timer?.cancel();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _iniciarSincronizacao() {
    _carregar();
    _timer?.cancel();
    _timer = Timer.periodic(_intervalo, (_) {
      // Todos finalizados: não há o que acompanhar. Ao voltar para a aba, atualiza de novo.
      if (_pedidos?.every((p) => p.status.finalizado) ?? false) return;
      _carregar();
    });
  }

  Future<void> _carregar() async {
    final id = _usuarioId;
    if (id == null) return;
    try {
      final pedidos = await ServicosApi.pedidos();
      if (!mounted || id != _usuarioId) return;
      setState(() {
        _pedidos = pedidos;
        _erro = null;
      });
    } on ErroApi catch (e) {
      if (mounted && id == _usuarioId) setState(() => _erro = e.mensagem);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessao = context.watch<SessaoEstado>();

    if (!sessao.estaLogado) {
      return EstadoVazio(
        icone: Icons.receipt_long_outlined,
        titulo: 'Acompanhe seus pedidos',
        texto: 'Entre na sua conta para ver o andamento dos pedidos.',
        acao: FilledButton.icon(
          icon: const Icon(Icons.login),
          label: const Text('Entrar'),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginTela())),
        ),
      );
    }

    if (!sessao.usuario!.ehCliente) {
      return const EstadoVazio(
        icone: Icons.desktop_windows_outlined,
        titulo: 'Conta da equipe',
        texto: 'Atendentes e administradores gerenciam os pedidos pelo painel web.',
      );
    }

    final pedidos = _pedidos;
    if (pedidos == null) {
      return _erro == null ? const Carregando(texto: 'Carregando seus pedidos...') : BannerOffline(_erro!);
    }

    return RefreshIndicator(
      onRefresh: _carregar,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        if (_erro != null) BannerOffline(_erro!),
        if (pedidos.isEmpty)
          const EstadoVazio(icone: Icons.coffee_outlined, titulo: 'Nenhum pedido ainda', texto: 'Que tal pedir um café agora?'),
        for (final p in pedidos)
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              title: Row(children: [
                Expanded(child: Text('Pedido ${p.numero}', style: const TextStyle(fontWeight: FontWeight.w800))),
                SeloStatus(p.status, rotulo: p.statusRotulo),
              ]),
              subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${formatarData(p.dataPedido)} · ${p.tipoEntrega == TipoEntrega.entrega ? 'Entrega' : 'Retirada'}'),
                Text(p.itens.map((i) => '${i.quantidade}× ${i.nomeProduto}').join(', '),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(formatarMoeda(p.total),
                    style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w800)),
              ]),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                await Navigator.of(context).push(MaterialPageRoute(builder: (_) => PedidoTela(pedidoId: p.id)));
                _carregar();
              },
            ),
          ),
      ]),
    );
  }
}
