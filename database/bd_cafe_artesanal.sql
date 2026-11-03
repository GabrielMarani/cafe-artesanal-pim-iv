-- =====================================================================
--  CAFÉ ARTESANAL — Banco de Dados Corporativo (PIM IV)
--  SGBD: MariaDB 10.4+ / MySQL 8.0+
--
--  Script completo utilizado pela API, pela aplicação Web e pelo App Mobile.
--  Conteúdo:
--    1. Criação do banco
--    2. Tabelas (modelo físico) com PK, FK, UNIQUE, CHECK e índices
--    3. Triggers  (estoque automático, auditoria de status e de preço)
--    4. Procedures (relatórios do painel e ajuste de estoque)
--    5. Views
--    6. Carga inicial (categorias, produtos, usuários e pedidos de demonstração)
--
--  ATENÇÃO: o script recria o banco do zero (DROP DATABASE).
--  Datas são gravadas no horário local do servidor (horário de Brasília).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS bd_cafe_artesanal;
CREATE DATABASE bd_cafe_artesanal
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE bd_cafe_artesanal;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 2. TABELAS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Categorias do cardápio
-- ---------------------------------------------------------------------
CREATE TABLE tb_categoria (
  ID_CATEGORIA        INT          NOT NULL AUTO_INCREMENT,
  NOME_CATEGORIA      VARCHAR(50)  NOT NULL,
  SLUG_CATEGORIA      VARCHAR(60)  NOT NULL,
  DESCRICAO_CATEGORIA VARCHAR(255) NULL,
  ORDEM_EXIBICAO      INT          NOT NULL DEFAULT 0,
  ATIVO               TINYINT(1)   NOT NULL DEFAULT 1,
  DATA_CRIACAO        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DATA_ATUALIZACAO    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_CATEGORIA PRIMARY KEY (ID_CATEGORIA),
  CONSTRAINT UQ_CATEGORIA_NOME UNIQUE (NOME_CATEGORIA),
  CONSTRAINT UQ_CATEGORIA_SLUG UNIQUE (SLUG_CATEGORIA)
) ENGINE=InnoDB COMMENT='Categorias de produtos do cardápio';

-- ---------------------------------------------------------------------
-- Produtos (com controle de estoque)
-- ---------------------------------------------------------------------
CREATE TABLE tb_produto (
  ID_PRODUTO        INT           NOT NULL AUTO_INCREMENT,
  ID_CATEGORIA      INT           NULL,
  NOME_PRODUTO      VARCHAR(100)  NOT NULL,
  DESCRICAO_PRODUTO VARCHAR(500)  NULL,
  IMAGEM_URL        VARCHAR(500)  NULL,
  PRECO             DECIMAL(10,2) NOT NULL,
  ESTOQUE           INT           NOT NULL DEFAULT 0,
  ESTOQUE_MINIMO    INT           NOT NULL DEFAULT 5,
  DESTAQUE          TINYINT(1)    NOT NULL DEFAULT 0,
  ATIVO             TINYINT(1)    NOT NULL DEFAULT 1,
  DATA_CRIACAO      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DATA_ATUALIZACAO  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_PRODUTO PRIMARY KEY (ID_PRODUTO),
  CONSTRAINT FK_PRODUTO_CATEGORIA FOREIGN KEY (ID_CATEGORIA)
    REFERENCES tb_categoria (ID_CATEGORIA) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT CK_PRODUTO_PRECO       CHECK (PRECO >= 0),
  CONSTRAINT CK_PRODUTO_ESTOQUE     CHECK (ESTOQUE >= 0),
  CONSTRAINT CK_PRODUTO_ESTOQUE_MIN CHECK (ESTOQUE_MINIMO >= 0),
  INDEX IX_PRODUTO_CATEGORIA_ATIVO (ID_CATEGORIA, ATIVO),
  INDEX IX_PRODUTO_DESTAQUE (DESTAQUE, ATIVO),
  INDEX IX_PRODUTO_ATUALIZACAO (DATA_ATUALIZACAO)  -- usado na sincronização do app mobile
) ENGINE=InnoDB COMMENT='Produtos vendidos pela cafeteria';

-- ---------------------------------------------------------------------
-- Histórico de alterações de preço (alimentado por trigger)
-- ---------------------------------------------------------------------
CREATE TABLE tb_historico_preco (
  ID_HISTORICO_PRECO INT           NOT NULL AUTO_INCREMENT,
  ID_PRODUTO         INT           NOT NULL,
  PRECO_ANTERIOR     DECIMAL(10,2) NOT NULL,
  PRECO_NOVO         DECIMAL(10,2) NOT NULL,
  DATA_ALTERACAO     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_HISTORICO_PRECO PRIMARY KEY (ID_HISTORICO_PRECO),
  CONSTRAINT FK_HIST_PRECO_PRODUTO FOREIGN KEY (ID_PRODUTO)
    REFERENCES tb_produto (ID_PRODUTO) ON DELETE CASCADE,
  INDEX IX_HIST_PRECO_PRODUTO (ID_PRODUTO, DATA_ALTERACAO)
) ENGINE=InnoDB COMMENT='Auditoria de preços';

