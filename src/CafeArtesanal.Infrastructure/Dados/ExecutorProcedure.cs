using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CafeArtesanal.Infrastructure.Dados;

/// <summary>
/// Executa stored procedures com ADO.NET sobre a mesma conexão do EF Core
/// e mapeia o resultado linha a linha.
/// </summary>
public sealed class ExecutorProcedure(CafeDbContext contexto)
{
    public async Task<List<T>> ConsultarAsync<T>(string procedure, Func<DbDataReader, T> mapear,
        CancellationToken ct, params (string Nome, object? Valor)[] parametros)
    {
        await contexto.Database.OpenConnectionAsync(ct);
        try
        {
            await using var comando = contexto.Database.GetDbConnection().CreateCommand();
            comando.CommandText = $"CALL {procedure}({string.Join(", ", parametros.Select(p => "@" + p.Nome))})";

            foreach (var (nome, valor) in parametros)
            {
                var parametro = comando.CreateParameter();
                parametro.ParameterName = "@" + nome;
                parametro.Value = valor ?? DBNull.Value;
                comando.Parameters.Add(parametro);
            }

            await using var leitor = await comando.ExecuteReaderAsync(ct);
            var resultado = new List<T>();
            while (await leitor.ReadAsync(ct))
                resultado.Add(mapear(leitor));
            return resultado;
        }
        catch (MySqlException ex) when (TradutorErroBanco.Traduzir(ex) is { } traduzida)
        {
            throw traduzida;
        }
        finally
        {
            await contexto.Database.CloseConnectionAsync();
        }
    }
}
