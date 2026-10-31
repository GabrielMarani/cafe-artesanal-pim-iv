using CafeArtesanal.Domain.Comum;

namespace CafeArtesanal.Domain.Entidades;

/// <summary>
/// Sessão de longa duração. Só o hash do token é persistido; a cada renovação
/// o token é trocado por outro (rotação) e o anterior é revogado.
/// </summary>
public class RefreshToken : Entidade
{
    public int UsuarioId { get; private set; }
    public Usuario? Usuario { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiraEm { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime? RevogadoEm { get; private set; }
    public string? SubstituidoPor { get; private set; }

    public bool EstaAtivo => RevogadoEm is null && Relogio.Agora() < ExpiraEm;

    protected RefreshToken() { } // EF Core

    public static RefreshToken Criar(int usuarioId, string tokenHash, TimeSpan validade) => new()
    {
        UsuarioId = usuarioId,
        TokenHash = tokenHash,
        CriadoEm = Relogio.Agora(),
        ExpiraEm = Relogio.Agora().Add(validade)
    };

    public void Revogar(string? substituidoPor = null)
    {
        if (RevogadoEm is not null) return;
        RevogadoEm = Relogio.Agora();
        SubstituidoPor = substituidoPor;
    }
}
