using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CafeArtesanal.IntegrationTests;

/// <summary>Cliente HTTP já autenticado como uma conta.</summary>
public sealed record Conta(HttpClient Http, int Id, string RefreshToken);

/// <summary>Atalhos usados pelos testes: contas, CPFs válidos, produtos e pedidos.</summary>
public static class Apoio
{
    public const string Base = "/api/v1";
    public const string SenhaPadrao = "Senha@123";

    private static int _proximoCpf = 100_000_000;

    public static Task<Conta> AdminAsync(this ApiFixture api) => api.EntrarAsync("admin@cafeartesanal.com.br", "Admin@123");

    public static async Task<Conta> EntrarAsync(this ApiFixture api, string login, string senha)
    {
        var resposta = await api.CreateClient().PostAsJsonAsync($"{Base}/auth/login", new { login, senha });
        resposta.EnsureSuccessStatusCode();
        return api.Autenticar(await resposta.LerAsync());
    }

    public static async Task<Conta> NovoClienteAsync(this ApiFixture api)
    {
        var resposta = await api.CreateClient().PostAsJsonAsync($"{Base}/auth/registrar", new
        {
            nome = "Cliente de Teste",
            cpf = GerarCpf(),
            senha = SenhaPadrao
        });
        resposta.EnsureSuccessStatusCode();
        return api.Autenticar(await resposta.LerAsync());
    }

    public static async Task<JsonElement> LerAsync(this HttpResponseMessage resposta) =>
        JsonDocument.Parse(await resposta.Content.ReadAsStringAsync()).RootElement;

    /// <summary>Um produto com estoque e preço suficientes para passar do pedido mínimo com 5 unidades.</summary>
    public static async Task<JsonElement> ProdutoAsync(this ApiFixture api)
    {
        var pagina = await (await api.CreateClient().GetAsync($"{Base}/produtos?tamanhoPagina=100")).LerAsync();
        return pagina.GetProperty("itens").EnumerateArray().First(p =>
            p.GetProperty("estoque").GetInt32() >= 10
            && p.GetProperty("preco").GetDecimal() * 5 >= 10
            && p.GetProperty("categoriaId").ValueKind == JsonValueKind.Number);
    }

    public static async Task<int> EstoqueAsync(this ApiFixture api, int produtoId)
    {
        var produto = await (await api.CreateClient().GetAsync($"{Base}/produtos/{produtoId}")).LerAsync();
        return produto.GetProperty("estoque").GetInt32();
    }

    public static Task<HttpResponseMessage> FazerPedidoAsync(this Conta conta, int produtoId, int quantidade = 5) =>
        conta.Http.PostAsJsonAsync($"{Base}/pedidos", new
        {
            itens = new[] { new { produtoId, quantidade } },
            tipoEntrega = "retirada",
            formaPagamento = "pix"
        });

    public static async Task<int> PedidoCriadoAsync(this Conta conta, int produtoId)
    {
        var resposta = await conta.FazerPedidoAsync(produtoId);
        resposta.EnsureSuccessStatusCode();
        return (await resposta.LerAsync()).GetProperty("id").GetInt32();
    }

    private static Conta Autenticar(this ApiFixture api, JsonElement sessao)
    {
        var http = api.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", sessao.GetProperty("accessToken").GetString());
        return new Conta(http, sessao.GetProperty("usuario").GetProperty("id").GetInt32(),
            sessao.GetProperty("refreshToken").GetString()!);
    }

    private static string GerarCpf()
    {
        var digitos = Interlocked.Increment(ref _proximoCpf).ToString().Select(c => c - '0').ToList();
        foreach (var tamanho in new[] { 9, 10 })
        {
            var soma = digitos.Take(tamanho).Select((d, i) => d * (tamanho + 1 - i)).Sum();
            var resto = soma * 10 % 11;
            digitos.Add(resto == 10 ? 0 : resto);
        }
        return string.Concat(digitos);
    }
}
