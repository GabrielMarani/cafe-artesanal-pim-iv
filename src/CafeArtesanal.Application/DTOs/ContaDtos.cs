using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Validacao;

namespace CafeArtesanal.Application.DTOs;

public sealed class AtualizarPerfilRequest
{
    [Required(ErrorMessage = "Informe o nome completo.")]
    [StringLength(100, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Nome { get; init; } = string.Empty;

    [StringLength(100, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? NomeSocial { get; init; }

    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    [StringLength(150, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Email { get; init; }

    [StringLength(20, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Telefone { get; init; }
}

public sealed class AlterarSenhaRequest
{
    [Required(ErrorMessage = "Informe a senha atual.")]
    public string SenhaAtual { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a nova senha.")]
    [SenhaForte]
    public string NovaSenha { get; init; } = string.Empty;
}

public sealed record EnderecoDto(
    int Id,
    string Apelido,
    string Cep,
    string Logradouro,
    string Numero,
    string? Complemento,
    string Bairro,
    string Cidade,
    string Uf,
    string? Referencia,
    bool Principal,
    string Descricao);

public sealed class SalvarEnderecoRequest
{
    [Required(ErrorMessage = "Dê um nome ao endereço (ex.: Casa, Trabalho).")]
    [StringLength(40, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Apelido { get; init; } = "Casa";

    [Required(ErrorMessage = "Informe o CEP.")]
    [StringLength(9, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Cep { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o logradouro.")]
    [StringLength(150, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Logradouro { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o número.")]
    [StringLength(10, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Numero { get; init; } = string.Empty;

    [StringLength(60, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Complemento { get; init; }

    [Required(ErrorMessage = "Informe o bairro.")]
    [StringLength(80, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Bairro { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a cidade.")]
    [StringLength(80, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Cidade { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a UF.")]
    [StringLength(2, MinimumLength = 2, ErrorMessage = "UF deve ter 2 letras.")]
    public string Uf { get; init; } = string.Empty;

    [StringLength(120, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Referencia { get; init; }

    public bool Principal { get; init; }
}
