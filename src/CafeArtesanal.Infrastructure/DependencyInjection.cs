using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Infrastructure.Banco;
using CafeArtesanal.Infrastructure.Dados;
using CafeArtesanal.Infrastructure.Repositorios;
using CafeArtesanal.Infrastructure.Seguranca;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CafeArtesanal.Infrastructure;

public static class DependencyInjection
{
    public const string NomeConexao = "CafeArtesanal";

    /// <summary>Registra EF Core (MariaDB/MySQL), repositórios e serviços de segurança.</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuracao)
    {
        var conexao = configuracao.GetConnectionString(NomeConexao)
            ?? throw new InvalidOperationException($"Connection string '{NomeConexao}' não configurada.");

        // Versão fixa (sem AutoDetect) para não abrir conexão a cada DbContext criado.
        var versaoServidor = ServerVersion.Parse(configuracao["Banco:VersaoServidor"] ?? "10.4.27-mariadb");

        services.AddDbContext<CafeDbContext>(opcoes => opcoes.UseMySql(conexao, versaoServidor,
            mysql => mysql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null)));

        services.AddScoped<IUnidadeDeTrabalho, UnidadeDeTrabalho>();
        services.AddScoped<ExecutorProcedure>();
        services.AddScoped<ICategoriaRepositorio, CategoriaRepositorio>();
        services.AddScoped<IProdutoRepositorio, ProdutoRepositorio>();
        services.AddScoped<IUsuarioRepositorio, UsuarioRepositorio>();
        services.AddScoped<IEnderecoRepositorio, EnderecoRepositorio>();
        services.AddScoped<IPedidoRepositorio, PedidoRepositorio>();
        services.AddScoped<IRefreshTokenRepositorio, RefreshTokenRepositorio>();
        services.AddScoped<IRelatorioRepositorio, RelatorioRepositorio>();
        services.AddScoped<IEstoqueRepositorio, EstoqueRepositorio>();

        services.AddOptions<JwtOptions>()
            .Bind(configuracao.GetSection(JwtOptions.Secao))
            .Validate(o => o.Chave.Length >= JwtOptions.TamanhoMinimoChave,
                $"Jwt:Chave precisa ter pelo menos {JwtOptions.TamanhoMinimoChave} caracteres. " +
                "Defina a variável de ambiente Jwt__Chave.")
            .ValidateOnStart();

        services.AddSingleton<IHashSenha, HashSenhaPbkdf2>();
        services.AddSingleton<IServicoToken, ServicoTokenJwt>();
        services.AddSingleton<InicializadorBanco>();

        return services;
    }
}
