using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Repositorios;

public sealed class PedidoRepositorio(CafeDbContext contexto) : RepositorioBase<Pedido>(contexto), IPedidoRepositorio
{
    public Task<Pedido?> ObterDetalhadoAsync(int id, CancellationToken ct = default) =>
        Conjunto.AsNoTrackingWithIdentityResolution()
            .AsSplitQuery()
            .Include(p => p.Usuario)
            .Include(p => p.Itens).ThenInclude(i => i.Produto)
            .Include(p => p.Historico).ThenInclude(h => h.Usuario)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<PaginaResultado<Pedido>> PesquisarAsync(FiltroPedidos filtro, int? usuarioId, CancellationToken ct = default)
    {
        var consulta = Conjunto.AsNoTracking();

        if (usuarioId.HasValue)
            consulta = consulta.Where(p => p.UsuarioId == usuarioId);

        if (filtro.Status == "abertos")
            consulta = consulta.Where(p => p.Status != StatusPedido.Entregue && p.Status != StatusPedido.Cancelado);
        else if (CodigoEnum.TentarConverter<StatusPedido>(filtro.Status, out var status))
            consulta = consulta.Where(p => p.Status == status);

        if (filtro.DataInicio is { } inicio)
            consulta = consulta.Where(p => p.DataPedido >= inicio.Date);
        if (filtro.DataFim is { } fim)
            consulta = consulta.Where(p => p.DataPedido < fim.Date.AddDays(1));

        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            var busca = filtro.Busca.Trim().TrimStart('#');
            if (int.TryParse(busca, out var numero))
            {
                consulta = consulta.Where(p => p.Id == numero);
            }
            else
            {
                var padrao = PadraoContem(busca);
                consulta = consulta.Where(p => p.Usuario != null &&
                    (EF.Functions.Like(p.Usuario.Nome, padrao) ||
                     (p.Usuario.NomeSocial != null && EF.Functions.Like(p.Usuario.NomeSocial, padrao))));
            }
        }

        var total = await consulta.CountAsync(ct);
        var itens = await consulta
            .OrderByDescending(p => p.DataPedido).ThenByDescending(p => p.Id)
            .Skip(filtro.Saltar).Take(filtro.TamanhoPagina)
            .Include(p => p.Usuario)
            .Include(p => p.Itens).ThenInclude(i => i.Produto)
            .AsSplitQuery()
            .ToListAsync(ct);

        return new PaginaResultado<Pedido>(itens, filtro.Pagina, filtro.TamanhoPagina, total);
    }
}
