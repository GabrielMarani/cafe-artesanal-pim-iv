using System.Security.Cryptography;
using CafeArtesanal.Application.Interfaces;

namespace CafeArtesanal.Infrastructure.Seguranca;

/// <summary>
/// Hash de senha com PBKDF2-HMAC-SHA256, salt aleatório por usuário e 100.000 iterações.
/// Formato gravado: pbkdf2-sha256$iteracoes$saltBase64$hashBase64
/// </summary>
public sealed class HashSenhaPbkdf2 : IHashSenha
{
    private const string Algoritmo = "pbkdf2-sha256";
    private const int Iteracoes = 100_000;
    private const int TamanhoSalt = 16;
    private const int TamanhoHash = 32;

    public string GerarHash(string senha)
    {
        var salt = RandomNumberGenerator.GetBytes(TamanhoSalt);
        var hash = Rfc2898DeriveBytes.Pbkdf2(senha, salt, Iteracoes, HashAlgorithmName.SHA256, TamanhoHash);
        return $"{Algoritmo}${Iteracoes}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public bool Verificar(string senha, string hashArmazenado)
    {
        var partes = hashArmazenado.Split('$');
        if (partes.Length != 4 || partes[0] != Algoritmo || !int.TryParse(partes[1], out var iteracoes))
            return false;

        try
        {
            var salt = Convert.FromBase64String(partes[2]);
            var esperado = Convert.FromBase64String(partes[3]);
            var calculado = Rfc2898DeriveBytes.Pbkdf2(senha, salt, iteracoes, HashAlgorithmName.SHA256, esperado.Length);

            // Comparação em tempo constante (evita ataques de temporização).
            return CryptographicOperations.FixedTimeEquals(calculado, esperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
