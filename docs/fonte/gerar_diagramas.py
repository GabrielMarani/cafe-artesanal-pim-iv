"""Gera os diagramas do PIM IV em SVG: caso de uso, modelo lógico e modelo físico do banco.

Uso:  python docs/fonte/gerar_diagramas.py
Saída: docs/diagramas/*.svg (depois o PDF e os PNG são gerados a partir deles).
As tabelas abaixo seguem database/bd_cafe_artesanal.sql.
"""
from html import escape
from math import hypot, sqrt
from pathlib import Path

SAIDA = Path(__file__).resolve().parent.parent / "diagramas"
FONTE = "Arial, Helvetica, sans-serif"

# Larguras aproximadas dos caracteres da Arial (em "em"), para dimensionar caixas e textos.
_LARG = {**{c: 0.667 for c in "ABCDEFGHKNPRSUVXY"}, **{c: 0.722 for c in "CDHNRUw"}, "M": 0.833, "W": 0.944,
         "O": 0.778, "Q": 0.778, "G": 0.778, "I": 0.278, "J": 0.5, "L": 0.556, "T": 0.611, "Z": 0.611, "F": 0.611,
         "E": 0.667, "_": 0.556, " ": 0.278, "(": 0.333, ")": 0.333, ",": 0.278, ".": 0.278, "…": 1.0}


def largura(texto, tamanho):
    total = 0.0
    for c in texto:
        if c in _LARG:
            total += _LARG[c]
        elif c.isdigit():
            total += 0.556
        elif c.islower():
            total += 0.52
        else:
            total += 0.6
    return total * tamanho


def txt(x, y, texto, tamanho=12, peso="normal", ancora="start", cor="#000", estilo="normal"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FONTE}" font-size="{tamanho}" font-weight="{peso}" '
            f'font-style="{estilo}" text-anchor="{ancora}" fill="{cor}">{escape(texto)}</text>')


def svg(largura_total, altura_total, corpo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{largura_total}" height="{altura_total}" '
            f'viewBox="0 0 {largura_total} {altura_total}">\n'
            f'<rect width="100%" height="100%" fill="#fff"/>\n' + "\n".join(corpo) + "\n</svg>\n")


# =====================================================================================
# 1. DIAGRAMA DE CASO DE USO
# =====================================================================================

