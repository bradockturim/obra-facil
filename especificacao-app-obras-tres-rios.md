# Especificação Técnica e Funcional — PWA de Serviços de Construção (Três Rios)

> **Nome provisório:** Obra Fácil
> **Versão:** 0.3 — custo zero, **Pagamento Garantido completo em modo simulação**
> **Formato:** PWA (Progressive Web App), mobile-first
> **Praça inicial:** Três Rios/RJ → expansão regional

**Mudanças em relação à v0.2:**
- O **Pagamento Garantido volta ao MVP com o fluxo inteiro**: checkout, retenção, liberação por etapa, contestação, extrato e taxa. Quem processa é um **provedor simulado**. Nenhum dinheiro real circula pelo app.
- O código de pagamento fica atrás de uma interface (`PaymentProvider`). Na Fase 2, troca-se o simulador por um gateway real sem mexer nas telas nem nas regras.
- Enquanto a simulação estiver ativa, o pagamento real é feito direto ao profissional (Pix/dinheiro). O app mostra isso de forma clara.
- O resto continua igual à v0.2: stack gratuita (Supabase + Cloudflare Pages), login Google/e-mail, anúncios cobrados por fora.

---

## 0. Visão em uma frase

Um app onde o morador de Três Rios encontra, conversa, contrata e paga profissionais de construção e reforma **com segurança**. O pagamento fica retido e só é liberado quando a etapa da obra é aprovada. A receita vem de anúncios locais, destaques e, a partir da Fase 2, taxa sobre transações.

**Diferencial central:** *Pagamento Garantido* + curadoria local (profissional verificado pessoalmente).

**No MVP:** o Pagamento Garantido roda em **modo simulação**. Serve para validar a experiência, medir quantos usuários usariam o recurso e demonstrar o produto para anunciantes e investidores, tudo sem gateway e sem custo.

---

## 1. Objetivos do MVP e critérios de validação

| Pergunta | Métrica | Meta em 90 dias (hipótese) |
|---|---|---|
| Existe demanda? | Pedidos de orçamento criados/mês | ≥ 60 |
| Os profissionais aderem? | Profissionais verificados e ativos | ≥ 40 |
| O Pagamento Garantido seria usado? | % de propostas aceitas que passam pelo checkout simulado | ≥ 50% |
| Anunciante paga? | Anunciantes pagantes | ≥ 5 |

**Métricas extras da simulação:**
- Volume transacionado simulado (GMV)
- Comissão que teria sido gerada
- Nº de contestações
- Tempo médio até a aprovação de etapas

Esses números viram argumento para a Fase 2 e para buscar investimento.

---

## 2. Escopo

### 2.1 Dentro do MVP
- Login (Google ou link por e-mail), perfis de cliente e profissional
- Categorias, busca, perfil público do profissional
- Pedido de orçamento, chat em tempo real, proposta formal
- **Pagamento Garantido simulado:** checkout Pix/cartão, retenção, liberação por etapa, contestação, reembolso, extrato do profissional, cálculo de taxa
- Comprovante do acordo (PDF via navegador)
- Avaliações e ranking
- Verificação manual de profissionais
- Banners patrocinados e destaque de profissional (cobrança manual via Pix para o CNPJ)
- Módulo de parceiros com leads
- Painel admin, incluindo o **financeiro simulado**
- Web Push + atalhos `wa.me`
- Instalação na tela inicial (PWA)

### 2.2 Fora do MVP
- **Gateway real** (movimentação de dinheiro) → Fase 2
- Login por SMS/WhatsApp OTP, API oficial do WhatsApp
- Painel self-service de anunciante e cobrança automática
- App nativo, marketplace de materiais, orçamento com IA, multi-cidade na interface

---

## 3. Perfis de usuário

