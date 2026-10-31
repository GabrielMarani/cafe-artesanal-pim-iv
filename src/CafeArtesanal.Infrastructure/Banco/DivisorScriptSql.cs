using System.Text;

namespace CafeArtesanal.Infrastructure.Banco;

/// <summary>
/// Divide um script .sql em comandos individuais, entendendo a diretiva DELIMITER
/// (usada nos triggers e procedures), strings e comentários — o mesmo que o
/// cliente "mysql" faz na linha de comando.
/// </summary>
public static class DivisorScriptSql
{
    public static IReadOnlyList<string> Dividir(string script)
    {
        var comandos = new List<string>();
        var atual = new StringBuilder();
        var delimitador = ";";
        var temConteudo = false;
        var i = 0;

        void Emitir()
        {
            if (temConteudo) comandos.Add(atual.ToString().Trim());
            atual.Clear();
            temConteudo = false;
        }

        while (i < script.Length)
        {
            // Diretiva DELIMITER: só vale no início de uma linha, fora de qualquer comando.
            if (InicioDeLinha(script, i) && !temConteudo && ComecaCom(script, i, "DELIMITER "))
            {
                var fimLinha = script.IndexOf('\n', i);
                if (fimLinha < 0) fimLinha = script.Length;
                delimitador = script[(i + "DELIMITER ".Length)..fimLinha].Trim();
                atual.Clear();
                i = fimLinha + 1;
                continue;
            }

            var c = script[i];

            // Comentários de linha: "-- " e "#"
            if ((c == '-' && ComecaCom(script, i, "--")) || c == '#')
            {
                var fimLinha = script.IndexOf('\n', i);
                if (fimLinha < 0) fimLinha = script.Length;
                atual.Append(script, i, fimLinha - i);
                i = fimLinha;
                continue;
            }

            // Comentário de bloco
            if (c == '/' && ComecaCom(script, i, "/*"))
            {
                var fim = script.IndexOf("*/", i + 2, StringComparison.Ordinal);
                fim = fim < 0 ? script.Length : fim + 2;
                atual.Append(script, i, fim - i);
                i = fim;
                continue;
            }

            // Strings e identificadores entre crases
            if (c is '\'' or '"' or '`')
            {
                var fim = FimDoLiteral(script, i, c);
                atual.Append(script, i, fim - i);
                temConteudo = true;
                i = fim;
                continue;
            }

            if (ComecaCom(script, i, delimitador))
            {
                Emitir();
                i += delimitador.Length;
                continue;
            }

            atual.Append(c);
            if (!char.IsWhiteSpace(c)) temConteudo = true;
            i++;
        }

        Emitir();
        return comandos;
    }

    private static bool InicioDeLinha(string s, int i)
    {
        var j = i - 1;
        while (j >= 0 && (s[j] == ' ' || s[j] == '\t')) j--;
        return j < 0 || s[j] == '\n';
    }

    private static bool ComecaCom(string s, int i, string trecho) =>
        i + trecho.Length <= s.Length &&
        string.Compare(s, i, trecho, 0, trecho.Length, StringComparison.OrdinalIgnoreCase) == 0;

    private static int FimDoLiteral(string s, int inicio, char aspas)
    {
        var i = inicio + 1;
        while (i < s.Length)
        {
            if (s[i] == '\\' && aspas != '`') { i += 2; continue; }
            if (s[i] == aspas)
            {
                if (i + 1 < s.Length && s[i + 1] == aspas) { i += 2; continue; } // aspas duplicadas
                return i + 1;
            }
            i++;
        }
        return s.Length;
    }
}
