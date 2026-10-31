using CafeArtesanal.Infrastructure.Dados;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CafeArtesanal.Api.Infra;

/// <summary>Health check usado por monitoramento/containers: verifica a conexão com o banco.</summary>
public sealed class VerificacaoBanco(CafeDbContext contexto) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            return await contexto.Database.CanConnectAsync(ct)
                ? HealthCheckResult.Healthy("Banco de dados acessível.")
                : HealthCheckResult.Unhealthy("Não foi possível conectar ao banco de dados.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Falha ao conectar ao banco de dados.", ex);
        }
    }
}
