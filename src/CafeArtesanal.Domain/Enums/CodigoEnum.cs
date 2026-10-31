using System.Text;

namespace CafeArtesanal.Domain.Enums;

/// <summary>
/// Converte enums para o código snake_case usado no banco e na API
/// (StatusPedido.SaiuParaEntrega ↔ "saiu_para_entrega").
/// </summary>
public static class CodigoEnum
{
    public static string ParaCodigo<T>(this T valor) where T : struct, Enum => ParaSnakeCase(valor.ToString());

    public static T DeCodigo<T>(string codigo) where T : struct, Enum =>
        TentarConverter<T>(codigo, out var valor)
            ? valor
            : throw new ArgumentException($"Valor \"{codigo}\" inválido para {typeof(T).Name}.");

    public static bool TentarConverter<T>(string? codigo, out T valor) where T : struct, Enum
    {
        valor = default;
        if (string.IsNullOrWhiteSpace(codigo)) return false;

        var normalizado = codigo.Trim().Replace("_", string.Empty).Replace("-", string.Empty);
        return Enum.TryParse(normalizado, ignoreCase: true, out valor) && Enum.IsDefined(valor);
    }

    private static string ParaSnakeCase(string nome)
    {
        var sb = new StringBuilder(nome.Length + 4);
        for (var i = 0; i < nome.Length; i++)
        {
            if (char.IsUpper(nome[i]) && i > 0) sb.Append('_');
            sb.Append(char.ToLowerInvariant(nome[i]));
        }
        return sb.ToString();
    }
}
