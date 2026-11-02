# ☕ Café Artesanal — PIM IV (ADS/UNIP)

Solução integrada para a transformação digital da cafeteria: **API REST em .NET 8**, **site** (clientes + painel administrativo),
**app mobile** (Flutter/Dart) e **banco MariaDB/MySQL** com procedures, triggers e views.
Continuação do sistema do PIM III, refatorado em camadas.

```
┌──────────────┐   ┌──────────────┐
│  Site (Web)  │   │ App Flutter  │   ← clientes, atendentes e administradores
└──────┬───────┘   └──────┬───────┘
       │  HTTPS/JSON + JWT│
┌──────▼──────────────────▼───────┐
│ CafeArtesanal.Api               │  Controllers, autenticação, rate limit, Swagger, /health
├─────────────────────────────────┤
│ CafeArtesanal.Application       │  Casos de uso (serviços), DTOs, validação, interfaces
├─────────────────────────────────┤
│ CafeArtesanal.Domain            │  Entidades e regras de negócio (POO, sem dependências)
├─────────────────────────────────┤
│ CafeArtesanal.Infrastructure    │  EF Core + MariaDB, repositórios, procedures, JWT, PBKDF2
└──────────────┬──────────────────┘
        ┌──────▼──────┐
        │  MariaDB    │  tabelas · triggers · procedures · views
        └─────────────┘
```

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `database/bd_cafe_artesanal.sql` | Script completo do banco (modelo físico, triggers, procedures, views e carga inicial) |
| `src/CafeArtesanal.Domain` | Entidades (`Pedido`, `Produto`, `Usuario`...), máquina de estados do pedido, objeto de valor `Cpf` |
| `src/CafeArtesanal.Application` | Serviços de caso de uso, DTOs, validações e portas (interfaces de repositório) |
| `src/CafeArtesanal.Infrastructure` | `CafeDbContext`, repositórios, chamadas às procedures, hash de senha, JWT, inicializador do banco |
| `src/CafeArtesanal.Api` | API REST + front-end web em `wwwroot/` |
| `tests/CafeArtesanal.Tests` | Testes automatizados (xUnit) |
| `mobile/` | App Flutter/Dart: `lib/telas` (telas), `lib/estado` (Provider), `lib/api` (cliente da API) |
| `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` | Containers e pipeline CI/CD |

## Como rodar (Windows + XAMPP)

