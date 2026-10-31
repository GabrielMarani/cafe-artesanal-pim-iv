using System.Net.Mail;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Domain.Entidades;

public class Usuario : Entidade
{
    public string Nome { get; private set; } = string.Empty;

    /// <summary>
    /// Nome pelo qual a pessoa quer ser chamada (Decreto 8.727/2016).
    /// Quando preenchido, é o nome exibido em todo o sistema.
    /// </summary>
    public string? NomeSocial { get; private set; }
    public string Cpf { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Telefone { get; private set; }
    public string SenhaHash { get; private set; } = string.Empty;
    public PerfilUsuario Perfil { get; private set; } = PerfilUsuario.Cliente;
    public bool Ativo { get; private set; } = true;
    public DateTime? UltimoLogin { get; private set; }
    public DateTime DataCadastro { get; private set; }
    public DateTime DataAtualizacao { get; private set; }

    private readonly List<Endereco> _enderecos = new();
    public IReadOnlyCollection<Endereco> Enderecos => _enderecos;

    public string NomeExibicao => string.IsNullOrWhiteSpace(NomeSocial) ? Nome : NomeSocial!;
    public bool EhEquipe => Perfil is PerfilUsuario.Atendente or PerfilUsuario.Admin;

    protected Usuario() { } // EF Core

    public static Usuario Criar(string nome, string? nomeSocial, string cpf, string? email,
        string? telefone, string senhaHash, PerfilUsuario perfil = PerfilUsuario.Cliente)
    {
        RegraNegocioException.Quando(string.IsNullOrWhiteSpace(senhaHash), "Senha não informada.");

        var agora = Relogio.Agora();
        var usuario = new Usuario
        {
            Cpf = Comum.Cpf.Criar(cpf).Numero,
            SenhaHash = senhaHash,
            Perfil = perfil,
            DataCadastro = agora
        };
        usuario.AtualizarDados(nome, nomeSocial, email, telefone);
        return usuario;
    }

    public void AtualizarDados(string nome, string? nomeSocial, string? email, string? telefone)
    {
        Nome = Texto.Obrigatorio(nome, "Nome", 100);
        NomeSocial = Texto.Opcional(nomeSocial, "Nome social", 100);
        Email = NormalizarEmail(email);
        Telefone = NormalizarTelefone(telefone);
        DataAtualizacao = Relogio.Agora();
    }

    public void AlterarSenha(string novoHash)
    {
        RegraNegocioException.Quando(string.IsNullOrWhiteSpace(novoHash), "Senha não informada.");
        SenhaHash = novoHash;
        DataAtualizacao = Relogio.Agora();
    }

    public void AlterarPerfil(PerfilUsuario perfil)
    {
        Perfil = perfil;
        DataAtualizacao = Relogio.Agora();
    }

    public void DefinirAtivo(bool ativo)
    {
        Ativo = ativo;
        DataAtualizacao = Relogio.Agora();
    }

    public void RegistrarLogin() => UltimoLogin = Relogio.Agora();

    private static string? NormalizarEmail(string? email)
    {
        var limpo = Texto.Opcional(email, "E-mail", 150)?.ToLowerInvariant();
        if (limpo is null) return null;

        var valido = MailAddress.TryCreate(limpo, out var endereco) && endereco.Address == limpo && limpo.Contains('.');
        RegraNegocioException.Quando(!valido, "E-mail inválido.");
        return limpo;
    }

    private static string? NormalizarTelefone(string? telefone)
    {
        var digitos = Texto.SomenteDigitos(telefone);
        if (digitos.Length == 0) return null;
        RegraNegocioException.Quando(digitos.Length is < 10 or > 11, "Telefone deve ter DDD + número (10 ou 11 dígitos).");

        return digitos.Length == 11
            ? $"({digitos[..2]}) {digitos[2..7]}-{digitos[7..]}"
            : $"({digitos[..2]}) {digitos[2..6]}-{digitos[6..]}";
    }
}
