using CafeArtesanal.Infrastructure.Banco;
using CafeArtesanal.Infrastructure.Seguranca;

namespace CafeArtesanal.Tests.Infraestrutura;

public class HashSenhaTests
{
    private readonly HashSenhaPbkdf2 _hash = new();

    [Fact]
    public void Gera_hash_com_salt_diferente_e_verifica()
    {
        var h1 = _hash.GerarHash("Senha123");
        var h2 = _hash.GerarHash("Senha123");

        Assert.NotEqual(h1, h2);
        Assert.True(_hash.Verificar("Senha123", h1));
        Assert.False(_hash.Verificar("senha123", h1));
    }

    [Fact]
    public void Reconhece_o_hash_gravado_no_script_do_banco()
    {
        // Mesmo hash do usuário admin em database/bd_cafe_artesanal.sql
        const string hashDoScript = "pbkdf2-sha256$100000$KOgjto2S3SIVVx4BM3ajDA==$2SEGhWWKCIZYo7ijw7KCbGN5Ht2jU/9K51y9Ris17uY=";
        Assert.True(_hash.Verificar("Admin@123", hashDoScript));
    }

    [Theory]
    [InlineData("")]
    [InlineData("sha256$abc")]
    [InlineData("pbkdf2-sha256$100000$@@@$@@@")]
    public void Hash_malformado_nao_quebra(string hash) => Assert.False(_hash.Verificar("x", hash));
}

public class DivisorScriptSqlTests
{
    [Fact]
    public void Respeita_delimiter_strings_e_comentarios()
    {
        const string script = """
            -- comentário; com ponto e vírgula
            CREATE TABLE t (a VARCHAR(10) DEFAULT 'x;y');
            DELIMITER $$
            CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW
            BEGIN
              SET NEW.a = 'z';
            END$$
            DELIMITER ;
            INSERT INTO t VALUES ('it''s; ok');
            """;

        var comandos = DivisorScriptSql.Dividir(script);

        Assert.Equal(3, comandos.Count);
        Assert.Contains("'x;y'", comandos[0]);
        Assert.StartsWith("CREATE TRIGGER", comandos[1]);
        Assert.EndsWith("END", comandos[1]);
        Assert.Contains("'it''s; ok'", comandos[2]);
    }

    [Fact]
    public void Divide_o_script_real_do_banco()
    {
        var caminho = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "bd_cafe_artesanal.sql");
        var comandos = DivisorScriptSql.Dividir(File.ReadAllText(caminho));

        // Cada comando pode começar com as linhas de comentário que o antecedem no script.
        Assert.DoesNotContain(comandos, c => c.Contains("DELIMITER ", StringComparison.Ordinal));
        Assert.Equal(9, comandos.Count(c => c.Contains("CREATE TRIGGER")));
        Assert.Equal(5, comandos.Count(c => c.Contains("CREATE PROCEDURE")));
        Assert.All(comandos.Where(c => c.Contains("CREATE PROCEDURE")), c => Assert.EndsWith("END", c));
    }
}