| Perfil | Quem é | O que faz |
|---|---|---|
| **Cliente** | Morador, dono de imóvel, pequeno comércio | Busca, pede orçamento, conversa, paga (simulado), aprova etapas, avalia |
| **Profissional** | Pedreiro, pintor, gesseiro, eletricista, encanador, etc. | Recebe pedidos, envia propostas, executa, vê saldo e repasses (simulados) |
| **Parceiro** | Corretor, despachante/legalização, arquiteto, engenheiro | Recebe leads |
| **Anunciante** | Loja de tinta, depósito, madeireira, vidraçaria | Tem banners cadastrados pelo admin; vê métricas por link |
| **Admin** | Você e seu sócio | Verifica, modera, media contestações, gerencia anúncios e o financeiro simulado |

---

## 4. Categorias iniciais

**Serviços (com Pagamento Garantido):**
Pedreiro · Pintor · Gesseiro/Drywall · Eletricista · Encanador · Azulejista · Serralheiro · Marceneiro · Vidraceiro · Telhadista · Limpeza pós-obra · Montador de móveis

**Parceiros (lead):**
Corretor de imóveis · Legalização/Despachante · Arquiteto · Engenheiro · Topógrafo

As categorias são configuráveis no admin (tipo `servico` ou `lead`).

---

## 5. Jornadas principais

### 5.1 Cliente contrata um serviço

```
Abre app → escolhe categoria (ex.: Pintor)
 → lista ranqueada (+ banner patrocinado)
 → perfil (fotos, nota, selo verificado, bairros)
 → "Pedir orçamento": descrição, fotos, bairro, prazo
 → enviado para até 3 profissionais
 → chat, visita técnica se necessário
 → PROPOSTA formal (valor, etapas, prazo)
 → aceita → comprovante do acordo gerado
 → paga a 1ª etapa no checkout (SIMULADO) → valor "RETIDO"
 → profissional executa e marca etapa concluída com fotos
 → cliente aprova (ou contesta) → valor "LIBERADO" ao profissional
 → repete por etapa → obra concluída → avaliação
```

### 5.2 Profissional entra na plataforma

```
Login Google/e-mail → "Sou profissional"
 → dados (nome, CPF/CNPJ, WhatsApp, categorias, bairros)
 → documento + selfie + 3 a 10 fotos de obras + 1 referência
 → "Em análise" → admin verifica → selo "Verificado"
 → cadastra chave Pix para repasses (no MVP, usada para o pagamento real direto)
```

### 5.3 Pagamento Garantido (fluxo completo, provedor simulado)

1. A proposta define as **etapas** (1 a 6). Exemplo: 30% início, 40% meio, 30% final.
2. O cliente paga a etapa **antes** de ela começar. O checkout tem Pix (QR e copia-e-cola simulados) e cartão (formulário demonstrativo).
3. O simulador confirma o pagamento, disparando um "webhook" simulado, e a etapa fica como **Paga — retida**.
4. O profissional é notificado e marca a etapa como concluída, com fotos obrigatórias.
5. O cliente tem **72h** para aprovar ou contestar. Sem resposta, a etapa é aprovada automaticamente.
6. Com a aprovação, o repasse é **simulado** para o profissional: `valor − taxa da plataforma` aparece no extrato dele.
7. **Contestação:** congela o valor e abre um chamado no admin. O admin decide entre liberar, reembolsar ou dividir. O reembolso também é simulado.
8. **Cancelamento antes do início:** reembolso integral (simulado). Durante a obra, etapas já aprovadas não são reembolsadas.

### 5.4 Regras de transparência do modo simulação (obrigatórias)

Com usuários reais, o app **nunca** pode dar a entender que houve cobrança ou repasse de verdade:

- Faixa fixa no checkout, na etapa paga e no extrato: **"Modo demonstração — nenhum valor é cobrado. Combine o pagamento diretamente com o profissional."**
- Após o "pagamento" simulado, a tela mostra a chave Pix do profissional com o botão **"Pagar o profissional agora (Pix direto)"**.
- O extrato do profissional exibe **"Saldo simulado"**, nunca "saldo disponível".
- O formulário de cartão **não aceita dados reais**. Vem pré-preenchido com um cartão de demonstração, e os campos ficam bloqueados. Nenhum número de cartão é digitado nem armazenado.
- A chave de configuração `PAYMENTS_MODE=simulation` controla tudo isso. Em `live` (Fase 2), as faixas somem e o gateway real assume.

