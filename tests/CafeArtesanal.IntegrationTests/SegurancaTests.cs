using System.Net;
using System.Net.Http.Json;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using static CafeArtesanal.IntegrationTests.Apoio;

namespace CafeArtesanal.IntegrationTests;

[Collection("Api")]
public class SegurancaTests(ApiFixture api)
{
    [Fact]
    public async Task Sem_login_a_area_autenticada_responde_401()
    {
        var resposta = await api.CreateClient().GetAsync($"{Base}/pedidos");
        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Cliente_nao_acessa_a_area_administrativa()
    {
        var cliente = await api.NovoClienteAsync();
        var resposta = await cliente.Http.GetAsync($"{Base}/usuarios");
        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task Cliente_nao_ve_pedido_de_outra_pessoa()
    {
        var produto = await api.ProdutoAsync();
        var dono = await api.NovoClienteAsync();
        var outro = await api.NovoClienteAsync();
        var pedido = await dono.PedidoCriadoAsync(produto.GetProperty("id").GetInt32());

        var resposta = await outro.Http.GetAsync($"{Base}/pedidos/{pedido}");

        Assert.Contains(resposta.StatusCode, new[] { HttpStatusCode.Forbidden, HttpStatusCode.NotFound });
    }

    [Fact]
    public async Task Conta_desativada_perde_o_acesso_na_hora()
    {
        var admin = await api.AdminAsync();
        var cliente = await api.NovoClienteAsync();
        (await cliente.Http.GetAsync($"{Base}/conta/perfil")).EnsureSuccessStatusCode();

        var desativar = await admin.Http.PatchAsJsonAsync($"{Base}/usuarios/{cliente.Id}/ativo", new { ativo = false });
        desativar.EnsureSuccessStatusCode();

        // O token ainda estaria dentro da validade de 60 minutos.
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.Http.GetAsync($"{Base}/conta/perfil")).StatusCode);
        var renovar = await api.CreateClient().PostAsJsonAsync($"{Base}/auth/refresh", new { refreshToken = cliente.RefreshToken });
        Assert.False(renovar.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Mudanca_de_perfil_invalida_o_token_antigo_na_hora()
    {
        var admin = await api.AdminAsync();
        var cliente = await api.NovoClienteAsync();

        var promover = await admin.Http.PatchAsJsonAsync($"{Base}/usuarios/{cliente.Id}/perfil", new { perfil = "atendente" });
        promover.EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.Http.GetAsync($"{Base}/conta/perfil")).StatusCode);
    }

    [Fact]
    public async Task Refresh_token_so_pode_ser_usado_uma_vez()
    {
        var cliente = await api.NovoClienteAsync();
        var http = api.CreateClient();

        var primeira = await http.PostAsJsonAsync($"{Base}/auth/refresh", new { refreshToken = cliente.RefreshToken });
        primeira.EnsureSuccessStatusCode();
        var repetida = await http.PostAsJsonAsync($"{Base}/auth/refresh", new { refreshToken = cliente.RefreshToken });

        Assert.Equal(HttpStatusCode.Unauthorized, repetida.StatusCode);
    }

    [Fact]
    public async Task Tokens_vencidos_sao_apagados_no_proximo_login()
    {
        var conta = await api.NovoClienteAsync();
        using var escopo = api.Services.CreateScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CafeDbContext>();
        var tokens = contexto.Set<RefreshToken>().Where(t => t.UsuarioId == conta.Id);
        var vencimento = Relogio.Agora().AddDays(-1);
        await tokens.ExecuteUpdateAsync(s => s.SetProperty(t => t.ExpiraEm, vencimento));

        var login = await api.CreateClient().GetAsync($"{Base}/conta/perfil");
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
        var perfil = await (await conta.Http.GetAsync($"{Base}/conta/perfil")).LerAsync();
        await api.EntrarAsync(perfil.GetProperty("cpf").GetString()!, SenhaPadrao);

        Assert.Equal(1, await tokens.CountAsync());
    }
}
