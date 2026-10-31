using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Servicos;

public interface ICategoriaServico
{
    Task<List<CategoriaDto>> ListarAsync(bool incluirInativas, CancellationToken ct = default);
    Task<CategoriaDto> ObterAsync(int id, CancellationToken ct = default);
    Task<CategoriaDto> CriarAsync(SalvarCategoriaRequest request, CancellationToken ct = default);
    Task<CategoriaDto> AtualizarAsync(int id, SalvarCategoriaRequest request, CancellationToken ct = default);
    Task ExcluirAsync(int id, CancellationToken ct = default);
}

public sealed class CategoriaServico(
    IUsuarioAtual usuarioAtual,
    ICategoriaRepositorio categorias,
    IUnidadeDeTrabalho unidadeDeTrabalho) : ICategoriaServico
{
    public async Task<List<CategoriaDto>> ListarAsync(bool incluirInativas, CancellationToken ct = default)
    {
        var lista = await categorias.ListarAsync(incluirInativas && usuarioAtual.EhEquipe, ct);
        var contagem = await categorias.ContarProdutosAtivosAsync(ct);
        return lista.Select(c => c.ParaDto(contagem.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<CategoriaDto> ObterAsync(int id, CancellationToken ct = default)
    {
        var categoria = await categorias.ObterPorIdAsync(id, ct);
        if (categoria is null || (!categoria.Ativo && !usuarioAtual.EhEquipe))
            throw RecursoNaoEncontradoException.Para("Categoria", id);

        var contagem = await categorias.ContarProdutosAtivosAsync(ct);
        return categoria.ParaDto(contagem.GetValueOrDefault(id));
    }

    public async Task<CategoriaDto> CriarAsync(SalvarCategoriaRequest r, CancellationToken ct = default)
    {
        var categoria = Categoria.Criar(r.Nome, r.Descricao, r.OrdemExibicao);
        if (!r.Ativo) categoria.Atualizar(r.Nome, r.Descricao, r.OrdemExibicao, ativo: false);
        await GarantirSlugUnicoAsync(categoria.Slug, null, ct);

        categorias.Adicionar(categoria);
        await unidadeDeTrabalho.SalvarAsync(ct);
        return categoria.ParaDto();
    }

    public async Task<CategoriaDto> AtualizarAsync(int id, SalvarCategoriaRequest r, CancellationToken ct = default)
    {
        var categoria = await categorias.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Categoria", id);

        categoria.Atualizar(r.Nome, r.Descricao, r.OrdemExibicao, r.Ativo);
        await GarantirSlugUnicoAsync(categoria.Slug, id, ct);

        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(id, ct);
    }

    public async Task ExcluirAsync(int id, CancellationToken ct = default)
    {
        var categoria = await categorias.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Categoria", id);

        if (await categorias.PossuiProdutosAsync(id, ct))
            throw new ConflitoException("A categoria possui produtos. Mova os produtos ou desative a categoria.");

        categorias.Remover(categoria);
        await unidadeDeTrabalho.SalvarAsync(ct);
    }

    private async Task GarantirSlugUnicoAsync(string slug, int? ignorarId, CancellationToken ct)
    {
        if (await categorias.ExisteSlugAsync(slug, ignorarId, ct))
            throw new ConflitoException("Já existe uma categoria com este nome.");
    }
}