> Assim a simulação valida o comportamento ("o cliente usaria o checkout?") sem risco jurídico ou de confusão.

### 5.5 Lead para parceiro

```
Cliente → categoria "Legalização" → formulário curto
 → lead enviado para até 2 parceiros → parceiro com plano ativo vê o contato → chat
```
O plano do parceiro é ativado manualmente pelo admin, após Pix.

### 5.6 Anunciante e destaque (cobrança manual)

```
Venda presencial/WhatsApp → Pix no CNPJ → admin cadastra a campanha (criativo, categoria, início, fim)
 → no ar → desativada automaticamente na data fim → link público de métricas
```
O destaque do profissional funciona igual: Pix → admin ativa por 30 dias.

---

## 6. Mapa de telas

### 6.1 Cliente
1. Onboarding (3 telas + "Instalar app")
2. Login (Google / link por e-mail)
3. Home: busca, categorias, destaques, banner
4. Lista da categoria: banner patrocinado, filtros, "Patrocinado" marcado
5. Perfil do profissional
6. Novo pedido
7. Meus pedidos
8. Chat: texto, fotos, cartão de proposta
9. Proposta: aceitar/recusar
10. **Checkout**: resumo da etapa, explicação do Pagamento Garantido, Pix/cartão (simulados), faixa de demonstração
11. **Pagamento confirmado**: status "Retido", botão "Pagar o profissional via Pix"
12. **Acompanhamento da obra**: linha do tempo das etapas (aguardando pagamento → retida → concluída → aprovada → liberada), fotos, aprovar/contestar, comprovante
13. Contestação: motivo, fotos, status do chamado
14. Avaliação
15. Perfil / configurações / histórico de pagamentos

### 6.2 Profissional
1. Cadastro e verificação
2. Painel: pedidos, propostas, obras, **saldo simulado**
3. Pedido recebido
4. Criar proposta (etapas e valores)
5. Obra em andamento: etapa paga → pode iniciar → concluir com fotos
6. **Financeiro**: retido, liberado, taxas, extrato (tudo marcado como simulação)
7. Meu perfil público
8. Destaque (contratação via WhatsApp da equipe)

### 6.3 Parceiro
Cadastro · Caixa de leads · Status do plano

### 6.4 Admin (`/admin`, desktop)
Dashboard (métricas + GMV e comissão simulados) · Fila de verificação · Usuários · Pedidos e obras · **Contestações** · **Financeiro simulado** (transações, retido, liberado, reembolsado; botões para forçar confirmação ou falha de pagamento em testes) · Anúncios · Planos ativos · Categorias · Denúncias

---

## 7. Regras de negócio

### 7.1 Ranking
```
score = 0,50 × nota_bayesiana
      + 0,20 × taxa_conclusao
      + 0,15 × velocidade_resposta
      + 0,10 × verificado
      + 0,05 × atividade_recente
```
- A nota bayesiana é `(v×R + m×C)/(v+m)`, com m = 5.
- Novatos verificados ganham impulso nos primeiros 30 dias.
- O destaque pago não altera o score. Ocupa no máximo 2 posições, marcadas como "Patrocinado".

### 7.2 Avaliações
- Só existem após obra concluída no app.
- Critérios: qualidade, pontualidade, limpeza e comunicação, mais comentário e fotos.
- O profissional responde uma vez e avalia o cliente (nota interna).

### 7.3 Incentivo a fechar pelo app
- Garantia (simulada no MVP, real na Fase 2), comprovante, histórico com fotos, contestação mediada.
- Só obras concluídas no app geram avaliação e sobem o ranking.
- Telefone ou link no chat antes do aceite mostra o aviso *"Feche pelo app para ter o Pagamento Garantido"*. O conteúdo não é bloqueado.

