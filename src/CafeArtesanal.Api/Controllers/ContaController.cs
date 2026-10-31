using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CafeArtesanal.Api.Controllers;

/// <summary>Área do cliente: perfil, senha e endereços de entrega.</summary>
[ApiController]
[Route("api/v1/conta")]
[Authorize]
[Produces("application/json")]
public sealed class ContaController(IContaServico conta) : ControllerBase
{
    [HttpGet("perfil")]
    public async Task<ActionResult<UsuarioLogadoDto>> ObterPerfil(CancellationToken ct) =>
        Ok(await conta.ObterPerfilAsync(ct));

    [HttpPut("perfil")]
    public async Task<ActionResult<UsuarioLogadoDto>> AtualizarPerfil(AtualizarPerfilRequest request, CancellationToken ct) =>
        Ok(await conta.AtualizarPerfilAsync(request, ct));

    /// <summary>Altera a senha, encerra as outras sessões e devolve uma sessão nova.</summary>
    [HttpPut("senha")]
    public async Task<ActionResult<SessaoResponse>> AlterarSenha(AlterarSenhaRequest request, CancellationToken ct) =>
        Ok(await conta.AlterarSenhaAsync(request, ct));

    [HttpGet("enderecos")]
    public async Task<ActionResult<List<EnderecoDto>>> ListarEnderecos(CancellationToken ct) =>
        Ok(await conta.ListarEnderecosAsync(ct));

    [HttpPost("enderecos")]
    public async Task<ActionResult<EnderecoDto>> CriarEndereco(SalvarEnderecoRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await conta.CriarEnderecoAsync(request, ct));

    [HttpPut("enderecos/{id:int}")]
    public async Task<ActionResult<EnderecoDto>> AtualizarEndereco(int id, SalvarEnderecoRequest request, CancellationToken ct) =>
        Ok(await conta.AtualizarEnderecoAsync(id, request, ct));

    [HttpDelete("enderecos/{id:int}")]
    public async Task<IActionResult> RemoverEndereco(int id, CancellationToken ct)
    {
        await conta.RemoverEnderecoAsync(id, ct);
        return NoContent();
    }
}
