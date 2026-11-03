# Café Artesanal — App mobile (Flutter)

App do cliente: cardápio com modo offline, carrinho, checkout, acompanhamento de pedidos e conta.
Consome a API REST em `src/CafeArtesanal.Api`. Como rodar: veja o [README principal](../README.md).

| Pasta | Conteúdo |
|---|---|
| `lib/api` | Modelos, cliente HTTP (JWT + renovação da sessão) e endpoints |
| `lib/estado` | Estado com Provider: sessão, carrinho e catálogo (sincronização) |
| `lib/telas` | Telas do app |
| `lib/widgets` | Componentes reutilizáveis |
| `lib/core` | Configuração, tema, formatação e armazenamento local |
| `test` | Testes de unidade e de widget |

## Plataformas

O projeto é gerado para Android e Web. A pasta `ios/` foi removida porque não dá para compilar para iOS no Windows;
para recriá-la em um Mac, rode `flutter create --platforms=ios .` dentro de `mobile/`.