def caso_de_uso():
    corpo = []
    W, H = 1100, 760
    rx_ry = {"A": (92, 24), "B": (78, 24), "C": (100, 24)}
    cx = {"A": 360, "B": 590, "C": 785}

    casos = {
        # coluna A: visitante e cliente
        "cardapio": ("A", 100, ["Consultar cardápio"]),
        "carrinho": ("A", 160, ["Montar carrinho"]),
        "conta": ("A", 220, ["Criar conta"]),
        "pedido": ("A", 340, ["Realizar pedido"]),
        "acompanhar": ("A", 400, ["Acompanhar pedidos"]),
        "receber": ("A", 460, ["Confirmar recebimento"]),
        "dados": ("A", 520, ["Gerenciar dados da conta"]),
        "enderecos": ("A", 580, ["Gerenciar endereços"]),
        "sair": ("A", 640, ["Sair da conta"]),
        # coluna B: casos compartilhados e extensões
        "buscar": ("B", 100, ["Buscar e filtrar", "produtos"]),
        "login": ("B", 285, ["Efetuar login"]),
        "cancelar_cli": ("B", 400, ["Cancelar pedido"]),
        # coluna C: atendente e administrador
        "fila": ("C", 110, ["Listar pedidos recebidos"]),
        "status": ("C", 170, ["Atualizar status do pedido"]),
        "cancelar_eq": ("C", 225, ["Cancelar pedido com motivo"]),
        "historico": ("C", 350, ["Consultar histórico", "de pedidos"]),
        "produtos": ("C", 445, ["Gerenciar produtos"]),
        "estoque": ("C", 505, ["Controlar estoque"]),
        "categorias": ("C", 565, ["Gerenciar categorias"]),
        "usuarios": ("C", 625, ["Gerenciar usuários"]),
        "indicadores": ("C", 685, ["Visualizar indicadores"]),
    }

    def geo(chave):
        col, y, _ = casos[chave]
        rx, ry = rx_ry[col]
        return cx[col], y, rx, ry

    def borda(chave, px, py):
        """Ponto da borda da elipse na direção de (px, py)."""
        x, y, rx, ry = geo(chave)
        vx, vy = px - x, py - y
        t = 1 / sqrt((vx / rx) ** 2 + (vy / ry) ** 2)
        return x + vx * t, y + vy * t

    # Fronteira do sistema
    corpo.append('<rect x="200" y="30" width="700" height="700" fill="none" stroke="#000" stroke-width="1.5"/>')
    corpo.append(txt(550, 52, "Sistema Café Artesanal", 14, "bold", "middle"))

    atores = {"Visitante": (95, 285, "esq"), "Cliente": (95, 520, "esq"),
              "Atendente": (1005, 240, "dir"), "Administrador": (1005, 570, "dir")}

    linhas = []

    def associacao(ator, caso):
        ax, ay, lado = atores[ator]
        px, py = (ax + 18 if lado == "esq" else ax - 18), ay - 15
        # Liga na ponta lateral da elipse: assim a linha não passa por trás das outras da coluna.
        x, y, rx, _ = geo(caso)
        bx, by = (x - rx if lado == "esq" else x + rx), y
        linhas.append(f'<line x1="{px}" y1="{py}" x2="{bx:.1f}" y2="{by:.1f}" stroke="#000" stroke-width="1"/>')

    for c in ["cardapio", "carrinho", "conta", "login"]:
        associacao("Visitante", c)
    for c in ["pedido", "acompanhar", "receber", "dados", "enderecos", "sair"]:
        associacao("Cliente", c)
    for c in ["fila", "status", "cancelar_eq", "historico", "login"]:
        associacao("Atendente", c)
    for c in ["produtos", "estoque", "categorias", "usuarios", "indicadores"]:
        associacao("Administrador", c)

    def seta_aberta(x1, y1, x2, y2):
        d = hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / d, (y2 - y1) / d
        nx, ny = -uy, ux
        a = (x2 - ux * 10 + nx * 5, y2 - uy * 10 + ny * 5)
        b = (x2 - ux * 10 - nx * 5, y2 - uy * 10 - ny * 5)
        return (f'<polyline points="{a[0]:.1f},{a[1]:.1f} {x2:.1f},{y2:.1f} {b[0]:.1f},{b[1]:.1f}" '
                f'fill="none" stroke="#000" stroke-width="1"/>')

    def dependencia(origem, destino, rotulo):
        ox, oy, *_ = geo(origem)
        dx, dy, *_ = geo(destino)
        x1, y1 = borda(origem, dx, dy)
        x2, y2 = borda(destino, ox, oy)
        linhas.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#000" '
                      f'stroke-width="1" stroke-dasharray="5,3"/>')
        linhas.append(seta_aberta(x1, y1, x2, y2))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        linhas.append(txt(mx, my - 6, f"«{rotulo}»", 10.5, ancora="middle"))

    dependencia("buscar", "cardapio", "extend")
    dependencia("cancelar_cli", "acompanhar", "extend")
    dependencia("pedido", "login", "include")

    def generalizacao(filho, pai):
        fx, fy, _ = atores[filho]
        _, py, _ = atores[pai]
        y1, y2 = (fy - 48, py + 56) if fy > py else (fy + 56, py - 48)
        linhas.append(f'<line x1="{fx}" y1="{y1}" x2="{fx}" y2="{y2 + 12}" stroke="#000" stroke-width="1"/>')
        linhas.append(f'<polygon points="{fx},{y2} {fx - 8},{y2 + 13} {fx + 8},{y2 + 13}" fill="#fff" '
                      f'stroke="#000" stroke-width="1"/>')

    generalizacao("Cliente", "Visitante")
    generalizacao("Administrador", "Atendente")

    corpo.extend(linhas)

    for chave, (col, y, rotulo) in casos.items():
        x, _, rx, ry = geo(chave)
        corpo.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" stroke="#000" stroke-width="1.2"/>')
        base = y + 4 - (len(rotulo) - 1) * 7
        for i, linha in enumerate(rotulo):
            corpo.append(txt(x, base + i * 14, linha, 12, ancora="middle"))

    for nome, (ax, ay, _) in atores.items():
        corpo.append(f'<circle cx="{ax}" cy="{ay - 35}" r="10" fill="#fff" stroke="#000" stroke-width="1.5"/>')
        corpo.append(f'<line x1="{ax}" y1="{ay - 25}" x2="{ax}" y2="{ay + 5}" stroke="#000" stroke-width="1.5"/>')
        corpo.append(f'<line x1="{ax - 16}" y1="{ay - 15}" x2="{ax + 16}" y2="{ay - 15}" stroke="#000" stroke-width="1.5"/>')
        corpo.append(f'<line x1="{ax}" y1="{ay + 5}" x2="{ax - 12}" y2="{ay + 30}" stroke="#000" stroke-width="1.5"/>')
        corpo.append(f'<line x1="{ax}" y1="{ay + 5}" x2="{ax + 12}" y2="{ay + 30}" stroke="#000" stroke-width="1.5"/>')
        corpo.append(txt(ax, ay + 48, nome, 12.5, "bold", "middle"))

    return svg(W, H, corpo)


