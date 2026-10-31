using CafeArtesanal.Application.Comum;
using CafeArtesanal.Domain.Enums;
using CafeArtesanal.Infrastructure.Seguranca;

namespace CafeArtesanal.Api.Infra;

/// <summary>Lê o usuário logado das claims do JWT da requisição atual.</summary>
public sealed class UsuarioAtualHttp(IHttpContextAccessor acessor) : IUsuarioAtual
{
    public int? Id =>
        int.TryParse(acessor.HttpContext?.User.FindFirst(ClaimsCafe.Id)?.Value, out var id) ? id : null;

    public PerfilUsuario? Perfil =>
        CodigoEnum.TentarConverter<PerfilUsuario>(acessor.HttpContext?.User.FindFirst(ClaimsCafe.Perfil)?.Value, out var perfil)
            ? perfil
            : null;
}
