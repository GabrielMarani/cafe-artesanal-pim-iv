using CafeArtesanal.Application.Comum;
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
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflitoException("Este registro acabou de ser alterado por outra pessoa. Atualize a tela e tente de novo.");
        }
        catch (DbUpdateException ex) when (TradutorErroBanco.Traduzir(ex) is { } traduzida)
        {
            throw traduzida;
        }
    }
}