# =====================================================================================
# 2 e 3. MODELOS LÓGICO E FÍSICO
# =====================================================================================
# (chave, coluna, tipo, obrigatório)
PK, FK, UQ = "PK", "FK", "UQ"
TABELAS = {
    "categoria": {
        "colunas": [(PK, "ID_CATEGORIA", "INT", 1), (UQ, "NOME_CATEGORIA", "VARCHAR(50)", 1),
                    (UQ, "SLUG_CATEGORIA", "VARCHAR(60)", 1), ("", "DESCRICAO_CATEGORIA", "VARCHAR(255)", 0),
                    ("", "ORDEM_EXIBICAO", "INT", 1), ("", "ATIVO", "TINYINT(1)", 1),
                    ("", "DATA_CRIACAO", "DATETIME", 1), ("", "DATA_ATUALIZACAO", "DATETIME", 1)],
        "indices": [],
    },
    "produto": {
        "colunas": [(PK, "ID_PRODUTO", "INT", 1), (FK, "ID_CATEGORIA", "INT", 0),
                    ("", "NOME_PRODUTO", "VARCHAR(100)", 1), ("", "DESCRICAO_PRODUTO", "VARCHAR(500)", 0),
                    ("", "IMAGEM_URL", "VARCHAR(500)", 0), ("", "PRECO", "DECIMAL(10,2)", 1),
                    ("", "ESTOQUE", "INT", 1), ("", "ESTOQUE_MINIMO", "INT", 1), ("", "DESTAQUE", "TINYINT(1)", 1),
                    ("", "ATIVO", "TINYINT(1)", 1), ("", "DATA_CRIACAO", "DATETIME", 1),
                    ("", "DATA_ATUALIZACAO", "DATETIME", 1)],
        "indices": ["IX_PRODUTO_CATEGORIA_ATIVO (ID_CATEGORIA, ATIVO)", "IX_PRODUTO_DESTAQUE (DESTAQUE, ATIVO)",
                    "IX_PRODUTO_ATUALIZACAO (DATA_ATUALIZACAO)"],
    },
    "historico_preco": {
        "colunas": [(PK, "ID_HISTORICO_PRECO", "INT", 1), (FK, "ID_PRODUTO", "INT", 1),
                    ("", "PRECO_ANTERIOR", "DECIMAL(10,2)", 1), ("", "PRECO_NOVO", "DECIMAL(10,2)", 1),
                    ("", "DATA_ALTERACAO", "DATETIME", 1)],
        "indices": ["IX_HIST_PRECO_PRODUTO (ID_PRODUTO, DATA_ALTERACAO)"],
    },
    "usuario": {
        "colunas": [(PK, "ID_USUARIO", "INT", 1), ("", "NOME_USUARIO", "VARCHAR(100)", 1),
                    ("", "NOME_SOCIAL", "VARCHAR(100)", 0), (UQ, "CPF_USUARIO", "VARCHAR(14)", 1),
                    (UQ, "EMAIL_USUARIO", "VARCHAR(150)", 0), ("", "TELEFONE_USUARIO", "VARCHAR(20)", 0),
                    ("", "SENHA_HASH", "VARCHAR(255)", 1), ("", "PERFIL_USUARIO", "ENUM", 1),
                    ("", "ATIVO", "TINYINT(1)", 1), ("", "ULTIMO_LOGIN", "DATETIME", 0),
                    ("", "DATA_CADASTRO", "DATETIME", 1), ("", "DATA_ATUALIZACAO", "DATETIME", 1)],
        "indices": ["IX_USUARIO_PERFIL (PERFIL_USUARIO, ATIVO)"],
    },
    "endereco": {
        "colunas": [(PK, "ID_ENDERECO", "INT", 1), (FK, "ID_USUARIO", "INT", 1), ("", "APELIDO", "VARCHAR(40)", 1),
                    ("", "CEP", "CHAR(8)", 1), ("", "LOGRADOURO", "VARCHAR(150)", 1), ("", "NUMERO", "VARCHAR(10)", 1),
                    ("", "COMPLEMENTO", "VARCHAR(60)", 0), ("", "BAIRRO", "VARCHAR(80)", 1),
                    ("", "CIDADE", "VARCHAR(80)", 1), ("", "UF", "CHAR(2)", 1), ("", "REFERENCIA", "VARCHAR(120)", 0),
                    ("", "PRINCIPAL", "TINYINT(1)", 1), ("", "DATA_CRIACAO", "DATETIME", 1)],
        "indices": ["IX_ENDERECO_USUARIO (ID_USUARIO)"],
    },
    "pedido": {
        "colunas": [(PK, "ID_PEDIDO", "INT", 1), (FK, "ID_USUARIO", "INT", 0), ("", "STATUS_PEDIDO", "ENUM", 1),
                    ("", "TIPO_ENTREGA", "ENUM", 1), ("", "FORMA_PAGAMENTO", "ENUM", 1),
                    ("", "SUBTOTAL", "DECIMAL(10,2)", 1), ("", "TAXA_ENTREGA", "DECIMAL(10,2)", 1),
                    ("", "TOTAL_PEDIDO", "DECIMAL(10,2)", 1), ("", "ENDERECO_ENTREGA", "VARCHAR(400)", 0),
                    ("", "OBSERVACAO", "VARCHAR(300)", 0), ("", "MOTIVO_CANCELAMENTO", "VARCHAR(255)", 0),
                    (FK, "ID_USUARIO_ATUALIZACAO", "INT", 0), ("", "DATA_PEDIDO", "DATETIME", 1),
                    ("", "DATA_ATUALIZACAO", "DATETIME", 1)],
        "indices": ["IX_PEDIDO_USUARIO_DATA (ID_USUARIO, DATA_PEDIDO)",
                    "IX_PEDIDO_STATUS_DATA (STATUS_PEDIDO, DATA_PEDIDO)", "IX_PEDIDO_DATA (DATA_PEDIDO)"],
    },
    "item_pedido": {
        "colunas": [(PK, "ID_ITEM", "INT", 1), (FK, "ID_PEDIDO", "INT", 1), (FK, "ID_PRODUTO", "INT", 1),
                    ("", "NOME_PRODUTO", "VARCHAR(100)", 1), ("", "QUANTIDADE", "INT", 1),
                    ("", "VALOR_UNITARIO", "DECIMAL(10,2)", 1), ("", "SUBTOTAL", "DECIMAL(10,2)", 0)],
        "indices": ["UQ_ITEM_PEDIDO_PRODUTO (ID_PEDIDO, ID_PRODUTO)", "IX_ITEM_PRODUTO (ID_PRODUTO)",
                    "SUBTOTAL: coluna gerada (QUANTIDADE × VALOR_UNITARIO)"],
    },
    "historico_status_pedido": {
        "colunas": [(PK, "ID_HISTORICO", "INT", 1), (FK, "ID_PEDIDO", "INT", 1), ("", "STATUS_ANTERIOR", "ENUM", 0),
                    ("", "STATUS_NOVO", "ENUM", 1), (FK, "ID_USUARIO", "INT", 0), ("", "OBSERVACAO", "VARCHAR(255)", 0),
                    ("", "DATA_ALTERACAO", "DATETIME", 1)],
        "indices": ["IX_HIST_STATUS_PEDIDO (ID_PEDIDO, DATA_ALTERACAO)"],
    },
    "movimentacao_estoque": {
        "colunas": [(PK, "ID_MOVIMENTACAO", "INT", 1), (FK, "ID_PRODUTO", "INT", 1),
                    ("", "TIPO_MOVIMENTACAO", "ENUM", 1), ("", "QUANTIDADE", "INT", 1),
                    ("", "ESTOQUE_RESULTANTE", "INT", 1), (FK, "ID_PEDIDO", "INT", 0), (FK, "ID_USUARIO", "INT", 0),
                    ("", "MOTIVO", "VARCHAR(255)", 0), ("", "DATA_MOVIMENTACAO", "DATETIME", 1)],
        "indices": ["IX_MOV_PRODUTO_DATA (ID_PRODUTO, DATA_MOVIMENTACAO)"],
    },
    "refresh_token": {
        "colunas": [(PK, "ID_REFRESH_TOKEN", "INT", 1), (FK, "ID_USUARIO", "INT", 1), (UQ, "TOKEN_HASH", "CHAR(64)", 1),
                    ("", "EXPIRA_EM", "DATETIME", 1), ("", "CRIADO_EM", "DATETIME", 1),
                    ("", "REVOGADO_EM", "DATETIME", 0), ("", "SUBSTITUIDO_POR", "CHAR(64)", 0)],
        "indices": ["IX_REFRESH_TOKEN_USUARIO (ID_USUARIO, EXPIRA_EM)"],
    },
}

