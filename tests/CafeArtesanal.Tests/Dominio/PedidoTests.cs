using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Tests.Dominio;

public class PedidoTests
{
    private const int ClienteId = 10;
    private const int AtendenteId = 2;

    [Fact]
    public void Entrega_sem_endereco_e_rejeitada()
    {
        var erro = Assert.Throws<RegraNegocioException>(() =>
            Pedido.Criar(ClienteId, TipoEntrega.Entrega, FormaPagamento.Pix, null, null, 5m));

        Assert.Contains("endereço", erro.Message);
    }

    [Fact]
    public void Itens_repetidos_sao_somados_e_usam_o_preco_do_cadastro()
    {
        var cafe = Fabrica.Produto(1, preco: 6.50m, estoque: 10);
        var pedido = Fabrica.PedidoRetiradaVazio();

        pedido.AdicionarItem(cafe, 2);
        pedido.AdicionarItem(cafe, 1);

        var item = Assert.Single(pedido.Itens);
        Assert.Equal(3, item.Quantidade);
        Assert.Equal(6.50m, item.ValorUnitario);
        Assert.Equal(19.50m, pedido.Subtotal);
    }

    [Fact]
    public void Taxa_de_entrega_so_e_cobrada_na_entrega()
    {
        var produto = Fabrica.Produto(1, preco: 10m, estoque: 10);

        var entrega = Pedido.Criar(ClienteId, TipoEntrega.Entrega, FormaPagamento.Pix, "Rua A, 1", null, 5m);
        entrega.AdicionarItem(produto, 2);
        var retirada = Pedido.Criar(ClienteId, TipoEntrega.Retirada, FormaPagamento.Pix, "Rua A, 1", null, 5m);
        retirada.AdicionarItem(produto, 2);

        Assert.Equal(25m, entrega.Total);
        Assert.Equal(20m, retirada.Total);
        Assert.Null(retirada.EnderecoEntrega);
    }

    [Fact]
    public void Nao_aceita_quantidade_maior_que_o_estoque()
    {
        var pedido = Fabrica.PedidoRetiradaVazio();
        var produto = Fabrica.Produto(1, preco: 10m, estoque: 2);

        var erro = Assert.Throws<RegraNegocioException>(() => pedido.AdicionarItem(produto, 3));
        Assert.Contains("Estoque insuficiente", erro.Message);
    }

    [Fact]
    public void Nao_aceita_produto_desativado()
    {
        var produto = Fabrica.Produto(1, preco: 10m, estoque: 5);
        produto.Desativar();

        Assert.Throws<RegraNegocioException>(() => Fabrica.PedidoRetirada().AdicionarItem(produto, 1));
    }

    [Fact]
    public void Pedido_abaixo_do_minimo_e_rejeitado()
    {
        var pedido = Fabrica.PedidoRetiradaVazio();
        pedido.AdicionarItem(Fabrica.Produto(1, preco: 6m, estoque: 5), 1);

        Assert.Throws<RegraNegocioException>(() => pedido.ValidarParaRegistro(pedidoMinimo: 10m));
    }

    [Fact]
    public void Fluxo_completo_de_entrega()
    {
        var pedido = Fabrica.PedidoEntregaComItem();

        Assert.Equal(StatusPedido.EmPreparo, pedido.ProximaEtapa());
        pedido.AlterarStatus(StatusPedido.EmPreparo, AtendenteId);
        pedido.AlterarStatus(StatusPedido.Pronto, AtendenteId);

        // Entrega não pode pular direto para "entregue": precisa sair para entrega.
        Assert.DoesNotContain(StatusPedido.Entregue, pedido.ProximosStatusPermitidos());
        Assert.Equal(StatusPedido.SaiuParaEntrega, pedido.ProximaEtapa());

        pedido.AlterarStatus(StatusPedido.SaiuParaEntrega, AtendenteId);
        pedido.ConfirmarRecebimento(ClienteId);

        Assert.Equal(StatusPedido.Entregue, pedido.Status);
        Assert.True(pedido.EstaFinalizado);
        Assert.Equal(ClienteId, pedido.UsuarioAtualizacaoId);
    }

