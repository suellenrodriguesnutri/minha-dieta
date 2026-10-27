# Minha Dieta

App de meta de calorias e diário alimentar da Nutricionista Suellen Rodrigues (CRN-3 97171/P).
Publicado automaticamente no Vercel a cada atualização deste repositório.

## Acesso com e-mail e senha

- A compra aprovada no Hotmart libera o e-mail da compradora (webhook em `/api/hotmart`).
- No primeiro acesso, ela informa o e-mail da compra e cria a senha.
- Cada conta funciona em 1 celular por vez: um login novo desconecta o aparelho anterior.
- Reembolso ou chargeback no Hotmart bloqueia o acesso.
- Painel da nutricionista: `/admin.html` (liberar, bloquear, apagar senha).

## Configuração no Vercel

| Item | Onde |
|---|---|
| Banco de dados | Aba **Storage** do projeto: Upstash for Redis, conectado ao projeto |
| `HOTMART_HOTTOK` | Settings > Environment Variables (valor do "hottok" do webhook no Hotmart) |
| `ADMIN_SENHA` | Settings > Environment Variables (senha do painel, mínimo 8 caracteres) |
| `HOTMART_PRODUCT_ID` | Opcional. ID do produto no Hotmart; outros produtos são ignorados |

Conferir a configuração: abrir `/api/status`.

## Arquivos

- `index.html`: o app
- `admin.html`: painel de acessos
- `api/`: login, cadastro, sessão, webhook do Hotmart, painel
- `sw.js`: funcionamento offline (mudar a versão em `C` a cada atualização do app)