### 7.4 Taxa da plataforma (calculada desde já)
- Parâmetro configurável no admin: `taxa_percentual` (sugestão: 10%) e `taxa_cliente_percentual` (sugestão: 0%).
- No MVP ela é só calculada e exibida no extrato simulado, para projetar receita.

### 7.5 Automações (`pg_cron`)
| Evento | Prazo | Ação |
|---|---|---|
| Pedido sem resposta | 24h | Sugere outros profissionais |
| Proposta sem resposta | 5 dias | Expira |
| Etapa concluída sem aprovação | 72h | Aprova e libera (simulado) |
| Pagamento simulado pendente | 30 min | Expira a cobrança |
| Obra concluída sem avaliação | 7 dias | Lembrete |
| Campanha/plano com data fim | Diário | Desativa |
| Recálculo de ranking | Diário | Atualiza o score |

---

## 8. Monetização

| Fonte | Quem paga | MVP | Preço inicial (hipótese) |
|---|---|---|---|
| Banner de categoria | Loja/depósito | **Real**: Pix para o CNPJ, ativação manual | R$ 150–300/mês |
| Banner da home | Loja/depósito | Real | R$ 300–500/mês |
| Destaque do profissional | Profissional | Real | R$ 29–49/mês |
| Plano de parceiro | Corretor/despachante | Real | R$ 99–199/mês |
| Comissão sobre serviço | Profissional | **Simulada** (só calculada) | 8–10% na Fase 2 |

---

## 9. Modelo de dados

```
cities, neighborhoods, categories

profiles          id (= auth.users.id), nome, whatsapp, foto, papeis[], cidade_id, status
professional_profiles
                  user_id, bio, categorias[], bairros[], verificado, verificado_em, docs_status,
                  chave_pix, score, nota_media, total_avaliacoes, obras_concluidas,
                  tempo_resposta_medio, destaque_ate
verification_docs user_id, doc_url, selfie_url, referencia, status        ← bucket PRIVADO
portfolio_items   id, professional_id, foto_url, descricao, categoria_id, origem
partner_profiles  user_id, tipo, registro_profissional, plano_ate

service_requests  id, cliente_id, categoria_id, descricao, fotos[], bairro_id, prazo, status
request_targets   request_id, professional_id, status
conversations     id, request_id, cliente_id, professional_id
messages          id, conversation_id, autor_id, tipo, conteudo, flag_contato_externo, criado_em

proposals         id, conversation_id, valor_total, prazo_dias, material_por, observacoes, status
jobs              id, proposal_id, cliente_id, professional_id,
                  status(em_andamento|concluida|cancelada|em_disputa),
                  comprovante_hash, iniciado_em, concluido_em
job_stages        id, job_id, ordem, descricao, valor,
                  status(aguardando_pagamento|paga_retida|concluida_aguardando|
                         aprovada|liberada|contestada|reembolsada),
                  fotos_conclusao[], prazo_aprovacao

payments          id, stage_id, provider('mock'|'<gateway>'), provider_charge_id,
                  metodo(pix|cartao), valor, taxa_plataforma, valor_liquido,
                  status(pendente|pago_retido|liberado|reembolsado|falhou|expirado),
                  simulado(bool), criado_em, pago_em, liberado_em
payment_events    id, payment_id, tipo(charge_created|paid|released|refunded|failed),
                  payload_json, criado_em                ← log idêntico ao que um gateway enviaria
ledger_entries    id, user_id, payment_id, tipo(credito_retido|credito_liberado|taxa|estorno),
                  valor, simulado, criado_em             ← extrato do profissional
disputes          id, stage_id, aberta_por, motivo, fotos[], decisao,
                  valor_cliente, valor_profissional, resolvida_em

reviews           id, job_id, autor_id, alvo_id, qualidade, pontualidade, limpeza,
                  comunicacao, nota_geral, comentario, fotos[], resposta, publica
leads, lead_recipients
advertisers, ad_campaigns, ad_events
manual_payments   (recebimentos reais de anúncios/planos — controle interno)
settings          chave, valor   ← PAYMENTS_MODE, taxa_percentual, prazo_aprovacao_horas...
push_subscriptions, notifications, reports
```

