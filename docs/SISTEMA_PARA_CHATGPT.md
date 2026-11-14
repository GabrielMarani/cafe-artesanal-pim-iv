# Contexto do sistema "Café Artesanal" (PIM IV – ADS/UNIP)

> **Para o assistente de IA:** este documento descreve um sistema já pronto e funcionando. Use-o como contexto para
> responder perguntas, explicar partes do código, sugerir mudanças ou ajudar a escrever a documentação do PIM.
> Responda em português do Brasil. Ao sugerir alterações, respeite a arquitetura e as regras descritas aqui e não
> invente funções que não existem. Se precisar de um trecho de código que não está aqui, peça o arquivo.

---

## 1. O que é o sistema

O **Café Artesanal** é um sistema de pedidos para uma cafeteria. É o Projeto Integrado Multidisciplinar (PIM) do
4º semestre do curso de Análise e Desenvolvimento de Sistemas da UNIP. Ele continua o sistema do PIM III, que era um
cardápio com autoatendimento, e foi refatorado e ampliado para uma plataforma completa com:

- **API REST** em C# / .NET 8 (ASP.NET Core), organizada em camadas;
- **Site** (HTML, CSS e JavaScript puro, sem framework), servido pela própria API, com loja para clientes e painel administrativo;
- **Aplicativo móvel** em Flutter/Dart (Android, e também roda no navegador);
- **Banco de dados MariaDB/MySQL** (XAMPP) com triggers, procedures e views.

Site e aplicativo usam **a mesma API**. Nenhum dos dois acessa o banco diretamente.

```
 Site (wwwroot)      App Flutter
        \               /
         HTTP + JSON + JWT
                |
   CafeArtesanal.Api            → controllers, autenticação, limites, Swagger, /health
   CafeArtesanal.Application    → casos de uso (serviços), DTOs, validação, interfaces
   CafeArtesanal.Domain         → entidades e regras de negócio (sem dependências)
   CafeArtesanal.Infrastructure → EF Core + MariaDB, repositórios, procedures, JWT, PBKDF2
                |
            MariaDB (bd_cafe_artesanal)
```

## 2. Perfis de usuário

| Perfil | O que pode fazer |
|---|---|
| Visitante (sem login) | Ver cardápio, buscar produtos e montar o carrinho |
| Cliente | Fazer pedidos (retirada ou entrega), acompanhar, cancelar pedido pendente, confirmar recebimento, editar dados, senha e endereços |
| Atendente | Tudo do painel de pedidos: ver a fila, avançar o status e cancelar com motivo |
| Administrador | Tudo do atendente e também: produtos, estoque, categorias, usuários e painel de indicadores |

No código, as políticas de acesso são `Equipe` (atendente + admin) e `Admin`.

**Usuários de demonstração** (criados pelo script do banco):

| Perfil | Login (CPF ou e-mail) | Senha |
|---|---|---|
| Administrador | 529.982.247-25 / admin@cafeartesanal.com.br | Admin@123 |
| Atendente | 111.444.777-35 / atendente@cafeartesanal.com.br | Atendente@123 |
| Cliente (nome social "Carla Lima") | 390.533.447-05 / cliente@email.com | Cliente@123 |

## 3. Estrutura de pastas

