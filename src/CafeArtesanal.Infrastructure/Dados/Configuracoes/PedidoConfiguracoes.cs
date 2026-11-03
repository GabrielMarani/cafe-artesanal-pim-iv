using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CafeArtesanal.Infrastructure.Dados.Configuracoes;

public sealed class PedidoConfiguracao : IEntityTypeConfiguration<Pedido>
{
    public void Configure(EntityTypeBuilder<Pedido> b)
    {
        b.ToTable("tb_pedido");
        b.HasKey(p => p.Id);
        b.Property(p => p.Id).HasColumnName("ID_PEDIDO");
        b.Property(p => p.UsuarioId).HasColumnName("ID_USUARIO");
        // Concorrência otimista: se duas pessoas alterarem o mesmo pedido ao mesmo tempo,
        // só a primeira grava; a outra recebe um conflito em vez de sobrescrever.
        b.Property(p => p.Status).HasColumnName("STATUS_PEDIDO").HasConversion(new ConversorCodigoEnum<StatusPedido>()).IsConcurrencyToken();
        b.Property(p => p.TipoEntrega).HasColumnName("TIPO_ENTREGA").HasConversion(new ConversorCodigoEnum<TipoEntrega>());
        b.Property(p => p.FormaPagamento).HasColumnName("FORMA_PAGAMENTO").HasConversion(new ConversorCodigoEnum<FormaPagamento>());
        b.Property(p => p.Subtotal).HasColumnName("SUBTOTAL").HasPrecision(10, 2);
        b.Property(p => p.TaxaEntrega).HasColumnName("TAXA_ENTREGA").HasPrecision(10, 2);
        b.Property(p => p.Total).HasColumnName("TOTAL_PEDIDO").HasPrecision(10, 2);
        b.Property(p => p.EnderecoEntrega).HasColumnName("ENDERECO_ENTREGA").HasMaxLength(400);
        b.Property(p => p.Observacao).HasColumnName("OBSERVACAO").HasMaxLength(300);
        b.Property(p => p.MotivoCancelamento).HasColumnName("MOTIVO_CANCELAMENTO").HasMaxLength(255);
        b.Property(p => p.UsuarioAtualizacaoId).HasColumnName("ID_USUARIO_ATUALIZACAO");
        b.Property(p => p.DataPedido).HasColumnName("DATA_PEDIDO");
        b.Property(p => p.DataAtualizacao).HasColumnName("DATA_ATUALIZACAO");

        b.HasOne(p => p.Usuario)
            .WithMany()
            .HasForeignKey(p => p.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(p => p.UsuarioAtualizacaoId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(p => p.Itens)
            .WithOne()
            .HasForeignKey(i => i.PedidoId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(p => p.Historico)
            .WithOne()
            .HasForeignKey(h => h.PedidoId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ItemPedidoConfiguracao : IEntityTypeConfiguration<ItemPedido>
{
    public void Configure(EntityTypeBuilder<ItemPedido> b)
    {
        b.ToTable("tb_item_pedido");
        b.HasKey(i => i.Id);
        b.Property(i => i.Id).HasColumnName("ID_ITEM");
        b.Property(i => i.PedidoId).HasColumnName("ID_PEDIDO");
        b.Property(i => i.ProdutoId).HasColumnName("ID_PRODUTO");
        b.Property(i => i.NomeProduto).HasColumnName("NOME_PRODUTO").HasMaxLength(100).IsRequired();
        b.Property(i => i.Quantidade).HasColumnName("QUANTIDADE");
        b.Property(i => i.ValorUnitario).HasColumnName("VALOR_UNITARIO").HasPrecision(10, 2);
        // SUBTOTAL é coluna gerada no banco; no domínio é calculado (propriedade sem setter, não mapeada).

        b.HasOne(i => i.Produto)
            .WithMany()
            .HasForeignKey(i => i.ProdutoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class HistoricoStatusPedidoConfiguracao : IEntityTypeConfiguration<HistoricoStatusPedido>
{
    public void Configure(EntityTypeBuilder<HistoricoStatusPedido> b)
    {
        b.ToTable("tb_historico_status_pedido");
        b.HasKey(h => h.Id);
        b.Property(h => h.Id).HasColumnName("ID_HISTORICO");
        b.Property(h => h.PedidoId).HasColumnName("ID_PEDIDO");
        b.Property(h => h.StatusAnterior).HasColumnName("STATUS_ANTERIOR").HasConversion(new ConversorCodigoEnum<StatusPedido>());
        b.Property(h => h.StatusNovo).HasColumnName("STATUS_NOVO").HasConversion(new ConversorCodigoEnum<StatusPedido>());
        b.Property(h => h.UsuarioId).HasColumnName("ID_USUARIO");
        b.Property(h => h.Observacao).HasColumnName("OBSERVACAO").HasMaxLength(255);
        b.Property(h => h.DataAlteracao).HasColumnName("DATA_ALTERACAO");

        b.HasOne(h => h.Usuario)
            .WithMany()
            .HasForeignKey(h => h.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
