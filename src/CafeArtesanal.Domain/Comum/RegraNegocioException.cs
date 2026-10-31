namespace CafeArtesanal.Domain.Comum;

/// <summary>
/// Lançada quando uma regra de negócio do domínio é violada
/// (ex.: cancelar um pedido já entregue). A API devolve HTTP 422.
/// </summary>
public class RegraNegocioException : Exception
{
    public RegraNegocioException(string mensagem) : base(mensagem) { }

    /// <summary>Lança a exceção quando a condição for verdadeira.</summary>
    public static void Quando(bool condicao, string mensagem)
    {
        if (condicao) throw new RegraNegocioException(mensagem);
    }
}