```
CafeArtesanal.sln                 solução .NET (abre no Visual Studio)
database/bd_cafe_artesanal.sql    script completo do banco (tabelas, triggers, procedures, views e dados iniciais)
src/
  CafeArtesanal.Domain/           Entidades/ (Pedido, Produto, Usuario, Categoria, Endereco, ItemPedido,
                                  HistoricoStatusPedido, RefreshToken), Enums/, Comum/ (Cpf, exceções de domínio)
  CafeArtesanal.Application/      Servicos/ (AuthServico, ContaServico, PedidoServico, ProdutoServico,
                                  CategoriaServico, UsuarioServico, RelatorioServico, SincronizacaoServico,
                                  GeradorSessao), DTOs/, Interfaces/, Validacao/, Mapeamentos/, Comum/
  CafeArtesanal.Infrastructure/   Dados/ (CafeDbContext e configurações do EF), Repositorios/, Seguranca/
                                  (hash de senha PBKDF2 e geração de JWT), Banco/ (cria o banco a partir do script)
  CafeArtesanal.Api/              Controllers/, Infra/ (configuração de serviços e pipeline, tratamento de erros),
                                  Program.cs, appsettings*.json
    wwwroot/                      o site: index, cardapio, carrinho, login, conta, pedidos, admin,
                                  acessibilidade e 404 (.html); css/; js/nucleo/ (api, http, sessao, carrinho,
                                  layout, acessibilidade...); js/paginas/ (um script por página; admin/ com
                                  painel, pedidos, produtos, categorias e usuários)
tests/
  CafeArtesanal.Tests/            42 testes de unidade (xUnit), sem banco
  CafeArtesanal.IntegrationTests/ 19 testes de integração (API real + banco bd_cafe_artesanal_teste)
mobile/                           app Flutter
  lib/api/                        cliente_api.dart (HTTP, token e renovação), modelos.dart, servicos_api.dart
  lib/estado/                     sessao_estado, carrinho_estado, catalogo_estado (Provider)
  lib/telas/                      cardápio, produto, carrinho, checkout, pedidos, pedido, conta, perfil,
                                  senha, endereço, login, cadastro, servidor e shell (navegação)
  lib/core/                       config (endereço da API), tema, formatos, armazenamento
  test/                           23 testes do app
Dockerfile, docker-compose.yml    execução em containers (opcional)
.github/workflows/ci.yml          pipeline de integração contínua
docs/                             documentação (análise de requisitos em PDF)
```

## 4. Tecnologias

- **Back-end:** .NET 8, ASP.NET Core, Entity Framework Core com Pomelo (MySQL/MariaDB), JWT Bearer, rate limiting nativo,
  Swagger (Swashbuckle), ProblemDetails para erros, health checks.
- **Front-end web:** HTML5, CSS com variáveis (temas claro/escuro e alto contraste), JavaScript em módulos, VLibras.
- **Mobile:** Flutter 3 / Dart, `provider` (estado), `http`, `shared_preferences` (cache do cardápio e carrinho),
  `flutter_secure_storage` (tokens), `connectivity_plus` (detecta internet), `intl`.
- **Banco:** MariaDB 10.4+ (XAMPP) ou MySQL 8.
- **Testes:** xUnit, WebApplicationFactory (integração), flutter_test.

## 5. Banco de dados (`bd_cafe_artesanal`)

**Tabelas (10):** `tb_categoria`, `tb_produto`, `tb_historico_preco`, `tb_usuario`, `tb_endereco`, `tb_pedido`,
`tb_item_pedido`, `tb_historico_status_pedido`, `tb_movimentacao_estoque`, `tb_refresh_token`.

**Triggers (9):**
- `trg_usuario_bi` / `trg_usuario_bu`: normalizam o CPF (só dígitos) e o e-mail (minúsculo, vazio vira NULL).
- `trg_produto_ai`: registra a carga inicial de estoque do produto novo.
- `trg_produto_au`: guarda o histórico quando o preço muda (`tb_historico_preco`).
- `trg_item_pedido_bi`: antes de inserir um item, confere se o produto existe, está ativo e tem estoque.
- `trg_item_pedido_ai`: baixa o estoque e registra a movimentação de venda.
- `trg_pedido_ai`: grava o primeiro registro no histórico de status ("Pedido criado").
- `trg_pedido_bu`: impede mudar o status de pedido já entregue ou cancelado.
- `trg_pedido_au`: grava o histórico de status e devolve o estoque quando o pedido é cancelado.

**Procedures (5):** `sp_dashboard_resumo`, `sp_vendas_por_dia`, `sp_produtos_mais_vendidos`, `sp_pedidos_por_status`
(usadas pelo painel de indicadores) e `sp_ajustar_estoque` (entrada/saída manual de estoque com motivo).

**Views (2):** `vw_produtos_estoque_baixo` e `vw_pedidos_detalhados`.

Os valores de enum são gravados em texto: status `pendente`, `em_preparo`, `pronto`, `saiu_para_entrega`, `entregue`,
`cancelado`; entrega `retirada` ou `entrega`; pagamento `pix`, `cartao_credito`, `cartao_debito`, `dinheiro`;
perfil `cliente`, `atendente`, `admin`. A API usa os mesmos textos no JSON.

