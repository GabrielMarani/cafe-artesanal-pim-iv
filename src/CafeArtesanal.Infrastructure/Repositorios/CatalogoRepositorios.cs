using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Repositorios;

public sealed class CategoriaRepositorio(CafeDbContext contexto) : RepositorioBase<Categoria>(contexto), ICategoriaRepositorio
{
    public Task<List<Categoria>> ListarAsync(bool incluirInativas, CancellationToken ct = default) =>
        Conjunto.AsNoTracking()
            .Where(c => incluirInativas || c.Ativo)
            .OrderBy(c => c.OrdemExibicao).ThenBy(c => c.Nome)
            .ToListAsync(ct);

    public Task<List<Categoria>> ListarAlteradasDesdeAsync(DateTime desde, CancellationToken ct = default) =>
        Conjunto.AsNoTracking()
            .Where(c => c.DataAtualizacao >= desde)
            .OrderBy(c => c.OrdemExibicao)
            .ToListAsync(ct);

    public Task<bool> ExisteSlugAsync(string slug, int? ignorarId, CancellationToken ct = default) =>
        Conjunto.AnyAsync(c => c.Slug == slug && (ignorarId == null || c.Id != ignorarId), ct);

    public Task<bool> PossuiProdutosAsync(int categoriaId, CancellationToken ct = default) =>
        Contexto.Produtos.AnyAsync(p => p.CategoriaId == categoriaId, ct);

    public Task<Dictionary<int, int>> ContarProdutosAtivosAsync(CancellationToken ct = default) =>
        Contexto.Produtos
            .Where(p => p.Ativo && p.CategoriaId != null)
            .GroupBy(p => p.CategoriaId!.Value)
            .Select(g => new { CategoriaId = g.Key, Quantidade = g.Count() })
            .ToDictionaryAsync(x => x.CategoriaId, x => x.Quantidade, ct);
}

public sealed class ProdutoRepositorio(CafeDbContext contexto) : RepositorioBase<Produto>(contexto), IProdutoRepositorio
{
    public async Task<PaginaResultado<Produto>> PesquisarAsync(FiltroProdutos filtro, CancellationToken ct = default)
    {
        var consulta = Conjunto.AsNoTracking().Include(p => p.Categoria).AsQueryable();

        if (!filtro.IncluirInativos)
            consulta = consulta.Where(p => p.Ativo && (p.Categoria == null || p.Categoria.Ativo));

        if (!string.IsNullOrWhiteSpace(filtro.Categoria) && filtro.Categoria != "todas")
            consulta = consulta.Where(p => p.Categoria != null && p.Categoria.Slug == filtro.Categoria);

        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            // A collation utf8mb4_unicode_ci já ignora maiúsculas e acentos.
            var padrao = PadraoContem(filtro.Busca);
            consulta = consulta.Where(p =>
                EF.Functions.Like(p.Nome, padrao) ||
                (p.Descricao != null && EF.Functions.Like(p.Descricao, padrao)) ||
                (p.Categoria != null && EF.Functions.Like(p.Categoria.Nome, padrao)));
        }

        if (filtro.Destaque.HasValue)
            consulta = consulta.Where(p => p.Destaque == filtro.Destaque.Value);

        consulta = filtro.Ordenar switch
        {
            "preco_asc" => consulta.OrderBy(p => p.Preco).ThenBy(p => p.Nome),
            "preco_desc" => consulta.OrderByDescending(p => p.Preco).ThenBy(p => p.Nome),
            "mais_recentes" => consulta.OrderByDescending(p => p.DataCriacao),
            "nome" => consulta.OrderBy(p => p.Nome),
            _ => consulta.OrderBy(p => p.Categoria == null ? int.MaxValue : p.Categoria.OrdemExibicao).ThenBy(p => p.Nome)
        };

        var total = await consulta.CountAsync(ct);
        var itens = await consulta.Skip(filtro.Saltar).Take(filtro.TamanhoPagina).ToListAsync(ct);
        return new PaginaResultado<Produto>(itens, filtro.Pagina, filtro.TamanhoPagina, total);
    }

    public Task<Produto?> ObterComCategoriaAsync(int id, CancellationToken ct = default) =>
        Conjunto.AsNoTracking().Include(p => p.Categoria).FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<List<Produto>> ObterPorIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default) =>
        Conjunto.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync(ct);

    public Task<List<Produto>> ListarParaSincronizacaoAsync(DateTime? desde, CancellationToken ct = default)
    {
        var consulta = Conjunto.AsNoTracking().Include(p => p.Categoria).AsQueryable();

        consulta = desde is null
            ? consulta.Where(p => p.Ativo && (p.Categoria == null || p.Categoria.Ativo))
            // Incremental: inclui desativados (para o app remover) e produtos cuja categoria mudou.
            : consulta.Where(p => p.DataAtualizacao >= desde ||
                                  (p.Categoria != null && p.Categoria.DataAtualizacao >= desde));

        return consulta.OrderBy(p => p.Id).ToListAsync(ct);
    }
}