GRADE = [  # (tabela, coluna da grade, linha da grade)
    ("categoria", 0, 0), ("produto", 1, 0), ("item_pedido", 2, 0), ("pedido", 3, 0),
    ("historico_preco", 0, 1), ("movimentacao_estoque", 1, 1), ("historico_status_pedido", 2, 1), ("usuario", 3, 1),
    ("refresh_token", 2, 2), ("endereco", 3, 2),
]

CAB, LIN, IDX = 26, 17, 14  # alturas: cabeçalho, linha de coluna, linha de índice


# Estilo "br" (padrão): caixas como no brModelo, com chave nos campos e cardinalidade (mín,máx) nas linhas.
# Estilo "pe": tabelas com pé de galinha (crow's foot).
CAB_BR, LIN_BR, FONTE_BR = 24, 18, "Verdana, Geneva, sans-serif"
VERDE_BORDA, VERDE_FUNDO, VERDE_LINHA = "#3d7a3d", "#cfe8cf", "#dde9dd"


def tipo_logico(tipo):
    """Tipo genérico (independente do SGBD) usado no modelo lógico."""
    return {"INT": "INTEGER", "TINYINT(1)": "BOOLEAN"}.get(tipo, tipo)


def campo_br(coluna, fisico):
    _, nome, tipo, _ = coluna
    return f"{nome}: {tipo if fisico else tipo_logico(tipo)}"


