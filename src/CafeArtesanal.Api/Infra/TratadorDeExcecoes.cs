using CafeArtesanal.Application.Comum;
using CafeArtesanal.Domain.Comum;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CafeArtesanal.Api.Infra;

/// <summary>
/// Converte exceções em respostas padronizadas (RFC 7807 - ProblemDetails).
/// Erros inesperados são registrados no log e não expõem detalhes internos.
/// </summary>
public sealed class TratadorDeExcecoes(ILogger<TratadorDeExcecoes> logger, IProblemDetailsService problemDetails)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext contexto, Exception excecao, CancellationToken ct)
    {
        var (status, titulo) = excecao switch
        {
            RegraNegocioException => (StatusCodes.Status422UnprocessableEntity, "Regra de negócio violada"),
            EntradaInvalidaException => (StatusCodes.Status400BadRequest, "Requisição inválida"),
            RecursoNaoEncontradoException => (StatusCodes.Status404NotFound, "Não encontrado"),
            ConflitoException => (StatusCodes.Status409Conflict, "Conflito"),
            AcessoNegadoException => (StatusCodes.Status403Forbidden, "Acesso negado"),
            NaoAutenticadoException => (StatusCodes.Status401Unauthorized, "Não autenticado"),
            OperationCanceledException => (499, "Requisição cancelada"),
            _ => (StatusCodes.Status500InternalServerError, "Erro interno")
        };

        var detalhe = status == StatusCodes.Status500InternalServerError
            ? "Ocorreu um erro inesperado. Tente novamente em instantes."
            : excecao.Message;

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(excecao, "Erro não tratado em {Metodo} {Caminho}", contexto.Request.Method, contexto.Request.Path);

        contexto.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = contexto,
            Exception = excecao,
            ProblemDetails = new ProblemDetails { Status = status, Title = titulo, Detail = detalhe }
        });
    }
}