O banco antigo do PIM III (`bd_cafeteria`) é outro banco e não é usado nem alterado.

## 6. API REST (prefixo `/api/v1`)

| Método e rota | Acesso | Função |
|---|---|---|
| POST `/auth/registrar` | público | Cria conta de cliente e já devolve a sessão |
| POST `/auth/login` | público | Login com CPF ou e-mail + senha |
| POST `/auth/refresh` | público | Troca o refresh token por um novo par de tokens (rotação) |
| POST `/auth/logout` | público | Revoga o refresh token |
| GET `/auth/me` | logado | Dados do usuário logado |
| GET/PUT `/conta/perfil` | logado | Ver/editar nome, nome social, e-mail e celular |
| PUT `/conta/senha` | logado | Troca a senha (encerra as outras sessões e devolve uma nova) |
| GET/POST `/conta/enderecos`, PUT/DELETE `/conta/enderecos/{id}` | logado | Endereços do cliente (máx. 10) |
| GET `/categorias`, GET `/categorias/{id}` | público | Lista/obtém categorias |
| POST/PUT/DELETE `/categorias` | admin | Gerencia categorias (exclusão só sem produtos) |
| GET `/produtos`, GET `/produtos/{id}` | público | Lista paginada com busca, filtro por categoria e ordenação |
| POST/PUT `/produtos`, DELETE `/produtos/{id}` | admin | Cadastra, edita e desativa produtos |
| POST `/produtos/{id}/estoque` | admin | Ajuste de estoque (chama `sp_ajustar_estoque`) |
| GET `/sync/catalogo?desde=` | público | Sincronização incremental do cardápio para o app |
| GET `/loja` | público | Dados da loja (taxa de entrega, pedido mínimo, horários) |
| GET `/pedidos`, GET `/pedidos/{id}` | logado | Cliente vê os seus; equipe vê todos (com filtros) |
| POST `/pedidos` | logado | Cria pedido |
| PATCH `/pedidos/{id}/status` | equipe | Avança o status ou cancela com motivo |
| POST `/pedidos/{id}/cancelar` | logado | Cliente cancela pedido pendente |
| POST `/pedidos/{id}/confirmar-recebimento` | logado | Cliente confirma entrega/retirada |
| GET `/usuarios`, PATCH `/usuarios/{id}/perfil`, PATCH `/usuarios/{id}/ativo` | admin | Gestão de usuários |
| GET `/relatorios/dashboard?inicio=&fim=` | admin | Indicadores do painel |

Outros endereços: `/swagger` (documentação interativa) e `/health` (verifica a API e o banco).

Erros seguem o padrão **ProblemDetails** (`title`, `detail`, `status`, `traceId`), com mensagens em português.
Códigos usados: 400 (dados inválidos), 401 (não logado/sessão expirada), 403 (sem permissão), 404, 409 (conflito de
alteração simultânea), 422 (regra de negócio violada), 429 (muitas tentativas).

## 7. Regras de negócio principais

1. CPF válido e único; e-mail opcional, mas único se informado. Senha com no mínimo 8 caracteres, letras e números.
2. O preço e o total do pedido são **sempre calculados no servidor** com o preço atual do banco.
3. Pedido: 1 a 30 produtos diferentes, 1 a 99 unidades por produto, sem passar do estoque; produto ou categoria
   desativados não podem ser pedidos.
4. Pedido mínimo de R$ 10,00; taxa de entrega de R$ 5,00; retirada grátis (configurável em `appsettings.json`, seção `Loja`).
5. Entrega exige um endereço do próprio cliente.
6. Fluxo de status: `pendente → em_preparo → pronto → saiu_para_entrega → entregue`. Na retirada, `pronto → entregue`.
   Entregue e cancelado são finais. A regra fica na entidade `Pedido` (domínio) e também no trigger do banco.
7. Cancelamento: o cliente só cancela `pendente`; a equipe cancela até `pronto`, com motivo obrigatório. O pedido não é
   apagado, vira `cancelado` e o estoque volta.
