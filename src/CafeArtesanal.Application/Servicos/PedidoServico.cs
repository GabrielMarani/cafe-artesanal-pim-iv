using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Application.Interfaces;
using CafeArtesanal.Application.Mapeamentos;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using Microsoft.Extensions.Options;

namespace CafeArtesanal.Application.Servicos;

public interface IPedidoServico
{
    Task<PedidoDto> CriarAsync(CriarPedidoRequest request, CancellationToken ct = default);
    Task<PaginaResultado<PedidoDto>> PesquisarAsync(FiltroPedidos filtro, CancellationToken ct = default);
    Task<PedidoDto> ObterAsync(int id, CancellationToken ct = default);
    Task<PedidoDto> AlterarStatusAsync(int id, AlterarStatusPedidoRequest request, CancellationToken ct = default);
    Task<PedidoDto> CancelarAsync(int id, CancelarPedidoRequest request, CancellationToken ct = default);
    Task<PedidoDto> ConfirmarRecebimentoAsync(int id, CancellationToken ct = default);
}

public sealed class PedidoServico(
    IUsuarioAtual usuarioAtual,
    IPedidoRepositorio pedidos,
    IProdutoRepositorio produtos,
    IEnderecoRepositorio enderecos,
    IUnidadeDeTrabalho unidadeDeTrabalho,
    IOptions<LojaOptions> loja) : IPedidoServico
{
    public async Task<PedidoDto> CriarAsync(CriarPedidoRequest r, CancellationToken ct = default)
    {
        var usuarioId = usuarioAtual.IdObrigatorio;

        // 1. Endereço: precisa ser um endereço salvo do próprio cliente.
        string? enderecoTexto = null;
        if (r.TipoEntrega == TipoEntrega.Entrega)
        {
            RegraNegocioException.Quando(r.EnderecoId is null, "Escolha um endereço para a entrega.");
            var endereco = await enderecos.ObterPorIdAsync(r.EnderecoId!.Value, ct);
            if (endereco is null || endereco.UsuarioId != usuarioId)
                throw new RegraNegocioException("Endereço de entrega inválido.");
            enderecoTexto = endereco.Descrever();
        }

        // 2. Produtos: preço e disponibilidade vêm SEMPRE do banco, nunca do cliente.
        var ids = r.Itens.Select(i => i.ProdutoId).Distinct().ToList();
        var catalogo = (await produtos.ObterPorIdsAsync(ids, ct)).ToDictionary(p => p.Id);

        var faltando = ids.Where(id => !catalogo.ContainsKey(id)).ToList();
        RegraNegocioException.Quando(faltando.Count > 0, $"Produto(s) não encontrado(s): {string.Join(", ", faltando)}.");

        // 3. Monta o agregado (regras de estoque, quantidades e totais ficam no domínio).
        var pedido = Pedido.Criar(usuarioId, r.TipoEntrega, r.FormaPagamento, enderecoTexto, r.Observacao, loja.Value.TaxaEntrega);
        foreach (var item in r.Itens)
            pedido.AdicionarItem(catalogo[item.ProdutoId], item.Quantidade);

        pedido.ValidarParaRegistro(loja.Value.PedidoMinimo);

        // 4. Grava. Os triggers do banco baixam o estoque e criam o histórico.
        pedidos.Adicionar(pedido);
        await unidadeDeTrabalho.SalvarAsync(ct);

        return await ObterAsync(pedido.Id, ct);
    }

    public async Task<PaginaResultado<PedidoDto>> PesquisarAsync(FiltroPedidos filtro, CancellationToken ct = default)
    {
        var usuarioId = usuarioAtual.IdObrigatorio;
        if (filtro.Status is not null && filtro.Status != "abertos" && !CodigoEnum.TentarConverter<StatusPedido>(filtro.Status, out _))
            throw new EntradaInvalidaException($"Status \"{filtro.Status}\" inválido.");

        // Cliente só enxerga os próprios pedidos; a equipe enxerga todos.
        var pagina = await pedidos.PesquisarAsync(filtro, usuarioAtual.EhEquipe ? null : usuarioId, ct);
        return pagina.Mapear(p => p.ParaDto(usuarioAtual));
    }

    public async Task<PedidoDto> ObterAsync(int id, CancellationToken ct = default)
    {
        var pedido = await pedidos.ObterDetalhadoAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Pedido", id);
        GarantirAcesso(pedido);
        return pedido.ParaDto(usuarioAtual);
    }

    public async Task<PedidoDto> AlterarStatusAsync(int id, AlterarStatusPedidoRequest r, CancellationToken ct = default)
    {
        if (!usuarioAtual.EhEquipe) throw new AcessoNegadoException();

        var pedido = await ObterParaAlteracaoAsync(id, ct);
        var novoStatus = CodigoEnum.DeCodigo<StatusPedido>(r.Status);
        pedido.AlterarStatus(novoStatus, usuarioAtual.IdObrigatorio, r.Motivo);

        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(id, ct);
    }

    public async Task<PedidoDto> CancelarAsync(int id, CancelarPedidoRequest r, CancellationToken ct = default)
    {
        var pedido = await ObterParaAlteracaoAsync(id, ct);
        var usuarioId = usuarioAtual.IdObrigatorio;

        if (usuarioAtual.EhEquipe)
            pedido.AlterarStatus(StatusPedido.Cancelado, usuarioId, r.Motivo ?? "Cancelado pela cafeteria");
        else
            pedido.CancelarPeloCliente(usuarioId, r.Motivo);

        // O trigger trg_pedido_au devolve os itens ao estoque.
        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(id, ct);
    }

    public async Task<PedidoDto> ConfirmarRecebimentoAsync(int id, CancellationToken ct = default)
    {
        var pedido = await ObterParaAlteracaoAsync(id, ct);
        pedido.ConfirmarRecebimento(usuarioAtual.IdObrigatorio);

        await unidadeDeTrabalho.SalvarAsync(ct);
        return await ObterAsync(id, ct);
    }

    private async Task<Pedido> ObterParaAlteracaoAsync(int id, CancellationToken ct)
    {
        var pedido = await pedidos.ObterPorIdAsync(id, ct) ?? throw RecursoNaoEncontradoException.Para("Pedido", id);
        GarantirAcesso(pedido);
        return pedido;
    }

    private void GarantirAcesso(Pedido pedido)
    {
        if (usuarioAtual.EhEquipe) return;
        // 404 em vez de 403: não revela a existência de pedidos de outras pessoas.
        if (!pedido.PertenceA(usuarioAtual.IdObrigatorio))
            throw RecursoNaoEncontradoException.Para("Pedido", pedido.Id);
    }
}
