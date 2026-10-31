using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CafeArtesanal.Infrastructure.Banco;

/// <summary>
/// Na inicialização da API: se o banco ainda não existir, executa o script
/// database/bd_cafe_artesanal.sql (tabelas, triggers, procedures, views e carga).
/// Controlado por "Banco:CriarAutomaticamente".
/// </summary>
public sealed class InicializadorBanco(IConfiguration configuracao, ILogger<InicializadorBanco> logger)
{
    public async Task ExecutarAsync(CancellationToken ct = default)
    {
        if (!configuracao.GetValue("Banco:CriarAutomaticamente", false))
            return;

        var builder = new MySqlConnectionStringBuilder(configuracao.GetConnectionString(DependencyInjection.NomeConexao) ?? string.Empty);
        var nomeBanco = builder.Database;
        builder.Database = string.Empty;   // conecta no servidor, sem selecionar banco
        builder.AllowUserVariables = true;

        await using var conexao = new MySqlConnection(builder.ConnectionString);
        await conexao.OpenAsync(ct);

        await using (var verificar = new MySqlCommand(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = @nome", conexao))
        {
            verificar.Parameters.AddWithValue("@nome", nomeBanco);
            if (Convert.ToInt32(await verificar.ExecuteScalarAsync(ct)) > 0)
            {
                logger.LogInformation("Banco {Banco} encontrado.", nomeBanco);
                return;
            }
        }

        var caminho = LocalizarScript();
        logger.LogWarning("Banco {Banco} não existe. Criando a partir de {Script}...", nomeBanco, caminho);

        var comandos = DivisorScriptSql.Dividir(await File.ReadAllTextAsync(caminho, ct));
        foreach (var sql in comandos)
        {
            await using var comando = new MySqlCommand(sql, conexao);
            await comando.ExecuteNonQueryAsync(ct);
        }

        logger.LogInformation("Banco {Banco} criado com {Quantidade} comandos.", nomeBanco, comandos.Count);
    }

    private string LocalizarScript()
    {
        var configurado = configuracao["Banco:Script"];
        var candidatos = new[]
        {
            configurado,
            Path.Combine(AppContext.BaseDirectory, "database", "bd_cafe_artesanal.sql"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "bd_cafe_artesanal.sql")
        };

        return candidatos.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c) && File.Exists(c))
               ?? throw new FileNotFoundException("Script do banco (bd_cafe_artesanal.sql) não encontrado.");
    }
}