RLS em todas as tabelas. `payments`, `payment_events` e `ledger_entries` são **somente leitura** para usuários. Só Edge Functions (service role) escrevem nelas.

---

## 10. Arquitetura e stack — custo zero

| Parte | Solução gratuita | Observação |
|---|---|---|
| Front-end (PWA) | React + Vite + `vite-plugin-pwa` + TailwindCSS | Open source |
| Hospedagem do front | **Cloudflare Pages** (Free) | Uso comercial permitido. Evitar Vercel Hobby (não comercial) |
| Banco | **Supabase Free** (Postgres, 500 MB) | |
| Back-end | Supabase (API + RLS) + **Edge Functions** | Substitui Express + VPS |
| Login | Supabase Auth: Google + link por e-mail | Sem SMS |
| Chat | Supabase Realtime | Até 200 conexões simultâneas no Free |
| Fotos | Supabase Storage (1 GB) + compressão WebP no celular | Documentos em bucket privado |
| Automações | `pg_cron` | |
| Push | Web Push (VAPID) via Edge Function | |
| WhatsApp | Links `wa.me` | |
| **Pagamentos** | **`MockPaymentProvider`** (Edge Function própria) | Zero custo; interface pronta para gateway real |
| Comprovante PDF | HTML com CSS de impressão | |
| Código/deploy | GitHub + Cloudflare Pages | |
| Backup | GitHub Actions semanal com `pg_dump` | |
| Analytics | Cloudflare Web Analytics | |
| Domínio | `obrafacil.pages.dev` (grátis); `.com.br` opcional (~R$ 40/ano) | |

### 10.1 Camada de pagamento plugável

```ts
interface PaymentProvider {
  createCharge(stage, metodo): Promise<Charge>   // gera cobrança (Pix/cartão)
  getCharge(id): Promise<Charge>
  release(paymentId): Promise<void>             // libera ao profissional (split)
  refund(paymentId, valor?): Promise<void>      // total ou parcial
  parseWebhook(req): PaymentEvent               // normaliza eventos do provedor
}

class MockPaymentProvider implements PaymentProvider { ... }   // MVP
class GatewayRealProvider implements PaymentProvider { ... }   // Fase 2
```

**Como o simulador funciona:**
- `createCharge` grava o `payment` como `pendente` e devolve um QR Pix de demonstração (texto fixo, sem valor real) ou um "token" de cartão de teste.
- O cliente toca em **"Simular pagamento"**. A Edge Function `mock-webhook` dispara o evento `paid` depois de 2–3 s, imitando o gateway real.
- `release` e `refund` só geram `payment_events` e `ledger_entries` com `simulado = true`.
- O admin pode forçar **falha**, **expiração** ou **estorno** para testar todos os caminhos.
- **Todo o resto do sistema reage a `payment_events`**: telas, notificações, automações. Por isso, trocar o provedor na Fase 2 = implementar `GatewayRealProvider` + apontar o webhook real + `PAYMENTS_MODE=live`.

### 10.2 Arquitetura geral

```
[PWA React @ Cloudflare Pages]
      │ supabase-js (HTTPS + WebSocket)
      ▼
[Supabase Free]
  ├─ Auth
  ├─ Postgres + RLS ◀── pg_cron
  ├─ Realtime (chat, status da obra/pagamento)
  ├─ Storage
  └─ Edge Functions
       ├─ payments-create / payments-release / payments-refund
       ├─ mock-webhook  (Fase 2 → webhook do gateway)
       ├─ send-push · detect-contact · recalc-ranking
       └─ ad-event · ad-metrics-public · admin-actions
[GitHub] ──Actions──▶ deploy + backup semanal
```

### 10.3 Cuidados com o plano gratuito
- O Supabase pausa o projeto após 7 dias sem atividade. Em desenvolvimento, basta reativar no painel.
- Monitorar banco (500 MB), storage (1 GB), 5 GB de tráfego/mês e 200 conexões realtime.
- Ao estourar esses limites: Supabase Pro, US$ 25/mês.

