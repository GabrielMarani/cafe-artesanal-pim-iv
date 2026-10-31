using CafeArtesanal.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Dados;

public sealed class UnidadeDeTrabalho(CafeDbContext contexto) : IUnidadeDeTrabalho
{
    public async Task SalvarAsync(CancellationToken ct = default)
    {
        try
        {
            await contexto.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (TradutorErroBanco.Traduzir(ex) is { } traduzida)
        {
            throw traduzida;
        }
    }
}
