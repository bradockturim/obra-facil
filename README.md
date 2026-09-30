# Obra Fácil

PWA de serviços de construção e reforma para Três Rios/RJ. Especificação completa
em [`especificacao-app-obras-tres-rios.md`](./especificacao-app-obras-tres-rios.md).

Stack: React + Vite + TypeScript + TailwindCSS + `vite-plugin-pwa`, com
Supabase (Postgres + RLS + Auth + Realtime + Storage + Edge Functions) e
deploy no Cloudflare Pages — custo zero (seção 10 da especificação).

## Status

**Semana 1 do roadmap (seção 14) concluída e no ar:**
- App publicado: https://obra-facil-5r1.pages.dev (Cloudflare Pages)
- Repositório: https://github.com/bradockturim/obra-facil
- Projeto Supabase real conectado, migrations `0001` (schema) e `0002`
  (RLS) aplicadas
- Login por link mágico (e-mail) funcionando; login Google pendente de
  colar o Client ID/Secret em Authentication → Providers → Google no
  painel do Supabase

Detalhes/checklist de provisionamento em [`SETUP.md`](./SETUP.md).

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Supabase
npm run dev
```

- `npm run dev` — servidor de desenvolvimento (Vite)
- `npm run build` — checagem de tipos + build de produção
- `npm run typecheck` — só checagem de tipos
- `npm run preview` — serve o build de produção localmente

## Estrutura

```
src/
  features/auth/     Login (Google + magic link), contexto de sessão, rota protegida
  lib/                Cliente Supabase
  routes/             Telas do app
supabase/
  migrations/         Schema (0001) e RLS (0002) do Postgres
```

## Próximas etapas

Semanas 2–10 da Fase 1 (ver seção 14 da especificação): perfis e
verificação de profissionais, catálogo/busca, pedidos + chat realtime +
propostas, Pagamento Garantido simulado (`MockPaymentProvider` + Edge
Functions), avaliações e ranking, anúncios/destaque, leads de parceiros,
Web Push e PWA completo.
