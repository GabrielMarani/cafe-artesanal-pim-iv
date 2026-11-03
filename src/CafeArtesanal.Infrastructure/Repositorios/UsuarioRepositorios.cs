using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using CafeArtesanal.Infrastructure.Dados;
using Microsoft.EntityFrameworkCore;

namespace CafeArtesanal.Infrastructure.Repositorios;

public sealed class UsuarioRepositorio(CafeDbContext contexto) : RepositorioBase<Usuario>(contexto), IUsuarioRepositorio
{
    public Task<Usuario?> ObterPorCpfAsync(string cpf, CancellationToken ct = default) =>
        Conjunto.FirstOrDefaultAsync(u => u.Cpf == cpf, ct);

    public Task<Usuario?> ObterPorEmailAsync(string email, CancellationToken ct = default) =>
        Conjunto.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<bool> ExisteCpfAsync(string cpf, CancellationToken ct = default) =>
        Conjunto.AnyAsync(u => u.Cpf == cpf, ct);

    public Task<bool> ExisteEmailAsync(string email, int? ignorarId, CancellationToken ct = default) =>
        Conjunto.AnyAsync(u => u.Email == email && (ignorarId == null || u.Id != ignorarId), ct);

    public Task<int> ContarAdminsAtivosAsync(CancellationToken ct = default) =>
        Conjunto.CountAsync(u => u.Perfil == PerfilUsuario.Admin && u.Ativo, ct);

    public async Task<(bool Ativo, PerfilUsuario Perfil)?> ObterAcessoAsync(int id, CancellationToken ct = default)
    {
        var acesso = await Conjunto.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new { u.Ativo, u.Perfil })
            .FirstOrDefaultAsync(ct);
        return acesso is null ? null : (acesso.Ativo, acesso.Perfil);
    }

    public async Task<PaginaResultado<(Usuario Usuario, int QuantidadePedidos)>> PesquisarAsync(
        FiltroUsuarios filtro, CancellationToken ct = default)
    {
        var consulta = Conjunto.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            var padrao = PadraoContem(filtro.Busca);
            var digitos = Texto.SomenteDigitos(filtro.Busca);
            consulta = consulta.Where(u =>
                EF.Functions.Like(u.Nome, padrao) ||
                (u.NomeSocial != null && EF.Functions.Like(u.NomeSocial, padrao)) ||
                (u.Email != null && EF.Functions.Like(u.Email, padrao)) ||
                (digitos.Length >= 3 && u.Cpf.Contains(digitos)));
        }

        if (CodigoEnum.TentarConverter<PerfilUsuario>(filtro.Perfil, out var perfil))
            consulta = consulta.Where(u => u.Perfil == perfil);

        var total = await consulta.CountAsync(ct);
        var pagina = await consulta
            .OrderBy(u => u.Nome)
            .Skip(filtro.Saltar).Take(filtro.TamanhoPagina)
            .Select(u => new { Usuario = u, Pedidos = Contexto.Pedidos.Count(p => p.UsuarioId == u.Id) })
            .ToListAsync(ct);

        return new PaginaResultado<(Usuario, int)>(
            pagina.Select(x => (x.Usuario, x.Pedidos)).ToList(), filtro.Pagina, filtro.TamanhoPagina, total);
    }
}

public sealed class EnderecoRepositorio(CafeDbContext contexto) : RepositorioBase<Endereco>(contexto), IEnderecoRepositorio
{
    public Task<List<Endereco>> ListarPorUsuarioAsync(int usuarioId, CancellationToken ct = default) =>
        Conjunto
            .Where(e => e.UsuarioId == usuarioId)
            .OrderByDescending(e => e.Principal).ThenBy(e => e.Id)
            .ToListAsync(ct);
}

public sealed class RefreshTokenRepositorio(CafeDbContext contexto) : RepositorioBase<RefreshToken>(contexto), IRefreshTokenRepositorio
{
    public Task<RefreshToken?> ObterPorHashAsync(string tokenHash, CancellationToken ct = default) =>
        Conjunto.Include(t => t.Usuario).FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    /// <summary>Executa direto no banco (não depende do SaveChanges).</summary>
    public Task RevogarTodosDoUsuarioAsync(int usuarioId, CancellationToken ct = default)
    {
        var agora = Relogio.Agora();
        return Conjunto
            .Where(t => t.UsuarioId == usuarioId && t.RevogadoEm == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevogadoEm, agora), ct);
    }

    public Task RemoverExpiradosDoUsuarioAsync(int usuarioId, CancellationToken ct = default)
    {
        var agora = Relogio.Agora();
        return Conjunto.Where(t => t.UsuarioId == usuarioId && t.ExpiraEm < agora).ExecuteDeleteAsync(ct);
    }
}
