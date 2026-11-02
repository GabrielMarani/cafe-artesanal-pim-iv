import 'package:flutter/material.dart';

import '../api/modelos.dart';
import '../core/formatos.dart';
import '../core/tema.dart';

/// Selo colorido com o status do pedido.
class SeloStatus extends StatelessWidget {
  const SeloStatus(this.status, {super.key, this.rotulo});

  final StatusPedido status;
  final String? rotulo;

  @override
  Widget build(BuildContext context) {
    final (fundo, texto) = TemaCafe.corStatus(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: fundo, borderRadius: BorderRadius.circular(99)),
      child: Text(rotulo ?? status.rotulo, style: TextStyle(color: texto, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

/// Selo simples (destaque, esgotado, últimas unidades).
class Selo extends StatelessWidget {
  const Selo(this.texto, {super.key, this.fundo, this.cor});

  final String texto;
  final Color? fundo;
  final Color? cor;

  @override
  Widget build(BuildContext context) {
    final esquema = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: fundo ?? esquema.secondaryContainer, borderRadius: BorderRadius.circular(99)),
      child: Text(texto,
          style: TextStyle(color: cor ?? esquema.onSecondaryContainer, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

/// Imagem do produto com reserva quando a URL falha ou não existe.
class ImagemProduto extends StatelessWidget {
  const ImagemProduto(this.url, {super.key, this.largura, this.altura, this.raio = 0});

  final String? url;
  final double? largura;
  final double? altura;
  final double raio;

  @override
  Widget build(BuildContext context) {
    final reserva = Container(
      width: largura,
      height: altura,
      color: TemaCafe.bege,
      alignment: Alignment.center,
      child: const Icon(Icons.coffee_outlined, color: TemaCafe.destaqueTexto, size: 36),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(raio),
      child: url == null
          ? reserva
          : Image.network(url!, width: largura, height: altura, fit: BoxFit.cover,
              excludeFromSemantics: true, errorBuilder: (_, _, _) => reserva),
    );
  }
}

class Carregando extends StatelessWidget {
  const Carregando({super.key, this.texto = 'Carregando...'});

  final String texto;

  @override
  Widget build(BuildContext context) => Center(
        child: Semantics(
          liveRegion: true,
          label: texto,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(texto),
          ]),
        ),
      );
}

class EstadoVazio extends StatelessWidget {
  const EstadoVazio({super.key, required this.icone, required this.titulo, this.texto, this.acao});

  final IconData icone;
  final String titulo;
  final String? texto;
  final Widget? acao;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icone, size: 56, color: tema.colorScheme.outline),
          const SizedBox(height: 12),
          Semantics(header: true, child: Text(titulo, style: tema.textTheme.titleLarge, textAlign: TextAlign.center)),
          if (texto != null) ...[
            const SizedBox(height: 8),
            Text(texto!, textAlign: TextAlign.center, style: TextStyle(color: tema.colorScheme.onSurfaceVariant)),
          ],
          if (acao != null) ...[const SizedBox(height: 20), acao!],
        ]),
      ),
    );
  }
}

/// Faixa de aviso quando o app está sem conexão com a API.
class BannerOffline extends StatelessWidget {
  const BannerOffline(this.mensagem, {super.key});

  final String mensagem;

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1D6),
            border: Border.all(color: const Color(0xFF7A4F00)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(children: [
            const Icon(Icons.cloud_off_outlined, color: Color(0xFF7A4F00)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(mensagem, style: const TextStyle(color: Color(0xFF7A4F00), fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
      );
}

/// Seletor de quantidade com botões de 48 dp e rótulos para leitor de tela.
class SeletorQuantidade extends StatelessWidget {
  const SeletorQuantidade({super.key, required this.valor, required this.maximo, required this.nome, required this.aoMudar});

  final int valor;
  final int maximo;
  final String nome;
  final ValueChanged<int> aoMudar;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton.filledTonal(
          onPressed: () => aoMudar(valor - 1),
          icon: Icon(valor == 1 ? Icons.delete_outline : Icons.remove),
          tooltip: valor == 1 ? 'Remover $nome' : 'Diminuir quantidade de $nome',
        ),
        Semantics(
          label: 'Quantidade de $nome: $valor',
          excludeSemantics: true,
          child: SizedBox(
            width: 36,
            child: Text('$valor', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
        IconButton.filledTonal(
          onPressed: valor >= maximo ? null : () => aoMudar(valor + 1),
          icon: const Icon(Icons.add),
          tooltip: 'Aumentar quantidade de $nome',
        ),
      ]);
}

/// Linha "rótulo .......... valor" usada em resumos de valores.
class LinhaValor extends StatelessWidget {
  const LinhaValor(this.rotulo, this.valor, {super.key, this.destaque = false, this.gratisQuandoZero = false});

  final String rotulo;
  final num valor;
  final bool destaque;

  /// Mostra "Grátis" em vez de R$ 0,00 (taxa de entrega na retirada).
  final bool gratisQuandoZero;

  @override
  Widget build(BuildContext context) {
    final estilo = destaque
        ? TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Theme.of(context).colorScheme.primary)
        : null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(rotulo, style: destaque ? const TextStyle(fontWeight: FontWeight.w800) : null),
        Text(valor == 0 && gratisQuandoZero ? 'Grátis' : formatarMoeda(valor), style: estilo),
      ]),
    );
  }
}

void mostrarAviso(BuildContext context, String mensagem) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(mensagem), behavior: SnackBarBehavior.floating));
}

Future<bool> confirmar(BuildContext context,
    {required String titulo, required String mensagem, String confirmar = 'Confirmar', bool destrutivo = false}) async {
  final resposta = await showDialog<bool>(
    context: context,
    builder: (contexto) => AlertDialog(
      title: Text(titulo),
      content: Text(mensagem),
      actions: [
        TextButton(onPressed: () => Navigator.pop(contexto, false), child: const Text('Voltar')),
        FilledButton(
          // O tema usa botões de largura total; no diálogo eles ficam lado a lado.
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 48),
            backgroundColor: destrutivo ? Theme.of(contexto).colorScheme.error : null,
          ),
          onPressed: () => Navigator.pop(contexto, true),
          child: Text(confirmar),
        ),
      ],
    ),
  );
  return resposta ?? false;
}
