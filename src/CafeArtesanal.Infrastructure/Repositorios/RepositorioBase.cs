using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Repositorios;

public abstract class RepositorioBase<T>(CafeDbContext contexto) : IRepositorio<T> where T : Entidade
{
    protected CafeDbContext Contexto { get; } = contexto;
    protected DbSet<T> Conjunto => Contexto.Set<T>();

    public virtual async Task<T?> ObterPorIdAsync(int id, CancellationToken ct = default) =>
        await Conjunto.FindAsync([id], ct);

    public void Adicionar(T entidade) => Conjunto.Add(entidade);

    public void Remover(T entidade) => Conjunto.Remove(entidade);

    /// <summary>Monta um padrão LIKE seguro (escapa %, _ e \ digitados pelo usuário).</summary>
    protected static string PadraoContem(string termo) =>
        "%" + termo.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}
