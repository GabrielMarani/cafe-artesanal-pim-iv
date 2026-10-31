using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CafeArtesanal.Infrastructure.Seguranca;

public sealed class ServicoTokenJwt(IOptions<JwtOptions> opcoes) : IServicoToken
{
    private readonly JwtOptions _opcoes = opcoes.Value;

    public TimeSpan ValidadeRefreshToken => TimeSpan.FromDays(_opcoes.RefreshTokenDias);

    public TokenGerado GerarAccessToken(Usuario usuario)
    {
        var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opcoes.Chave));
        var credenciais = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256);
        var expiraUtc = DateTime.UtcNow.AddMinutes(_opcoes.ExpiracaoMinutos);

        var claims = new[]
        {
            new Claim(ClaimsCafe.Id, usuario.Id.ToString()),
            new Claim(ClaimsCafe.Nome, usuario.NomeExibicao),
            new Claim(ClaimsCafe.Perfil, usuario.Perfil.ParaCodigo()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        var token = new JwtSecurityToken(
            issuer: _opcoes.Emissor,
            audience: _opcoes.Audiencia,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiraUtc,
            signingCredentials: credenciais);

        return new TokenGerado(new JwtSecurityTokenHandler().WriteToken(token), Relogio.Agora().AddMinutes(_opcoes.ExpiracaoMinutos));
    }

    public RefreshTokenGerado GerarRefreshToken()
    {
        var valor = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));
        return new RefreshTokenGerado(valor, CalcularHash(valor), Relogio.Agora().Add(ValidadeRefreshToken));
    }

    /// <summary>SHA-256 em hexadecimal: é o que fica salvo no banco.</summary>
    public string CalcularHash(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken))).ToLowerInvariant();
}
