using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.Comum;

/// <summary>
/// Quem está fazendo a requisição. Implementado na API a partir do token JWT,
/// permite que os serviços apliquem regras de autorização por dono do recurso.
/// </summary>
public interface IUsuarioAtual
{
    int? Id { get; }
    PerfilUsuario? Perfil { get; }

    bool EstaAutenticado => Id.HasValue;
    bool EhEquipe => Perfil is PerfilUsuario.Atendente or PerfilUsuario.Admin;
    bool EhAdmin => Perfil == PerfilUsuario.Admin;

    /// <summary>Id do usuário logado ou <see cref="NaoAutenticadoException"/>.</summary>
    int IdObrigatorio => Id ?? throw new NaoAutenticadoException();
}