-- ---------------------------------------------------------------------
-- Usuários (clientes, atendentes e administradores)
-- NOME_SOCIAL: respeita a identidade de gênero (inclusão e diversidade)
-- ---------------------------------------------------------------------
CREATE TABLE tb_usuario (
  ID_USUARIO       INT          NOT NULL AUTO_INCREMENT,
  NOME_USUARIO     VARCHAR(100) NOT NULL,
  NOME_SOCIAL      VARCHAR(100) NULL,
  CPF_USUARIO      VARCHAR(14)  NOT NULL COMMENT 'Gravado só com dígitos (trigger normaliza)',
  EMAIL_USUARIO    VARCHAR(150) NULL,
  TELEFONE_USUARIO VARCHAR(20)  NULL,
  SENHA_HASH       VARCHAR(255) NOT NULL COMMENT 'PBKDF2-SHA256 com salt individual',
  PERFIL_USUARIO   ENUM('cliente','atendente','admin') NOT NULL DEFAULT 'cliente',
  ATIVO            TINYINT(1)   NOT NULL DEFAULT 1,
  ULTIMO_LOGIN     DATETIME     NULL,
  DATA_CADASTRO    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DATA_ATUALIZACAO DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_USUARIO PRIMARY KEY (ID_USUARIO),
  CONSTRAINT UQ_USUARIO_CPF   UNIQUE (CPF_USUARIO),
  CONSTRAINT UQ_USUARIO_EMAIL UNIQUE (EMAIL_USUARIO),
  CONSTRAINT CK_USUARIO_CPF   CHECK (CPF_USUARIO REGEXP '^[0-9]{11}$'),
  INDEX IX_USUARIO_PERFIL (PERFIL_USUARIO, ATIVO)
) ENGINE=InnoDB COMMENT='Usuários do sistema';