**Pré-requisitos:** [.NET SDK 8](https://dotnet.microsoft.com/download/dotnet/8.0), MySQL/MariaDB do XAMPP ligado, [Flutter SDK](https://docs.flutter.dev/get-started/install) (para o app).

### 1. API + site

```bash
cd src/CafeArtesanal.Api
dotnet run
```

- Na primeira execução (ambiente de desenvolvimento) a API **cria o banco `bd_cafe_artesanal` sozinha** a partir do script SQL.
  Se preferir, importe `database/bd_cafe_artesanal.sql` pelo phpMyAdmin.
- O banco do PIM III (`bd_cafeteria`) não é alterado.
- A conexão fica em `src/CafeArtesanal.Api/appsettings.json` (`root` sem senha, padrão do XAMPP).

| Endereço | O que é |
|---|---|
| http://localhost:5000 | Site (loja + painel) |
| http://localhost:5000/swagger | Documentação interativa da API |
| http://localhost:5000/health | Saúde da aplicação e do banco |

### 2. App mobile (Flutter)

1. Rode a API liberada para a rede local: `dotnet run --launch-profile rede-local` (o Windows pode pedir para liberar no firewall).
2. Conecte o celular com a depuração USB ativa (ou abra um emulador Android) e, em outro terminal:

```bash
cd mobile
flutter pub get
flutter run
```

3. No **emulador Android**, o endereço padrão (`http://10.0.2.2:5000/api/v1`) já funciona. No **celular físico**, na mesma rede
   Wi-Fi do PC, informe o IP do computador em **Conta › Servidor da API** (ex.: `http://192.168.0.10:5000/api/v1`).

Para testar no navegador: `flutter run -d chrome`. Para gerar o instalador: `flutter build apk`.

### 3. Tudo com Docker (opcional)

```bash
cp .env.exemplo .env      # edite as senhas
docker compose up -d --build
```

## Usuários de demonstração

| Perfil | Login (CPF ou e-mail) | Senha |
|---|---|---|
| Administrador | `529.982.247-25` ou `admin@cafeartesanal.com.br` | `Admin@123` |
| Atendente | `111.444.777-35` ou `atendente@cafeartesanal.com.br` | `Atendente@123` |
| Cliente (usa nome social "Carla Lima") | `390.533.447-05` ou `cliente@email.com` | `Cliente@123` |

## Onde está cada etapa do PIM IV

| Etapa | Onde encontrar no projeto |
|---|---|
| **3 – Responsabilidade social e diversidade** | Nome social no cadastro e em toda a exibição (`Usuario.NomeExibicao`); VLibras, alto contraste, tamanho de fonte, atalhos de teclado e foco visível (`wwwroot/js/nucleo/layout.js`, `acessibilidade.js`); página `acessibilidade.html`; coleta mínima de dados (LGPD); pagamento em dinheiro/retirada para inclusão; app com rótulos para TalkBack/VoiceOver e fonte do sistema |
| **4 – Web (.NET)** | API REST versionada `/api/v1` (Swagger); autenticação JWT + refresh token com rotação; perfis cliente/atendente/admin; PBKDF2, rate limit no login, CORS, cabeçalhos de segurança, ProblemDetails; painel administrativo (`admin.html`): indicadores, pedidos, produtos, estoque, categorias e usuários |
| **5 – Mobile** | `mobile/lib/telas`: cardápio, produto, carrinho, checkout, pedidos (linha do tempo), conta, login e cadastro; **sincronização**: catálogo offline com sincronização incremental (`GET /sync/catalogo?desde=`), retomada ao voltar a internet (`lib/estado/catalogo_estado.dart`) e status dos pedidos atualizado automaticamente |
| **6 – Arquitetura (.NET)** | 4 projetos em camadas (Domain, Application, Infrastructure, Api); entidades ricas com encapsulamento; Repository + Unit of Work; injeção de dependência; testes unitários |
| **7 – Banco de dados** | `database/bd_cafe_artesanal.sql`: 10 tabelas com PK/FK/UNIQUE/CHECK e índices; coluna gerada; **9 triggers** (baixa e estorno de estoque, histórico de status, auditoria de preço, normalização); **5 procedures** usadas pela API (painel e ajuste de estoque); **2 views** |
| **8 – Nuvem e DevOps** | `Dockerfile` multi-stage (roda os testes no build, usuário não-root), `docker-compose.yml` (MariaDB + API com health check), `.github/workflows/ci.yml` (build, testes, validação do script SQL, análise e testes do app Flutter e publicação da imagem no GHCR) |

## Testes

```bash
dotnet test
```

42 testes cobrindo regras do pedido (fluxo de status, cancelamento, estoque, totais), CPF, e-mail,
hash de senha (inclusive os hashes do script SQL), divisão do script SQL e o serviço de pedidos com repositórios em memória.

No app (`cd mobile`): `flutter analyze` e `flutter test` (11 testes: formatação, modelos, sincronização do catálogo, carrinho e navegação).

## Principais melhorias em relação ao PIM III

- **Segurança:** o preço e o total do pedido eram enviados pelo navegador e aceitos pela API — agora são sempre calculados no servidor.
  Senhas passaram de SHA-256 com o CPF como "sal" para PBKDF2 (100 mil iterações, sal aleatório). XSS corrigido (todo dado da API é escapado).
  Refresh token com rotação e detecção de reuso, limite de tentativas de login, validação de CPF.
- **Regras de negócio:** cancelar não apaga mais o pedido (vira status com motivo e histórico); fluxo de status validado no domínio e no banco;
  produto com pedidos é desativado em vez de excluído (antes gerava erro 500); controle de estoque.
- **Código:** de 1 projeto com a lógica nos controllers para 4 camadas; 15 arquivos JS duplicados/não usados removidos; navbar e rodapé
  deixaram de ser copiados em cada página; CSS com tokens e temas.
- **Novas funções:** app mobile, entrega/retirada com endereços (busca de CEP), formas de pagamento, linha do tempo do pedido, painel com indicadores,
  gestão de categorias/usuários/estoque, acessibilidade.

O código original do PIM III está preservado em `_backup_pim3_original.zip`.
