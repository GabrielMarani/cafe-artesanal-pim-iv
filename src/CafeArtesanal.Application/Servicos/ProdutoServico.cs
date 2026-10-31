using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;

namespace CafeArtesanal.Application.Servicos;

public interface IProdutoServico
{
    Task<PaginaResultado<ProdutoDto>> PesquisarAsync(FiltroProdutos filtro, CancellationToken ct = default);
    Task<ProdutoDto> ObterAsync(int id, CancellationToken ct = default);
    Task<ProdutoDto> CriarAsync(SalvarProdutoRequest request, CancellationToken ct = default);
    Task<ProdutoDto> AtualizarAsync(int id, SalvarProdutoRequest request, CancellationToken ct = default);
    Task DesativarAsync(int id, CancellationToken ct = default);
    Task<AjusteEstoqueResultado> AjustarEstoqueAsync(int id, AjustarEstoqueRequest request, CancellationToken ct = default);
}

public sealed class ProdutoServico(
    IUsuarioAtual usuarioAtual,
    IProdutoRepositorio produtos,
    ICategoriaRepositorio categorias,
    IEstoqueRepositorio estoque,
    IUnidadeDeTrabalho unidadeDeTrabalho) : IProdutoServico
{
    public async Task<PaginaResultado<ProdutoDto>> PesquisarAsync(FiltroProdutos filtro, CancellationToken ct = default)
    {
        if (!usuarioAtual.EhEquipe) filtro.IncluirInativos = false;
        var pagina = await produtos.PesquisarAsync(filtro, ct);
        return pagina.Mapear(p => p.ParaDto());
    }

    public async Task<ProdutoDto> ObterAsync(int id, CancellationToken ct = default)
    {
        var produto = await produtos.ObterComCategoriaAsync(id, ct);
        if (produto is null || (!produto.Ativo && !usuarioAtual.EhEquipe))
            throw RecursoNaoEncontradoException.Para("Produto", id);
        return produto.ParaDto();
    }

    public async Task<ProdutoDto> CriarAsync(SalvarProdutoRequest r, CancellationToken ct = default)
    {
        await GarantirCategoriaAsync(r.CategoriaId, ct);

        var produto = Produto.Criar(r.Nome, r.Descricao, r.ImagemUrl, r.Preco, r.CategoriaId,
            r.EstoqueInicial, r.EstoqueMinimo, r.Destaque);
        if (!r.Ativo) produto.Desativar();

        produtos.Adicionar(produto);
        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(produto.Id, ct);
    }

    public async Task<ProdutoDto> AtualizarAsync(int id, SalvarProdutoRequest r, CancellationToken ct = default)
    {
        var produto = await produtos.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Produto", id);
        await GarantirCategoriaAsync(r.CategoriaId, ct);

        produto.Atualizar(r.Nome, r.Descricao, r.ImagemUrl, r.Preco, r.CategoriaId, r.EstoqueMinimo, r.Destaque, r.Ativo);
        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(id, ct);
    }

    /// <summary>Exclusão lógica: o produto some do cardápio mas continua nos pedidos antigos.</summary>
    public async Task DesativarAsync(int id, CancellationToken ct = default)
    {
        var produto = await produtos.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Produto", id);
        produto.Desativar();
        await unidadeDeTrabalho.SalvarAsync(ct);
    }

    public async Task<AjusteEstoqueResultado> AjustarEstoqueAsync(int id, AjustarEstoqueRequest r, CancellationToken ct = default)
    {
        RegraNegocioException.Quando(r.Quantidade == 0, "A quantidade do ajuste deve ser diferente de zero.");
        _ = await produtos.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Produto", id);

        var estoqueAtual = await estoque.AjustarAsync(id, r.Quantidade, r.Motivo.Trim(), usuarioAtual.IdObrigatorio, ct);
        return new AjusteEstoqueResultado(id, estoqueAtual);
    }

    private async Task GarantirCategoriaAsync(int? categoriaId, CancellationToken ct)
    {
        if (categoriaId is null) return;
        if (await categorias.ObterPorIdAsync(categoriaId.Value, ct) is null)
            throw new RegraNegocioException("Categoria informada não existe.");
    }
}
