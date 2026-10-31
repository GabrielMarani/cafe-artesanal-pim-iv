namespace CafeArtesanal.Infrastructure.Seguranca;

/// <summary>Configuração dos tokens (seção "Jwt"). A chave NUNCA deve ir para o repositório em produção.</summary>
public sealed class JwtOptions
{
    public const string Secao = "Jwt";
    public const int TamanhoMinimoChave = 32;

    public string Chave { get; set; } = string.Empty;
    public string Emissor { get; set; } = "CafeArtesanal.Api";
    public string Audiencia { get; set; } = "CafeArtesanal.Clientes";
    public int ExpiracaoMinutos { get; set; } = 60;
    public int RefreshTokenDias { get; set; } = 14;
}

/// <summary>Nomes curtos das claims gravadas no JWT.</summary>
public static class ClaimsCafe
{
    public const string Id = "sub";
    public const string Nome = "name";
    public const string Perfil = "role";
}
