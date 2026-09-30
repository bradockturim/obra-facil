-- Obra Fácil — corrige recursão infinita de RLS (erro 42P17)
--
-- service_requests_select (0002) consulta request_targets, e
-- request_targets_select consulta service_requests de volta — Postgres
-- detecta esse ciclo mútuo entre policies de tabelas diferentes e recusa
-- a query com "infinite recursion detected in policy for relation".
-- O mesmo padrão existe entre leads/lead_recipients (ainda não exercitado
-- em produção, mas tem o mesmo defeito).
--
-- Correção padrão do Postgres/Supabase: mover a subquery para dentro de
-- uma função SECURITY DEFINER. Como a função roda com o dono (postgres,
-- que tem BYPASSRLS), a consulta interna não reavalia RLS da tabela
-- consultada, quebrando o ciclo.

create or replace function is_request_target(p_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from request_targets
    where request_id = p_request_id and professional_id = auth.uid()
  );
$$;

create or replace function request_owner(p_request_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select cliente_id from service_requests where id = p_request_id;
$$;

drop policy service_requests_select on service_requests;
create policy service_requests_select on service_requests for select
  using (auth.uid() = cliente_id or is_admin() or is_request_target(id));

drop policy request_targets_select on request_targets;
create policy request_targets_select on request_targets for select
  using (auth.uid() = professional_id or is_admin() or request_owner(request_id) = auth.uid());

-- Mesmo defeito, mesmo remédio, para leads/lead_recipients (seção 5.5,
-- ainda não implementado na UI, mas a policy já existia desde 0002).

create or replace function is_lead_recipient(p_lead_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from lead_recipients
    where lead_id = p_lead_id and partner_id = auth.uid()
  );
$$;

create or replace function lead_owner(p_lead_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select cliente_id from leads where id = p_lead_id;
$$;

drop policy leads_select on leads;
create policy leads_select on leads for select
  using (auth.uid() = cliente_id or is_admin() or is_lead_recipient(id));

drop policy lead_recipients_select on lead_recipients;
create policy lead_recipients_select on lead_recipients for select
  using (auth.uid() = partner_id or is_admin() or lead_owner(lead_id) = auth.uid());
