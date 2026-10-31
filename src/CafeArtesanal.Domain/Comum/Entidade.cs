namespace CafeArtesanal.Domain.Comum;

/// <summary>
/// Classe base de todas as entidades: identidade numérica gerada pelo banco.
/// </summary>
public abstract class Entidade
{
    public int Id { get; protected set; }

    /// <summary>Verdadeiro enquanto a entidade ainda não foi persistida.</summary>
    public bool EhNova => Id == 0;
}
