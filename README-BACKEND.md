# O que foi adicionado ao Open Higgsfield AI

Este projeto partiu do [Open-Higgsfield-AI](https://github.com/Autom8AI/Open-Higgsfield-AI),
que por padrão pede a chave da Muapi do **usuário** e guarda no navegador dele
(`localStorage`). Isso não dá pra cobrar de ninguém — cada pessoa paga a
própria conta na Muapi.

O que foi montado por cima resolve exatamente isso: a chave da Muapi agora
fica só no seu servidor, cada usuário tem uma conta com saldo em R$, e toda
geração passa por uma checagem de crédito antes de rodar.

## Arquivos novos

```
lib/
  db.js          → banco SQLite: usuários, saldo, histórico de transações e gerações
  auth.js        → login/cadastro por e-mail+senha, sessão via cookie httpOnly
  pricing.js     → converte o custo real da Muapi (US$) em R$, com sua margem

app/api/
  auth/signup, login, logout, me    → conta do usuário
  credits/balance                   → saldo atual
  generate                          → ⭐ rota principal: checa crédito → chama a Muapi
                                       com a chave do servidor → cobra o custo REAL
  upload                            → proxy de upload (usuário nunca vê a chave)
  billing/checkout, webhook         → Stripe: comprar créditos e confirmar pagamento

.env.example      → todas as variáveis de ambiente que você precisa preencher
```

## Como funciona a cobrança (o ponto mais importante)

A Muapi devolve o custo exato de cada geração na própria resposta da API
(`cost.amount_usd`). Em vez de manter uma tabela de preços por modelo que
fica desatualizada, a rota `/api/generate` faz assim:

1. **Antes de gerar**: debita uma estimativa conservadora (o teto de preço
   daquele tipo de geração, configurado em `lib/pricing.js`). Se o saldo não
   cobre nem a estimativa, a geração é bloqueada — ninguém gera de graça.
2. **Chama a Muapi** com a chave do servidor (`MUAPI_API_KEY`, nunca exposta
   ao navegador).
3. **Depois de gerar**: estorna a estimativa e cobra o valor **real** que a
   Muapi retornou, convertido pra R$ e multiplicado pela sua margem
   (`PRICE_MARKUP`, padrão 4x).

Se a geração falhar, a estimativa é estornada inteira — o usuário não paga
por algo que não recebeu.

## O que falta conectar no frontend

Hoje `packages/studio/src/muapi.js` é chamado **diretamente do navegador**
pelos componentes (`ImageStudio.jsx`, `VideoStudio.jsx`, etc.), usando a
chave que o `ApiKeyModal` salvou no `localStorage`. Isso ainda não foi
alterado.

Para o Image Studio funcionar com o novo backend, troque a chamada a
`generateImage(apiKey, params)` dentro de `ImageStudio.jsx` por uma chamada
a `fetch('/api/generate', { method: 'POST', body: JSON.stringify({ kind: 'image', ...params }) })`
— sem precisar de `apiKey` nenhuma no cliente. O `ApiKeyModal` pode ser
removido depois disso (não é mais necessário pedir chave ao usuário).

**Video, I2V e Lip Sync ainda chamam a Muapi direto do navegador.** Para
migrar cada um, siga exatamente o padrão de `app/api/generate/route.js`:
importe `generateVideo` / `generateI2V` / `processLipSync` de
`packages/studio/src/muapi.js`, adicione o tipo em
`ESTIMATED_CEILING_USD` (`lib/pricing.js`), e repita os 3 passos de cobrança.
É código repetitivo, não complexo — mas é trabalho real, não estimei tempo
pra isso aqui de propósito, porque depende de quanto você quer lançar de
uma vez (só imagem já é um MVP válido pra testar demanda).

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# preencha MUAPI_API_KEY, JWT_SECRET, STRIPE_SECRET_KEY no .env.local
npm run dev
```

Pra testar o webhook do Stripe localmente, use a Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```
Isso te dá o `STRIPE_WEBHOOK_SECRET` de teste pra colocar no `.env.local`.

## Indo pra produção

- **Hospedagem**: Vercel NÃO segura bem SQLite com escrita (sistema de
  arquivos efêmero) — use Railway, Render, ou uma VPS com disco persistente.
- **Pagamento com PIX**: Stripe no Brasil aceita PIX em contas habilitadas —
  ative em Settings → Payment methods no dashboard, e adicione `'pix'` no
  array `payment_method_types` de `billing/checkout/route.js`. Se preferir
  PIX nativo (sem intermediário internacional), troque o Stripe por
  Mercado Pago ou Asaas — a lógica do webhook é a mesma, só muda o SDK.
- **LGPD**: você vai guardar e-mail e histórico de uso — tenha uma política
  de privacidade e um jeito do usuário pedir exclusão dos dados.
- **JWT_SECRET real**: gere com `openssl rand -base64 32`, nunca deixe o
  valor padrão de desenvolvimento em produção.
- **Banco**: SQLite aguenta bem centenas de usuários simultâneos com
  `WAL mode` (já configurado). Se crescer além disso, migre pra Postgres —
  só o conteúdo de `lib/db.js` muda, o resto do app não sabe que existe
  um banco por trás.

## Testando a régua de margem antes de lançar

Ajuste `PRICE_MARKUP` e `USD_TO_BRL` no `.env.local` e gere algumas imagens
de teste — o valor debitado aparece na resposta da API (`charged_brl`) e
fica registrado na tabela `generations` do banco, pra você conferir se a
conta está fechando como na calculadora que simulamos antes.
