using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Tests;

internal static class AuxiliarTeste
{
    /// <summary>Simula o Id gerado pelo banco (o setter é protegido no domínio).</summary>
    public static T DefinirId<T>(T entidade, int id) where T : Entidade
    {
        typeof(Entidade).GetProperty(nameof(Entidade.Id))!.SetValue(entidade, id);
        return entidade;
    }
}
