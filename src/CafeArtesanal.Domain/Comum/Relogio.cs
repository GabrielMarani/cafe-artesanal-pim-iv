namespace CafeArtesanal.Domain.Comum;

/// <summary>
/// Fonte única de data/hora do domínio. As datas são gravadas no horário local
/// (o mesmo usado pelo CURRENT_TIMESTAMP do banco). Pode ser trocada nos testes.
/// </summary>
public static class Relogio
{
    public static Func<DateTime> Agora { get; set; } = () => DateTime.Now;
}
