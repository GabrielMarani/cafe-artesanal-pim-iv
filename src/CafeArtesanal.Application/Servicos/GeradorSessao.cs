using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Servicos;

/// <summary>Emite o par access token + refresh token e persiste o refresh token.</summary>
public sealed class GeradorSessao(
    IRefreshTokenRepositorio refreshTokens,
    IServicoToken servicoToken,
    IUnidadeDeTrabalho unidadeDeTrabalho)
{
    public async Task<SessaoResponse> CriarAsync(Usuario usuario, CancellationToken ct = default)
    {
        var acesso = servicoToken.GerarAccessToken(usuario);
        var refresh = servicoToken.GerarRefreshToken();

        refreshTokens.Adicionar(RefreshToken.Criar(usuario.Id, refresh.Hash, servicoToken.ValidadeRefreshToken));
        await unidadeDeTrabalho.SalvarAsync(ct);

        return new SessaoResponse(acesso.Valor, acesso.ExpiraEm, refresh.Valor, refresh.ExpiraEm, usuario.ParaDto());
    }
}
