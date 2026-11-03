using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.Servicos;

/// <summary>Gestão de usuários pelo administrador.</summary>
public interface IUsuarioServico
{
    Task<PaginaResultado<UsuarioAdminDto>> PesquisarAsync(FiltroUsuarios filtro, CancellationToken ct = default);
    Task AlterarPerfilAsync(int id, PerfilUsuario perfil, CancellationToken ct = default);
    Task AlterarAtivoAsync(int id, bool ativo, CancellationToken ct = default);
}

public sealed class UsuarioServico(
    IUsuarioAtual usuarioAtual,
    IUsuarioRepositorio usuarios,
    IRefreshTokenRepositorio refreshTokens,
    IUnidadeDeTrabalho unidadeDeTrabalho) : IUsuarioServico
{
    public async Task<PaginaResultado<UsuarioAdminDto>> PesquisarAsync(FiltroUsuarios filtro, CancellationToken ct = default)
    {
        var pagina = await usuarios.PesquisarAsync(filtro, ct);
        return pagina.Mapear(x => x.Usuario.ParaAdminDto(x.QuantidadePedidos));
    }

    public async Task AlterarPerfilAsync(int id, PerfilUsuario perfil, CancellationToken ct = default)
    {
        RegraNegocioException.Quando(id == usuarioAtual.Id, "Você não pode alterar o próprio perfil.");
        var usuario = await usuarios.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Usuário", id);

        if (usuario.Perfil == PerfilUsuario.Admin && perfil != PerfilUsuario.Admin)
            await GarantirOutroAdminAsync(ct);

        usuario.AlterarPerfil(perfil);
        // O perfil vai dentro do token: a pessoa precisa entrar de novo para receber o novo perfil.
        await refreshTokens.RevogarTodosDoUsuarioAsync(id, ct);
        await unidadeDeTrabalho.SalvarAsync(ct);
    }

    public async Task AlterarAtivoAsync(int id, bool ativo, CancellationToken ct = default)
    {
        RegraNegocioException.Quando(id == usuarioAtual.Id, "Você não pode desativar a própria conta.");
        var usuario = await usuarios.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Usuário", id);

        if (!ativo && usuario.Perfil == PerfilUsuario.Admin)
            await GarantirOutroAdminAsync(ct);

        usuario.DefinirAtivo(ativo);
        if (!ativo) await refreshTokens.RevogarTodosDoUsuarioAsync(id, ct);

        await unidadeDeTrabalho.SalvarAsync(ct);
    }

    private async Task GarantirOutroAdminAsync(CancellationToken ct)
    {
        if (await usuarios.ContarAdminsAtivosAsync(ct) <= 1)
            throw new RegraNegocioException("O sistema precisa de pelo menos um administrador ativo.");
    }
}
