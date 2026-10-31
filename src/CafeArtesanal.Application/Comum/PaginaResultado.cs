namespace CafeArtesanal.Application.Comum;

/// <summary>Resultado paginado devolvido pelas listagens da API.</summary>
public sealed record PaginaResultado<T>(IReadOnlyList<T> Itens, int Pagina, int TamanhoPagina, int TotalItens)
{
    public int TotalPaginas => TamanhoPagina <= 0 ? 0 : (int)Math.Ceiling(TotalItens / (double)TamanhoPagina);

    public PaginaResultado<TDestino> Mapear<TDestino>(Func<T, TDestino> conversor) =>
        new(Itens.Select(conversor).ToList(), Pagina, TamanhoPagina, TotalItens);
}

/// <summary>Parâmetros comuns de paginação (com limites de segurança).</summary>
public abstract class FiltroPaginado
{
    public const int TamanhoMaximo = 100;

    private int _pagina = 1;
    private int _tamanhoPagina = 20;

    public int Pagina
    {
        get => _pagina;
        set => _pagina = Math.Max(1, value);
    }

    public int TamanhoPagina
    {
        get => _tamanhoPagina;
        set => _tamanhoPagina = Math.Clamp(value, 1, TamanhoMaximo);
    }

    public int Saltar => (Pagina - 1) * TamanhoPagina;
}
