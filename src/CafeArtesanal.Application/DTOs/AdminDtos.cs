using System.ComponentModel.DataAnnotations;
using CafeArtesanal.Application.Comum;
using CafeArtesanal.Application.Validacao;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Application.DTOs;

// ------------------------------------------------------------------ Usuários (administração)

public sealed record UsuarioAdminDto(
    int Id,
    string Nome,
    string? NomeSocial,
    string NomeExibicao,
    string Cpf,
    string? Email,
    string? Telefone,
    PerfilUsuario Perfil,
    bool Ativo,
    DateTime DataCadastro,
    DateTime? UltimoLogin,
    int QuantidadePedidos);

public sealed class FiltroUsuarios : FiltroPaginado
{
    public string? Busca { get; set; }

    [CodigoEnum<PerfilUsuario>]
    public string? Perfil { get; set; }
}

public sealed class AlterarPerfilUsuarioRequest
{
    public PerfilUsuario Perfil { get; init; }
}

public sealed class AlterarAtivoRequest
{
    public bool Ativo { get; init; }
}

// ------------------------------------------------------------------ Relatórios (stored procedures)

public sealed record ResumoVendasDto(
    int TotalPedidos,
    int PedidosCancelados,
    decimal Faturamento,
    decimal TicketMedio,
    int ClientesAtendidos,
    int NovosClientes,
    int PedidosEmAberto);

public sealed record VendaDiaDto(DateTime Dia, int QuantidadePedidos, decimal Faturamento);

public sealed record ProdutoVendidoDto(int ProdutoId, string Nome, int QuantidadeVendida, decimal Faturamento);

public sealed record PedidosPorStatusDto(StatusPedido Status, string Rotulo, int Quantidade, decimal Valor);

public sealed record EstoqueBaixoDto(int ProdutoId, string Nome, string? Categoria, int Estoque, int EstoqueMinimo);

public sealed record DashboardDto(
    DateTime Inicio,
    DateTime Fim,
    ResumoVendasDto Resumo,
    IReadOnlyList<VendaDiaDto> VendasPorDia,
    IReadOnlyList<ProdutoVendidoDto> MaisVendidos,
    IReadOnlyList<PedidosPorStatusDto> PorStatus,
    IReadOnlyList<EstoqueBaixoDto> EstoqueBaixo);
