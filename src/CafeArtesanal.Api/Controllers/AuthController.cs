using CafeArtesanal.Api.Infra;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CafeArtesanal.Api.Controllers;

/// <summary>Cadastro, login e renovação de sessão (JWT + refresh token).</summary>
[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public sealed class AuthController(IAuthServico auth, IContaServico conta) : ControllerBase
{
    /// <summary>Cria uma conta de cliente e já devolve a sessão.</summary>
    [HttpPost("registrar")]
    [AllowAnonymous]
    [EnableRateLimiting(Politicas.LimiteAutenticacao)]
    [ProducesResponseType<SessaoResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SessaoResponse>> Registrar(RegistrarRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await auth.RegistrarAsync(request, ct));

    /// <summary>Login por CPF ou e-mail.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(Politicas.LimiteAutenticacao)]
    [ProducesResponseType<SessaoResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SessaoResponse>> Login(LoginRequest request, CancellationToken ct) =>
        Ok(await auth.EntrarAsync(request, ct));

    /// <summary>Troca um refresh token válido por uma nova sessão (rotação de token).</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(Politicas.LimiteAutenticacao)]
    public async Task<ActionResult<SessaoResponse>> Renovar(RefreshTokenRequest request, CancellationToken ct) =>
        Ok(await auth.RenovarAsync(request.RefreshToken, ct));

    /// <summary>Encerra a sessão (revoga o refresh token).</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Sair(RefreshTokenRequest request, CancellationToken ct)
    {
        await auth.SairAsync(request.RefreshToken, ct);
        return NoContent();
    }

    /// <summary>Dados do usuário autenticado.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioLogadoDto>> Eu(CancellationToken ct) =>
        Ok(await conta.ObterPerfilAsync(ct));
}