-- ---------------------------------------------------------------------
-- Endereços de entrega dos clientes
-- ---------------------------------------------------------------------
CREATE TABLE tb_endereco (
  ID_ENDERECO  INT          NOT NULL AUTO_INCREMENT,
  ID_USUARIO   INT          NOT NULL,
  APELIDO      VARCHAR(40)  NOT NULL DEFAULT 'Casa',
  CEP          CHAR(8)      NOT NULL,
  LOGRADOURO   VARCHAR(150) NOT NULL,
  NUMERO       VARCHAR(10)  NOT NULL,
  COMPLEMENTO  VARCHAR(60)  NULL,
  BAIRRO       VARCHAR(80)  NOT NULL,
  CIDADE       VARCHAR(80)  NOT NULL,
  UF           CHAR(2)      NOT NULL,
  REFERENCIA   VARCHAR(120) NULL,
  PRINCIPAL    TINYINT(1)   NOT NULL DEFAULT 0,
  DATA_CRIACAO DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_ENDERECO PRIMARY KEY (ID_ENDERECO),
  CONSTRAINT FK_ENDERECO_USUARIO FOREIGN KEY (ID_USUARIO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE CASCADE,
  CONSTRAINT CK_ENDERECO_CEP CHECK (CHAR_LENGTH(CEP) = 8),
  INDEX IX_ENDERECO_USUARIO (ID_USUARIO)
) ENGINE=InnoDB COMMENT='Endereços de entrega';

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
CREATE TABLE tb_pedido (
  ID_PEDIDO              INT           NOT NULL AUTO_INCREMENT,
  ID_USUARIO             INT           NULL,
  STATUS_PEDIDO          ENUM('pendente','em_preparo','pronto','saiu_para_entrega','entregue','cancelado')
                                       NOT NULL DEFAULT 'pendente',
  TIPO_ENTREGA           ENUM('entrega','retirada') NOT NULL DEFAULT 'retirada',
  FORMA_PAGAMENTO        ENUM('pix','cartao_credito','cartao_debito','dinheiro') NOT NULL,
  SUBTOTAL               DECIMAL(10,2) NOT NULL DEFAULT 0,
  TAXA_ENTREGA           DECIMAL(10,2) NOT NULL DEFAULT 0,
  TOTAL_PEDIDO           DECIMAL(10,2) NOT NULL DEFAULT 0,
  ENDERECO_ENTREGA       VARCHAR(400)  NULL COMMENT 'Cópia do endereço no momento do pedido',
  OBSERVACAO             VARCHAR(300)  NULL,
  MOTIVO_CANCELAMENTO    VARCHAR(255)  NULL,
  ID_USUARIO_ATUALIZACAO INT           NULL COMMENT 'Quem fez a última alteração de status',
  DATA_PEDIDO            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DATA_ATUALIZACAO       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_PEDIDO PRIMARY KEY (ID_PEDIDO),
  CONSTRAINT FK_PEDIDO_USUARIO FOREIGN KEY (ID_USUARIO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE SET NULL,
  CONSTRAINT FK_PEDIDO_USUARIO_ATUALIZACAO FOREIGN KEY (ID_USUARIO_ATUALIZACAO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE SET NULL,
  CONSTRAINT CK_PEDIDO_VALORES  CHECK (SUBTOTAL >= 0 AND TAXA_ENTREGA >= 0 AND TOTAL_PEDIDO >= 0),
  CONSTRAINT CK_PEDIDO_TOTAL    CHECK (TOTAL_PEDIDO = SUBTOTAL + TAXA_ENTREGA),
  CONSTRAINT CK_PEDIDO_ENDERECO CHECK (TIPO_ENTREGA = 'retirada' OR ENDERECO_ENTREGA IS NOT NULL),
  INDEX IX_PEDIDO_USUARIO_DATA (ID_USUARIO, DATA_PEDIDO),
  INDEX IX_PEDIDO_STATUS_DATA (STATUS_PEDIDO, DATA_PEDIDO),
  INDEX IX_PEDIDO_DATA (DATA_PEDIDO)
) ENGINE=InnoDB COMMENT='Pedidos realizados';

-- ---------------------------------------------------------------------
-- Itens do pedido (SUBTOTAL é coluna gerada)
-- ---------------------------------------------------------------------
CREATE TABLE tb_item_pedido (
  ID_ITEM        INT           NOT NULL AUTO_INCREMENT,
  ID_PEDIDO      INT           NOT NULL,
  ID_PRODUTO     INT           NOT NULL,
  NOME_PRODUTO   VARCHAR(100)  NOT NULL COMMENT 'Cópia do nome no momento da venda',
  QUANTIDADE     INT           NOT NULL,
  VALOR_UNITARIO DECIMAL(10,2) NOT NULL,
  SUBTOTAL       DECIMAL(10,2) GENERATED ALWAYS AS (QUANTIDADE * VALOR_UNITARIO) STORED,
  CONSTRAINT PK_ITEM_PEDIDO PRIMARY KEY (ID_ITEM),
  CONSTRAINT FK_ITEM_PEDIDO FOREIGN KEY (ID_PEDIDO)
    REFERENCES tb_pedido (ID_PEDIDO) ON DELETE CASCADE,
  CONSTRAINT FK_ITEM_PRODUTO FOREIGN KEY (ID_PRODUTO)
    REFERENCES tb_produto (ID_PRODUTO) ON DELETE RESTRICT,
  CONSTRAINT UQ_ITEM_PEDIDO_PRODUTO UNIQUE (ID_PEDIDO, ID_PRODUTO),
  CONSTRAINT CK_ITEM_QUANTIDADE CHECK (QUANTIDADE BETWEEN 1 AND 99),
  CONSTRAINT CK_ITEM_VALOR      CHECK (VALOR_UNITARIO >= 0),
  INDEX IX_ITEM_PRODUTO (ID_PRODUTO)
) ENGINE=InnoDB COMMENT='Itens de cada pedido';

-- ---------------------------------------------------------------------
-- Linha do tempo do pedido (alimentada por trigger)
-- ---------------------------------------------------------------------
CREATE TABLE tb_historico_status_pedido (
  ID_HISTORICO    INT          NOT NULL AUTO_INCREMENT,
  ID_PEDIDO       INT          NOT NULL,
  STATUS_ANTERIOR ENUM('pendente','em_preparo','pronto','saiu_para_entrega','entregue','cancelado') NULL,
  STATUS_NOVO     ENUM('pendente','em_preparo','pronto','saiu_para_entrega','entregue','cancelado') NOT NULL,
  ID_USUARIO      INT          NULL,
  OBSERVACAO      VARCHAR(255) NULL,
  DATA_ALTERACAO  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_HISTORICO_STATUS PRIMARY KEY (ID_HISTORICO),
  CONSTRAINT FK_HIST_STATUS_PEDIDO FOREIGN KEY (ID_PEDIDO)
    REFERENCES tb_pedido (ID_PEDIDO) ON DELETE CASCADE,
  CONSTRAINT FK_HIST_STATUS_USUARIO FOREIGN KEY (ID_USUARIO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE SET NULL,
  INDEX IX_HIST_STATUS_PEDIDO (ID_PEDIDO, DATA_ALTERACAO)
) ENGINE=InnoDB COMMENT='Auditoria de mudanças de status dos pedidos';

-- ---------------------------------------------------------------------
-- Movimentação de estoque (vendas, estornos e ajustes manuais)
-- ---------------------------------------------------------------------
CREATE TABLE tb_movimentacao_estoque (
  ID_MOVIMENTACAO    INT          NOT NULL AUTO_INCREMENT,
  ID_PRODUTO         INT          NOT NULL,
  TIPO_MOVIMENTACAO  ENUM('carga_inicial','venda','cancelamento','ajuste_entrada','ajuste_saida') NOT NULL,
  QUANTIDADE         INT          NOT NULL COMMENT 'Positivo = entrada, negativo = saída',
  ESTOQUE_RESULTANTE INT          NOT NULL,
  ID_PEDIDO          INT          NULL,
  ID_USUARIO         INT          NULL,
  MOTIVO             VARCHAR(255) NULL,
  DATA_MOVIMENTACAO  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_MOVIMENTACAO PRIMARY KEY (ID_MOVIMENTACAO),
  CONSTRAINT FK_MOV_PRODUTO FOREIGN KEY (ID_PRODUTO)
    REFERENCES tb_produto (ID_PRODUTO) ON DELETE CASCADE,
  CONSTRAINT FK_MOV_PEDIDO FOREIGN KEY (ID_PEDIDO)
    REFERENCES tb_pedido (ID_PEDIDO) ON DELETE SET NULL,
  CONSTRAINT FK_MOV_USUARIO FOREIGN KEY (ID_USUARIO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE SET NULL,
  INDEX IX_MOV_PRODUTO_DATA (ID_PRODUTO, DATA_MOVIMENTACAO)
) ENGINE=InnoDB COMMENT='Kardex de estoque';

-- ---------------------------------------------------------------------
-- Refresh tokens (sessões da Web e do App) — guarda apenas o hash
-- ---------------------------------------------------------------------
CREATE TABLE tb_refresh_token (
  ID_REFRESH_TOKEN INT         NOT NULL AUTO_INCREMENT,
  ID_USUARIO       INT         NOT NULL,
  TOKEN_HASH       CHAR(64)    NOT NULL COMMENT 'SHA-256 do token',
  EXPIRA_EM        DATETIME    NOT NULL,
  CRIADO_EM        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  REVOGADO_EM      DATETIME    NULL,
  SUBSTITUIDO_POR  CHAR(64)    NULL,
  CONSTRAINT PK_REFRESH_TOKEN PRIMARY KEY (ID_REFRESH_TOKEN),
  CONSTRAINT UQ_REFRESH_TOKEN_HASH UNIQUE (TOKEN_HASH),
  CONSTRAINT FK_REFRESH_TOKEN_USUARIO FOREIGN KEY (ID_USUARIO)
    REFERENCES tb_usuario (ID_USUARIO) ON DELETE CASCADE,
  INDEX IX_REFRESH_TOKEN_USUARIO (ID_USUARIO, EXPIRA_EM)
) ENGINE=InnoDB COMMENT='Tokens de renovação de sessão';


-- =====================================================================
-- 3. TRIGGERS
-- =====================================================================
DELIMITER $$

-- Normaliza CPF (apenas dígitos) e e-mail (minúsculo) na inclusão
CREATE TRIGGER trg_usuario_bi BEFORE INSERT ON tb_usuario
FOR EACH ROW
BEGIN
  SET NEW.CPF_USUARIO = REGEXP_REPLACE(NEW.CPF_USUARIO, '[^0-9]', '');
  SET NEW.EMAIL_USUARIO = NULLIF(LOWER(TRIM(NEW.EMAIL_USUARIO)), '');
END$$

-- Mesma normalização na alteração
CREATE TRIGGER trg_usuario_bu BEFORE UPDATE ON tb_usuario
FOR EACH ROW
BEGIN
  SET NEW.CPF_USUARIO = REGEXP_REPLACE(NEW.CPF_USUARIO, '[^0-9]', '');
  SET NEW.EMAIL_USUARIO = NULLIF(LOWER(TRIM(NEW.EMAIL_USUARIO)), '');
END$$

-- Registra a carga inicial de estoque de um novo produto
CREATE TRIGGER trg_produto_ai AFTER INSERT ON tb_produto
FOR EACH ROW
BEGIN
  IF NEW.ESTOQUE > 0 THEN
    INSERT INTO tb_movimentacao_estoque
      (ID_PRODUTO, TIPO_MOVIMENTACAO, QUANTIDADE, ESTOQUE_RESULTANTE, MOTIVO)
    VALUES
      (NEW.ID_PRODUTO, 'carga_inicial', NEW.ESTOQUE, NEW.ESTOQUE, 'Cadastro do produto');
  END IF;
END$$

-- Auditoria de preço: guarda o valor anterior sempre que o preço muda
CREATE TRIGGER trg_produto_au AFTER UPDATE ON tb_produto
FOR EACH ROW
BEGIN
  IF NEW.PRECO <> OLD.PRECO THEN
    INSERT INTO tb_historico_preco (ID_PRODUTO, PRECO_ANTERIOR, PRECO_NOVO)
    VALUES (NEW.ID_PRODUTO, OLD.PRECO, NEW.PRECO);
  END IF;
END$$

-- Antes de inserir um item: valida produto ativo e estoque disponível
CREATE TRIGGER trg_item_pedido_bi BEFORE INSERT ON tb_item_pedido
FOR EACH ROW
BEGIN
  DECLARE v_ativo   TINYINT DEFAULT NULL;
  DECLARE v_estoque INT DEFAULT 0;
  DECLARE v_nome    VARCHAR(100) DEFAULT '';
  DECLARE v_msg     VARCHAR(255);

  SELECT ATIVO, ESTOQUE, NOME_PRODUTO
    INTO v_ativo, v_estoque, v_nome
    FROM tb_produto
   WHERE ID_PRODUTO = NEW.ID_PRODUTO
   FOR UPDATE;

  IF v_ativo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produto inexistente.';
  END IF;

  IF v_ativo = 0 THEN
    SET v_msg = CONCAT('Produto indisponível: ', v_nome);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;

  IF v_estoque < NEW.QUANTIDADE THEN
    SET v_msg = CONCAT('Estoque insuficiente para "', v_nome, '" (disponível: ', v_estoque, ').');
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;

  IF NEW.NOME_PRODUTO IS NULL OR NEW.NOME_PRODUTO = '' THEN
    SET NEW.NOME_PRODUTO = v_nome;
  END IF;
END$$

-- Depois de inserir um item: baixa o estoque e registra a movimentação
CREATE TRIGGER trg_item_pedido_ai AFTER INSERT ON tb_item_pedido
FOR EACH ROW
BEGIN
  UPDATE tb_produto
     SET ESTOQUE = ESTOQUE - NEW.QUANTIDADE
   WHERE ID_PRODUTO = NEW.ID_PRODUTO;

  INSERT INTO tb_movimentacao_estoque
    (ID_PRODUTO, TIPO_MOVIMENTACAO, QUANTIDADE, ESTOQUE_RESULTANTE, ID_PEDIDO, ID_USUARIO, MOTIVO)
  SELECT p.ID_PRODUTO, 'venda', -NEW.QUANTIDADE, p.ESTOQUE, NEW.ID_PEDIDO,
         (SELECT ped.ID_USUARIO FROM tb_pedido ped WHERE ped.ID_PEDIDO = NEW.ID_PEDIDO),
         'Baixa automática por venda'
    FROM tb_produto p
   WHERE p.ID_PRODUTO = NEW.ID_PRODUTO;
END$$

-- Novo pedido: primeiro registro da linha do tempo
CREATE TRIGGER trg_pedido_ai AFTER INSERT ON tb_pedido
FOR EACH ROW
BEGIN
  INSERT INTO tb_historico_status_pedido
    (ID_PEDIDO, STATUS_ANTERIOR, STATUS_NOVO, ID_USUARIO, OBSERVACAO, DATA_ALTERACAO)
  VALUES
    (NEW.ID_PEDIDO, NULL, NEW.STATUS_PEDIDO, NEW.ID_USUARIO, 'Pedido criado', NEW.DATA_PEDIDO);
END$$

-- Impede alterar o status de pedidos já finalizados (defesa no banco)
CREATE TRIGGER trg_pedido_bu BEFORE UPDATE ON tb_pedido
FOR EACH ROW
BEGIN
  IF OLD.STATUS_PEDIDO IN ('entregue', 'cancelado') AND NEW.STATUS_PEDIDO <> OLD.STATUS_PEDIDO THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pedido finalizado não pode ter o status alterado.';
  END IF;
END$$

-- Mudança de status: registra o histórico e, se cancelado, devolve o estoque
CREATE TRIGGER trg_pedido_au AFTER UPDATE ON tb_pedido
FOR EACH ROW
BEGIN
  IF NEW.STATUS_PEDIDO <> OLD.STATUS_PEDIDO THEN
    INSERT INTO tb_historico_status_pedido
      (ID_PEDIDO, STATUS_ANTERIOR, STATUS_NOVO, ID_USUARIO, OBSERVACAO)
    VALUES
      (NEW.ID_PEDIDO, OLD.STATUS_PEDIDO, NEW.STATUS_PEDIDO, NEW.ID_USUARIO_ATUALIZACAO,
       IF(NEW.STATUS_PEDIDO = 'cancelado', NEW.MOTIVO_CANCELAMENTO, NULL));

    IF NEW.STATUS_PEDIDO = 'cancelado' THEN
      UPDATE tb_produto p
        JOIN tb_item_pedido i ON i.ID_PRODUTO = p.ID_PRODUTO
         SET p.ESTOQUE = p.ESTOQUE + i.QUANTIDADE
       WHERE i.ID_PEDIDO = NEW.ID_PEDIDO;

      INSERT INTO tb_movimentacao_estoque
        (ID_PRODUTO, TIPO_MOVIMENTACAO, QUANTIDADE, ESTOQUE_RESULTANTE, ID_PEDIDO, ID_USUARIO, MOTIVO)
      SELECT i.ID_PRODUTO, 'cancelamento', i.QUANTIDADE, p.ESTOQUE, NEW.ID_PEDIDO,
             NEW.ID_USUARIO_ATUALIZACAO, 'Estorno por cancelamento do pedido'
        FROM tb_item_pedido i
        JOIN tb_produto p ON p.ID_PRODUTO = i.ID_PRODUTO
       WHERE i.ID_PEDIDO = NEW.ID_PEDIDO;
    END IF;
  END IF;
END$$


-- =====================================================================
-- 4. STORED PROCEDURES (chamadas pela API)
-- =====================================================================

-- Indicadores gerais do período (cards do painel administrativo)
CREATE PROCEDURE sp_dashboard_resumo(IN p_inicio DATE, IN p_fim DATE)
BEGIN
  SELECT
    COUNT(*)                                                      AS TOTAL_PEDIDOS,
    COALESCE(SUM(STATUS_PEDIDO = 'cancelado'), 0)                 AS PEDIDOS_CANCELADOS,
    COALESCE(SUM(CASE WHEN STATUS_PEDIDO <> 'cancelado' THEN TOTAL_PEDIDO END), 0) AS FATURAMENTO,
    COALESCE(AVG(CASE WHEN STATUS_PEDIDO <> 'cancelado' THEN TOTAL_PEDIDO END), 0) AS TICKET_MEDIO,
    COUNT(DISTINCT ID_USUARIO)                                    AS CLIENTES_ATENDIDOS,
    (SELECT COUNT(*) FROM tb_usuario
      WHERE PERFIL_USUARIO = 'cliente'
        AND DATA_CADASTRO >= p_inicio
        AND DATA_CADASTRO <  DATE_ADD(p_fim, INTERVAL 1 DAY))     AS NOVOS_CLIENTES,
    (SELECT COUNT(*) FROM tb_pedido
      WHERE STATUS_PEDIDO IN ('pendente','em_preparo','pronto','saiu_para_entrega')) AS PEDIDOS_EM_ABERTO
  FROM tb_pedido
  WHERE DATA_PEDIDO >= p_inicio
    AND DATA_PEDIDO <  DATE_ADD(p_fim, INTERVAL 1 DAY);
END$$

-- Faturamento dia a dia (inclui dias sem venda, via CTE recursiva)
CREATE PROCEDURE sp_vendas_por_dia(IN p_inicio DATE, IN p_fim DATE)
BEGIN
  WITH RECURSIVE dias (DIA) AS (
    SELECT p_inicio
    UNION ALL
    SELECT DATE_ADD(DIA, INTERVAL 1 DAY) FROM dias WHERE DIA < p_fim
  )
  SELECT d.DIA,
         COUNT(p.ID_PEDIDO)               AS QUANTIDADE_PEDIDOS,
         COALESCE(SUM(p.TOTAL_PEDIDO), 0) AS FATURAMENTO
    FROM dias d
    LEFT JOIN tb_pedido p
           ON p.DATA_PEDIDO >= d.DIA
          AND p.DATA_PEDIDO <  DATE_ADD(d.DIA, INTERVAL 1 DAY)
          AND p.STATUS_PEDIDO <> 'cancelado'
   GROUP BY d.DIA
   ORDER BY d.DIA;
END$$

-- Ranking de produtos mais vendidos no período
CREATE PROCEDURE sp_produtos_mais_vendidos(IN p_inicio DATE, IN p_fim DATE, IN p_limite INT)
BEGIN
  SELECT i.ID_PRODUTO,
         MAX(i.NOME_PRODUTO) AS NOME_PRODUTO,
         SUM(i.QUANTIDADE)   AS QUANTIDADE_VENDIDA,
         SUM(i.SUBTOTAL)     AS FATURAMENTO
    FROM tb_item_pedido i
    JOIN tb_pedido p ON p.ID_PEDIDO = i.ID_PEDIDO
   WHERE p.STATUS_PEDIDO <> 'cancelado'
     AND p.DATA_PEDIDO >= p_inicio
     AND p.DATA_PEDIDO <  DATE_ADD(p_fim, INTERVAL 1 DAY)
   GROUP BY i.ID_PRODUTO
   ORDER BY QUANTIDADE_VENDIDA DESC, FATURAMENTO DESC
   LIMIT p_limite;
END$$

-- Quantidade e valor de pedidos por status no período
CREATE PROCEDURE sp_pedidos_por_status(IN p_inicio DATE, IN p_fim DATE)
BEGIN
  SELECT STATUS_PEDIDO,
         COUNT(*)                         AS QUANTIDADE,
         COALESCE(SUM(TOTAL_PEDIDO), 0)   AS VALOR
    FROM tb_pedido
   WHERE DATA_PEDIDO >= p_inicio
     AND DATA_PEDIDO <  DATE_ADD(p_fim, INTERVAL 1 DAY)
   GROUP BY STATUS_PEDIDO;
END$$

-- Ajuste manual de estoque (entrada ou saída) com transação e kardex
CREATE PROCEDURE sp_ajustar_estoque(
  IN p_id_produto INT,
  IN p_quantidade INT,
  IN p_motivo     VARCHAR(255),
  IN p_id_usuario INT)
BEGIN
  DECLARE v_estoque INT DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantidade IS NULL OR p_quantidade = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A quantidade do ajuste deve ser diferente de zero.';
  END IF;

  START TRANSACTION;

  SELECT ESTOQUE INTO v_estoque
    FROM tb_produto
   WHERE ID_PRODUTO = p_id_produto
   FOR UPDATE;

  IF v_estoque IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produto não encontrado.';
  END IF;

  IF v_estoque + p_quantidade < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O ajuste deixaria o estoque negativo.';
  END IF;

  UPDATE tb_produto
     SET ESTOQUE = ESTOQUE + p_quantidade
   WHERE ID_PRODUTO = p_id_produto;

  INSERT INTO tb_movimentacao_estoque
    (ID_PRODUTO, TIPO_MOVIMENTACAO, QUANTIDADE, ESTOQUE_RESULTANTE, ID_USUARIO, MOTIVO)
  VALUES
    (p_id_produto, IF(p_quantidade > 0, 'ajuste_entrada', 'ajuste_saida'),
     p_quantidade, v_estoque + p_quantidade, p_id_usuario, p_motivo);

  COMMIT;

  SELECT v_estoque + p_quantidade AS ESTOQUE_ATUAL;
END$$

DELIMITER ;


-- =====================================================================
-- 5. VIEWS
-- =====================================================================

-- Produtos ativos com estoque no limite mínimo (alerta do painel)
CREATE VIEW vw_produtos_estoque_baixo AS
SELECT p.ID_PRODUTO,
       p.NOME_PRODUTO,
       c.NOME_CATEGORIA,
       p.ESTOQUE,
       p.ESTOQUE_MINIMO
  FROM tb_produto p
  LEFT JOIN tb_categoria c ON c.ID_CATEGORIA = p.ID_CATEGORIA
 WHERE p.ATIVO = 1
   AND p.ESTOQUE <= p.ESTOQUE_MINIMO;

-- Visão consolidada dos pedidos (consultas e relatórios)
CREATE VIEW vw_pedidos_detalhados AS
SELECT p.ID_PEDIDO,
       p.DATA_PEDIDO,
       p.STATUS_PEDIDO,
       p.TIPO_ENTREGA,
       p.FORMA_PAGAMENTO,
       COALESCE(u.NOME_SOCIAL, u.NOME_USUARIO) AS CLIENTE,
       u.TELEFONE_USUARIO                      AS TELEFONE,
       COUNT(i.ID_ITEM)                        AS QUANTIDADE_ITENS,
       COALESCE(SUM(i.QUANTIDADE), 0)          AS QUANTIDADE_UNIDADES,
       p.SUBTOTAL,
       p.TAXA_ENTREGA,
       p.TOTAL_PEDIDO
  FROM tb_pedido p
  LEFT JOIN tb_usuario u     ON u.ID_USUARIO = p.ID_USUARIO
  LEFT JOIN tb_item_pedido i ON i.ID_PEDIDO  = p.ID_PEDIDO
 GROUP BY p.ID_PEDIDO, p.DATA_PEDIDO, p.STATUS_PEDIDO, p.TIPO_ENTREGA, p.FORMA_PAGAMENTO,
          u.NOME_SOCIAL, u.NOME_USUARIO, u.TELEFONE_USUARIO,
          p.SUBTOTAL, p.TAXA_ENTREGA, p.TOTAL_PEDIDO;


-- =====================================================================
-- 6. CARGA INICIAL
-- =====================================================================

INSERT INTO tb_categoria (ID_CATEGORIA, NOME_CATEGORIA, SLUG_CATEGORIA, DESCRICAO_CATEGORIA, ORDEM_EXIBICAO) VALUES
(1, 'Cafés',           'cafes',           'Cafés quentes preparados na hora',          1),
(2, 'Bebidas',         'bebidas',         'Bebidas geladas e especiais',               2),
(3, 'Acompanhamentos', 'acompanhamentos', 'Doces e salgados para acompanhar',          3),
(4, 'Grãos',           'graos',           'Cafés em grãos e moídos para levar para casa', 4);

INSERT INTO tb_produto
  (ID_PRODUTO, ID_CATEGORIA, NOME_PRODUTO, DESCRICAO_PRODUTO, IMAGEM_URL, PRECO, ESTOQUE, ESTOQUE_MINIMO, DESTAQUE) VALUES
-- Cafés
(1,  1, 'Espresso Clássico',      'Café expresso tradicional italiano, forte e encorpado com crema dourada',  'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=400&fit=crop&q=80',  6.50, 200, 20, 1),
(2,  1, 'Cappuccino Tradicional', 'Espresso com leite vaporizado e espuma cremosa, finalizado com cacau',      'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop&q=80',  9.50, 150, 20, 1),
(3,  1, 'Café Latte',             'Espresso suave com bastante leite vaporizado e uma fina camada de espuma',  'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400&h=400&fit=crop&q=80', 10.00, 150, 20, 1),
(4,  1, 'Café Americano',         'Espresso duplo diluído em água quente, mantendo todo o sabor',              'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop&q=80',  7.50, 120, 15, 0),
(5,  1, 'Macchiato',              'Espresso marcado com uma pequena porção de espuma de leite',                'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=400&h=400&fit=crop&q=80',  7.00, 100, 15, 0),
(6,  1, 'Flat White',             'Espresso duplo com microespuma aveludada de leite, estilo australiano',     'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop&q=80', 11.00,  80, 10, 0),
(7,  1, 'Mocha',                  'Espresso com calda de chocolate belga, leite vaporizado e chantilly',      'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=400&h=400&fit=crop&q=80', 12.50,  80, 10, 0),
-- Bebidas
(8,  2, 'Iced Latte',             'Espresso gelado com leite cremoso e gelo, refrescante e saboroso',         'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=400&fit=crop&q=80', 11.00,  90, 10, 0),
(9,  2, 'Cold Brew',              'Café extraído a frio por 16 horas, sabor suave e doce natural',            'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&q=80', 13.00,  60, 10, 0),
(10, 2, 'Frappuccino',            'Bebida gelada batida com café, leite, gelo e chantilly',                   'https://images.unsplash.com/photo-1562155618-e1a8bc2eb04f?w=400&h=400&fit=crop&q=80', 14.50,  60, 10, 0),
(11, 2, 'Affogato',               'Sorvete de creme afogado em espresso quente, uma sobremesa perfeita',      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&q=80', 15.00,  40,  8, 0),
(12, 2, 'Chocolate Gelado',       'Chocolate belga batido com leite gelado e chantilly',                      'https://images.unsplash.com/photo-1542990253-a781e04c0082?w=400&h=400&fit=crop&q=80', 12.00,  50, 10, 0),
-- Acompanhamentos
(13, 3, 'Croissant Tradicional',  'Croissant francês folhado, crocante por fora e macio por dentro',          'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&q=80',  8.50,  40, 10, 0),
(14, 3, 'Pão de Queijo',          'Autêntico pão de queijo mineiro, quentinho e sequinho',                    'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=400&h=400&fit=crop&q=80',  6.00,  80, 15, 0),
(15, 3, 'Bolo de Cenoura',        'Bolo caseiro de cenoura com cobertura de chocolate',                       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop&q=80',  9.00,  25,  6, 0),
(16, 3, 'Brownie Artesanal',      'Brownie denso com chocolate 70% cacau e nozes',                             'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop&q=80', 10.50,  30,  6, 0),
(17, 3, 'Torta de Limão',         'Torta cremosa de limão com merengue suíço',                                 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop&q=80', 11.00,   7,  6, 0),
(18, 3, 'Cookie Americano',       'Cookie crocante com gotas de chocolate ao leite',                          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop&q=80',  7.50,  50, 10, 0),
(19, 3, 'Cheesecake',             'Cheesecake cremoso com calda de frutas vermelhas',                         'https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=400&h=400&fit=crop&q=80', 13.50,  20,  5, 0),
(20, 3, 'Sanduíche Natural',      'Sanduíche de pão integral com frango, alface e tomate',                    'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=400&fit=crop&q=80', 12.00,   4,  5, 0),
-- Grãos
(21, 4, 'Café em Grãos 250g',     'Grãos arábica premium torrados artesanalmente, torra média',               'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&q=80', 32.00,  30,  5, 0),
(22, 4, 'Café em Grãos 500g',     'Blend especial de grãos arábica e robusta, torra escura',                  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=400&fit=crop&q=80', 58.00,  20,  5, 0),
(23, 4, 'Café Gourmet 1kg',       '100% arábica de origem única, notas de chocolate e caramelo',              'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=400&h=400&fit=crop&q=80', 98.00,  10,  3, 0),
(24, 4, 'Café Moído 250g',        'Café moído na hora, moagem média para filtro e prensa francesa',           'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=400&h=400&fit=crop&q=80', 28.00,  35,  5, 0),
(25, 4, 'Café Especial 500g',     'Grãos especiais pontuação 85+, torra clara com notas frutadas',            'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400&h=400&fit=crop&q=80', 75.00,  12,  3, 0);

-- Usuários de demonstração (senhas com hash PBKDF2-SHA256, 100.000 iterações)
--   Admin ........ CPF 529.982.247-25 | admin@cafeartesanal.com.br     | senha Admin@123
--   Atendente .... CPF 111.444.777-35 | atendente@cafeartesanal.com.br | senha Atendente@123
--   Cliente ...... CPF 390.533.447-05 | cliente@email.com              | senha Cliente@123
INSERT INTO tb_usuario
  (ID_USUARIO, NOME_USUARIO, NOME_SOCIAL, CPF_USUARIO, EMAIL_USUARIO, TELEFONE_USUARIO, SENHA_HASH, PERFIL_USUARIO, DATA_CADASTRO) VALUES
(1, 'Administrador do Sistema', NULL, '52998224725', 'admin@cafeartesanal.com.br', '(11) 99999-0000',
    'pbkdf2-sha256$100000$KOgjto2S3SIVVx4BM3ajDA==$2SEGhWWKCIZYo7ijw7KCbGN5Ht2jU/9K51y9Ris17uY=', 'admin', NOW() - INTERVAL 30 DAY),
(2, 'Ana Paula Souza', NULL, '11144477735', 'atendente@cafeartesanal.com.br', '(11) 98888-1111',
    'pbkdf2-sha256$100000$h+KfJeJ+79TcTNZjkXglZA==$nHRvVByaq3aqj8WD41aE3oo8EtIbo41mYOzwKaTodCM=', 'atendente', NOW() - INTERVAL 30 DAY),
(3, 'Carlos Eduardo Lima', 'Carla Lima', '39053344705', 'cliente@email.com', '(11) 97777-2222',
    'pbkdf2-sha256$100000$o7qifJbffTl1L3iLULc5UA==$A61ILwjSArBSXWFKH/Gf9aTW/wC+PXPnXu1pCdIOIjw=', 'cliente', NOW() - INTERVAL 10 DAY);

INSERT INTO tb_endereco
  (ID_USUARIO, APELIDO, CEP, LOGRADOURO, NUMERO, COMPLEMENTO, BAIRRO, CIDADE, UF, REFERENCIA, PRINCIPAL) VALUES
(3, 'Casa', '01310100', 'Avenida Paulista', '1000', 'Apto 52', 'Bela Vista', 'São Paulo', 'SP', 'Próximo ao metrô Trianon', 1);

-- Pedidos de demonstração (alimentam o painel). São criados como "pendente" e
-- percorrem o fluxo real de status: os triggers baixam/estornam o estoque e
-- registram a linha do tempo automaticamente.
INSERT INTO tb_pedido
  (ID_PEDIDO, ID_USUARIO, TIPO_ENTREGA, FORMA_PAGAMENTO, TAXA_ENTREGA, TOTAL_PEDIDO, ENDERECO_ENTREGA, DATA_PEDIDO) VALUES
(1, 3, 'entrega',  'pix',            5.00, 5.00, 'Avenida Paulista, 1000 - Apto 52 - Bela Vista, São Paulo/SP - CEP 01310-100', TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '08:40:00')),
(2, 3, 'retirada', 'cartao_debito',  0.00, 0.00, NULL,                                                                          TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '15:10:00')),
(3, 3, 'entrega',  'cartao_credito', 5.00, 5.00, 'Avenida Paulista, 1000 - Apto 52 - Bela Vista, São Paulo/SP - CEP 01310-100', TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '09:25:00')),
(4, 3, 'retirada', 'dinheiro',       0.00, 0.00, NULL,                                                                          TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '11:05:00')),
(5, 3, 'entrega',  'pix',            5.00, 5.00, 'Avenida Paulista, 1000 - Apto 52 - Bela Vista, São Paulo/SP - CEP 01310-100', TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '16:45:00')),
(6, 3, 'retirada', 'pix',            0.00, 0.00, NULL,                                                                          TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '07:55:00')),
(7, 3, 'entrega',  'cartao_credito', 5.00, 5.00, 'Avenida Paulista, 1000 - Apto 52 - Bela Vista, São Paulo/SP - CEP 01310-100', TIMESTAMP(CURDATE(), '07:15:00')),
(8, 3, 'retirada', 'pix',            0.00, 0.00, NULL,                                                                          TIMESTAMP(CURDATE(), '07:30:00'));

-- Os itens são preparados numa tabela temporária: um trigger não pode alterar
-- tb_produto enquanto o próprio INSERT estiver lendo tb_produto.
CREATE TEMPORARY TABLE tmp_itens_demo AS
SELECT x.ID_PEDIDO, p.ID_PRODUTO, p.NOME_PRODUTO, x.QTD AS QUANTIDADE, p.PRECO AS VALOR_UNITARIO
  FROM (
    SELECT 1 AS ID_PEDIDO,  2 AS ID_PRODUTO, 2 AS QTD UNION ALL
    SELECT 1, 13, 2 UNION ALL
    SELECT 2,  1, 1 UNION ALL
    SELECT 2, 14, 3 UNION ALL
    SELECT 3,  3, 1 UNION ALL
    SELECT 3, 16, 1 UNION ALL
    SELECT 3, 21, 1 UNION ALL
    SELECT 4,  9, 2 UNION ALL
    SELECT 5,  2, 1 UNION ALL
    SELECT 5,  7, 1 UNION ALL
    SELECT 5, 19, 2 UNION ALL
    SELECT 6,  1, 2 UNION ALL
    SELECT 6, 14, 2 UNION ALL
    SELECT 7,  8, 2 UNION ALL
    SELECT 7, 18, 1 UNION ALL
    SELECT 8,  2, 1 UNION ALL
    SELECT 8, 15, 1
  ) x
  JOIN tb_produto p ON p.ID_PRODUTO = x.ID_PRODUTO;

INSERT INTO tb_item_pedido (ID_PEDIDO, ID_PRODUTO, NOME_PRODUTO, QUANTIDADE, VALOR_UNITARIO)
SELECT ID_PEDIDO, ID_PRODUTO, NOME_PRODUTO, QUANTIDADE, VALOR_UNITARIO FROM tmp_itens_demo;

DROP TEMPORARY TABLE tmp_itens_demo;

-- Consolida subtotal/total dos pedidos de demonstração
UPDATE tb_pedido ped
   SET ped.SUBTOTAL     = (SELECT SUM(i.SUBTOTAL) FROM tb_item_pedido i WHERE i.ID_PEDIDO = ped.ID_PEDIDO),
       ped.TOTAL_PEDIDO = ped.SUBTOTAL + ped.TAXA_ENTREGA;

-- Avança os pedidos pelo fluxo (atendente = usuário 2)
UPDATE tb_pedido SET STATUS_PEDIDO = 'em_preparo',        ID_USUARIO_ATUALIZACAO = 2 WHERE ID_PEDIDO IN (1, 2, 3, 5, 6, 7);
UPDATE tb_pedido SET STATUS_PEDIDO = 'pronto',            ID_USUARIO_ATUALIZACAO = 2 WHERE ID_PEDIDO IN (1, 2, 3, 5, 6);
UPDATE tb_pedido SET STATUS_PEDIDO = 'saiu_para_entrega', ID_USUARIO_ATUALIZACAO = 2 WHERE ID_PEDIDO IN (1, 3, 5);
UPDATE tb_pedido SET STATUS_PEDIDO = 'entregue',          ID_USUARIO_ATUALIZACAO = 2 WHERE ID_PEDIDO IN (1, 2, 3, 5, 6);

-- Pedido 4 cancelado pelo cliente: o trigger devolve o estoque
UPDATE tb_pedido
   SET STATUS_PEDIDO = 'cancelado', MOTIVO_CANCELAMENTO = 'Cliente desistiu do pedido', ID_USUARIO_ATUALIZACAO = 3
 WHERE ID_PEDIDO = 4;

-- Ajusta as datas do histórico/kardex para ficarem coerentes com a data de cada pedido
UPDATE tb_historico_status_pedido h
  JOIN (SELECT ID_HISTORICO,
               ROW_NUMBER() OVER (PARTITION BY ID_PEDIDO ORDER BY ID_HISTORICO) - 1 AS ETAPA
          FROM tb_historico_status_pedido) x ON x.ID_HISTORICO = h.ID_HISTORICO
  JOIN tb_pedido p ON p.ID_PEDIDO = h.ID_PEDIDO
   SET h.DATA_ALTERACAO = p.DATA_PEDIDO + INTERVAL (x.ETAPA * 9) MINUTE;

UPDATE tb_movimentacao_estoque m
  JOIN tb_pedido p ON p.ID_PEDIDO = m.ID_PEDIDO
   SET m.DATA_MOVIMENTACAO = IF(m.TIPO_MOVIMENTACAO = 'venda', p.DATA_PEDIDO, p.DATA_PEDIDO + INTERVAL 9 MINUTE);

UPDATE tb_movimentacao_estoque
   SET DATA_MOVIMENTACAO = NOW() - INTERVAL 30 DAY
 WHERE TIPO_MOVIMENTACAO = 'carga_inicial';

-- Uma alteração de preço para demonstrar a auditoria (trigger trg_produto_au)
UPDATE tb_produto SET PRECO = 6.50 WHERE ID_PRODUTO = 14;
