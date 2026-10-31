using CafeArtesanal.Application.Servicos;
using Microsoft.Extensions.DependencyInjection;

namespace CafeArtesanal.Application;

public static class DependencyInjection
{
    /// <summary>Registra os serviços de caso de uso da camada de aplicação.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<GeradorSessao>();
        services.AddScoped<IAuthServico, AuthServico>();
        services.AddScoped<IContaServico, ContaServico>();
        services.AddScoped<ICategoriaServico, CategoriaServico>();
        services.AddScoped<IProdutoServico, ProdutoServico>();
        services.AddScoped<IPedidoServico, PedidoServico>();
        services.AddScoped<IUsuarioServico, UsuarioServico>();
        services.AddScoped<IRelatorioServico, RelatorioServico>();
        services.AddScoped<ISincronizacaoServico, SincronizacaoServico>();
        return services;
    }
}
