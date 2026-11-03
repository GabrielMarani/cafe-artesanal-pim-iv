using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using static CafeArtesanal.IntegrationTests.Apoio;

namespace CafeArtesanal.IntegrationTests;

/// <summary>Regras que dependem do banco de verdade: triggers, procedures e concorrência.</summary>
[Collection("Api")]
public class PedidoTests(ApiFixture api)
{
    [Fact]
    public async Task Pedido_baixa_o_estoque_e_o_cancelamento_devolve()
    {
        var produtoId = (await api.ProdutoAsync()).GetProperty("id").GetInt32();
        var cliente = await api.NovoClienteAsync();
        var antes = await api.EstoqueAsync(produtoId);

        var pedido = await cliente.PedidoCriadoAsync(produtoId);
        Assert.Equal(antes - 5, await api.EstoqueAsync(produtoId));

        var cancelar = await cliente.Http.PostAsJsonAsync($"{Base}/pedidos/{pedido}/cancelar", new { motivo = "Teste" });
        cancelar.EnsureSuccessStatusCode();
        Assert.Equal(antes, await api.EstoqueAsync(produtoId));
    }

    [Fact]
    public async Task Pedido_acima_do_estoque_e_recusado_sem_mexer_no_estoque()
    {
        var produtoId = (await api.ProdutoAsync()).GetProperty("id").GetInt32();
        var admin = await api.AdminAsync();
        var cliente = await api.NovoClienteAsync();

        // Deixa só 3 unidades: o pedido tem um limite de quantidade por item menor que o estoque da carga inicial.
        var original = await api.EstoqueAsync(produtoId);
        var reduzir = await admin.Http.PostAsJsonAsync($"{Base}/produtos/{produtoId}/estoque", new { quantidade = 3 - original, motivo = "Teste" });
        reduzir.EnsureSuccessStatusCode();

        var resposta = await cliente.FazerPedidoAsync(produtoId, 5);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(3, await api.EstoqueAsync(produtoId));
        (await admin.Http.PostAsJsonAsync($"{Base}/produtos/{produtoId}/estoque", new { quantidade = original - 3, motivo = "Teste" })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Produto_de_categoria_desativada_nao_pode_ser_pedido()
    {
        var produto = await api.ProdutoAsync();
        var admin = await api.AdminAsync();
        var cliente = await api.NovoClienteAsync();
        var categoriaId = produto.GetProperty("categoriaId").GetInt32();
        var categoria = await (await admin.Http.GetAsync($"{Base}/categorias/{categoriaId}")).LerAsync();

        Task<HttpResponseMessage> DefinirAtiva(bool ativo) => admin.Http.PutAsJsonAsync($"{Base}/categorias/{categoriaId}", new
        {
            nome = categoria.GetProperty("nome").GetString(),
            descricao = categoria.GetProperty("descricao").GetString(),
            ordemExibicao = categoria.GetProperty("ordemExibicao").GetInt32(),
            ativo
        });

        (await DefinirAtiva(false)).EnsureSuccessStatusCode();
        try
        {
            var resposta = await cliente.FazerPedidoAsync(produto.GetProperty("id").GetInt32());
            Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        }
        finally
        {
            (await DefinirAtiva(true)).EnsureSuccessStatusCode();
        }
    }

    [Fact]
    public async Task Equipe_avanca_o_pedido_ate_entregue_e_depois_ele_nao_cancela_mais()
    {
        var produtoId = (await api.ProdutoAsync()).GetProperty("id").GetInt32();
        var admin = await api.AdminAsync();
        var pedido = await (await api.NovoClienteAsync()).PedidoCriadoAsync(produtoId);

        var atual = await (await admin.Http.GetAsync($"{Base}/pedidos/{pedido}")).LerAsync();
        while (atual.GetProperty("acoes").GetProperty("proximaEtapa") is { ValueKind: JsonValueKind.String } proxima)
        {
            var avancar = await admin.Http.PatchAsJsonAsync($"{Base}/pedidos/{pedido}/status", new { status = proxima.GetString() });
            avancar.EnsureSuccessStatusCode();
            atual = await avancar.LerAsync();
        }

        Assert.Equal("entregue", atual.GetProperty("status").GetString());
        Assert.True(atual.GetProperty("historico").GetArrayLength() >= 4);
        var cancelar = await admin.Http.PatchAsJsonAsync($"{Base}/pedidos/{pedido}/status", new { status = "cancelado", motivo = "Tarde demais" });
        Assert.False(cancelar.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Duas_alteracoes_simultaneas_no_mesmo_pedido_geram_conflito()
    {
        var produtoId = (await api.ProdutoAsync()).GetProperty("id").GetInt32();
        var id = await (await api.NovoClienteAsync()).PedidoCriadoAsync(produtoId);

        // A primeira pessoa abre o pedido e vai avançar o status...
        using var primeira = api.Services.CreateScope();
        var contexto = primeira.ServiceProvider.GetRequiredService<CafeDbContext>();
        var pedido = await contexto.Set<Pedido>().SingleAsync(p => p.Id == id);
        contexto.Entry(pedido).Property(p => p.Status).CurrentValue = StatusPedido.EmPreparo;

        // ...mas a segunda cancela antes de ela salvar.
        using var segunda = api.Services.CreateScope();
        await segunda.ServiceProvider.GetRequiredService<CafeDbContext>().Set<Pedido>()
            .Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, StatusPedido.Cancelado));

        await Assert.ThrowsAsync<ConflitoException>(
            () => primeira.ServiceProvider.GetRequiredService<IUnidadeDeTrabalho>().SalvarAsync());
    }

    [Fact]
    public async Task Ajuste_de_estoque_usa_a_procedure_e_nao_deixa_ficar_negativo()
    {
        var produtoId = (await api.ProdutoAsync()).GetProperty("id").GetInt32();
        var admin = await api.AdminAsync();
        var antes = await api.EstoqueAsync(produtoId);

        var entrada = await admin.Http.PostAsJsonAsync($"{Base}/produtos/{produtoId}/estoque", new { quantidade = 3, motivo = "Teste" });
        entrada.EnsureSuccessStatusCode();
        Assert.Equal(antes + 3, (await entrada.LerAsync()).GetProperty("estoqueAtual").GetInt32());

        var saida = await admin.Http.PostAsJsonAsync($"{Base}/produtos/{produtoId}/estoque", new { quantidade = -(antes + 4), motivo = "Teste" });
        Assert.False(saida.IsSuccessStatusCode);
        Assert.Equal(antes + 3, await api.EstoqueAsync(produtoId));

        (await admin.Http.PostAsJsonAsync($"{Base}/produtos/{produtoId}/estoque", new { quantidade = -3, motivo = "Teste" })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Dashboard_responde_para_o_administrador()
    {
        var admin = await api.AdminAsync();
        var resposta = await admin.Http.GetAsync($"{Base}/relatorios/dashboard");
        resposta.EnsureSuccessStatusCode();
    }
}
