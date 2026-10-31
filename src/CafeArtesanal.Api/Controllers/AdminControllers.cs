using CafeArtesanal.Api.Infra;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CafeArtesanal.Api.Controllers;

/// <summary>Gestão de usuários e perfis de acesso (somente administrador).</summary>
[ApiController]
[Route("api/v1/usuarios")]
[Authorize(Policy = Politicas.Admin)]
[Produces("application/json")]
public sealed class UsuariosController(IUsuarioServico usuarios) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginaResultado<UsuarioAdminDto>>> Pesquisar([FromQuery] FiltroUsuarios filtro, CancellationToken ct) =>
        Ok(await usuarios.PesquisarAsync(filtro, ct));

    [HttpPatch("{id:int}/perfil")]
    public async Task<IActionResult> AlterarPerfil(int id, AlterarPerfilUsuarioRequest request, CancellationToken ct)
    {
        await usuarios.AlterarPerfilAsync(id, request.Perfil, ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/ativo")]
    public async Task<IActionResult> AlterarAtivo(int id, AlterarAtivoRequest request, CancellationToken ct)
    {
        await usuarios.AlterarAtivoAsync(id, request.Ativo, ct);
        return NoContent();
    }
}

/// <summary>Indicadores do painel administrativo (stored procedures do banco).</summary>
[ApiController]
[Route("api/v1/relatorios")]
[Authorize(Policy = Politicas.Admin)]
[Produces("application/json")]
public sealed class RelatoriosController(IRelatorioServico relatorios) : ControllerBase
{
    /// <param name="inicio">Data inicial (yyyy-MM-dd). Padrão: 6 dias antes do fim.</param>
    /// <param name="fim">Data final (yyyy-MM-dd). Padrão: hoje.</param>
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard([FromQuery] DateOnly? inicio, [FromQuery] DateOnly? fim, CancellationToken ct) =>
        Ok(await relatorios.DashboardAsync(inicio, fim, ct));
}
