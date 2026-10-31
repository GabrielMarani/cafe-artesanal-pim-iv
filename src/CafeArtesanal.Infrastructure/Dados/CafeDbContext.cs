using CafeArtesanal.Domain.Entidades;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Dados;

/// <summary>
/// Contexto do EF Core. O esquema é definido pelo script database/bd_cafe_artesanal.sql
/// (tabelas, triggers e procedures); aqui só mapeamos as entidades para ele.
/// </summary>
public sealed class CafeDbContext(DbContextOptions<CafeDbContext> options) : DbContext(options)
{
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Endereco> Enderecos => Set<Endereco>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<ItemPedido> ItensPedido => Set<ItemPedido>();
    public DbSet<HistoricoStatusPedido> HistoricoStatus => Set<HistoricoStatusPedido>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CafeDbContext).Assembly);
}