    [Fact]
    public void Retirada_nao_passa_por_saiu_para_entrega()
    {
        var pedido = Fabrica.PedidoRetirada();
        pedido.AlterarStatus(StatusPedido.EmPreparo, AtendenteId);
        pedido.AlterarStatus(StatusPedido.Pronto, AtendenteId);

        Assert.DoesNotContain(StatusPedido.SaiuParaEntrega, pedido.ProximosStatusPermitidos());
        pedido.ConfirmarRecebimento(ClienteId);
        Assert.Equal(StatusPedido.Entregue, pedido.Status);
    }

    [Fact]
    public void Nao_pula_etapas()
    {
        var pedido = Fabrica.PedidoRetirada();
        Assert.Throws<RegraNegocioException>(() => pedido.AlterarStatus(StatusPedido.Entregue, AtendenteId));
    }

    [Fact]
    public void Cliente_so_cancela_enquanto_pendente()
    {
        var pendente = Fabrica.PedidoRetirada();
        pendente.CancelarPeloCliente(ClienteId, null);
        Assert.Equal(StatusPedido.Cancelado, pendente.Status);
        Assert.Equal("Cancelado pelo cliente", pendente.MotivoCancelamento);

        var emPreparo = Fabrica.PedidoRetirada();
        emPreparo.AlterarStatus(StatusPedido.EmPreparo, AtendenteId);
        Assert.Throws<RegraNegocioException>(() => emPreparo.CancelarPeloCliente(ClienteId, "Desisti"));
    }

    [Fact]
    public void Cliente_nao_mexe_em_pedido_de_outra_pessoa()
    {
        var pedido = Fabrica.PedidoRetirada();
        Assert.Throws<RegraNegocioException>(() => pedido.CancelarPeloCliente(clienteId: 999, null));
    }

    [Fact]
    public void Equipe_precisa_informar_motivo_para_cancelar()
    {
        var pedido = Fabrica.PedidoRetirada();
        Assert.Throws<RegraNegocioException>(() => pedido.AlterarStatus(StatusPedido.Cancelado, AtendenteId, "  "));

        pedido.AlterarStatus(StatusPedido.Cancelado, AtendenteId, "Produto em falta");
        Assert.Equal("Produto em falta", pedido.MotivoCancelamento);
    }

    [Fact]
    public void Pedido_finalizado_nao_muda_de_status()
    {
        var pedido = Fabrica.PedidoRetirada();
        pedido.CancelarPeloCliente(ClienteId, null);

        Assert.Empty(pedido.ProximosStatusPermitidos());
        Assert.Throws<RegraNegocioException>(() => pedido.AlterarStatus(StatusPedido.EmPreparo, AtendenteId));
    }

    private static class Fabrica
    {
        public static Produto Produto(int id, decimal preco, int estoque)
        {
            var produto = Domain.Entidades.Produto.Criar("Produto " + id, null, null, preco, null, estoque, 0, false);
            AuxiliarTeste.DefinirId(produto, id);
            return produto;
        }

        public static Pedido PedidoRetiradaVazio() =>
            Pedido.Criar(ClienteId, TipoEntrega.Retirada, FormaPagamento.Pix, null, null, 5m);

        public static Pedido PedidoRetirada()
        {
            var pedido = PedidoRetiradaVazio();
            pedido.AdicionarItem(Produto(1, 15m, 10), 1);
            return pedido;
        }

        public static Pedido PedidoEntregaComItem()
        {
            var pedido = Pedido.Criar(ClienteId, TipoEntrega.Entrega, FormaPagamento.Dinheiro, "Rua A, 1", null, 5m);
            pedido.AdicionarItem(Produto(1, 15m, 10), 1);
            return pedido;
        }
    }
}
