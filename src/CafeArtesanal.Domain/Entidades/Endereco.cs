using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Domain.Entidades;

public class Endereco : Entidade
{
    private static readonly HashSet<string> Ufs = new(StringComparer.OrdinalIgnoreCase)
    {
        "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
        "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
    };

    public int UsuarioId { get; private set; }
    public string Apelido { get; private set; } = "Casa";
    public string Cep { get; private set; } = string.Empty;
    public string Logradouro { get; private set; } = string.Empty;
    public string Numero { get; private set; } = string.Empty;
    public string? Complemento { get; private set; }
    public string Bairro { get; private set; } = string.Empty;
    public string Cidade { get; private set; } = string.Empty;
    public string Uf { get; private set; } = string.Empty;
    public string? Referencia { get; private set; }
    public bool Principal { get; private set; }
    public DateTime DataCriacao { get; private set; }

    protected Endereco() { } // EF Core

    public static Endereco Criar(int usuarioId, string apelido, string cep, string logradouro, string numero,
        string? complemento, string bairro, string cidade, string uf, string? referencia, bool principal)
    {
        var endereco = new Endereco { UsuarioId = usuarioId, DataCriacao = Relogio.Agora() };
        endereco.Atualizar(apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, referencia, principal);
        return endereco;
    }

    public void Atualizar(string apelido, string cep, string logradouro, string numero, string? complemento,
        string bairro, string cidade, string uf, string? referencia, bool principal)
    {
        var cepDigitos = Texto.SomenteDigitos(cep);
        RegraNegocioException.Quando(cepDigitos.Length != 8, "CEP deve ter 8 dígitos.");
        var ufNormalizada = (uf ?? string.Empty).Trim().ToUpperInvariant();
        RegraNegocioException.Quando(!Ufs.Contains(ufNormalizada), "UF inválida.");

        Apelido = Texto.Obrigatorio(apelido, "Apelido do endereço", 40);
        Cep = cepDigitos;
        Logradouro = Texto.Obrigatorio(logradouro, "Logradouro", 150);
        Numero = Texto.Obrigatorio(numero, "Número", 10);
        Complemento = Texto.Opcional(complemento, "Complemento", 60);
        Bairro = Texto.Obrigatorio(bairro, "Bairro", 80);
        Cidade = Texto.Obrigatorio(cidade, "Cidade", 80);
        Uf = ufNormalizada;
        Referencia = Texto.Opcional(referencia, "Ponto de referência", 120);
        Principal = principal;
    }

    public void DefinirPrincipal(bool principal) => Principal = principal;

    /// <summary>Texto usado como "fotografia" do endereço dentro do pedido.</summary>
    public string Descrever()
    {
        var complemento = Complemento is null ? string.Empty : $" - {Complemento}";
        var referencia = Referencia is null ? string.Empty : $" (Ref.: {Referencia})";
        return $"{Logradouro}, {Numero}{complemento} - {Bairro}, {Cidade}/{Uf} - CEP {Cep[..5]}-{Cep[5..]}{referencia}";
    }
}
