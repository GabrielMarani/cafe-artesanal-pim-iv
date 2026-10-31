using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace CafeArtesanal.Domain.Comum;

/// <summary>Utilitários de texto usados pelas entidades.</summary>
public static partial class Texto
{
    /// <summary>Remove espaços extras; devolve null para texto vazio.</summary>
    public static string? Limpar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return null;
        return EspacosRepetidos().Replace(valor.Trim(), " ");
    }

    /// <summary>Exige texto preenchido, com tamanho máximo.</summary>
    public static string Obrigatorio(string? valor, string campo, int tamanhoMaximo)
    {
        var limpo = Limpar(valor);
        RegraNegocioException.Quando(limpo is null, $"{campo} é obrigatório.");
        RegraNegocioException.Quando(limpo!.Length > tamanhoMaximo, $"{campo} deve ter no máximo {tamanhoMaximo} caracteres.");
        return limpo;
    }

    /// <summary>Texto opcional, com tamanho máximo.</summary>
    public static string? Opcional(string? valor, string campo, int tamanhoMaximo)
    {
        var limpo = Limpar(valor);
        RegraNegocioException.Quando(limpo is not null && limpo.Length > tamanhoMaximo,
            $"{campo} deve ter no máximo {tamanhoMaximo} caracteres.");
        return limpo;
    }

    /// <summary>Mantém apenas os dígitos (CPF, CEP, telefone).</summary>
    public static string SomenteDigitos(string? valor) =>
        valor is null ? string.Empty : NaoDigitos().Replace(valor, string.Empty);

    /// <summary>Gera um slug amigável para URLs: "Grãos Especiais" → "graos-especiais".</summary>
    public static string GerarSlug(string valor)
    {
        var normalizado = valor.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalizado.Length);
        foreach (var c in normalizado)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        var semAcento = sb.ToString().Normalize(NormalizationForm.FormC);
        return NaoAlfanumerico().Replace(semAcento, "-").Trim('-');
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRepetidos();

    [GeneratedRegex(@"\D")]
    private static partial Regex NaoDigitos();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NaoAlfanumerico();
}
