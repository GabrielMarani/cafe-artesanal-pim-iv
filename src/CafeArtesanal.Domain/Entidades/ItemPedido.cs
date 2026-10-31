using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Domain.Entidades;

public class ItemPedido : Entidade
{
    public const int QuantidadeMaxima = 99;

    public int PedidoId { get; private set; }
    public int ProdutoId { get; private set; }
    public Produto? Produto { get; private set; }

    /// <summary>Nome e preço são copiados no momento da venda (histórico imutável).</summary>
    public string NomeProduto { get; private set; } = string.Empty;
    public int Quantidade { get; private set; }
    public decimal ValorUnitario { get; private set; }

    public decimal Subtotal => Quantidade * ValorUnitario;

    protected ItemPedido() { } // EF Core

    internal ItemPedido(Produto produto, int quantidade)
    {
        ProdutoId = produto.Id;
        NomeProduto = produto.Nome;
        ValorUnitario = produto.Preco; // sempre o preço do cadastro, nunca o enviado pelo cliente
        DefinirQuantidade(quantidade);
    }

    internal void DefinirQuantidade(int quantidade)
    {
        RegraNegocioException.Quando(quantidade < 1, "A quantidade deve ser no mínimo 1.");
        RegraNegocioException.Quando(quantidade > QuantidadeMaxima,
            $"Quantidade máxima por item é {QuantidadeMaxima}.");
        Quantidade = quantidade;
    }
}
