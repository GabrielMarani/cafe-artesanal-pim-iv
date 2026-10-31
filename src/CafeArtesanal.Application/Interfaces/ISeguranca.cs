using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Interfaces;

/// <summary>Geração e verificação de hash de senha.</summary>
public interface IHashSenha
{
    string GerarHash(string senha);
    bool Verificar(string senha, string hash);
}

public sealed record TokenGerado(string Valor, DateTime ExpiraEm);

public sealed record RefreshTokenGerado(string Valor, string Hash, DateTime ExpiraEm);

/// <summary>Emissão de tokens de acesso (JWT) e de renovação.</summary>
public interface IServicoToken
{
    TokenGerado GerarAccessToken(Usuario usuario);
    RefreshTokenGerado GerarRefreshToken();
    string CalcularHash(string refreshToken);
    TimeSpan ValidadeRefreshToken { get; }
}
