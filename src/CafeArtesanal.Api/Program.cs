using System.Globalization;
using CafeArtesanal.Api.Infra;
using CafeArtesanal.Application;
using CafeArtesanal.Infrastructure;

// Mensagens e formatação de moeda em português do Brasil.
CultureInfo.DefaultThreadCurrentCulture = new CultureInfo("pt-BR");
CultureInfo.DefaultThreadCurrentUICulture = new CultureInfo("pt-BR");

var builder = WebApplication.CreateBuilder(args);

// Camadas: Apresentação (API) → Aplicação → Domínio ← Infraestrutura
builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddApi(builder.Configuration, builder.Environment);

var app = builder.Build();

await app.PrepararBancoAsync();
app.UsarPipelineApi();

app.Run();

/// <summary>Exposto para testes de integração.</summary>
public partial class Program;
