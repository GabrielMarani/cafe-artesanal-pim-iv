using CafeArtesanal.Application.Comum;
using CafeArtesanal.Domain.Comum;
using MySqlConnector;

namespace CafeArtesanal.Infrastructure.Dados;

/// <summary>
/// Converte erros do MariaDB/MySQL (triggers, CHECK, UNIQUE, FK) em exceções
/// da aplicação com mensagens amigáveis.
/// </summary>
internal static class TradutorErroBanco
{
    private const string SqlStateSignal = "45000"; // SIGNAL disparado por trigger/procedure
    private const int CheckMariaDb = 4025;         // ER_CONSTRAINT_FAILED (MariaDB)
    private const int CheckMySql = 3819;           // ER_CHECK_CONSTRAINT_VIOLATED (MySQL 8)

    public static Exception? Traduzir(Exception ex)
    {
        var mysql = ex as MySqlException ?? ex.InnerException as MySqlException;
        if (mysql is null) return null;

        if (mysql.SqlState == SqlStateSignal)
            return new RegraNegocioException(mysql.Message);

        return mysql.ErrorCode switch
        {
            MySqlErrorCode.DuplicateKeyEntry => new ConflitoException(MensagemDuplicidade(mysql.Message)),
            MySqlErrorCode.RowIsReferenced2 or MySqlErrorCode.RowIsReferenced =>
                new ConflitoException("O registro está sendo usado por outros dados e não pode ser removido."),
            _ when (int)mysql.ErrorCode is CheckMariaDb or CheckMySql =>
                new RegraNegocioException(MensagemCheck(mysql.Message)),
            _ => null
        };
    }

    private static string MensagemDuplicidade(string mensagem) => mensagem switch
    {
        _ when mensagem.Contains("UQ_USUARIO_CPF") => "Já existe uma conta cadastrada com este CPF.",
        _ when mensagem.Contains("UQ_USUARIO_EMAIL") => "Este e-mail já está em uso por outra conta.",
        _ when mensagem.Contains("UQ_CATEGORIA") => "Já existe uma categoria com este nome.",
        _ when mensagem.Contains("UQ_ITEM_PEDIDO_PRODUTO") => "O mesmo produto foi informado mais de uma vez.",
        _ => "Registro duplicado."
    };

    private static string MensagemCheck(string mensagem) => mensagem switch
    {
        _ when mensagem.Contains("CK_PRODUTO_ESTOQUE") => "Estoque insuficiente para concluir a operação.",
        _ when mensagem.Contains("CK_PEDIDO") => "Os valores do pedido são inconsistentes.",
        _ when mensagem.Contains("CK_USUARIO_CPF") => "CPF inválido.",
        _ => "Os dados violam uma regra do banco de dados."
    };
}
