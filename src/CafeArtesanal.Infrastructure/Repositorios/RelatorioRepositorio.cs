using System.Data.Common;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Enums;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Repositorios;

/// <summary>Relatórios do painel: cada método chama uma stored procedure do banco.</summary>
public sealed class RelatorioRepositorio(ExecutorProcedure executor, CafeDbContext contexto) : IRelatorioRepositorio
{
    public async Task<ResumoVendasDto> ResumoAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default)
    {
        var linhas = await executor.ConsultarAsync("sp_dashboard_resumo", r => new ResumoVendasDto(
                Inteiro(r, "TOTAL_PEDIDOS"),
                Inteiro(r, "PEDIDOS_CANCELADOS"),
                Decimal(r, "FATURAMENTO"),
                decimal.Round(Decimal(r, "TICKET_MEDIO"), 2),
                Inteiro(r, "CLIENTES_ATENDIDOS"),
                Inteiro(r, "NOVOS_CLIENTES"),
                Inteiro(r, "PEDIDOS_EM_ABERTO")),
            ct, Periodo(inicio, fim));

        return linhas.Single();
    }

    public Task<List<VendaDiaDto>> VendasPorDiaAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default) =>
        executor.ConsultarAsync("sp_vendas_por_dia", r => new VendaDiaDto(
                r.GetDateTime(r.GetOrdinal("DIA")),
                Inteiro(r, "QUANTIDADE_PEDIDOS"),
                Decimal(r, "FATURAMENTO")),
            ct, Periodo(inicio, fim));

    public Task<List<ProdutoVendidoDto>> MaisVendidosAsync(DateOnly inicio, DateOnly fim, int limite, CancellationToken ct = default) =>
        executor.ConsultarAsync("sp_produtos_mais_vendidos", r => new ProdutoVendidoDto(
                Inteiro(r, "ID_PRODUTO"),
                r.GetString(r.GetOrdinal("NOME_PRODUTO")),
                Inteiro(r, "QUANTIDADE_VENDIDA"),
                Decimal(r, "FATURAMENTO")),
            ct, [.. Periodo(inicio, fim), ("limite", limite)]);

    public Task<List<PedidosPorStatusDto>> PedidosPorStatusAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default) =>
        executor.ConsultarAsync("sp_pedidos_por_status", r =>
            {
                var status = CodigoEnum.DeCodigo<StatusPedido>(r.GetString(r.GetOrdinal("STATUS_PEDIDO")));
                return new PedidosPorStatusDto(status, status.Rotulo(), Inteiro(r, "QUANTIDADE"), Decimal(r, "VALOR"));
            },
            ct, Periodo(inicio, fim));

    /// <summary>Consulta a view vw_produtos_estoque_baixo.</summary>
    public Task<List<EstoqueBaixoDto>> EstoqueBaixoAsync(CancellationToken ct = default) =>
        contexto.Database
            .SqlQuery<EstoqueBaixoDto>($"""
                SELECT ID_PRODUTO AS ProdutoId, NOME_PRODUTO AS Nome, NOME_CATEGORIA AS Categoria,
                       ESTOQUE AS Estoque, ESTOQUE_MINIMO AS EstoqueMinimo
                  FROM vw_produtos_estoque_baixo
                 ORDER BY ESTOQUE - ESTOQUE_MINIMO, NOME_PRODUTO
                """)
            .ToListAsync(ct);

    private static (string, object?)[] Periodo(DateOnly inicio, DateOnly fim) =>
    [
        ("inicio", inicio.ToDateTime(TimeOnly.MinValue)),
        ("fim", fim.ToDateTime(TimeOnly.MinValue))
    ];

    private static int Inteiro(DbDataReader r, string coluna) => Convert.ToInt32(r[coluna]);
    private static decimal Decimal(DbDataReader r, string coluna) => Convert.ToDecimal(r[coluna]);
}

public sealed class EstoqueRepositorio(ExecutorProcedure executor) : IEstoqueRepositorio
{
    public async Task<int> AjustarAsync(int produtoId, int quantidade, string motivo, int usuarioId, CancellationToken ct = default)
    {
        var resultado = await executor.ConsultarAsync("sp_ajustar_estoque",
            r => Convert.ToInt32(r["ESTOQUE_ATUAL"]),
            ct, ("produto", produtoId), ("quantidade", quantidade), ("motivo", motivo), ("usuario", usuarioId));
        return resultado.Single();
    }
}
