using CafeArtesanal.Api.Infra;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CafeArtesanal.Api.Controllers;

/// <summary>Categorias do cardápio. Leitura pública; escrita somente administrador.</summary>
[ApiController]
[Route("api/v1/categorias")]
[Produces("application/json")]
public sealed class CategoriasController(ICategoriaServico categorias) : ControllerBase
{
    /// <param name="incluirInativas">Somente equipe: lista também as desativadas.</param>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<CategoriaDto>>> Listar([FromQuery] bool incluirInativas, CancellationToken ct) =>
        Ok(await categorias.ListarAsync(incluirInativas, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<CategoriaDto>> Obter(int id, CancellationToken ct) =>
        Ok(await categorias.ObterAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<ActionResult<CategoriaDto>> Criar(SalvarCategoriaRequest request, CancellationToken ct)
    {
        var criada = await categorias.CriarAsync(request, ct);
        return CreatedAtAction(nameof(Obter), new { id = criada.Id }, criada);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<ActionResult<CategoriaDto>> Atualizar(int id, SalvarCategoriaRequest request, CancellationToken ct) =>
        Ok(await categorias.AtualizarAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        await categorias.ExcluirAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Produtos do cardápio e controle de estoque.</summary>
[ApiController]
[Route("api/v1/produtos")]
[Produces("application/json")]
public sealed class ProdutosController(IProdutoServico produtos) : ControllerBase
{
    /// <summary>Pesquisa paginada (filtros: categoria, busca, destaque, ordenar).</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PaginaResultado<ProdutoDto>>> Pesquisar([FromQuery] FiltroProdutos filtro, CancellationToken ct) =>
        Ok(await produtos.PesquisarAsync(filtro, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProdutoDto>> Obter(int id, CancellationToken ct) =>
        Ok(await produtos.ObterAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<ActionResult<ProdutoDto>> Criar(SalvarProdutoRequest request, CancellationToken ct)
    {
        var criado = await produtos.CriarAsync(request, ct);
        return CreatedAtAction(nameof(Obter), new { id = criado.Id }, criado);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<ActionResult<ProdutoDto>> Atualizar(int id, SalvarProdutoRequest request, CancellationToken ct) =>
        Ok(await produtos.AtualizarAsync(id, request, ct));

    /// <summary>Exclusão lógica: o produto deixa de aparecer no cardápio.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<IActionResult> Desativar(int id, CancellationToken ct)
    {
        await produtos.DesativarAsync(id, ct);
        return NoContent();
    }

    /// <summary>Entrada (+) ou saída (-) manual de estoque. Executa a procedure sp_ajustar_estoque.</summary>
    [HttpPost("{id:int}/estoque")]
    [Authorize(Policy = Politicas.Admin)]
    public async Task<ActionResult<AjusteEstoqueResultado>> AjustarEstoque(int id, AjustarEstoqueRequest request, CancellationToken ct) =>
        Ok(await produtos.AjustarEstoqueAsync(id, request, ct));
}

/// <summary>Sincronização incremental do catálogo para o app mobile.</summary>
[ApiController]
[Route("api/v1/sync")]
[Produces("application/json")]
public sealed class SincronizacaoController(ISincronizacaoServico sincronizacao) : ControllerBase
{
    /// <param name="desde">Valor de "servidorEm" da última sincronização. Vazio = catálogo completo.</param>
    [HttpGet("catalogo")]
    [AllowAnonymous]
    public async Task<ActionResult<CatalogoSyncDto>> Catalogo([FromQuery] DateTime? desde, CancellationToken ct) =>
        Ok(await sincronizacao.CatalogoAsync(desde, ct));
}

/// <summary>Informações públicas da loja (taxa de entrega, pedido mínimo, horários).</summary>
[ApiController]
[Route("api/v1/loja")]
[Produces("application/json")]
public sealed class LojaController(IOptions<LojaOptions> loja) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<LojaConfigDto> Obter()
    {
        var l = loja.Value;
        return Ok(new LojaConfigDto(l.Nome, l.TaxaEntrega, l.PedidoMinimo, l.Telefone, l.Endereco, l.Horarios));
    }
}
