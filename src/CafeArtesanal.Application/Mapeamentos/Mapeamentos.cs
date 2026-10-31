using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.DTOs;
using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.Mapeamentos;

/// <summary>Conversões explícitas Entidade → DTO (sem bibliotecas de mapeamento).</summary>
public static class Mapeamentos
{
    public static UsuarioLogadoDto ParaDto(this Usuario u) =>
        new(u.Id, u.Nome, u.NomeSocial, u.NomeExibicao, Cpf.Formatar(u.Cpf), u.Email, u.Telefone, u.Perfil);

    public static UsuarioAdminDto ParaAdminDto(this Usuario u, int quantidadePedidos) =>
        new(u.Id, u.Nome, u.NomeSocial, u.NomeExibicao, Cpf.Formatar(u.Cpf), u.Email, u.Telefone,
            u.Perfil, u.Ativo, u.DataCadastro, u.UltimoLogin, quantidadePedidos);

    public static EnderecoDto ParaDto(this Endereco e) =>
        new(e.Id, e.Apelido, e.Cep, e.Logradouro, e.Numero, e.Complemento, e.Bairro, e.Cidade, e.Uf,
            e.Referencia, e.Principal, e.Descrever());

    public static CategoriaDto ParaDto(this Categoria c, int quantidadeProdutos = 0) =>
        new(c.Id, c.Nome, c.Slug, c.Descricao, c.OrdemExibicao, c.Ativo, quantidadeProdutos, c.DataAtualizacao);

    public static ProdutoDto ParaDto(this Produto p) =>
        new(p.Id, p.Nome, p.Descricao, p.ImagemUrl, p.Preco, p.CategoriaId, p.Categoria?.Nome, p.Categoria?.Slug,
            p.Estoque, p.EstoqueMinimo, p.Disponivel, p.EstoqueBaixo, p.Destaque, p.Ativo, p.DataAtualizacao);

    public static PedidoDto ParaDto(this Pedido p, IUsuarioAtual usuarioAtual)
    {
        var cliente = p.Usuario is null ? null : new ClientePedidoDto(p.Usuario.Id, p.Usuario.NomeExibicao, p.Usuario.Telefone);

        var itens = p.Itens
            .Select(i => new ItemPedidoDto(i.ProdutoId, i.NomeProduto, i.Produto?.ImagemUrl, i.Quantidade, i.ValorUnitario, i.Subtotal))
            .ToList();

        var historico = p.Historico
            .OrderBy(h => h.DataAlteracao).ThenBy(h => h.Id)
            .Select(h => new HistoricoStatusDto(h.StatusAnterior, h.StatusNovo, h.StatusNovo.Rotulo(),
                h.Usuario?.NomeExibicao, h.Observacao, h.DataAlteracao))
            .ToList();

        return new PedidoDto(
            p.Id, NumeroPedido(p.Id), p.DataPedido, p.DataAtualizacao,
            p.Status, p.Status.Rotulo(), p.TipoEntrega, p.FormaPagamento, p.FormaPagamento.Rotulo(),
            p.Subtotal, p.TaxaEntrega, p.Total, p.EnderecoEntrega, p.Observacao, p.MotivoCancelamento,
            cliente, itens, historico, CalcularAcoes(p, usuarioAtual));
    }

    public static string NumeroPedido(int id) => $"#{id:D5}";

    private static AcoesPedidoDto CalcularAcoes(Pedido p, IUsuarioAtual usuarioAtual)
    {
        if (usuarioAtual.EhEquipe)
        {
            var proximos = p.ProximosStatusPermitidos();
            return new AcoesPedidoDto(proximos.Contains(StatusPedido.Cancelado), false, proximos, p.ProximaEtapa());
        }

        var podeConfirmar = (p.TipoEntrega == TipoEntrega.Entrega && p.Status == StatusPedido.SaiuParaEntrega) ||
                            (p.TipoEntrega == TipoEntrega.Retirada && p.Status == StatusPedido.Pronto);
        return new AcoesPedidoDto(p.Status == StatusPedido.Pendente, podeConfirmar, Array.Empty<StatusPedido>(), null);
    }
}
