// Modelos que espelham os DTOs da API REST (CafeArtesanal.Application.DTOs).
// Os enums usam os mesmos códigos snake_case da API e do banco.

double _decimal(dynamic v) => (v as num).toDouble();
DateTime _data(dynamic v) => DateTime.parse(v as String);

enum StatusPedido {
  pendente('pendente', 'Pendente'),
  emPreparo('em_preparo', 'Em preparo'),
  pronto('pronto', 'Pronto'),
  saiuParaEntrega('saiu_para_entrega', 'Saiu para entrega'),
  entregue('entregue', 'Entregue'),
  cancelado('cancelado', 'Cancelado');

  const StatusPedido(this.codigo, this.rotulo);
  final String codigo;
  final String rotulo;

  static StatusPedido deCodigo(String codigo) => values.firstWhere((s) => s.codigo == codigo);
}

enum TipoEntrega {
  entrega('entrega'),
  retirada('retirada');

  const TipoEntrega(this.codigo);
  final String codigo;

  static TipoEntrega deCodigo(String codigo) => values.firstWhere((t) => t.codigo == codigo);

  /// Etapas exibidas no acompanhamento do pedido.
  List<StatusPedido> get etapas => this == entrega
      ? const [StatusPedido.pendente, StatusPedido.emPreparo, StatusPedido.pronto, StatusPedido.saiuParaEntrega, StatusPedido.entregue]
      : const [StatusPedido.pendente, StatusPedido.emPreparo, StatusPedido.pronto, StatusPedido.entregue];
}

enum FormaPagamento {
  pix('pix', 'Pix'),
  cartaoCredito('cartao_credito', 'Cartão de crédito'),
  cartaoDebito('cartao_debito', 'Cartão de débito'),
  dinheiro('dinheiro', 'Dinheiro');

  const FormaPagamento(this.codigo, this.rotulo);
  final String codigo;
  final String rotulo;
}

class Usuario {
  Usuario({
    required this.id,
    required this.nome,
    required this.nomeSocial,
    required this.nomeExibicao,
    required this.cpf,
    required this.email,
    required this.telefone,
    required this.perfil,
  });

  final int id;
  final String nome;
  final String? nomeSocial;
  final String nomeExibicao;
  final String cpf;
  final String? email;
  final String? telefone;
  final String perfil;

  bool get ehCliente => perfil == 'cliente';
  String get primeiroNome => nomeExibicao.split(' ').first;

  factory Usuario.fromJson(Map<String, dynamic> j) => Usuario(
        id: j['id'] as int,
        nome: j['nome'] as String,
        nomeSocial: j['nomeSocial'] as String?,
        nomeExibicao: j['nomeExibicao'] as String,
        cpf: j['cpf'] as String,
        email: j['email'] as String?,
        telefone: j['telefone'] as String?,
        perfil: j['perfil'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'nomeSocial': nomeSocial,
        'nomeExibicao': nomeExibicao,
        'cpf': cpf,
        'email': email,
        'telefone': telefone,
        'perfil': perfil,
      };
}

class Sessao {
  Sessao({required this.accessToken, required this.refreshToken, required this.usuario});

  final String accessToken;
  final String refreshToken;
  final Usuario usuario;