def modelo(fisico, estilo="br"):
    br = estilo == "br"
    tam = 11
    margem, gap_x, gap_y = 30, (130 if br else 90), (100 if br else 75)
    cab, lin = (CAB_BR, LIN_BR) if br else (CAB, LIN)

    def nome_tabela(t):
        return f"tb_{t}" if fisico else t.upper()

    def rodape(t):
        return TABELAS[t]["indices"] if fisico and not br else []

    # Largura de cada caixa
    larg_caixa = {}
    for t, dados in TABELAS.items():
        if br:
            campos = max(largura(campo_br(c, fisico), 10.5) * 1.22 for c in dados["colunas"])
            idx = max([largura(i, 9) * 1.2 + 16 for i in rodape(t)], default=0)
            larg_caixa[t] = max(30 + campos + 12, idx, largura(nome_tabela(t), 11.5) * 1.25 + 24)
            continue
        x_nome = 30 + (12 if fisico else 0)
        nomes = max(largura(c[1], tam) for c in dados["colunas"])
        tipos = max(largura(c[2], tam) for c in dados["colunas"]) + 14 if fisico else 0
        idx = max([largura(i, 9.5) + 16 for i in rodape(t)], default=0)
        titulo = largura(nome_tabela(t), 12) + 20
        larg_caixa[t] = max(x_nome + nomes + tipos + 12, idx, titulo)

    def altura(t):
        n_idx = len(rodape(t))
        if br:
            return cab + len(TABELAS[t]["colunas"]) * lin + 4 + (n_idx * 13 + 8 if n_idx else 9)
        return CAB + len(TABELAS[t]["colunas"]) * LIN + 6 + (n_idx * IDX + 8 if n_idx else 0)

    cols = max(c for _, c, _ in GRADE) + 1
    linhas = max(l for _, _, l in GRADE) + 1
    larg_col = [max(larg_caixa[t] for t, c, _ in GRADE if c == i) for i in range(cols)]
    alt_lin = [max(altura(t) for t, _, l in GRADE if l == i) for i in range(linhas)]
    x_col = [margem + sum(larg_col[:i]) + gap_x * i for i in range(cols)]
    y_lin = [margem + sum(alt_lin[:i]) + gap_y * i for i in range(linhas)]

    caixa = {}
    for t, c, l in GRADE:
        caixa[t] = dict(x=x_col[c], y=y_lin[l], w=larg_col[c], h=altura(t))

    def linha_y(t, nome_coluna):
        i = [c[1] for c in TABELAS[t]["colunas"]].index(nome_coluna)
        return caixa[t]["y"] + cab + (i + 0.5) * lin

    b = caixa
    dir_ = lambda t: b[t]["x"] + b[t]["w"]
    esq = lambda t: b[t]["x"]
    topo = lambda t: b[t]["y"]
    base = lambda t: b[t]["y"] + b[t]["h"]
    gx = lambda i: x_col[i + 1] - gap_x / 2  # meio do vão entre a coluna i e a i+1
    fim_lin0 = y_lin[0] + alt_lin[0]
    fim_lin1 = y_lin[1] + alt_lin[1]

    # (pontos, cardinalidade no 1º ponto, cardinalidade no último ponto, rótulo opcional)
    rel = []
    y = linha_y("produto", "ID_CATEGORIA")
    rel.append(([(dir_("categoria"), y), (esq("produto"), y)], "01", "0N", None))
    y = linha_y("item_pedido", "ID_PRODUTO")
    rel.append(([(dir_("produto"), y), (esq("item_pedido"), y)], "11", "0N", None))
    y = linha_y("item_pedido", "ID_PEDIDO")
    rel.append(([(esq("pedido"), y), (dir_("item_pedido"), y)], "11", "1N", None))
    ya, y2 = base("produto") - 14, linha_y("historico_preco", "ID_PRODUTO")
    rel.append(([(esq("produto"), ya), (gx(0), ya), (gx(0), y2), (dir_("historico_preco"), y2)], "11", "0N", None))
    x = esq("produto") + 45
    rel.append(([(x, base("produto")), (x, topo("movimentacao_estoque"))], "11", "0N", None))
    ya, y2 = base("pedido") - 16, linha_y("movimentacao_estoque", "ID_PEDIDO")
    rel.append(([(esq("pedido"), ya), (gx(1), ya), (gx(1), y2), (dir_("movimentacao_estoque"), y2)], "01", "0N", None))
    x1, yc, x2 = esq("pedido") + 28, fim_lin0 + 28, dir_("historico_status_pedido") - 45
    rel.append(([(x1, base("pedido")), (x1, yc), (x2, yc), (x2, topo("historico_status_pedido"))], "11", "1N", None))
    for frac, rotulo in [(0.5, "realiza"), (0.8, "atualiza")]:
        x = esq("pedido") + b["pedido"]["w"] * frac
        rel.append(([(x, topo("usuario")), (x, base("pedido"))], "01", "0N", rotulo))
    y = linha_y("historico_status_pedido", "ID_USUARIO")
    rel.append(([(esq("usuario"), y), (dir_("historico_status_pedido"), y)], "01", "0N", None))
    x1, yc, x2 = dir_("movimentacao_estoque") - 45, fim_lin1 + 30, esq("usuario") + 18
    rel.append(([(x1, base("movimentacao_estoque")), (x1, yc), (x2, yc), (x2, base("usuario"))], "0N", "01", None))
    x = esq("usuario") + b["usuario"]["w"] * 0.55
    rel.append(([(x, base("usuario")), (x, topo("endereco"))], "11", "0N", None))
    ya, xr = base("usuario") - 20, dir_("usuario") + 40
    yb = max(base("endereco"), base("refresh_token")) + 30
    xm = esq("refresh_token") + b["refresh_token"]["w"] * 0.5
    rel.append(([(dir_("usuario"), ya), (xr, ya), (xr, yb), (xm, yb), (xm, base("refresh_token"))], "11", "0N", None))

    W = int(xr + margem)
    H = int(yb + margem)
    corpo = []

    # Relacionamentos (desenhados antes das caixas)
    for pts, c1, c2, rotulo in rel:
        pontos = " ".join(f"{px:.1f},{py:.1f}" for px, py in pts)
        corpo.append(f'<polyline points="{pontos}" fill="none" stroke="#000" stroke-width="1.1"/>')
        if br:
            corpo.append(cardinalidade(pts[0], pts[1], c1))
            corpo.append(cardinalidade(pts[-1], pts[-2], c2))
        else:
            corpo.extend(marcador(pts[0], pts[1], c1))
            corpo.extend(marcador(pts[-1], pts[-2], c2))
        if rotulo:
            (px, py), (qx, qy) = pts[0], pts[1]
            corpo.append(txt(px + 5, (py + qy) / 2 + 4, rotulo, 10, estilo="italic"))

    # Tabelas
    for t, cx in caixa.items():
        if br:
            corpo.extend(desenhar_tabela_br(t, cx, fisico, nome_tabela(t), rodape(t)))
        else:
            corpo.extend(desenhar_tabela(t, cx, fisico, nome_tabela(t), rodape(t), tam))

    # Legenda (só no estilo pé de galinha) no espaço livre da última linha
    lx, ly = x_col[0], y_lin[2]
    if not br:
        corpo.extend(legenda(lx, ly, fisico))
    return svg(W, H, corpo)


