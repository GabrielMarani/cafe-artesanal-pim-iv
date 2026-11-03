using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Comum;

namespace CafeArtesanal.Application.DTOs;

// ------------------------------------------------------------------ Categorias

public sealed record CategoriaDto(
    int Id,
    string Nome,
    string Slug,
    string? Descricao,
    int OrdemExibicao,
    bool Ativo,
    int QuantidadeProdutos,
    DateTime DataAtualizacao);

public sealed class SalvarCategoriaRequest
{
    [Required(ErrorMessage = "Informe o nome da categoria.")]
    [StringLength(50, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Nome { get; init; } = string.Empty;

    [StringLength(255, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Descricao { get; init; }

    [Range(0, 999, ErrorMessage = "Ordem de exibição inválida.")]
    public int OrdemExibicao { get; init; }

    public bool Ativo { get; init; } = true;
}

// ------------------------------------------------------------------ Produtos

public sealed record ProdutoDto(
    int Id,
    string Nome,
    string? Descricao,
    string? ImagemUrl,
    decimal Preco,
    int? CategoriaId,
    string? CategoriaNome,
    string? CategoriaSlug,
    int Estoque,
    int EstoqueMinimo,
    bool Disponivel,
    bool EstoqueBaixo,
    bool Destaque,
    bool Ativo,
    DateTime DataAtualizacao);

public sealed class FiltroProdutos : FiltroPaginado
{
    /// <summary>Slug da categoria (ex.: "cafes").</summary>
    public string? Categoria { get; set; }
    public string? Busca { get; set; }
    public bool? Destaque { get; set; }

    /// <summary>nome | preco_asc | preco_desc | mais_recentes</summary>
    public string? Ordenar { get; set; }

    /// <summary>Somente equipe: inclui produtos desativados.</summary>
    public bool IncluirInativos { get; set; }

    public FiltroProdutos() => TamanhoPagina = 50;
}

public sealed class SalvarProdutoRequest
{
    [Required(ErrorMessage = "Informe o nome do produto.")]
    [StringLength(100, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Nome { get; init; } = string.Empty;

    [StringLength(500, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Descricao { get; init; }

    [StringLength(500, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? ImagemUrl { get; init; }

    [Range(0.01, 99999, ErrorMessage = "O preço deve ser maior que zero.")]
    public decimal Preco { get; init; }

    public int? CategoriaId { get; init; }

    /// <summary>Usado apenas no cadastro. Depois, use o ajuste de estoque.</summary>
    [Range(0, 100000, ErrorMessage = "Estoque inicial inválido.")]
    public int EstoqueInicial { get; init; }

    [Range(0, 100000, ErrorMessage = "Estoque mínimo inválido.")]
    public int EstoqueMinimo { get; init; } = 5;

    public bool Destaque { get; init; }
    public bool Ativo { get; init; } = true;
}

public sealed class AjustarEstoqueRequest
{
    /// <summary>Positivo = entrada, negativo = saída.</summary>
    [Range(-10000, 10000, ErrorMessage = "Quantidade fora do limite permitido.")]
    public int Quantidade { get; init; }

    [Required(ErrorMessage = "Informe o motivo do ajuste.")]
    [StringLength(255, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Motivo { get; init; } = string.Empty;
}

public sealed record AjusteEstoqueResultado(int ProdutoId, int EstoqueAtual);

// ------------------------------------------------------------------ Sincronização (app mobile)

public sealed record CatalogoSyncDto(
    DateTime ServidorEm,
    bool Completo,
    IReadOnlyList<CategoriaDto> Categorias,
    IReadOnlyList<ProdutoDto> Produtos);

// ------------------------------------------------------------------ Configuração pública da loja

public sealed record LojaConfigDto(
    string Nome,
    decimal TaxaEntrega,
    decimal PedidoMinimo,
    string Telefone,
    string Endereco,
    IReadOnlyList<string> Horarios);
