using System.Text.Json;
using CafeArtesanal.Infrastructure.Banco;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;

namespace CafeArtesanal.Api.Infra;

/// <summary>Ordem dos middlewares da API e do front-end web.</summary>
public static class ConfiguracaoPipeline
{
    public static async Task PrepararBancoAsync(this WebApplication app)
    {
        try
        {
            await app.Services.GetRequiredService<InicializadorBanco>().ExecutarAsync();
        }
        catch (Exception ex)
        {
            // A API sobe mesmo assim; o /health indicará o problema.
            app.Logger.LogError(ex, "Não foi possível preparar o banco. Verifique se o MariaDB/MySQL está rodando " +
                                    "e a connection string em appsettings.json.");
        }
    }

    public static WebApplication UsarPipelineApi(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();

        if (!app.Environment.IsDevelopment())
            app.UseHsts();

        app.Use(async (contexto, proximo) =>
        {
            var cabecalhos = contexto.Response.Headers;
            cabecalhos["X-Content-Type-Options"] = "nosniff";
            cabecalhos["X-Frame-Options"] = "DENY";
            cabecalhos["Referrer-Policy"] = "strict-origin-when-cross-origin";
            cabecalhos["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            await proximo();
        });

        app.UseResponseCompression();

        // Front-end web (wwwroot): sempre revalida para não servir JS antigo após deploy.
        app.UseDefaultFiles();
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "no-cache"
        });

        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Café Artesanal API v1");
            c.DocumentTitle = "Café Artesanal - Documentação da API";
        });

        app.UseCors();
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = async (contexto, relatorio) =>
            {
                contexto.Response.ContentType = "application/json";
                await contexto.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    status = relatorio.Status.ToString(),
                    verificacoes = relatorio.Entries.Select(e => new { nome = e.Key, status = e.Value.Status.ToString(), e.Value.Description }),
                    duracaoMs = relatorio.TotalDuration.TotalMilliseconds
                }));
            }
        }).DisableRateLimiting();

        // Rota de API inexistente devolve 404 em JSON (e não a página HTML).
        app.MapFallback("/api/{**rota}", (HttpContext contexto) => Results.Problem(
            statusCode: StatusCodes.Status404NotFound, title: "Não encontrado",
            detail: $"Rota {contexto.Request.Path} não existe."));

        return app;
    }
}
