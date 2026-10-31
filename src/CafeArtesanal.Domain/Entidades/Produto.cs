using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Domain.Entidades;

public class Produto : Entidade
{
    public int? CategoriaId { get; private set; }
    public Categoria? Categoria { get; private set; }
    public string Nome { get; private set; } = string.Empty;
    public string? Descricao { get; private set; }
    public string? ImagemUrl { get; private set; }
    public decimal Preco { get; private set; }

    /// <summary>
    /// Saldo em estoque. Depois do cadastro ele só muda pelo banco: os triggers
    /// baixam/estornam nas vendas e a procedure sp_ajustar_estoque faz ajustes manuais.
    /// </summary>
    public int Estoque { get; private set; }
    public int EstoqueMinimo { get; private set; }
    public bool Destaque { get; private set; }
    public bool Ativo { get; private set; } = true;
    public DateTime DataCriacao { get; private set; }
    public DateTime DataAtualizacao { get; private set; }

    public bool Disponivel => Ativo && Estoque > 0;
    public bool EstoqueBaixo => Estoque <= EstoqueMinimo;

    protected Produto() { } // EF Core

    public static Produto Criar(string nome, string? descricao, string? imagemUrl, decimal preco,
        int? categoriaId, int estoqueInicial, int estoqueMinimo, bool destaque)
    {
        RegraNegocioException.Quando(estoqueInicial < 0, "O estoque inicial não pode ser negativo.");

        var produto = new Produto
        {
            Estoque = estoqueInicial,
            DataCriacao = Relogio.Agora()
        };
        produto.Atualizar(nome, descricao, imagemUrl, preco, categoriaId, estoqueMinimo, destaque, ativo: true);
        return produto;
    }

    public void Atualizar(string nome, string? descricao, string? imagemUrl, decimal preco,
        int? categoriaId, int estoqueMinimo, bool destaque, bool ativo)
    {
        RegraNegocioException.Quando(preco <= 0, "O preço deve ser maior que zero.");
        RegraNegocioException.Quando(preco > 99_999, "Preço acima do limite permitido.");
        RegraNegocioException.Quando(estoqueMinimo < 0, "O estoque mínimo não pode ser negativo.");

        var url = Texto.Opcional(imagemUrl, "URL da imagem", 500);
        RegraNegocioException.Quando(url is not null && !UrlValida(url), "A URL da imagem deve começar com http:// ou https://.");

        Nome = Texto.Obrigatorio(nome, "Nome do produto", 100);
        Descricao = Texto.Opcional(descricao, "Descrição", 500);
        ImagemUrl = url;
        Preco = decimal.Round(preco, 2);
        CategoriaId = categoriaId;
        EstoqueMinimo = estoqueMinimo;
        Destaque = destaque;
        Ativo = ativo;
        DataAtualizacao = Relogio.Agora();
    }

    public void Desativar()
    {
        Ativo = false;
        Destaque = false;
        DataAtualizacao = Relogio.Agora();
    }

    private static bool UrlValida(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
