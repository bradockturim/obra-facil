-- Obra Fácil — RLS (Fase 1, Semana 1)
-- RLS habilitado em todas as tabelas (seção 9/13). `payments`, `payment_events`
-- e `ledger_entries` são somente leitura para usuários: não há policy de
-- INSERT/UPDATE/DELETE para `authenticated`/`anon` nelas — só a service_role
-- (usada pelas Edge Functions de pagamento, Semana 5-6) escreve, pois ela
-- ignora RLS por padrão no Supabase.
--
-- Observação: algumas policies de escrita aqui (ex.: job_stages, request_targets)
-- são um ponto de partida propositalmente permissivo para o dono dos dados;
-- serão apertadas quando as Edge Functions de transição de etapa/pagamento
-- entrarem (Semana 4-6), substituindo escrita direta do cliente por RPC.

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: usuário autenticado tem papel admin?
-- ─────────────────────────────────────────────────────────────────────────

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and 'admin' = any(papeis)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Catálogo (leitura pública, escrita só admin)
-- ─────────────────────────────────────────────────────────────────────────

alter table cities enable row level security;
create policy cities_select on cities for select using (true);
create policy cities_write on cities for all
  using (is_admin()) with check (is_admin());

alter table neighborhoods enable row level security;
create policy neighborhoods_select on neighborhoods for select using (true);
create policy neighborhoods_write on neighborhoods for all
  using (is_admin()) with check (is_admin());

alter table categories enable row level security;
create policy categories_select on categories for select using (true);
create policy categories_write on categories for all
  using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Perfis
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
create policy profiles_select on profiles for select using (true);
create policy profiles_insert_self on profiles for insert
  with check (auth.uid() = id);
create policy profiles_update_self_or_admin on profiles for update
  using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

alter table professional_profiles enable row level security;
create policy professional_profiles_select on professional_profiles for select using (true);
create policy professional_profiles_insert_self on professional_profiles for insert
  with check (auth.uid() = user_id);
create policy professional_profiles_update_self_or_admin on professional_profiles for update
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

alter table verification_docs enable row level security;
create policy verification_docs_select on verification_docs for select
  using (auth.uid() = user_id or is_admin());
create policy verification_docs_insert_self on verification_docs for insert
  with check (auth.uid() = user_id);
create policy verification_docs_update_admin on verification_docs for update
  using (is_admin()) with check (is_admin());

alter table portfolio_items enable row level security;
create policy portfolio_items_select on portfolio_items for select using (true);
create policy portfolio_items_insert_self on portfolio_items for insert
  with check (auth.uid() = professional_id);
create policy portfolio_items_update_self_or_admin on portfolio_items for update
  using (auth.uid() = professional_id or is_admin())
  with check (auth.uid() = professional_id or is_admin());
create policy portfolio_items_delete_self_or_admin on portfolio_items for delete
  using (auth.uid() = professional_id or is_admin());

alter table partner_profiles enable row level security;
create policy partner_profiles_select on partner_profiles for select
  using (auth.uid() = user_id or is_admin());
create policy partner_profiles_insert_self on partner_profiles for insert
  with check (auth.uid() = user_id);
create policy partner_profiles_update_self_or_admin on partner_profiles for update
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Pedidos, chat, propostas
-- ─────────────────────────────────────────────────────────────────────────

alter table service_requests enable row level security;
create policy service_requests_select on service_requests for select
  using (
    auth.uid() = cliente_id
    or is_admin()
    or exists (
      select 1 from request_targets rt
      where rt.request_id = id and rt.professional_id = auth.uid()
    )
  );
create policy service_requests_insert_self on service_requests for insert
  with check (auth.uid() = cliente_id);
create policy service_requests_update_self_or_admin on service_requests for update
  using (auth.uid() = cliente_id or is_admin())
  with check (auth.uid() = cliente_id or is_admin());

alter table request_targets enable row level security;
create policy request_targets_select on request_targets for select
  using (
    auth.uid() = professional_id
    or is_admin()
    or exists (
      select 1 from service_requests sr
      where sr.id = request_id and sr.cliente_id = auth.uid()
    )
  );
create policy request_targets_insert_owner on request_targets for insert
  with check (
    is_admin()
    or exists (
      select 1 from service_requests sr
      where sr.id = request_id and sr.cliente_id = auth.uid()
    )
  );
create policy request_targets_update_self_or_admin on request_targets for update
  using (auth.uid() = professional_id or is_admin())
  with check (auth.uid() = professional_id or is_admin());

alter table conversations enable row level security;
create policy conversations_select on conversations for select
  using (auth.uid() = cliente_id or auth.uid() = professional_id or is_admin());
create policy conversations_insert_participant on conversations for insert
  with check (auth.uid() = cliente_id or auth.uid() = professional_id);

alter table messages enable row level security;
create policy messages_select on messages for select
  using (
    is_admin()
    or exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.cliente_id = auth.uid() or c.professional_id = auth.uid())
    )
  );
create policy messages_insert_participant on messages for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.cliente_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

alter table proposals enable row level security;
create policy proposals_select on proposals for select
  using (
    is_admin()
    or exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.cliente_id = auth.uid() or c.professional_id = auth.uid())
    )
  );
create policy proposals_insert_professional on proposals for insert
  with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and c.professional_id = auth.uid()
    )
  );