def texto_br(x, y, texto, tamanho=10.5, peso="bold", ancora="start", cor="#000"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FONTE_BR}" font-size="{tamanho}" font-weight="{peso}" '
            f'text-anchor="{ancora}" fill="{cor}">{escape(texto)}</text>')


def chave(x, y, primaria):
    """Ícone de chave (dourada = chave primária, cinza = chave estrangeira); (x, y) é o centro."""
    corpo, borda = ("#f2c230", "#8a6a00") if primaria else ("#cfcfcf", "#6f6f6f")
    return (f'<g transform="translate({x:.1f},{y:.1f}) rotate(-35)">'
            f'<rect x="-1" y="-1.6" width="10" height="3.2" rx="1" fill="{corpo}" stroke="{borda}" stroke-width="0.8"/>'
            f'<rect x="5.5" y="1.2" width="1.8" height="2.6" fill="{corpo}" stroke="{borda}" stroke-width="0.7"/>'
            f'<rect x="7.8" y="1.2" width="1.6" height="2" fill="{corpo}" stroke="{borda}" stroke-width="0.7"/>'
            f'<circle cx="-3.6" cy="0" r="3.9" fill="{corpo}" stroke="{borda}" stroke-width="0.9"/>'
            f'<circle cx="-4.4" cy="0" r="1.1" fill="#fff" stroke="{borda}" stroke-width="0.6"/></g>')


