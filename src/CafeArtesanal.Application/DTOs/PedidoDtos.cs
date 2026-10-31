using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.Validacao;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.DTOs;

public sealed class CriarPedidoRequest
{
    [Required(ErrorMessage = "Informe os itens do pedido.")]
    [MinLength(1, ErrorMessage = "O pedido deve conter pelo menos um item.")]
    [MaxLength(Pedido.MaximoItensDistintos, ErrorMessage = "Itens demais no pedido.")]
    public List<ItemPedidoRequest> Itens { get; init; } = new();

    public TipoEntrega TipoEntrega { get; init; } = TipoEntrega.Retirada;
    public FormaPagamento FormaPagamento { get; init; } = FormaPagamento.Pix;

    /// <summary>Obrigatório quando TipoEntrega = entrega (endereço salvo do cliente).</summary>
    public int? EnderecoId { get; init; }

    [StringLength(300)]
    public string? Observacao { get; init; }
}

public sealed class ItemPedidoRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Produto inválido.")]
    public int ProdutoId { get; init; }

    [Range(1, ItemPedido.QuantidadeMaxima, ErrorMessage = "Quantidade deve estar entre 1 e 99.")]
    public int Quantidade { get; init; }
}

public sealed class AlterarStatusPedidoRequest
{
    [Required(ErrorMessage = "Informe o novo status.")]
    [CodigoEnum<StatusPedido>]
    public string Status { get; init; } = string.Empty;

    /// <summary>Obrigatório ao cancelar.</summary>
    [StringLength(255)]
    public string? Motivo { get; init; }
}

public sealed class CancelarPedidoRequest
{
    [StringLength(255)]
    public string? Motivo { get; init; }
}

public sealed class FiltroPedidos : FiltroPaginado
{
    /// <summary>Código do status (ex.: "pendente") ou "abertos" para todos os não finalizados.</summary>
    public string? Status { get; set; }
    public DateTime? DataInicio { get; set; }
    public DateTime? DataFim { get; set; }

    /// <summary>Número do pedido ou nome do cliente (somente equipe).</summary>
    public string? Busca { get; set; }
}

public sealed record ItemPedidoDto(
    int ProdutoId,
    string NomeProduto,
    string? ImagemUrl,
    int Quantidade,
    decimal ValorUnitario,
    decimal Subtotal);

public sealed record HistoricoStatusDto(
    StatusPedido? StatusAnterior,
    StatusPedido StatusNovo,
    string Rotulo,
    string? Responsavel,
    string? Observacao,
    DateTime Data);

public sealed record ClientePedidoDto(int Id, string Nome, string? Telefone);

/// <summary>O que o usuário atual pode fazer com o pedido (a interface usa para exibir botões).</summary>
public sealed record AcoesPedidoDto(
    bool PodeCancelar,
    bool PodeConfirmarRecebimento,
    IReadOnlyList<StatusPedido> ProximosStatus,
    StatusPedido? ProximaEtapa);

public sealed record PedidoDto(
    int Id,
    string Numero,
    DateTime DataPedido,
    DateTime DataAtualizacao,
    StatusPedido Status,
    string StatusRotulo,
    TipoEntrega TipoEntrega,
    FormaPagamento FormaPagamento,
    string FormaPagamentoRotulo,
    decimal Subtotal,
    decimal TaxaEntrega,
    decimal Total,
    string? EnderecoEntrega,
    string? Observacao,
    string? MotivoCancelamento,
    ClientePedidoDto? Cliente,
    IReadOnlyList<ItemPedidoDto> Itens,
    IReadOnlyList<HistoricoStatusDto> Historico,
    AcoesPedidoDto Acoes);