create policy proposals_update_participant_or_admin on proposals for update
  using (
    is_admin()
    or exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.cliente_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Obras e etapas
-- ─────────────────────────────────────────────────────────────────────────

alter table jobs enable row level security;
create policy jobs_select on jobs for select
  using (auth.uid() = cliente_id or auth.uid() = professional_id or is_admin());
create policy jobs_insert_participant on jobs for insert
  with check (auth.uid() = cliente_id or auth.uid() = professional_id);
create policy jobs_update_participant_or_admin on jobs for update
  using (auth.uid() = cliente_id or auth.uid() = professional_id or is_admin())
  with check (auth.uid() = cliente_id or auth.uid() = professional_id or is_admin());

alter table job_stages enable row level security;
create policy job_stages_select on job_stages for select
  using (
    is_admin()
    or exists (
      select 1 from jobs j
      where j.id = job_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
create policy job_stages_insert_participant_or_admin on job_stages for insert
  with check (
    is_admin()
    or exists (
      select 1 from jobs j
      where j.id = job_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
create policy job_stages_update_participant_or_admin on job_stages for update
  using (
    is_admin()
    or exists (
      select 1 from jobs j
      where j.id = job_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from jobs j
      where j.id = job_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Pagamento Garantido — somente leitura para usuários (seção 9/13)
-- ─────────────────────────────────────────────────────────────────────────

alter table payments enable row level security;
create policy payments_select on payments for select
  using (
    is_admin()
    or exists (
      select 1 from job_stages js
      join jobs j on j.id = js.job_id
      where js.id = stage_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
-- Sem policies de insert/update/delete: só service_role (Edge Functions) escreve.

alter table payment_events enable row level security;
create policy payment_events_select on payment_events for select
  using (
    is_admin()
    or exists (
      select 1 from payments p
      join job_stages js on js.id = p.stage_id
      join jobs j on j.id = js.job_id
      where p.id = payment_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
-- Sem policies de insert/update/delete: só service_role escreve.

alter table ledger_entries enable row level security;
create policy ledger_entries_select on ledger_entries for select
  using (auth.uid() = user_id or is_admin());
-- Sem policies de insert/update/delete: só service_role escreve.

alter table disputes enable row level security;
create policy disputes_select on disputes for select
  using (
    is_admin()
    or exists (
      select 1 from job_stages js
      join jobs j on j.id = js.job_id
      where js.id = stage_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
create policy disputes_insert_participant on disputes for insert
  with check (
    auth.uid() = aberta_por
    and exists (
      select 1 from job_stages js
      join jobs j on j.id = js.job_id
      where js.id = stage_id and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
    )
  );
create policy disputes_update_admin on disputes for update
  using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Avaliações
-- ─────────────────────────────────────────────────────────────────────────

alter table reviews enable row level security;
create policy reviews_select on reviews for select
  using (publica = true or auth.uid() = autor_id or auth.uid() = alvo_id or is_admin());
create policy reviews_insert_participant on reviews for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from jobs j
      where j.id = job_id
        and (j.cliente_id = auth.uid() or j.professional_id = auth.uid())
        and j.status = 'concluida'
    )
  );
create policy reviews_update_target on reviews for update
  using (auth.uid() = alvo_id or is_admin())
  with check (auth.uid() = alvo_id or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Leads (parceiros)
-- ─────────────────────────────────────────────────────────────────────────

alter table leads enable row level security;
create policy leads_select on leads for select
  using (
    auth.uid() = cliente_id
    or is_admin()
    or exists (
      select 1 from lead_recipients lr
      where lr.lead_id = id and lr.partner_id = auth.uid()
    )
  );
create policy leads_insert_self on leads for insert
  with check (auth.uid() = cliente_id);

alter table lead_recipients enable row level security;
create policy lead_recipients_select on lead_recipients for select
  using (
    auth.uid() = partner_id
    or is_admin()
    or exists (select 1 from leads l where l.id = lead_id and l.cliente_id = auth.uid())
  );
create policy lead_recipients_insert_admin on lead_recipients for insert
  with check (is_admin());
create policy lead_recipients_update_partner on lead_recipients for update
  using (auth.uid() = partner_id or is_admin())
  with check (auth.uid() = partner_id or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Anúncios e financeiro manual (cobrança fora do app — seção 5.6/8)
-- ─────────────────────────────────────────────────────────────────────────

alter table advertisers enable row level security;
create policy advertisers_admin_only on advertisers for all
  using (is_admin()) with check (is_admin());

alter table ad_campaigns enable row level security;
create policy ad_campaigns_select_public_active on ad_campaigns for select
  using (is_admin() or (ativa and current_date between inicio and fim));
create policy ad_campaigns_write_admin on ad_campaigns for insert
  with check (is_admin());
create policy ad_campaigns_update_admin on ad_campaigns for update
  using (is_admin()) with check (is_admin());
create policy ad_campaigns_delete_admin on ad_campaigns for delete
  using (is_admin());

alter table ad_events enable row level security;
create policy ad_events_insert_any on ad_events for insert
  with check (true); -- impressão/clique registrado por qualquer visitante
create policy ad_events_select_admin on ad_events for select
  using (is_admin());

alter table manual_payments enable row level security;
create policy manual_payments_admin_only on manual_payments for all
  using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Configuração, push, notificações, denúncias
-- ─────────────────────────────────────────────────────────────────────────

alter table settings enable row level security;
create policy settings_select on settings for select using (true);
create policy settings_write_admin on settings for update
  using (is_admin()) with check (is_admin());
create policy settings_insert_admin on settings for insert
  with check (is_admin());

alter table push_subscriptions enable row level security;
create policy push_subscriptions_owner on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table notifications enable row level security;
create policy notifications_select_owner on notifications for select
  using (auth.uid() = user_id or is_admin());
create policy notifications_update_owner on notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Sem policy de insert: notificações são criadas pelo sistema (service_role/triggers).

alter table reports enable row level security;
create policy reports_select on reports for select
  using (auth.uid() = autor_id or is_admin());
create policy reports_insert_self on reports for insert
  with check (auth.uid() = autor_id);
create policy reports_update_admin on reports for update
  using (is_admin()) with check (is_admin());
