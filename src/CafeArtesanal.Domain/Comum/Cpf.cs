namespace CafeArtesanal.Domain.Comum;

/// <summary>
/// Objeto de valor CPF: valida os dígitos verificadores e guarda apenas números.
/// </summary>
public readonly record struct Cpf
{
    public string Numero { get; }

    private Cpf(string numero) => Numero = numero;

    /// <summary>Cria um CPF válido ou lança <see cref="RegraNegocioException"/>.</summary>
    public static Cpf Criar(string? valor)
    {
        var numero = Texto.SomenteDigitos(valor);
        RegraNegocioException.Quando(!EhValido(numero), "CPF inválido.");
        return new Cpf(numero);
    }

    public static bool EhValido(string? valor)
    {
        var cpf = Texto.SomenteDigitos(valor);
        if (cpf.Length != 11) return false;
        if (cpf.All(c => c == cpf[0])) return false; // 000.000.000-00, 111.111.111-11...

        var digitos = cpf.Select(c => c - '0').ToArray();
        return digitos[9] == CalcularDigito(digitos, 9) && digitos[10] == CalcularDigito(digitos, 10);
    }

    /// <summary>Formata como 000.000.000-00.</summary>
    public static string Formatar(string? valor)
    {
        var cpf = Texto.SomenteDigitos(valor);
        return cpf.Length == 11
            ? $"{cpf[..3]}.{cpf[3..6]}.{cpf[6..9]}-{cpf[9..]}"
            : valor ?? string.Empty;
    }

    public override string ToString() => Formatar(Numero);

    private static int CalcularDigito(int[] digitos, int quantidade)
    {
        var soma = 0;
        for (var i = 0; i < quantidade; i++)
            soma += digitos[i] * (quantidade + 1 - i);

        var resto = soma * 10 % 11;
        return resto == 10 ? 0 : resto;
    }
}
