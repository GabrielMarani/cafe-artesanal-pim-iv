import 'dart:async';

import 'package:flutter/material.dart';

import '../api/cliente_api.dart';
import '../api/modelos.dart';
import '../api/servicos_api.dart';
import '../core/formatos.dart';
import '../core/tema.dart';
import '../widgets/componentes.dart';

/// Acompanhamento de um pedido: etapas, itens, linha do tempo e ações.
/// O status é atualizado sozinho a cada 15 segundos até o pedido ser finalizado.
class PedidoTela extends StatefulWidget {
  const PedidoTela({super.key, required this.pedidoId, this.recemCriado = false});

  final int pedidoId;
  final bool recemCriado;

  @override
  State<PedidoTela> createState() => _PedidoTelaState();
}

class _PedidoTelaState extends State<PedidoTela> {
  Pedido? _pedido;
  String? _erro;
  bool _enviando = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _carregar();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _carregar());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _carregar() async {
    try {
      final pedido = await ServicosApi.pedido(widget.pedidoId);
      if (!mounted) return;
      setState(() {
        _pedido = pedido;
        _erro = null;
      });
      if (pedido.status.finalizado) _timer?.cancel();
    } on ErroApi catch (e) {
      if (mounted) setState(() => _erro = e.mensagem);
    }
  }

  Future<void> _executar(Future<Pedido> Function() acao, String sucesso) async {
    setState(() => _enviando = true);
    try {
      final atualizado = await acao();
      if (!mounted) return;
      setState(() => _pedido = atualizado);
      if (atualizado.status.finalizado) _timer?.cancel();
      mostrarAviso(context, sucesso);
    } on ErroApi catch (e) {
      if (mounted) mostrarAviso(context, e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _pedido;
    final tema = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(p == null ? 'Pedido' : 'Pedido ${p.numero}')),
      body: p == null
          ? (_erro == null ? const Carregando() : BannerOffline(_erro!))
          : ListView(padding: const EdgeInsets.all(16), children: [
              if (widget.recemCriado)
                Semantics(
                  liveRegion: true,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFE3F1E3), borderRadius: BorderRadius.circular(10)),
                    child: const Text('Pedido enviado! Acompanhe cada etapa por aqui.',
                        style: TextStyle(color: Color(0xFF2E6B30), fontWeight: FontWeight.w700)),
                  ),
                ),
              if (_erro != null) const BannerOffline('Sem conexão: mostrando a última atualização.'),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text('Pedido ${p.numero}', style: tema.textTheme.titleLarge)),
                      SeloStatus(p.status, rotulo: p.statusRotulo),
                    ]),
                    Text(formatarData(p.dataPedido)),
                    const SizedBox(height: 12),
                    if (p.status == StatusPedido.cancelado)
                      Text('Cancelado${p.motivoCancelamento == null ? '' : ': ${p.motivoCancelamento}'}',
                          style: TextStyle(color: tema.colorScheme.error))
                    else
                      _Etapas(pedido: p),
                  ]),
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Semantics(header: true, child: Text('Itens', style: tema.textTheme.titleMedium)),
                    const SizedBox(height: 8),
                    for (final i in p.itens) LinhaValor('${i.quantidade}× ${i.nomeProduto}', i.subtotal),
                    const Divider(),
                    LinhaValor('Taxa de entrega', p.taxaEntrega, gratisQuandoZero: true),
                    LinhaValor('Total', p.total, destaque: true),
                    const SizedBox(height: 8),
                    Text('Pagamento: ${p.formaPagamentoRotulo} '
                        '(${p.tipoEntrega == TipoEntrega.entrega ? 'na entrega' : 'na retirada'})'),
                    if (p.enderecoEntrega != null) Text('Entrega em: ${p.enderecoEntrega}'),
                    if (p.observacao != null) Text('Observação: ${p.observacao}'),
                  ]),
                ),
              ),
              if (p.historico.isNotEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Semantics(header: true, child: Text('Linha do tempo', style: tema.textTheme.titleMedium)),
                      const SizedBox(height: 8),
                      for (final h in p.historico)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(h.rotulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${formatarData(h.data)}${h.responsavel == null ? '' : ' · ${h.responsavel}'}',
                                style: tema.textTheme.bodySmall),
                          ]),
                        ),
                    ]),
                  ),
                ),
              if (p.podeConfirmarRecebimento)
                FilledButton.icon(
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Confirmar que recebi'),
                  onPressed: _enviando
                      ? null
                      : () async {
                          if (await confirmar(context,
                              titulo: 'Confirmar recebimento', mensagem: 'Você recebeu o pedido ${p.numero}?', confirmar: 'Sim, recebi')) {
                            _executar(() => ServicosApi.confirmarRecebimento(p.id), 'Obrigado! Bom café ☕');
                          }
                        },
                ),
              if (p.podeCancelar) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: tema.colorScheme.error),
                  icon: const Icon(Icons.cancel_outlined),
                  label: const Text('Cancelar pedido'),
                  onPressed: _enviando
                      ? null
                      : () async {
                          if (await confirmar(context,
                              titulo: 'Cancelar pedido',
                              mensagem: 'Os itens voltam para o estoque. Deseja cancelar?',
                              confirmar: 'Cancelar pedido',
                              destrutivo: true)) {
                            _executar(() => ServicosApi.cancelarPedido(p.id), 'Pedido cancelado.');
                          }
                        },
                ),
              ],
            ]),
    );
  }
}

/// Etapas do pedido com o progresso atual (lido como "Etapa 2 de 5" pelo leitor de tela).
class _Etapas extends StatelessWidget {
  const _Etapas({required this.pedido});

  final Pedido pedido;

  @override
  Widget build(BuildContext context) {
    final etapas = pedido.tipoEntrega.etapas;
    final atual = etapas.indexOf(pedido.status);
    return Semantics(
      label: 'Etapa ${atual + 1} de ${etapas.length}: ${pedido.status.rotulo}',
      excludeSemantics: true,
      child: Column(children: [
        for (final (i, etapa) in etapas.indexed)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              Icon(i <= atual ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: i <= atual ? TemaCafe.sucesso(context) : Theme.of(context).colorScheme.outlineVariant),
              const SizedBox(width: 12),
              Text(etapa.rotulo, style: TextStyle(fontWeight: i == atual ? FontWeight.w800 : FontWeight.w400)),
            ]),
          ),
      ]),
    );
  }
}
