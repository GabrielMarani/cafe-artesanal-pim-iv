namespace CafeArtesanal.Application.Comum;

// Exceções da camada de aplicação. Não conhecem HTTP: a API traduz cada uma
// para o código de status adequado (ver TratadorDeExcecoes na API).

/// <summary>Recurso inexistente (HTTP 404).</summary>
public class RecursoNaoEncontradoException(string mensagem) : Exception(mensagem)
{
    public static RecursoNaoEncontradoException Para(string recurso, int id) =>
        new($"{recurso} #{id} não encontrado(a).");
}

/// <summary>Conflito com dados existentes, ex.: CPF já cadastrado (HTTP 409).</summary>
public class ConflitoException(string mensagem) : Exception(mensagem);

/// <summary>Usuário autenticado sem permissão para a ação (HTTP 403).</summary>
public class AcessoNegadoException(string mensagem = "Você não tem permissão para realizar esta ação.")
    : Exception(mensagem);

/// <summary>Credenciais ou sessão inválidas (HTTP 401).</summary>
public class NaoAutenticadoException(string mensagem = "Sessão inválida ou expirada. Faça login novamente.")
    : Exception(mensagem);

/// <summary>Parâmetro de entrada inválido (HTTP 400).</summary>
public class EntradaInvalidaException(string mensagem) : Exception(mensagem);
