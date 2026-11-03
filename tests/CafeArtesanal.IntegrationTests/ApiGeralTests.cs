using System.Net;
using System.Net.Http.Json;
using System.Text;
using static CafeArtesanal.IntegrationTests.Apoio;

namespace CafeArtesanal.IntegrationTests;

[Collection("Api")]
public class ApiGeralTests(ApiFixture api)
{
    [Fact]
    public async Task Health_informa_que_o_banco_esta_no_ar()
    {
        var resposta = await api.CreateClient().GetAsync("/health");
        resposta.EnsureSuccessStatusCode();
        Assert.Equal("Healthy", (await resposta.LerAsync()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Pagina_inexistente_no_navegador_mostra_o_404_do_site()
    {
        var http = api.CreateClient();
        http.DefaultRequestHeaders.Add("Accept", "text/html");

        foreach (var endereco in new[] { "/nao-existe", "/nao-existe.html" })
        {
            var resposta = await http.GetAsync(endereco);
            Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
            Assert.Contains("Página não encontrada", await resposta.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task Rota_inexistente_da_api_responde_em_json()
    {
        var resposta = await api.CreateClient().GetAsync($"{Base}/nao-existe");
        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Validacao_responde_em_portugues()
    {
        var resposta = await api.CreateClient().PostAsJsonAsync($"{Base}/auth/login", new { login = new string('1', 151), senha = "x" });
        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Contains("no máximo 150 caracteres", (await resposta.LerAsync()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Json_malformado_nao_expoe_mensagem_interna()
    {
        var corpo = new StringContent("{ isso nao e json", Encoding.UTF8, "application/json");
        var resposta = await api.CreateClient().PostAsync($"{Base}/auth/login", corpo);
        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal("Formato de dado inválido.", (await resposta.LerAsync()).GetProperty("detail").GetString());
    }
}
