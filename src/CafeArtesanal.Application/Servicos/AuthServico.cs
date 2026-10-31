using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Servicos;

public interface IAuthServico
{
    Task<SessaoResponse> RegistrarAsync(RegistrarRequest request, CancellationToken ct = default);
    Task<SessaoResponse> EntrarAsync(LoginRequest request, CancellationToken ct = default);
    Task<SessaoResponse> RenovarAsync(string refreshToken, CancellationToken ct = default);
    Task SairAsync(string refreshToken, CancellationToken ct = default);
}

public sealed class AuthServico(
    IUsuarioRepositorio usuarios,
    IRefreshTokenRepositorio refreshTokens,
    IHashSenha hashSenha,
    IServicoToken servicoToken,
    GeradorSessao geradorSessao,
    IUnidadeDeTrabalho unidadeDeTrabalho) : IAuthServico
{
    private const string MensagemCredenciaisInvalidas = "CPF/e-mail ou senha incorretos.";

    /// <summary>Intervalo em que a reutilização de um token recém-trocado é tratada como corrida entre abas.</summary>
    private static readonly TimeSpan ToleranciaReuso = TimeSpan.FromSeconds(60);

    // Hash usado quando o login não existe, para o tempo de resposta não revelar se a conta existe.
    private static string? _hashFicticio;

    public async Task<SessaoResponse> RegistrarAsync(RegistrarRequest request, CancellationToken ct = default)
    {
        var cpf = Cpf.Criar(request.Cpf).Numero;
        if (await usuarios.ExisteCpfAsync(cpf, ct))
            throw new ConflitoException("Já existe uma conta cadastrada com este CPF.");

        var email = Texto.Limpar(request.Email)?.ToLowerInvariant();
        if (email is not null && await usuarios.ExisteEmailAsync(email, null, ct))
            throw new ConflitoException("Este e-mail já está em uso por outra conta.");

        var usuario = Usuario.Criar(request.Nome, request.NomeSocial, cpf, email, request.Telefone,
            hashSenha.GerarHash(request.Senha));
        usuario.RegistrarLogin();

        usuarios.Adicionar(usuario);
        await unidadeDeTrabalho.SalvarAsync(ct);

        return await geradorSessao.CriarAsync(usuario, ct);
    }

    public async Task<SessaoResponse> EntrarAsync(LoginRequest request, CancellationToken ct = default)
    {
        var login = request.Login.Trim();
        var usuario = login.Contains('@')
            ? await usuarios.ObterPorEmailAsync(login.ToLowerInvariant(), ct)
            : await usuarios.ObterPorCpfAsync(Texto.SomenteDigitos(login), ct);

        if (usuario is null)
        {
            hashSenha.Verificar(request.Senha, _hashFicticio ??= hashSenha.GerarHash(Guid.NewGuid().ToString()));
            throw new NaoAutenticadoException(MensagemCredenciaisInvalidas);
        }

        if (!hashSenha.Verificar(request.Senha, usuario.SenhaHash))
            throw new NaoAutenticadoException(MensagemCredenciaisInvalidas);

        if (!usuario.Ativo)
            throw new AcessoNegadoException("Sua conta está desativada. Entre em contato com a cafeteria.");

        usuario.RegistrarLogin();
        return await geradorSessao.CriarAsync(usuario, ct);
    }

    public async Task<SessaoResponse> RenovarAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await refreshTokens.ObterPorHashAsync(servicoToken.CalcularHash(refreshToken), ct)
                    ?? throw new NaoAutenticadoException();

        if (token.RevogadoEm is { } revogadoEm)
        {
            // Token já trocado sendo reutilizado depois da tolerância: possível roubo de sessão.
            // Por segurança, todas as sessões do usuário são encerradas.
            if (Relogio.Agora() - revogadoEm > ToleranciaReuso)
                await refreshTokens.RevogarTodosDoUsuarioAsync(token.UsuarioId, ct);
            throw new NaoAutenticadoException();
        }

        if (!token.EstaAtivo || token.Usuario is not { Ativo: true } usuario)
            throw new NaoAutenticadoException();

        var novo = servicoToken.GerarRefreshToken();
        token.Revogar(substituidoPor: novo.Hash);
        refreshTokens.Adicionar(RefreshToken.Criar(usuario.Id, novo.Hash, servicoToken.ValidadeRefreshToken));

        var acesso = servicoToken.GerarAccessToken(usuario);
        await unidadeDeTrabalho.SalvarAsync(ct);

        return new SessaoResponse(acesso.Valor, acesso.ExpiraEm, novo.Valor, novo.ExpiraEm, usuario.ParaDto());
    }

    public async Task SairAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await refreshTokens.ObterPorHashAsync(servicoToken.CalcularHash(refreshToken), ct);
        if (token is null || token.RevogadoEm is not null) return;

        token.Revogar();
        await unidadeDeTrabalho.SalvarAsync(ct);
    }
}