8. Produto já vendido é desativado em vez de excluído.
9. O admin não pode mudar o próprio perfil nem se desativar, e sempre deve existir um admin ativo.
10. Pagamento é feito na entrega/retirada; o sistema só registra a forma escolhida.
11. Nome social, quando informado, aparece no lugar do nome em todo o sistema (`Usuario.NomeExibicao`).

## 8. Segurança

- **JWT** de 60 minutos + **refresh token** de 14 dias com rotação (cada refresh token só vale uma vez; se um token já trocado for reutilizado, todas as sessões do usuário são encerradas).
- A cada requisição autenticada, a API confere se a conta continua ativa e com o mesmo perfil, então desativar ou mudar o
  perfil vale na hora.
- Senhas com **PBKDF2** (100 mil iterações, sal aleatório).
- Limite de 10 tentativas de login/cadastro por minuto por IP e limite geral de requisições.
- Proteção contra XSS (todo dado exibido no site é escapado), consultas parametrizadas (EF Core), cabeçalhos de segurança,
  CORS configurável e controle de concorrência otimista nos pedidos.

## 9. Site (wwwroot)

- **Loja:** `index.html` (início), `cardapio.html`, `carrinho.html` (com checkout), `login.html` (login e cadastro),
  `conta.html` (dados, senha e endereços com busca de CEP pelo ViaCEP), `pedidos.html` (acompanhamento com linha do tempo,
  atualizado sozinho).
- **Painel (`admin.html`):** abas de indicadores (gráficos e exportação CSV), pedidos (fila com aviso de pedido novo),
  produtos e estoque, categorias e usuários. O atendente vê só os pedidos.
- **Acessibilidade:** aumentar/diminuir fonte, alto contraste, tema escuro, VLibras, navegação por teclado com foco visível,
  página `acessibilidade.html`. Preferências ficam no `localStorage`.
- O carrinho e a sessão (tokens e usuário) ficam no `localStorage` (`js/nucleo/carrinho.js` e `js/nucleo/sessao.js`);
  o token é renovado automaticamente em `js/nucleo/http.js`.

## 10. Aplicativo Flutter

- Abas: cardápio, carrinho, pedidos e conta. O checkout permite retirada ou entrega, forma de pagamento e observação.
- **Funciona sem internet:** o cardápio fica salvo no aparelho e é atualizado de forma incremental por `GET /sync/catalogo?desde=`.
  Quando a internet volta, sincroniza sozinho. Uma queda de rede não encerra a sessão.
- Os pedidos em andamento são atualizados automaticamente enquanto a tela está aberta.
- Os tokens ficam no armazenamento seguro do aparelho.
- **Endereço da API:** no emulador Android o padrão é `http://10.0.2.2:5000/api/v1`; na web, `http://localhost:5000/api/v1`;
  no celular físico, o usuário informa o IP do PC em **Conta › Servidor da API**.

## 11. Como executar

1. Ligar o MySQL do XAMPP.
2. `cd src/CafeArtesanal.Api` e `dotnet run`. No ambiente de desenvolvimento, a API **cria o banco sozinha** a partir de
   `database/bd_cafe_artesanal.sql` (ou importe o script pelo phpMyAdmin).
3. Abrir http://localhost:5000 (site), http://localhost:5000/swagger e http://localhost:5000/health.
4. App: `dotnet run --launch-profile rede-local` na API e, em `mobile/`, `flutter pub get` e `flutter run`.
5. Testes: `dotnet test tests/CafeArtesanal.Tests`, `dotnet test tests/CafeArtesanal.IntegrationTests` (precisa do MariaDB)
   e, em `mobile/`, `flutter test`.

A conexão com o banco fica em `src/CafeArtesanal.Api/appsettings.json` (usuário `root` sem senha, padrão do XAMPP).

## 12. Principais diferenças em relação ao PIM III

- De 1 projeto com a lógica nos controllers para 4 camadas (Domain, Application, Infrastructure, Api).
- Preço/total deixaram de vir do navegador; senhas saíram de SHA-256 para PBKDF2; XSS corrigido; refresh token e limite de login.
- Cancelar não apaga mais o pedido; fluxo de status validado; controle de estoque com triggers.
- Novidades: app Flutter, entrega com endereços, formas de pagamento, linha do tempo do pedido, painel de indicadores,
  gestão de usuários/categorias/estoque e acessibilidade.
