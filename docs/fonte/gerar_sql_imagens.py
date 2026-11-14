"""Gera imagens (SVG) do código SQL de criação das tabelas — o modelo físico em forma de script.

Uso:  python docs/fonte/gerar_sql_imagens.py   (depois: python docs/fonte/exportar_png.py)
Saída: docs/diagramas/modelo_fisico_sql_1.svg ... _4.svg
O código vem direto de database/bd_cafe_artesanal.sql, com a numeração de linhas original.
"""
import re
from html import escape
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / "database" / "bd_cafe_artesanal.sql"
SAIDA = RAIZ / "docs" / "diagramas"

# Trechos (linhas inclusivas do script): criação do banco e das 10 tabelas, em 4 imagens.
PARTES = [(18, 91), (93, 140), (141, 194), (195, 253)]

FONTE = "Consolas, 'Cascadia Mono', 'Courier New', monospace"
TAM, ALT_LINHA, LARG_CHAR = 14, 20, 7.7
CORES = {"comentario": "#008000", "texto": "#a31515", "numero": "#098658", "palavra": "#0000ff",
         "tipo": "#267f99", "normal": "#1f1f1f"}
PALAVRAS = {"SET", "NAMES", "DROP", "DATABASE", "IF", "EXISTS", "CREATE", "DEFAULT", "CHARACTER", "COLLATE", "USE",
            "TABLE", "NOT", "NULL", "AUTO_INCREMENT", "CURRENT_TIMESTAMP", "ON", "UPDATE", "CONSTRAINT", "PRIMARY",
            "KEY", "UNIQUE", "FOREIGN", "REFERENCES", "DELETE", "CASCADE", "RESTRICT", "CHECK", "INDEX", "ENGINE",
            "COMMENT", "GENERATED", "ALWAYS", "AS", "STORED", "AND", "OR", "IS", "BETWEEN", "REGEXP"}
TIPOS = {"INT", "VARCHAR", "CHAR", "DECIMAL", "TINYINT", "DATETIME", "ENUM", "CHAR_LENGTH", "InnoDB"}
TOKEN = re.compile(r"(?P<comentario>--.*$)|(?P<texto>'[^']*')|(?P<numero>\b\d+\b)|(?P<palavra>\b[A-Za-z_]+\b)")


def colorir(linha):
    partes, pos = [], 0
    for m in TOKEN.finditer(linha):
        if m.start() > pos:
            partes.append(("normal", linha[pos:m.start()]))
        tipo = m.lastgroup
        if tipo == "palavra":
            palavra = m.group()
            tipo = "palavra" if palavra.upper() in PALAVRAS and palavra.isupper() else "tipo" if palavra in TIPOS else "normal"
        partes.append((tipo, m.group()))
        pos = m.end()
    if pos < len(linha):
        partes.append(("normal", linha[pos:]))
    return "".join(f'<tspan fill="{CORES[t]}">{escape(s)}</tspan>' for t, s in partes if s)


def imagem(linhas, inicio, numero, total):
    gutter, topo, margem = 56, 40, 14
    largura = int(gutter + 18 + max(len(l) for l in linhas) * LARG_CHAR + margem)
    altura = topo + 10 + len(linhas) * ALT_LINHA + margem
    corpo = [
        f'<rect x="0.5" y="0.5" width="{largura - 1}" height="{altura - 1}" fill="#ffffff" stroke="#c8c8c8"/>',
        f'<rect x="1" y="1" width="{largura - 2}" height="{topo - 2}" fill="#f3f3f3"/>',
        f'<line x1="0" y1="{topo}" x2="{largura}" y2="{topo}" stroke="#d4d4d4"/>',
        f'<rect x="1" y="1" width="230" height="{topo - 1}" fill="#ffffff"/>',
        f'<rect x="1" y="1" width="230" height="2" fill="#4b8bd4"/>',
        f'<text x="16" y="25" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#333">bd_cafe_artesanal.sql</text>',
        f'<text x="{largura - 14}" y="25" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#777" '
        f'text-anchor="end">Parte {numero} de {total} · linhas {inicio}–{inicio + len(linhas) - 1}</text>',
        f'<rect x="1" y="{topo + 1}" width="{gutter}" height="{altura - topo - 2}" fill="#fafafa"/>',
    ]
    for i, linha in enumerate(linhas):
        y = topo + 10 + (i + 1) * ALT_LINHA - 5
        corpo.append(f'<text x="{gutter - 10}" y="{y}" font-family="{FONTE}" font-size="{TAM}" fill="#9a9a9a" '
                     f'text-anchor="end">{inicio + i}</text>')
        corpo.append(f'<text x="{gutter + 14}" y="{y}" font-family="{FONTE}" font-size="{TAM}" '
                     f'xml:space="preserve">{colorir(linha)}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{largura}" height="{altura}" '
            f'viewBox="0 0 {largura} {altura}">\n' + "\n".join(corpo) + "\n</svg>\n")


if __name__ == "__main__":
    todas = SCRIPT.read_text(encoding="utf-8").splitlines()
    for n, (ini, fim) in enumerate(PARTES, start=1):
        trecho = todas[ini - 1:fim]
        while trecho and not trecho[-1].strip():
            trecho.pop()
        (SAIDA / f"modelo_fisico_sql_{n}.svg").write_text(imagem(trecho, ini, n, len(PARTES)), encoding="utf-8")
    print("Imagens do SQL geradas em", SAIDA)
