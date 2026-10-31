using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Servicos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using Microsoft.Extensions.Options;

namespace CafeArtesanal.Tests.Aplicacao;

/// <summary>Testa o caso de uso de pedidos isolado do banco (repositórios em memória).</summary>
public class PedidoServicoTests
{
    private readonly UsuarioFalso _usuario = new() { Id = 10, Perfil = PerfilUsuario.Cliente };
    private readonly PedidosEmMemoria _pedidos = new();
    private readonly ProdutosEmMemoria _produtos = new();
    private readonly EnderecosEmMemoria _enderecos = new();
    private readonly PedidoServico _servico;

    public PedidoServicoTests()
    {
        _produtos.Itens.Add(AuxiliarTeste.DefinirId(Produto.Criar("Cappuccino", null, null, 9.50m, null, 50, 5, true), 1));
        _produtos.Itens.Add(AuxiliarTeste.DefinirId(Produto.Criar("Croissant", null, null, 8.50m, null, 2, 1, false), 2));

        _enderecos.Itens.Add(AuxiliarTeste.DefinirId(
            Endereco.Criar(10, "Casa", "01310-100", "Av. Paulista", "1000", null, "Bela Vista", "São Paulo", "sp", null, true), 7));
        _enderecos.Itens.Add(AuxiliarTeste.DefinirId(
            Endereco.Criar(99, "Casa", "01310-100", "Rua de Outra Pessoa", "1", null, "Centro", "São Paulo", "SP", null, true), 8));

        var loja = Options.Create(new LojaOptions { TaxaEntrega = 5m, PedidoMinimo = 10m });
        _servico = new PedidoServico(_usuario, _pedidos, _produtos, _enderecos, _pedidos, loja);
    }

    [Fact]
    public async Task Cria_pedido_de_entrega_com_totais_do_servidor()
    {
        var dto = await _servico.CriarAsync(new CriarPedidoRequest
        {
            Itens = [new ItemPedidoRequest { ProdutoId = 1, Quantidade = 2 }, new ItemPedidoRequest { ProdutoId = 2, Quantidade = 1 }],
            TipoEntrega = TipoEntrega.Entrega,
            FormaPagamento = FormaPagamento.Pix,
            EnderecoId = 7
        });

        Assert.Equal(27.50m, dto.Subtotal);
        Assert.Equal(5m, dto.TaxaEntrega);
        Assert.Equal(32.50m, dto.Total);
        Assert.Contains("Av. Paulista, 1000", dto.EnderecoEntrega);
        Assert.Contains("São Paulo/SP", dto.EnderecoEntrega);
        Assert.True(dto.Acoes.PodeCancelar);
        Assert.Equal(1, _pedidos.Salvamentos);
    }

    [Fact]
    public async Task Rejeita_endereco_de_outro_cliente()
    {
        var erro = await Assert.ThrowsAsync<RegraNegocioException>(() => _servico.CriarAsync(new CriarPedidoRequest
        {
            Itens = [new ItemPedidoRequest { ProdutoId = 1, Quantidade = 2 }],
            TipoEntrega = TipoEntrega.Entrega,
            EnderecoId = 8
        }));

        Assert.Equal("Endereço de entrega inválido.", erro.Message);
        Assert.Equal(0, _pedidos.Salvamentos);
    }

    [Fact]
    public async Task Rejeita_produto_inexistente()
    {
        var erro = await Assert.ThrowsAsync<RegraNegocioException>(() => _servico.CriarAsync(new CriarPedidoRequest
        {
            Itens = [new ItemPedidoRequest { ProdutoId = 1, Quantidade = 2 }, new ItemPedidoRequest { ProdutoId = 404, Quantidade = 1 }]
        }));

        Assert.Contains("404", erro.Message);
    }

    [Fact]
    public async Task Cliente_nao_ve_pedido_de_outra_pessoa()
    {
        var pedido = Pedido.Criar(usuarioId: 99, TipoEntrega.Retirada, FormaPagamento.Pix, null, null, 0);
        pedido.AdicionarItem(_produtos.Itens[0], 2);
        _pedidos.Adicionar(pedido);
        await _pedidos.SalvarAsync();

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _servico.ObterAsync(pedido.Id));
    }

    [Fact]
    public async Task Somente_equipe_altera_status()
    {
        await Assert.ThrowsAsync<AcessoNegadoException>(() =>
            _servico.AlterarStatusAsync(1, new AlterarStatusPedidoRequest { Status = "em_preparo" }));
    }

    // ------------------------------------------------------------------ dublês

    private sealed class UsuarioFalso : IUsuarioAtual
    {
        public int? Id { get; set; }
        public PerfilUsuario? Perfil { get; set; }
    }

    private abstract class EmMemoria<T> : IRepositorio<T> where T : Entidade
    {
        public List<T> Itens { get; } = new();
        public Task<T?> ObterPorIdAsync(int id, CancellationToken ct = default) => Task.FromResult(Itens.FirstOrDefault(i => i.Id == id));
        public void Adicionar(T entidade) => Itens.Add(entidade);
        public void Remover(T entidade) => Itens.Remove(entidade);
    }

    private sealed class PedidosEmMemoria : EmMemoria<Pedido>, IPedidoRepositorio, IUnidadeDeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken ct = default)
        {
            Salvamentos++;
            foreach (var novo in Itens.Where(p => p.Id == 0))
                AuxiliarTeste.DefinirId(novo, Itens.Max(p => p.Id) + 1);
            return Task.CompletedTask;
        }

        public Task<Pedido?> ObterDetalhadoAsync(int id, CancellationToken ct = default) => ObterPorIdAsync(id, ct);

        public Task<PaginaResultado<Pedido>> PesquisarAsync(FiltroPedidos filtro, int? usuarioId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class ProdutosEmMemoria : EmMemoria<Produto>, IProdutoRepositorio
    {
        public Task<List<Produto>> ObterPorIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default) =>
            Task.FromResult(Itens.Where(p => ids.Contains(p.Id)).ToList());

        public Task<PaginaResultado<Produto>> PesquisarAsync(FiltroProdutos filtro, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Produto?> ObterComCategoriaAsync(int id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<Produto>> ListarParaSincronizacaoAsync(DateTime? desde, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class EnderecosEmMemoria : EmMemoria<Endereco>, IEnderecoRepositorio
    {
        public Task<List<Endereco>> ListarPorUsuarioAsync(int usuarioId, CancellationToken ct = default) =>
            Task.FromResult(Itens.Where(e => e.UsuarioId == usuarioId).ToList());
    }
}