---

## 11. Principais operações

```
Direto (RLS):   perfis, catálogo, pedidos, mensagens, propostas, aprovar etapa, avaliações, leads
Edge Functions: payments-create · mock-webhook · payments-release · payments-refund
                · dispute-resolve (admin) · send-push · detect-contact · recalc-ranking
                · ad-event · ad-metrics-public · admin-actions
Triggers SQL:   payment_event 'paid' → etapa paga_retida + push ao profissional
                etapa aprovada → chama payments-release
                nova mensagem → notificação · avaliação → atualiza média
pg_cron:        tabela 7.5
```

---

## 12. Notificações

| Evento | Destinatário | Canal |
|---|---|---|
| Novo pedido | Profissional | Push + botão WhatsApp |
| Nova mensagem | Ambos | Push |
| Proposta recebida / aceita | Cliente / Profissional | Push |
| Etapa paga (simulado) — pode iniciar | Profissional | Push |
| Etapa concluída — aprovar em 72h | Cliente | Push |
| Valor liberado (simulado) | Profissional | Push |
| Contestação aberta / resolvida | Ambos + admin | Push |
| Verificação aprovada | Profissional | Push + WhatsApp (admin) |

---

## 13. Segurança, LGPD e jurídico

- **Simulação sem dinheiro real:** o app não cobra, não retém e não repassa valores. As faixas de "Modo demonstração" são obrigatórias (seção 5.4).
- **Nenhum dado de cartão real** é digitado ou armazenado. O formulário é demonstrativo e bloqueado.
- **Termos de uso:** informar que o Pagamento Garantido está em fase de demonstração e que o pagamento é combinado diretamente entre as partes. Regras de contestação e suspensão explícitas.
- **Fase 2 (gateway real):** custódia via split/subconta do gateway, nunca na conta da empresa. Validar o modelo com contador/advogado.
- **LGPD:** política de privacidade, consentimento, documentos em bucket privado, exclusão de conta.
- **RLS** em tudo. A `service_role key` só existe nas Edge Functions.

---

## 14. Roadmap

### Fase 0 — Pré-validação (em paralelo)
Recrutar 30 profissionais · 3–5 anunciantes fundadores · nome e identidade

### Fase 1 — MVP custo zero (8–10 semanas)
| Semana | Entrega |
|---|---|
| 1 | Setup (Supabase, Cloudflare Pages, GitHub), esquema + RLS, login |
| 2–3 | Perfis, categorias, catálogo, verificação, admin básico |
| 4 | Pedidos, chat realtime, propostas, comprovante |
| 5–6 | **Pagamento Garantido simulado**: `PaymentProvider` + mock, checkout, retenção, liberação, contestação, extrato, financeiro admin |
| 7 | Avaliações, ranking, anúncios e destaque |
| 8 | Leads, Web Push, PWA completo |
| 9–10 | Testes com usuários reais, ajustes, lançamento |

### Fase 2 — Com receita
Escolher gateway → implementar `GatewayRealProvider` → `PAYMENTS_MODE=live` → comissão real · Painel self-service do anunciante · Domínio e e-mail transacional · Supabase Pro, se necessário

### Fase 3 — Escala
Cidades vizinhas → Petrópolis/Juiz de Fora · App nativo · Materiais

---

## 15. Decisões pendentes

1. **Nome e marca** — "Obra Fácil" é provisório.
2. **Taxa simulada** — 10% para o profissional? Cobrar algo do cliente?
3. **Modo simulação visível a todos**, ou liberado só para um grupo de testes, enquanto os demais usam o fluxo sem checkout?
4. **Limite de profissionais por pedido** — 3?
5. **Parceiros no MVP** ou só na Fase 2?
6. **Aprovação automática em 72h** — mantém?
7. **Domínio próprio no lançamento?** É o único custo, e opcional.
8. **Quem opera o quê** — verificação, vendas de anúncio, contestações.