def desenhar_tabela_br(t, c, fisico, titulo, indices):
    x, y, w, h = c["x"], c["y"], c["w"], c["h"]
    colunas = TABELAS[t]["colunas"]
    y_rodape = y + CAB_BR + len(colunas) * LIN_BR + 4
    out = [f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="#fff" stroke="{VERDE_BORDA}" stroke-width="1.3"/>',
           f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{CAB_BR}" fill="{VERDE_FUNDO}" stroke="{VERDE_BORDA}" stroke-width="1.3"/>',
           texto_br(x + w / 2, y + 16.5, titulo, 11.5, ancora="middle"),
           f'<rect x="{x:.1f}" y="{y_rodape:.1f}" width="{w:.1f}" height="{y + h - y_rodape:.1f}" fill="{VERDE_FUNDO}" stroke="{VERDE_BORDA}" stroke-width="1.3"/>']
    for i, coluna in enumerate(colunas):
        topo_linha = y + CAB_BR + i * LIN_BR
        if i:
            out.append(f'<line x1="{x + 1:.1f}" y1="{topo_linha:.1f}" x2="{x + w - 1:.1f}" y2="{topo_linha:.1f}" stroke="{VERDE_LINHA}" stroke-width="0.8"/>')
        if coluna[0] in (PK, FK):
            out.append(chave(x + 13, topo_linha + LIN_BR / 2, coluna[0] == PK))
        out.append(texto_br(x + 26, topo_linha + 13, campo_br(coluna, fisico)))
    for i, ind in enumerate(indices):
        out.append(texto_br(x + 8, y_rodape + 13 + i * 13, ind, 9, "normal", cor="#1f3d1f"))
    return out


def cardinalidade(p, q, card):
    """Rótulo (mín,máx) perto da ponta p da linha; q é o próximo ponto."""
    rotulo = {"11": "(1,1)", "01": "(0,1)", "0N": "(0,n)", "1N": "(1,n)"}[card]
    (px, py), (qx, qy) = p, q
    if py == qy:  # trecho horizontal: rótulo acima da linha, encostado na tabela
        direita = qx > px
        return texto_br(px + (5 if direita else -5), py - 5, rotulo, 10.5, ancora="start" if direita else "end")
    desce = qy > py  # trecho vertical: rótulo à direita da linha
    return texto_br(px + 5, py + (15 if desce else -6), rotulo, 10.5)


def desenhar_tabela(t, c, fisico, titulo, indices, tam):
    x, y, w, h = c["x"], c["y"], c["w"], c["h"]
    out = [f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="#fff" stroke="#000" stroke-width="1.2"/>',
           f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{CAB}" fill="#000"/>',
           txt(x + w / 2, y + 17.5, titulo, 12, "bold", "middle", "#fff")]
    for i, (chave, nome, tipo, obrig) in enumerate(TABELAS[t]["colunas"]):
        ly = y + CAB + (i + 0.5) * LIN + 4
        if chave:
            out.append(txt(x + 7, ly, chave, 9, "bold", cor="#000" if chave == PK else "#444"))
        x_nome = x + 30
        if fisico:
            cy = ly - 3.5
            preench = "#000" if obrig else "#fff"
            out.append(f'<polygon points="{x_nome + 4},{cy - 4} {x_nome + 8},{cy} {x_nome + 4},{cy + 4} {x_nome},{cy}" '
                       f'fill="{preench}" stroke="#000" stroke-width="0.9"/>')
            x_nome += 12
            out.append(txt(x + w - 8, ly, tipo, tam, ancora="end", cor="#333"))
        peso = "bold" if chave == PK else "normal"
        out.append(txt(x_nome, ly, nome, tam, peso, estilo="italic" if chave == FK and not fisico else "normal"))
    if indices:
        ys = y + CAB + len(TABELAS[t]["colunas"]) * LIN + 6
        out.append(f'<line x1="{x:.1f}" y1="{ys:.1f}" x2="{x + w:.1f}" y2="{ys:.1f}" stroke="#000" stroke-width="0.8"/>')
        for i, ind in enumerate(indices):
            out.append(txt(x + 8, ys + 13 + i * IDX, ind, 9.5, cor="#333"))
    return out


