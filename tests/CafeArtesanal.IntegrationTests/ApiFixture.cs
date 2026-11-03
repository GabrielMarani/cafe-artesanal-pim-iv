using CafeArtesanal.Infrastructure.Dados;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CafeArtesanal.IntegrationTests;

/// <summary>
/// Sobe a API de verdade contra um banco só de testes, criado a partir de uma cópia do script
/// do projeto (com outro nome) e apagado no final. O banco de desenvolvimento não é tocado.
/// Precisa de um MariaDB rodando; o servidor pode ser trocado com a variável TESTE_DB_CONEXAO.
/// </summary>
public sealed class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string NomeBanco = "bd_cafe_artesanal_teste";

    private readonly string _servidor = Environment.GetEnvironmentVariable("TESTE_DB_CONEXAO")
                                        ?? "Server=127.0.0.1;Port=3306;User=root;Password=;CharSet=utf8mb4;";
    private readonly string _script = Path.Combine(Path.GetTempPath(), $"{NomeBanco}_{Guid.NewGuid():N}.sql");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var conexao = new MySqlConnectionStringBuilder(_servidor) { Database = NomeBanco };
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:CafeArtesanal", conexao.ConnectionString);
        builder.UseSetting("Banco:CriarAutomaticamente", "true");
        builder.UseSetting("Banco:Script", _script);
        builder.UseSetting("Seguranca:LoginsPorMinuto", "100000");
        builder.UseSetting("Seguranca:RequisicoesPorMinuto", "100000");
    }

    public async Task InitializeAsync()
    {
        await ExcluirBancoAsync();
        var script = await File.ReadAllTextAsync(LocalizarScript());
        await File.WriteAllTextAsync(_script, script.Replace("bd_cafe_artesanal", NomeBanco));

        _ = Server; // sobe a API, que cria o banco a partir do script

        // Trava de segurança: nenhum teste roda se a API não estiver no banco de testes.
        using var escopo = Services.CreateScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CafeDbContext>();
        if (contexto.Database.GetDbConnection().Database != NomeBanco)
            throw new InvalidOperationException("A API não está usando o banco de testes.");
        if (!await contexto.Database.CanConnectAsync())
            throw new InvalidOperationException("Não foi possível conectar ao MariaDB. Ele está rodando?");
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await ExcluirBancoAsync();
        File.Delete(_script);
    }

    private async Task ExcluirBancoAsync()
    {
        await using var conexao = new MySqlConnection(_servidor);
        await conexao.OpenAsync();
        await using var comando = new MySqlCommand($"DROP DATABASE IF EXISTS `{NomeBanco}`", conexao);
        await comando.ExecuteNonQueryAsync();
    }

    private static string LocalizarScript()
    {
        for (var pasta = new DirectoryInfo(AppContext.BaseDirectory); pasta is not null; pasta = pasta.Parent)
        {
            var caminho = Path.Combine(pasta.FullName, "database", "bd_cafe_artesanal.sql");
            if (File.Exists(caminho))
                return caminho;
        }
        throw new FileNotFoundException("Script do banco (bd_cafe_artesanal.sql) não encontrado.");
    }
}

[CollectionDefinition("Api")]
public sealed class ColecaoApi : ICollectionFixture<ApiFixture>;
