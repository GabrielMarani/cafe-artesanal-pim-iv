using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Servicos;

/// <summary>Autoatendimento do usuário logado: perfil, senha e endereços.</summary>
public interface IContaServico
{
    Task<UsuarioLogadoDto> ObterPerfilAsync(CancellationToken ct = default);
    Task<UsuarioLogadoDto> AtualizarPerfilAsync(AtualizarPerfilRequest request, CancellationToken ct = default);
    Task<SessaoResponse> AlterarSenhaAsync(AlterarSenhaRequest request, CancellationToken ct = default);
    Task<List<EnderecoDto>> ListarEnderecosAsync(CancellationToken ct = default);
    Task<EnderecoDto> CriarEnderecoAsync(SalvarEnderecoRequest request, CancellationToken ct = default);
    Task<EnderecoDto> AtualizarEnderecoAsync(int id, SalvarEnderecoRequest request, CancellationToken ct = default);
    Task RemoverEnderecoAsync(int id, CancellationToken ct = default);
}

public sealed class ContaServico(
    IUsuarioAtual usuarioAtual,
    IUsuarioRepositorio usuarios,
    IEnderecoRepositorio enderecos,
    IRefreshTokenRepositorio refreshTokens,
    IHashSenha hashSenha,
    GeradorSessao geradorSessao,
    IUnidadeDeTrabalho unidadeDeTrabalho) : IContaServico
{
    private const int MaximoEnderecos = 10;

    public async Task<UsuarioLogadoDto> ObterPerfilAsync(CancellationToken ct = default) =>
        (await ObterUsuarioLogadoAsync(ct)).ParaDto();

    public async Task<UsuarioLogadoDto> AtualizarPerfilAsync(AtualizarPerfilRequest request, CancellationToken ct = default)
    {
        var usuario = await ObterUsuarioLogadoAsync(ct);

        var email = Texto.Limpar(request.Email)?.ToLowerInvariant();
        if (email is not null && await usuarios.ExisteEmailAsync(email, usuario.Id, ct))
            throw new ConflitoException("Este e-mail já está em uso por outra conta.");

        usuario.AtualizarDados(request.Nome, request.NomeSocial, email, request.Telefone);
        await unidadeDeTrabalho.SalvarAsync(ct);
        return usuario.ParaDto();
    }

    /// <summary>Troca a senha, encerra as outras sessões e devolve uma sessão nova para este dispositivo.</summary>
    public async Task<SessaoResponse> AlterarSenhaAsync(AlterarSenhaRequest request, CancellationToken ct = default)
    {
        var usuario = await ObterUsuarioLogadoAsync(ct);

        if (!hashSenha.Verificar(request.SenhaAtual, usuario.SenhaHash))
            throw new RegraNegocioException("A senha atual está incorreta.");
        if (request.SenhaAtual == request.NovaSenha)
            throw new RegraNegocioException("A nova senha deve ser diferente da atual.");

        usuario.AlterarSenha(hashSenha.GerarHash(request.NovaSenha));
        await refreshTokens.RevogarTodosDoUsuarioAsync(usuario.Id, ct);

        return await geradorSessao.CriarAsync(usuario, ct);
    }

    public async Task<List<EnderecoDto>> ListarEnderecosAsync(CancellationToken ct = default) =>
        (await enderecos.ListarPorUsuarioAsync(usuarioAtual.IdObrigatorio, ct)).Select(e => e.ParaDto()).ToList();

    public async Task<EnderecoDto> CriarEnderecoAsync(SalvarEnderecoRequest r, CancellationToken ct = default)
    {
        var usuarioId = usuarioAtual.IdObrigatorio;
        var existentes = await enderecos.ListarPorUsuarioAsync(usuarioId, ct);
        RegraNegocioException.Quando(existentes.Count >= MaximoEnderecos,
            $"Você pode cadastrar no máximo {MaximoEnderecos} endereços.");

        var principal = r.Principal || existentes.Count == 0;
        var endereco = Endereco.Criar(usuarioId, r.Apelido, r.Cep, r.Logradouro, r.Numero, r.Complemento,
            r.Bairro, r.Cidade, r.Uf, r.Referencia, principal);

        if (principal) existentes.ForEach(e => e.DefinirPrincipal(false));

        enderecos.Adicionar(endereco);
        await unidadeDeTrabalho.SalvarAsync(ct);
        return endereco.ParaDto();
    }

    public async Task<EnderecoDto> AtualizarEnderecoAsync(int id, SalvarEnderecoRequest r, CancellationToken ct = default)
    {
        var existentes = await enderecos.ListarPorUsuarioAsync(usuarioAtual.IdObrigatorio, ct);
        var endereco = existentes.FirstOrDefault(e => e.Id == id)
                       ?? throw RecursoNaoEncontradoException.Para("Endereço", id);

        // Sempre existe um principal: para trocar, marque outro endereço como principal.
        var outros = existentes.Where(e => e.Id != id).ToList();
        var principal = r.Principal || endereco.Principal || outros.Count == 0;

        endereco.Atualizar(r.Apelido, r.Cep, r.Logradouro, r.Numero, r.Complemento, r.Bairro, r.Cidade, r.Uf,
            r.Referencia, principal);

        if (principal) outros.ForEach(e => e.DefinirPrincipal(false));

        await unidadeDeTrabalho.SalvarAsync(ct);
        return endereco.ParaDto();
    }

    public async Task RemoverEnderecoAsync(int id, CancellationToken ct = default)
    {
        var existentes = await enderecos.ListarPorUsuarioAsync(usuarioAtual.IdObrigatorio, ct);
        var endereco = existentes.FirstOrDefault(e => e.Id == id)
                       ?? throw RecursoNaoEncontradoException.Para("Endereço", id);

        enderecos.Remover(endereco);

        // Se removeu o principal, o próximo endereço assume.
        if (endereco.Principal)
            existentes.FirstOrDefault(e => e.Id != id)?.DefinirPrincipal(true);

        await unidadeDeTrabalho.SalvarAsync(ct);
    }

    private async Task<Usuario> ObterUsuarioLogadoAsync(CancellationToken ct) =>
        await usuarios.ObterPorIdAsync(usuarioAtual.IdObrigatorio, ct) ?? throw new NaoAutenticadoException();
}