def marcador(p, q, card):
    """Pé de galinha no ponto p (borda da tabela); q é o próximo ponto da linha."""
    (px, py), (qx, qy) = p, q
    d = hypot(qx - px, qy - py)
    ux, uy = (qx - px) / d, (qy - py) / d
    nx, ny = -uy, ux
    out = []

    def barra(k):
        cx, cy = px + ux * k, py + uy * k
        out.append(f'<line x1="{cx + nx * 6:.1f}" y1="{cy + ny * 6:.1f}" x2="{cx - nx * 6:.1f}" y2="{cy - ny * 6:.1f}" '
                   f'stroke="#000" stroke-width="1.2"/>')

    def circulo(k):
        out.append(f'<circle cx="{px + ux * k:.1f}" cy="{py + uy * k:.1f}" r="4.5" fill="#fff" stroke="#000" stroke-width="1.1"/>')

    def pe(k=12):
        cx, cy = px + ux * k, py + uy * k
        for s in (-7, 0, 7):
            out.append(f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{px + nx * s:.1f}" y2="{py + ny * s:.1f}" '
                       f'stroke="#000" stroke-width="1.1"/>')

    if card == "11":
        barra(7); barra(13)
    elif card == "01":
        barra(7); circulo(19)
    elif card == "0N":
        pe(); circulo(18.5)
    elif card == "1N":
        pe(); barra(17)
    return out


def legenda(x, y, fisico):
    out = []
    w, h = (410, 200) if fisico else (300, 175)
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="#000" stroke-width="1" stroke-dasharray="4,3"/>')
    out.append(txt(x + 12, y + 20, "Legenda", 12, "bold"))
    exemplos = [("11", "um e somente um"), ("01", "zero ou um"), ("0N", "zero ou muitos"), ("1N", "um ou muitos")]
    for i, (card, texto) in enumerate(exemplos):
        yy = y + 42 + i * 22
        out.append(f'<line x1="{x + 14}" y1="{yy}" x2="{x + 64}" y2="{yy}" stroke="#000" stroke-width="1.1"/>')
        out.extend(marcador((x + 64, yy), (x + 14, yy), card))
        out.append(txt(x + 76, yy + 4, texto, 11))
    yy = y + 42 + 4 * 22 + 4
    out.append(txt(x + 14, yy, "PK", 9, "bold"))
    out.append(txt(x + 36, yy, "chave primária", 11))
    out.append(txt(x + 14, yy + 18, "FK", 9, "bold", cor="#444"))
    out.append(txt(x + 36, yy + 18, "chave estrangeira" + ("" if fisico else " (em itálico)"), 11))
    if fisico:
        out.append(txt(x + 14, yy + 36, "UQ", 9, "bold", cor="#444"))
        out.append(txt(x + 36, yy + 36, "valor único (UNIQUE)", 11))
        cx = x + 215
        for i, (cor, texto) in enumerate([("#000", "NOT NULL (obrigatório)"), ("#fff", "NULL (opcional)")]):
            cy = y + 38 + i * 20
            out.append(f'<polygon points="{cx + 4},{cy - 4} {cx + 8},{cy} {cx + 4},{cy + 4} {cx},{cy}" fill="{cor}" stroke="#000" stroke-width="0.9"/>')
            out.append(txt(cx + 16, cy + 4, texto, 11))
        out.append(txt(cx, y + 90, "Abaixo da linha: índices e", 11))
        out.append(txt(cx, y + 106, "restrições UNIQUE compostas.", 11))
        out.append(txt(cx, y + 126, "ENUM: valores definidos no script", 11))
        out.append(txt(cx, y + 142, "database/bd_cafe_artesanal.sql.", 11))
    else:
        out.append(txt(x + 14, yy + 36, "UQ", 9, "bold", cor="#444"))
        out.append(txt(x + 36, yy + 36, "valor único", 11))
    return out


if __name__ == "__main__":
    SAIDA.mkdir(exist_ok=True)
    (SAIDA / "diagrama_caso_de_uso.svg").write_text(caso_de_uso(), encoding="utf-8")
    (SAIDA / "modelo_logico.svg").write_text(modelo(fisico=False), encoding="utf-8")
    (SAIDA / "modelo_fisico.svg").write_text(modelo(fisico=True), encoding="utf-8")
    print("Diagramas gerados em", SAIDA)
