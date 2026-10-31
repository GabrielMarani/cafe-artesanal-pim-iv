using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Application.Servicos;

public interface IRelatorioServico
{
    Task<DashboardDto> DashboardAsync(DateOnly? inicio, DateOnly? fim, CancellationToken ct = default);
}

public sealed class RelatorioServico(IRelatorioRepositorio relatorios) : IRelatorioServico
{
    public const int PeriodoMaximoDias = 366;

    public async Task<DashboardDto> DashboardAsync(DateOnly? inicio, DateOnly? fim, CancellationToken ct = default)
    {
        var dataFim = fim ?? DateOnly.FromDateTime(Relogio.Agora());
        var dataInicio = inicio ?? dataFim.AddDays(-6);

        if (dataInicio > dataFim)
            throw new EntradaInvalidaException("A data inicial deve ser anterior ou igual à data final.");
        if (dataFim.DayNumber - dataInicio.DayNumber >= PeriodoMaximoDias)
            throw new EntradaInvalidaException($"O período máximo é de {PeriodoMaximoDias} dias.");

        // As consultas compartilham a mesma conexão, então são executadas em sequência.
        var resumo = await relatorios.ResumoAsync(dataInicio, dataFim, ct);
        var vendasPorDia = await relatorios.VendasPorDiaAsync(dataInicio, dataFim, ct);
        var maisVendidos = await relatorios.MaisVendidosAsync(dataInicio, dataFim, 5, ct);
        var porStatus = await relatorios.PedidosPorStatusAsync(dataInicio, dataFim, ct);
        var estoqueBaixo = await relatorios.EstoqueBaixoAsync(ct);

        return new DashboardDto(
            dataInicio.ToDateTime(TimeOnly.MinValue), dataFim.ToDateTime(TimeOnly.MinValue),
            resumo, vendasPorDia, maisVendidos, porStatus, estoqueBaixo);
    }
}
