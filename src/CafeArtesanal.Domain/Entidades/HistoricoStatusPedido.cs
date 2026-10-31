using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Domain.Entidades;

/// <summary>
/// Linha do tempo do pedido. Os registros são criados pelos triggers
/// trg_pedido_ai / trg_pedido_au do banco — a aplicação apenas lê.
/// </summary>
public class HistoricoStatusPedido : Entidade
{
    public int PedidoId { get; private set; }
    public StatusPedido? StatusAnterior { get; private set; }
    public StatusPedido StatusNovo { get; private set; }
    public int? UsuarioId { get; private set; }
    public Usuario? Usuario { get; private set; }
    public string? Observacao { get; private set; }
    public DateTime DataAlteracao { get; private set; }

    protected HistoricoStatusPedido() { } // EF Core
}
