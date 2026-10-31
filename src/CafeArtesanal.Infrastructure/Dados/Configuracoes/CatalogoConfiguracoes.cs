using CafeArtesanal.Domain.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CafeArtesanal.Infrastructure.Dados.Configuracoes;

public sealed class CategoriaConfiguracao : IEntityTypeConfiguration<Categoria>
{
    public void Configure(EntityTypeBuilder<Categoria> b)
    {
        b.ToTable("tb_categoria");
        b.HasKey(c => c.Id);
        b.Property(c => c.Id).HasColumnName("ID_CATEGORIA");
        b.Property(c => c.Nome).HasColumnName("NOME_CATEGORIA").HasMaxLength(50).IsRequired();
        b.Property(c => c.Slug).HasColumnName("SLUG_CATEGORIA").HasMaxLength(60).IsRequired();
        b.Property(c => c.Descricao).HasColumnName("DESCRICAO_CATEGORIA").HasMaxLength(255);
        b.Property(c => c.OrdemExibicao).HasColumnName("ORDEM_EXIBICAO");
        b.Property(c => c.Ativo).HasColumnName("ATIVO");
        b.Property(c => c.DataCriacao).HasColumnName("DATA_CRIACAO");
        b.Property(c => c.DataAtualizacao).HasColumnName("DATA_ATUALIZACAO");

        b.HasMany(c => c.Produtos)
            .WithOne(p => p.Categoria)
            .HasForeignKey(p => p.CategoriaId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class ProdutoConfiguracao : IEntityTypeConfiguration<Produto>
{
    public void Configure(EntityTypeBuilder<Produto> b)
    {
        b.ToTable("tb_produto");
        b.HasKey(p => p.Id);
        b.Property(p => p.Id).HasColumnName("ID_PRODUTO");
        b.Property(p => p.CategoriaId).HasColumnName("ID_CATEGORIA");
        b.Property(p => p.Nome).HasColumnName("NOME_PRODUTO").HasMaxLength(100).IsRequired();
        b.Property(p => p.Descricao).HasColumnName("DESCRICAO_PRODUTO").HasMaxLength(500);
        b.Property(p => p.ImagemUrl).HasColumnName("IMAGEM_URL").HasMaxLength(500);
        b.Property(p => p.Preco).HasColumnName("PRECO").HasPrecision(10, 2);
        b.Property(p => p.Estoque).HasColumnName("ESTOQUE");
        b.Property(p => p.EstoqueMinimo).HasColumnName("ESTOQUE_MINIMO");
        b.Property(p => p.Destaque).HasColumnName("DESTAQUE");
        b.Property(p => p.Ativo).HasColumnName("ATIVO");
        b.Property(p => p.DataCriacao).HasColumnName("DATA_CRIACAO");
        b.Property(p => p.DataAtualizacao).HasColumnName("DATA_ATUALIZACAO");
    }
}
