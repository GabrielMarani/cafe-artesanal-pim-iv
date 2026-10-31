namespace CafeArtesanal.Application.Comum;

/// <summary>Parâmetros comerciais da loja (seção "Loja" do appsettings.json).</summary>
public sealed class LojaOptions
{
    public const string Secao = "Loja";

    public string Nome { get; set; } = "Café Artesanal";
    public decimal TaxaEntrega { get; set; } = 5.00m;
    public decimal PedidoMinimo { get; set; } = 10.00m;
    public string Telefone { get; set; } = "(11) 98765-4321";
    public string Endereco { get; set; } = "Rua do Café, 123 - São Paulo/SP";
    public List<string> Horarios { get; set; } = new();
}
