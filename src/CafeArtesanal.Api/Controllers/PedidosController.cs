using CafeArtesanal.Api.Infra;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CafeArtesanal.Api.Controllers;

/// <summary>
/// Pedidos. Clientes veem e alteram apenas os próprios; a equipe gerencia todos.
/// </summary>
[ApiController]
[Route("api/v1/pedidos")]
[Authorize]
[Produces("application/json")]
public sealed class PedidosController(IPedidoServico pedidos) : ControllerBase
{
    /// <summary>Lista paginada. Filtros: status (ou "abertos"), dataInicio, dataFim, busca.</summary>
    [HttpGet]
    public async Task<ActionResult<PaginaResultado<PedidoDto>>> Pesquisar([FromQuery] FiltroPedidos filtro, CancellationToken ct) =>
        Ok(await pedidos.PesquisarAsync(filtro, ct));

    /// <summary>Pedido com itens e linha do tempo de status.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PedidoDto>> Obter(int id, CancellationToken ct) =>
        Ok(await pedidos.ObterAsync(id, ct));

    /// <summary>Cria um pedido. Preços e totais são calculados no servidor.</summary>
    [HttpPost]
    [ProducesResponseType<PedidoDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PedidoDto>> Criar(CriarPedidoRequest request, CancellationToken ct)
    {
        var criado = await pedidos.CriarAsync(request, ct);
        return CreatedAtAction(nameof(Obter), new { id = criado.Id }, criado);
    }

    /// <summary>Equipe: avança o pedido no fluxo (ou cancela, informando o motivo).</summary>
    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = Politicas.Equipe)]
    public async Task<ActionResult<PedidoDto>> AlterarStatus(int id, AlterarStatusPedidoRequest request, CancellationToken ct) =>
        Ok(await pedidos.AlterarStatusAsync(id, request, ct));

    /// <summary>Cancela o pedido. Cliente: apenas enquanto estiver pendente.</summary>
    [HttpPost("{id:int}/cancelar")]
    public async Task<ActionResult<PedidoDto>> Cancelar(int id, CancelarPedidoRequest request, CancellationToken ct) =>
        Ok(await pedidos.CancelarAsync(id, request, ct));

    /// <summary>Cliente confirma que recebeu/retirou o pedido.</summary>
    [HttpPost("{id:int}/confirmar-recebimento")]
    public async Task<ActionResult<PedidoDto>> ConfirmarRecebimento(int id, CancellationToken ct) =>
        Ok(await pedidos.ConfirmarRecebimentoAsync(id, ct));
}
