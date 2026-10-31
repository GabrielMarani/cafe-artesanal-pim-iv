namespace CafeArtesanal.Api.Infra;

/// <summary>Nomes das políticas de autorização e de limite de requisições.</summary>
public static class Politicas
{
    /// <summary>Atendentes e administradores.</summary>
    public const string Equipe = "Equipe";

    /// <summary>Somente administradores.</summary>
    public const string Admin = "Admin";

    /// <summary>Limite de tentativas nos endpoints de login/cadastro (anti força bruta).</summary>
    public const string LimiteAutenticacao = "autenticacao";
}
