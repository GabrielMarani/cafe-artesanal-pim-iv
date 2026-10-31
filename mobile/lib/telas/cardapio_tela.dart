import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/modelos.dart';
import '../core/formatos.dart';
import '../core/tema.dart';
import '../estado/carrinho_estado.dart';
import '../estado/catalogo_estado.dart';
import '../estado/sessao_estado.dart';
import '../widgets/componentes.dart';
import 'produto_tela.dart';

class CardapioTela extends StatefulWidget {
  const CardapioTela({super.key});

  @override
  State<CardapioTela> createState() => _CardapioTelaState();
}

class _CardapioTelaState extends State<CardapioTela> {
  String _busca = '';
  int? _categoria;

  void _adicionar(Produto produto) {
    final ok = context.read<CarrinhoEstado>().adicionar(produto);
    // O SnackBar é anunciado automaticamente pelo TalkBack/VoiceOver.
    mostrarAviso(context, ok ? '${produto.nome} adicionado ao carrinho.' : 'Não há mais estoque de ${produto.nome}.');
  }

  @override
  Widget build(BuildContext context) {
    final catalogo = context.watch<CatalogoEstado>();
    final usuario = context.watch<SessaoEstado>().usuario;
    final podeComprar = usuario == null || usuario.ehCliente;
    final termo = normalizarBusca(_busca.trim());
    final produtos = catalogo.produtos
        .where((p) =>
            (_categoria == null || p.categoriaId == _categoria) &&
            (termo.isEmpty || normalizarBusca('${p.nome} ${p.descricao ?? ''} ${p.categoriaNome ?? ''}').contains(termo)))
        .toList();

    if (catalogo.produtos.isEmpty && catalogo.sincronizando) {
      return const Carregando(texto: 'Carregando o cardápio...');
    }

    final semConexao = !catalogo.online || catalogo.erro != null;

    return RefreshIndicator(
      onRefresh: catalogo.sincronizar,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          if (semConexao && catalogo.produtos.isNotEmpty)
            const BannerOffline('Sem conexão. Mostrando o cardápio salvo no aparelho.'),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Semantics(
                header: true,
                child: Text(usuario == null ? 'Bem-vindo(a)!' : 'Olá, ${usuario.primeiroNome}!',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              ),
              const Text('O que vai ser hoje?'),
              const SizedBox(height: 12),
              TextField(
                decoration: const InputDecoration(labelText: 'Buscar no cardápio', prefixIcon: Icon(Icons.search)),
                textInputAction: TextInputAction.search,
                onChanged: (v) => setState(() => _busca = v),
              ),
            ]),
          ),
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                for (final (id, nome) in [(null, 'Todas'), ...catalogo.categorias.map((c) => (c.id, c.nome))])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(nome),
                      selected: _categoria == id,
                      onSelected: (_) => setState(() => _categoria = id),
                    ),
                  ),
              ],
            ),
          ),
          if (produtos.isEmpty)
            semConexao && catalogo.produtos.isEmpty
                ? EstadoVazio(icone: Icons.cloud_off, titulo: 'Não foi possível carregar', texto: catalogo.erro)
                : const EstadoVazio(icone: Icons.search_off, titulo: 'Nada encontrado', texto: 'Tente outra palavra ou categoria.')
          else
            for (final produto in produtos)
              _CartaoProduto(
                produto: produto,
                aoAdicionar: podeComprar ? () => _adicionar(produto) : null,
              ),
          if (catalogo.ultimaSincronizacao != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Cardápio sincronizado em ${formatarData(DateTime.parse(catalogo.ultimaSincronizacao!))}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }
}

class _CartaoProduto extends StatelessWidget {
  const _CartaoProduto({required this.produto, this.aoAdicionar});

  final Produto produto;
  final VoidCallback? aoAdicionar;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    final p = produto;
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      clipBehavior: Clip.antiAlias,
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        // Área que abre os detalhes; o botão "+" fica ao lado (botões não ficam aninhados).
        Expanded(
          child: Semantics(
            button: true,
            label: '${p.nome}, ${formatarMoeda(p.preco)}${p.disponivel ? '' : ', esgotado'}',
            hint: 'Abre os detalhes do produto',
            excludeSemantics: true,
            child: InkWell(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProdutoTela(produtoId: p.id))),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ImagemProduto(p.imagemUrl, largura: 110, altura: 120),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text((p.categoriaNome ?? '').toUpperCase(),
                          style: tema.textTheme.labelSmall?.copyWith(color: TemaCafe.destaqueTexto, fontWeight: FontWeight.w700)),
                      Text(p.nome, maxLines: 2, overflow: TextOverflow.ellipsis,
                          style: tema.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Wrap(spacing: 6, runSpacing: 4, children: [
                        if (p.destaque) const Selo('Destaque', fundo: TemaCafe.caramelo, cor: Color(0xFF1F1A17)),
                        if (!p.disponivel)
                          const Selo('Esgotado', fundo: Color(0xFFFBE7E5), cor: Color(0xFFA8231B))
                        else if (p.ultimasUnidades)
                          Selo('Últimas ${p.estoque}', fundo: const Color(0xFFFFF1D6), cor: const Color(0xFF7A4F00)),
                      ]),
                      const SizedBox(height: 8),
                      Text(formatarMoeda(p.preco),
                          style: tema.textTheme.titleMedium?.copyWith(color: tema.colorScheme.primary, fontWeight: FontWeight.w800)),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
        ),
        if (aoAdicionar != null)
          Padding(
            padding: const EdgeInsets.all(8),
            child: IconButton.filled(
              onPressed: p.disponivel ? aoAdicionar : null,
              icon: const Icon(Icons.add),
              tooltip: 'Adicionar ${p.nome} ao carrinho',
            ),
          ),
      ]),
    );
  }
}
