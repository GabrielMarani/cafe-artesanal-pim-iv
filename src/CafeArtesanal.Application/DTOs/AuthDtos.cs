using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Validacao;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.DTOs;

public sealed class RegistrarRequest
{
    [Required(ErrorMessage = "Informe o nome completo.")]
    [StringLength(100, ErrorMessage = "O nome deve ter no máximo 100 caracteres.")]
    public string Nome { get; init; } = string.Empty;

    /// <summary>Opcional: nome pelo qual a pessoa deseja ser chamada.</summary>
    [StringLength(100, ErrorMessage = "O nome social deve ter no máximo 100 caracteres.")]
    public string? NomeSocial { get; init; }

    [Required(ErrorMessage = "Informe o CPF.")]
    [Cpf]
    public string Cpf { get; init; } = string.Empty;

    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    [StringLength(150, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Email { get; init; }

    [StringLength(20, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string? Telefone { get; init; }

    [Required(ErrorMessage = "Informe a senha.")]
    [SenhaForte]
    public string Senha { get; init; } = string.Empty;
}

public sealed class LoginRequest
{
    /// <summary>CPF (com ou sem pontuação) ou e-mail.</summary>
    [Required(ErrorMessage = "Informe o CPF ou e-mail.")]
    [StringLength(150, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Login { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a senha.")]
    [StringLength(100, ErrorMessage = "{0} deve ter no máximo {1} caracteres.")]
    public string Senha { get; init; } = string.Empty;
}

public sealed class RefreshTokenRequest
{
    [Required(ErrorMessage = "Refresh token não informado.")]
    public string RefreshToken { get; init; } = string.Empty;
}

/// <summary>Dados do usuário autenticado.</summary>
public sealed record UsuarioLogadoDto(
    int Id,
    string Nome,
    string? NomeSocial,
    string NomeExibicao,
    string Cpf,
    string? Email,
    string? Telefone,
    PerfilUsuario Perfil);

/// <summary>Resposta de login/cadastro/renovação: par de tokens + usuário.</summary>
public sealed record SessaoResponse(
    string AccessToken,
    DateTime AccessTokenExpiraEm,
    string RefreshToken,
    DateTime RefreshTokenExpiraEm,
    UsuarioLogadoDto Usuario);
