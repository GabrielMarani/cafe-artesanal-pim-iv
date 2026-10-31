using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Domain.Entidades;

public class Categoria : Entidade
{
    public string Nome { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? Descricao { get; private set; }
    public int OrdemExibicao { get; private set; }
    public bool Ativo { get; private set; } = true;
    public DateTime DataCriacao { get; private set; }
    public DateTime DataAtualizacao { get; private set; }

    private readonly List<Produto> _produtos = new();
    public IReadOnlyCollection<Produto> Produtos => _produtos;

    protected Categoria() { } // EF Core

    public static Categoria Criar(string nome, string? descricao, int ordemExibicao)
    {
        var agora = Relogio.Agora();
        var categoria = new Categoria { DataCriacao = agora };
        categoria.Atualizar(nome, descricao, ordemExibicao, ativo: true);
        return categoria;
    }

    public void Atualizar(string nome, string? descricao, int ordemExibicao, bool ativo)
    {
        Nome = Texto.Obrigatorio(nome, "Nome da categoria", 50);
        Slug = Texto.GerarSlug(Nome);
        RegraNegocioException.Quando(Slug.Length == 0, "Nome da categoria precisa ter letras ou números.");
        Descricao = Texto.Opcional(descricao, "Descrição", 255);
        OrdemExibicao = Math.Max(0, ordemExibicao);
        Ativo = ativo;
        DataAtualizacao = Relogio.Agora();
    }
}
