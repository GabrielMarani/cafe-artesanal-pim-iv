using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CafeArtesanal.Infrastructure.Dados.Configuracoes;

public sealed class UsuarioConfiguracao : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> b)
    {
        b.ToTable("tb_usuario");
        b.HasKey(u => u.Id);
        b.Property(u => u.Id).HasColumnName("ID_USUARIO");
        b.Property(u => u.Nome).HasColumnName("NOME_USUARIO").HasMaxLength(100).IsRequired();
        b.Property(u => u.NomeSocial).HasColumnName("NOME_SOCIAL").HasMaxLength(100);
        b.Property(u => u.Cpf).HasColumnName("CPF_USUARIO").HasMaxLength(14).IsRequired();
        b.Property(u => u.Email).HasColumnName("EMAIL_USUARIO").HasMaxLength(150);
        b.Property(u => u.Telefone).HasColumnName("TELEFONE_USUARIO").HasMaxLength(20);
        b.Property(u => u.SenhaHash).HasColumnName("SENHA_HASH").HasMaxLength(255).IsRequired();
        b.Property(u => u.Perfil).HasColumnName("PERFIL_USUARIO").HasConversion(new ConversorCodigoEnum<PerfilUsuario>());
        b.Property(u => u.Ativo).HasColumnName("ATIVO");
        b.Property(u => u.UltimoLogin).HasColumnName("ULTIMO_LOGIN");
        b.Property(u => u.DataCadastro).HasColumnName("DATA_CADASTRO");
        b.Property(u => u.DataAtualizacao).HasColumnName("DATA_ATUALIZACAO");

        b.HasMany(u => u.Enderecos)
            .WithOne()
            .HasForeignKey(e => e.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class EnderecoConfiguracao : IEntityTypeConfiguration<Endereco>
{
    public void Configure(EntityTypeBuilder<Endereco> b)
    {
        b.ToTable("tb_endereco");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).HasColumnName("ID_ENDERECO");
        b.Property(e => e.UsuarioId).HasColumnName("ID_USUARIO");
        b.Property(e => e.Apelido).HasColumnName("APELIDO").HasMaxLength(40);
        b.Property(e => e.Cep).HasColumnName("CEP").HasMaxLength(8);
        b.Property(e => e.Logradouro).HasColumnName("LOGRADOURO").HasMaxLength(150);
        b.Property(e => e.Numero).HasColumnName("NUMERO").HasMaxLength(10);
        b.Property(e => e.Complemento).HasColumnName("COMPLEMENTO").HasMaxLength(60);
        b.Property(e => e.Bairro).HasColumnName("BAIRRO").HasMaxLength(80);
        b.Property(e => e.Cidade).HasColumnName("CIDADE").HasMaxLength(80);
        b.Property(e => e.Uf).HasColumnName("UF").HasMaxLength(2);
        b.Property(e => e.Referencia).HasColumnName("REFERENCIA").HasMaxLength(120);
        b.Property(e => e.Principal).HasColumnName("PRINCIPAL");
        b.Property(e => e.DataCriacao).HasColumnName("DATA_CRIACAO");
    }
}

public sealed class RefreshTokenConfiguracao : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("tb_refresh_token");
        b.HasKey(t => t.Id);
        b.Property(t => t.Id).HasColumnName("ID_REFRESH_TOKEN");
        b.Property(t => t.UsuarioId).HasColumnName("ID_USUARIO");
        b.Property(t => t.TokenHash).HasColumnName("TOKEN_HASH").HasMaxLength(64).IsRequired();
        b.Property(t => t.ExpiraEm).HasColumnName("EXPIRA_EM");
        b.Property(t => t.CriadoEm).HasColumnName("CRIADO_EM");
        b.Property(t => t.RevogadoEm).HasColumnName("REVOGADO_EM");
        b.Property(t => t.SubstituidoPor).HasColumnName("SUBSTITUIDO_POR").HasMaxLength(64);

        b.HasOne(t => t.Usuario)
            .WithMany()
            .HasForeignKey(t => t.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
