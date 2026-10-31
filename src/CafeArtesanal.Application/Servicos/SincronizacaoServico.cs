using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Application.Servicos;

/// <summary>
/// Sincronização incremental do catálogo para o app mobile (modo offline).
/// O app guarda "servidorEm" e, na próxima vez, pede só o que mudou desde então.
/// </summary>
public interface ISincronizacaoServico
{
    Task<CatalogoSyncDto> CatalogoAsync(DateTime? desde, CancellationToken ct = default);
}

public sealed class SincronizacaoServico(
    ICategoriaRepositorio categorias,
    IProdutoRepositorio produtos) : ISincronizacaoServico
{
    /// <summary>Depois desse tempo sem sincronizar, o app recebe o catálogo completo de novo.</summary>
    private static readonly TimeSpan JanelaIncremental = TimeSpan.FromDays(30);

    public async Task<CatalogoSyncDto> CatalogoAsync(DateTime? desde, CancellationToken ct = default)
    {
        var agora = Relogio.Agora();
        // Precisão de segundos (igual ao DATETIME do banco). Na próxima sincronização o filtro
        // usa ">=", então algo alterado neste mesmo segundo ainda será enviado.
        var servidorEm = new DateTime(agora.Year, agora.Month, agora.Day, agora.Hour, agora.Minute, agora.Second);

        var completo = desde is null || desde > agora || agora - desde > JanelaIncremental;

        var listaCategorias = completo
            ? await categorias.ListarAsync(incluirInativas: false, ct)
            : await categorias.ListarAlteradasDesdeAsync(desde!.Value, ct);

        var listaProdutos = await produtos.ListarParaSincronizacaoAsync(completo ? null : desde, ct);

        return new CatalogoSyncDto(
            servidorEm,
            completo,
            listaCategorias.Select(c => c.ParaDto()).ToList(),
            listaProdutos.Select(p => p.ParaDto()).ToList());
    }
}
