namespace CafeArtesanal.Domain.Enums;

/// <summary>Textos amigáveis exibidos ao usuário.</summary>
public static class EnumRotulos
{
    public static string Rotulo(this StatusPedido status) => status switch
    {
        StatusPedido.Pendente        => "Pendente",
        StatusPedido.EmPreparo       => "Em preparo",
        StatusPedido.Pronto          => "Pronto",
        StatusPedido.SaiuParaEntrega => "Saiu para entrega",
        StatusPedido.Entregue        => "Entregue",
        StatusPedido.Cancelado       => "Cancelado",
        _ => status.ToString()
    };

    public static string Rotulo(this FormaPagamento forma) => forma switch
    {
        FormaPagamento.Pix           => "Pix",
        FormaPagamento.CartaoCredito => "Cartão de crédito",
        FormaPagamento.CartaoDebito  => "Cartão de débito",
        FormaPagamento.Dinheiro      => "Dinheiro",
        _ => forma.ToString()
    };

    public static string Rotulo(this PerfilUsuario perfil) => perfil switch
    {
        PerfilUsuario.Cliente   => "Cliente",
        PerfilUsuario.Atendente => "Atendente",
        PerfilUsuario.Admin     => "Administrador",
        _ => perfil.ToString()
    };
}