  factory Sessao.fromJson(Map<String, dynamic> j) => Sessao(
        accessToken: j['accessToken'] as String,
        refreshToken: j['refreshToken'] as String,
        usuario: Usuario.fromJson(j['usuario'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() =>
      {'accessToken': accessToken, 'refreshToken': refreshToken, 'usuario': usuario.toJson()};
}

class Categoria {
  Categoria({required this.id, required this.nome, required this.ordemExibicao, required this.ativo, required this.json});

  final int id;
  final String nome;
  final int ordemExibicao;
  final bool ativo;

  /// JSON original, guardado para o cache offline.
  final Map<String, dynamic> json;

  factory Categoria.fromJson(Map<String, dynamic> j) => Categoria(
        id: j['id'] as int,
        nome: j['nome'] as String,
        ordemExibicao: j['ordemExibicao'] as int,
        ativo: j['ativo'] as bool,
        json: j,
      );
}

class Produto {
  Produto({
    required this.id,
    required this.nome,
    required this.descricao,
    required this.imagemUrl,
    required this.preco,
    required this.categoriaId,
    required this.categoriaNome,
    required this.estoque,
    required this.disponivel,
    required this.destaque,
    required this.ativo,
    required this.json,
  });

  final int id;
  final String nome;
  final String? descricao;
  final String? imagemUrl;
  final double preco;
  final int? categoriaId;
  final String? categoriaNome;
  final int estoque;
  final bool disponivel;
  final bool destaque;
  final bool ativo;
  final Map<String, dynamic> json;

  bool get ultimasUnidades => disponivel && estoque <= 5;

  factory Produto.fromJson(Map<String, dynamic> j) => Produto(
        id: j['id'] as int,
        nome: j['nome'] as String,
        descricao: j['descricao'] as String?,
        imagemUrl: j['imagemUrl'] as String?,
        preco: _decimal(j['preco']),
        categoriaId: j['categoriaId'] as int?,
        categoriaNome: j['categoriaNome'] as String?,
        estoque: j['estoque'] as int,
        disponivel: j['disponivel'] as bool,
        destaque: j['destaque'] as bool,
        ativo: j['ativo'] as bool,
        json: j,
      );
}

class CatalogoSync {
  CatalogoSync({required this.servidorEm, required this.completo, required this.categorias, required this.produtos});

  final String servidorEm;
  final bool completo;
  final List<Categoria> categorias;
  final List<Produto> produtos;

  factory CatalogoSync.fromJson(Map<String, dynamic> j) => CatalogoSync(
        servidorEm: j['servidorEm'] as String,
        completo: j['completo'] as bool,
        categorias: (j['categorias'] as List).map((c) => Categoria.fromJson(c as Map<String, dynamic>)).toList(),
        produtos: (j['produtos'] as List).map((p) => Produto.fromJson(p as Map<String, dynamic>)).toList(),
      );
}

class Loja {
  Loja({required this.nome, required this.taxaEntrega, required this.pedidoMinimo, required this.json});

  final String nome;
  final double taxaEntrega;
  final double pedidoMinimo;
  final Map<String, dynamic> json;

  factory Loja.fromJson(Map<String, dynamic> j) => Loja(
        nome: j['nome'] as String,
        taxaEntrega: _decimal(j['taxaEntrega']),
        pedidoMinimo: _decimal(j['pedidoMinimo']),
        json: j,
      );
}

class Endereco {
  Endereco({required this.id, required this.apelido, required this.principal, required this.descricao});

  final int id;
  final String apelido;
  final bool principal;
  final String descricao;

  factory Endereco.fromJson(Map<String, dynamic> j) => Endereco(
        id: j['id'] as int,
        apelido: j['apelido'] as String,
        principal: j['principal'] as bool,
        descricao: j['descricao'] as String,
      );
}

class ItemPedido {
  ItemPedido({required this.produtoId, required this.nomeProduto, required this.quantidade, required this.subtotal});

  final int produtoId;
  final String nomeProduto;
  final int quantidade;
  final double subtotal;

  factory ItemPedido.fromJson(Map<String, dynamic> j) => ItemPedido(
        produtoId: j['produtoId'] as int,
        nomeProduto: j['nomeProduto'] as String,
        quantidade: j['quantidade'] as int,
        subtotal: _decimal(j['subtotal']),
      );
}

class HistoricoStatus {
  HistoricoStatus({required this.rotulo, required this.responsavel, required this.data});

  final String rotulo;
  final String? responsavel;
  final DateTime data;

  factory HistoricoStatus.fromJson(Map<String, dynamic> j) => HistoricoStatus(
        rotulo: j['rotulo'] as String,
        responsavel: j['responsavel'] as String?,
        data: _data(j['data']),
      );
}

class Pedido {
  Pedido({
    required this.id,
    required this.numero,
    required this.dataPedido,
    required this.status,
    required this.statusRotulo,
    required this.tipoEntrega,
    required this.formaPagamentoRotulo,
    required this.subtotal,
    required this.taxaEntrega,
    required this.total,
    required this.enderecoEntrega,
    required this.observacao,
    required this.motivoCancelamento,
    required this.itens,
    required this.historico,
    required this.podeCancelar,
    required this.podeConfirmarRecebimento,
  });

  final int id;
  final String numero;
  final DateTime dataPedido;
  final StatusPedido status;
  final String statusRotulo;
  final TipoEntrega tipoEntrega;
  final String formaPagamentoRotulo;
  final double subtotal;
  final double taxaEntrega;
  final double total;
  final String? enderecoEntrega;
  final String? observacao;
  final String? motivoCancelamento;
  final List<ItemPedido> itens;
  final List<HistoricoStatus> historico;
  final bool podeCancelar;
  final bool podeConfirmarRecebimento;

  factory Pedido.fromJson(Map<String, dynamic> j) {
    final acoes = j['acoes'] as Map<String, dynamic>;
    return Pedido(
      id: j['id'] as int,
      numero: j['numero'] as String,
      dataPedido: _data(j['dataPedido']),
      status: StatusPedido.deCodigo(j['status'] as String),
      statusRotulo: j['statusRotulo'] as String,
      tipoEntrega: TipoEntrega.deCodigo(j['tipoEntrega'] as String),
      formaPagamentoRotulo: j['formaPagamentoRotulo'] as String,
      subtotal: _decimal(j['subtotal']),
      taxaEntrega: _decimal(j['taxaEntrega']),
      total: _decimal(j['total']),
      enderecoEntrega: j['enderecoEntrega'] as String?,
      observacao: j['observacao'] as String?,
      motivoCancelamento: j['motivoCancelamento'] as String?,
      itens: (j['itens'] as List).map((i) => ItemPedido.fromJson(i as Map<String, dynamic>)).toList(),
      historico: (j['historico'] as List).map((h) => HistoricoStatus.fromJson(h as Map<String, dynamic>)).toList(),
      podeCancelar: acoes['podeCancelar'] as bool,
      podeConfirmarRecebimento: acoes['podeConfirmarRecebimento'] as bool,
    );
  }
}
