namespace CafeArtesanal.Domain.Enums;

// Os valores são gravados no banco e trafegados na API em snake_case
// (ex.: StatusPedido.EmPreparo ↔ "em_preparo").

/// <summary>Perfis de acesso (controle de acesso baseado em papéis).</summary>
public enum PerfilUsuario
{
    Cliente,
    Atendente,
    Admin
}

/// <summary>Etapas do ciclo de vida de um pedido.</summary>
public enum StatusPedido
{
    Pendente,
    EmPreparo,
    Pronto,
    SaiuParaEntrega,
    Entregue,
    Cancelado
}

public enum TipoEntrega
{
    Entrega,
    Retirada
}

/// <summary>Pagamento realizado na entrega ou na retirada.</summary>
public enum FormaPagamento
{
    Pix,
    CartaoCredito,
    CartaoDebito,
    Dinheiro
}
