using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Validacao;

namespace CafeArtesanal.Application.DTOs;

public sealed class AtualizarPerfilRequest
{
    [Required(ErrorMessage = "Informe o nome completo.")]
    [StringLength(100)]
    public string Nome { get; init; } = string.Empty;

    [StringLength(100)]
    public string? NomeSocial { get; init; }

    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    [StringLength(150)]
    public string? Email { get; init; }

    [StringLength(20)]
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
    [StringLength(40)]
    public string Apelido { get; init; } = "Casa";

    [Required(ErrorMessage = "Informe o CEP.")]
    [StringLength(9)]
    public string Cep { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o logradouro.")]
    [StringLength(150)]
    public string Logradouro { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o número.")]
    [StringLength(10)]
    public string Numero { get; init; } = string.Empty;

    [StringLength(60)]
    public string? Complemento { get; init; }

    [Required(ErrorMessage = "Informe o bairro.")]
    [StringLength(80)]
    public string Bairro { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a cidade.")]
    [StringLength(80)]
    public string Cidade { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a UF.")]
    [StringLength(2, MinimumLength = 2, ErrorMessage = "UF deve ter 2 letras.")]
    public string Uf { get; init; } = string.Empty;

    [StringLength(120)]
    public string? Referencia { get; init; }

    public bool Principal { get; init; }
}
