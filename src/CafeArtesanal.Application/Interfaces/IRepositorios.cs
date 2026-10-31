using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Interfaces;

// Portas de saída da aplicação (padrão Repository + Unit of Work).
// A implementação concreta (EF Core + MariaDB) fica na camada Infrastructure.

public interface IRepositorio<T> where T : Entidade
{
    Task<T?> ObterPorIdAsync(int id, CancellationToken ct = default);
    void Adicionar(T entidade);
    void Remover(T entidade);
}

/// <summary>Confirma todas as alterações de uma operação numa única transação.</summary>
public interface IUnidadeDeTrabalho
{
    Task SalvarAsync(CancellationToken ct = default);
}

public interface ICategoriaRepositorio : IRepositorio<Categoria>
{
    Task<List<Categoria>> ListarAsync(bool incluirInativas, CancellationToken ct = default);
    Task<List<Categoria>> ListarAlteradasDesdeAsync(DateTime desde, CancellationToken ct = default);
    Task<bool> ExisteSlugAsync(string slug, int? ignorarId, CancellationToken ct = default);
    Task<bool> PossuiProdutosAsync(int categoriaId, CancellationToken ct = default);
    Task<Dictionary<int, int>> ContarProdutosAtivosAsync(CancellationToken ct = default);
}

public interface IProdutoRepositorio : IRepositorio<Produto>
{
    Task<PaginaResultado<Produto>> PesquisarAsync(FiltroProdutos filtro, CancellationToken ct = default);
    Task<Produto?> ObterComCategoriaAsync(int id, CancellationToken ct = default);
    Task<List<Produto>> ObterPorIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default);

    /// <summary>Sem data: catálogo ativo completo. Com data: tudo que mudou (inclusive desativados).</summary>
    Task<List<Produto>> ListarParaSincronizacaoAsync(DateTime? desde, CancellationToken ct = default);
}

public interface IUsuarioRepositorio : IRepositorio<Usuario>
{
    Task<Usuario?> ObterPorCpfAsync(string cpf, CancellationToken ct = default);
    Task<Usuario?> ObterPorEmailAsync(string email, CancellationToken ct = default);
    Task<bool> ExisteCpfAsync(string cpf, CancellationToken ct = default);
    Task<bool> ExisteEmailAsync(string email, int? ignorarId, CancellationToken ct = default);
    Task<int> ContarAdminsAtivosAsync(CancellationToken ct = default);
    Task<PaginaResultado<(Usuario Usuario, int QuantidadePedidos)>> PesquisarAsync(FiltroUsuarios filtro, CancellationToken ct = default);
}

public interface IEnderecoRepositorio : IRepositorio<Endereco>
{
    Task<List<Endereco>> ListarPorUsuarioAsync(int usuarioId, CancellationToken ct = default);
}

public interface IPedidoRepositorio : IRepositorio<Pedido>
{
    /// <summary>Pedido com itens, cliente e linha do tempo (sem rastreamento).</summary>
    Task<Pedido?> ObterDetalhadoAsync(int id, CancellationToken ct = default);

    /// <param name="usuarioId">Quando informado, restringe aos pedidos deste cliente.</param>
    Task<PaginaResultado<Pedido>> PesquisarAsync(FiltroPedidos filtro, int? usuarioId, CancellationToken ct = default);
}

public interface IRefreshTokenRepositorio : IRepositorio<RefreshToken>
{
    Task<RefreshToken?> ObterPorHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevogarTodosDoUsuarioAsync(int usuarioId, CancellationToken ct = default);
}

/// <summary>Consultas analíticas executadas por stored procedures e views.</summary>
public interface IRelatorioRepositorio
{
    Task<ResumoVendasDto> ResumoAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default);
    Task<List<VendaDiaDto>> VendasPorDiaAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default);
    Task<List<ProdutoVendidoDto>> MaisVendidosAsync(DateOnly inicio, DateOnly fim, int limite, CancellationToken ct = default);
    Task<List<PedidosPorStatusDto>> PedidosPorStatusAsync(DateOnly inicio, DateOnly fim, CancellationToken ct = default);
    Task<List<EstoqueBaixoDto>> EstoqueBaixoAsync(CancellationToken ct = default);
}

/// <summary>Movimentações de estoque executadas pela procedure sp_ajustar_estoque.</summary>
public interface IEstoqueRepositorio
{
    Task<int> AjustarAsync(int produtoId, int quantidade, string motivo, int usuarioId, CancellationToken ct = default);
}
