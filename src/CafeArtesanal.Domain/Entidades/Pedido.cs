using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Domain.Entidades;

/// <summary>
/// Agregado Pedido: concentra as regras de montagem, totais e o fluxo de status.
/// </summary>
public class Pedido : Entidade
{
    public const int MaximoItensDistintos = 30;

    // Máquina de estados: de qual status é possível ir para qual.
    private static readonly IReadOnlyDictionary<StatusPedido, StatusPedido[]> Transicoes =
        new Dictionary<StatusPedido, StatusPedido[]>
        {
            [StatusPedido.Pendente]        = [StatusPedido.EmPreparo, StatusPedido.Cancelado],
            [StatusPedido.EmPreparo]       = [StatusPedido.Pronto, StatusPedido.Cancelado],
            [StatusPedido.Pronto]          = [StatusPedido.SaiuParaEntrega, StatusPedido.Entregue, StatusPedido.Cancelado],
            [StatusPedido.SaiuParaEntrega] = [StatusPedido.Entregue],
            [StatusPedido.Entregue]        = [],
            [StatusPedido.Cancelado]       = []
        };

    public int? UsuarioId { get; private set; }
    public Usuario? Usuario { get; private set; }
    public StatusPedido Status { get; private set; } = StatusPedido.Pendente;
    public TipoEntrega TipoEntrega { get; private set; }
    public FormaPagamento FormaPagamento { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal TaxaEntrega { get; private set; }
    public decimal Total { get; private set; }
    public string? EnderecoEntrega { get; private set; }
    public string? Observacao { get; private set; }
    public string? MotivoCancelamento { get; private set; }

    /// <summary>Lido pelo trigger para registrar quem alterou o status.</summary>
    public int? UsuarioAtualizacaoId { get; private set; }
    public DateTime DataPedido { get; private set; }
    public DateTime DataAtualizacao { get; private set; }

    private readonly List<ItemPedido> _itens = new();
    public IReadOnlyCollection<ItemPedido> Itens => _itens;

    private readonly List<HistoricoStatusPedido> _historico = new();
    public IReadOnlyCollection<HistoricoStatusPedido> Historico => _historico;

    public bool EstaFinalizado => Status is StatusPedido.Entregue or StatusPedido.Cancelado;

    protected Pedido() { } // EF Core

    public static Pedido Criar(int usuarioId, TipoEntrega tipoEntrega, FormaPagamento formaPagamento,
        string? enderecoEntrega, string? observacao, decimal taxaEntrega)
    {
        var endereco = Texto.Opcional(enderecoEntrega, "Endereço de entrega", 400);
        RegraNegocioException.Quando(tipoEntrega == TipoEntrega.Entrega && endereco is null,
            "Informe o endereço para pedidos com entrega.");
        RegraNegocioException.Quando(taxaEntrega < 0, "Taxa de entrega inválida.");

        var agora = Relogio.Agora();
        return new Pedido
        {
            UsuarioId = usuarioId,
            TipoEntrega = tipoEntrega,
            FormaPagamento = formaPagamento,
            EnderecoEntrega = tipoEntrega == TipoEntrega.Entrega ? endereco : null,
            Observacao = Texto.Opcional(observacao, "Observação", 300),
            TaxaEntrega = tipoEntrega == TipoEntrega.Entrega ? taxaEntrega : 0m,
            Total = tipoEntrega == TipoEntrega.Entrega ? taxaEntrega : 0m,
            DataPedido = agora,
            DataAtualizacao = agora
        };
    }

    /// <summary>
    /// Adiciona um produto usando o preço do cadastro. Itens repetidos são somados.
    /// </summary>
    public void AdicionarItem(Produto produto, int quantidade)
    {
        RegraNegocioException.Quando(!EhNova, "Não é possível alterar itens de um pedido já registrado.");
        RegraNegocioException.Quando(!produto.Ativo, $"O produto \"{produto.Nome}\" não está disponível.");

        var existente = _itens.FirstOrDefault(i => i.ProdutoId == produto.Id);
        var quantidadeTotal = (existente?.Quantidade ?? 0) + quantidade;

        RegraNegocioException.Quando(quantidadeTotal > produto.Estoque,
            $"Estoque insuficiente para \"{produto.Nome}\" (disponível: {produto.Estoque}).");

        if (existente is not null)
        {
            existente.DefinirQuantidade(quantidadeTotal);
        }
        else
        {
            RegraNegocioException.Quando(_itens.Count >= MaximoItensDistintos,
                $"O pedido pode ter no máximo {MaximoItensDistintos} produtos diferentes.");
            _itens.Add(new ItemPedido(produto, quantidade));
        }

        RecalcularTotais();
    }

    /// <summary>Garante que o pedido está completo antes de ser gravado.</summary>
    public void ValidarParaRegistro(decimal pedidoMinimo)
    {
        RegraNegocioException.Quando(_itens.Count == 0, "O pedido deve conter pelo menos um item.");
        RegraNegocioException.Quando(Subtotal < pedidoMinimo,
            $"O valor mínimo do pedido é {pedidoMinimo:C}.");
    }

    /// <summary>Próximos status permitidos, considerando o tipo de entrega.</summary>
    public IReadOnlyList<StatusPedido> ProximosStatusPermitidos() =>
        Transicoes[Status].Where(EhCompativelComTipoEntrega).ToList();

    /// <summary>Próxima etapa do fluxo normal (botão "Avançar" do painel).</summary>
    public StatusPedido? ProximaEtapa() =>
        ProximosStatusPermitidos().Where(s => s != StatusPedido.Cancelado).Cast<StatusPedido?>().FirstOrDefault();

    /// <summary>Alteração de status feita pela equipe (atendente/admin).</summary>
    public void AlterarStatus(StatusPedido novoStatus, int usuarioResponsavelId, string? motivoCancelamento = null)
    {
        RegraNegocioException.Quando(EstaFinalizado, "Pedido finalizado não pode ter o status alterado.");
        RegraNegocioException.Quando(novoStatus == Status, "O pedido já está neste status.");
        RegraNegocioException.Quando(!ProximosStatusPermitidos().Contains(novoStatus),
            $"Não é possível mudar de \"{Status.Rotulo()}\" para \"{novoStatus.Rotulo()}\".");

        if (novoStatus == StatusPedido.Cancelado)
        {
            MotivoCancelamento = Texto.Obrigatorio(motivoCancelamento, "Motivo do cancelamento", 255);
        }

        Status = novoStatus;
        UsuarioAtualizacaoId = usuarioResponsavelId;
        DataAtualizacao = Relogio.Agora();
    }

    /// <summary>O próprio cliente só cancela enquanto o pedido não entrou em preparo.</summary>
    public void CancelarPeloCliente(int clienteId, string? motivo)
    {
        GarantirDono(clienteId);
        RegraNegocioException.Quando(Status != StatusPedido.Pendente,
            "Só é possível cancelar pedidos que ainda não começaram a ser preparados.");

        AlterarStatus(StatusPedido.Cancelado, clienteId, Texto.Limpar(motivo) ?? "Cancelado pelo cliente");
    }

    /// <summary>Cliente confirma que recebeu (entrega) ou retirou o pedido.</summary>
    public void ConfirmarRecebimento(int clienteId)
    {
        GarantirDono(clienteId);
        var podeConfirmar = (TipoEntrega == TipoEntrega.Entrega && Status == StatusPedido.SaiuParaEntrega) ||
                            (TipoEntrega == TipoEntrega.Retirada && Status == StatusPedido.Pronto);
        RegraNegocioException.Quando(!podeConfirmar,
            TipoEntrega == TipoEntrega.Entrega
                ? "A confirmação só é possível depois que o pedido sair para entrega."
                : "A confirmação só é possível quando o pedido estiver pronto para retirada.");

        AlterarStatus(StatusPedido.Entregue, clienteId);
    }

    public bool PertenceA(int usuarioId) => UsuarioId == usuarioId;

    private void GarantirDono(int usuarioId) =>
        RegraNegocioException.Quando(!PertenceA(usuarioId), "Este pedido não pertence a você.");

    private bool EhCompativelComTipoEntrega(StatusPedido status) => (TipoEntrega, Status, status) switch
    {
        (TipoEntrega.Retirada, _, StatusPedido.SaiuParaEntrega) => false,
        (TipoEntrega.Entrega, StatusPedido.Pronto, StatusPedido.Entregue) => false,
        _ => true
    };

    private void RecalcularTotais()
    {
        Subtotal = _itens.Sum(i => i.Subtotal);
        Total = Subtotal + TaxaEntrega;
    }
}
