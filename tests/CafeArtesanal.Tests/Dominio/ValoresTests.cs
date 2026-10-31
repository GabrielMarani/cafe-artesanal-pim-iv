using CafeArtesanal.Domain.Comum;
using CafeArtesanal.Domain.Entidades;
using CafeArtesanal.Domain.Enums;

namespace CafeArtesanal.Tests.Dominio;

public class CpfTests
{
    [Theory]
    [InlineData("529.982.247-25")]
    [InlineData("52998224725")]
    [InlineData("390.533.447-05")]
    public void Cpf_valido(string cpf) => Assert.True(Cpf.EhValido(cpf));

    [Theory]
    [InlineData("529.982.247-24")]  // dígito verificador errado
    [InlineData("111.111.111-11")]  // todos iguais
    [InlineData("123")]
    [InlineData("")]
    public void Cpf_invalido(string cpf) => Assert.False(Cpf.EhValido(cpf));

    [Fact]
    public void Formata_e_guarda_somente_digitos()
    {
        var cpf = Cpf.Criar("529.982.247-25");
        Assert.Equal("52998224725", cpf.Numero);
        Assert.Equal("529.982.247-25", cpf.ToString());
    }
}

public class CodigoEnumTests
{
    [Theory]
    [InlineData(StatusPedido.SaiuParaEntrega, "saiu_para_entrega")]
    [InlineData(StatusPedido.EmPreparo, "em_preparo")]
    [InlineData(FormaPagamento.CartaoCredito, "cartao_credito")]
    public void Converte_para_snake_case_e_volta<T>(T valor, string codigo) where T : struct, Enum
    {
        Assert.Equal(codigo, valor.ParaCodigo());
        Assert.Equal(valor, CodigoEnum.DeCodigo<T>(codigo));
    }

    [Fact]
    public void Codigo_desconhecido_e_rejeitado() =>
        Assert.False(CodigoEnum.TentarConverter<StatusPedido>("voando", out _));
}

public class UsuarioTests
{
    [Fact]
    public void Nome_social_tem_prioridade_na_exibicao()
    {
        var usuario = Usuario.Criar("Carlos Eduardo Lima", "Carla Lima", "390.533.447-05", null, null, "hash");
        Assert.Equal("Carla Lima", usuario.NomeExibicao);

        usuario.AtualizarDados("Carlos Eduardo Lima", "  ", null, null);
        Assert.Equal("Carlos Eduardo Lima", usuario.NomeExibicao);
    }

    [Fact]
    public void Normaliza_email_e_telefone()
    {
        var usuario = Usuario.Criar("Ana", null, "52998224725", "  Ana@Email.COM ", "11912345678", "hash");
        Assert.Equal("ana@email.com", usuario.Email);
        Assert.Equal("(11) 91234-5678", usuario.Telefone);
    }

    [Theory]
    [InlineData("sem-arroba")]
    [InlineData("a@b")]
    public void Email_invalido_e_rejeitado(string email) =>
        Assert.Throws<RegraNegocioException>(() => Usuario.Criar("Ana", null, "52998224725", email, null, "hash"));
}

public class CategoriaTests
{
    [Fact]
    public void Gera_slug_sem_acentos() =>
        Assert.Equal("graos-especiais", Categoria.Criar("Grãos  Especiais", null, 1).Slug);
}
