-- Obra Fácil — Semana 5-6: Pagamento Garantido simulado
--
-- Em vez de Edge Functions (seção 10.1/10.2), a lógica de checkout,
-- retenção, liberação, contestação e ações de admin vive aqui como
-- funções Postgres `SECURITY DEFINER` (decisão registrada no plano desta
-- etapa — evita precisar de um Personal Access Token da conta Supabase
-- só para dar `supabase functions deploy`). Funcionam com a mesma
-- garantia de segurança: `payments`/`payment_events`/`ledger_entries`
-- seguem sem policy de escrita para `authenticated` (0002); só essas
-- funções escrevem, porque rodam como o dono `postgres`, que bypassa RLS.
--
-- Convenção: funções "internas" (prefixo `_`, mais `cron_*`) não recebem
-- `GRANT EXECUTE` para `authenticated`/`anon` — só são chamáveis a partir
-- de outra função `SECURITY DEFINER` ou do pg_cron (que também roda como
-- o dono do job). As funções "públicas" validam `auth.uid()` contra o
-- dono da etapa/job (ou `is_admin()`) antes de qualquer escrita.

-- ─────────────────────────────────────────────────────────────────────────
-- Bucket "obras" (público) — fotos de conclusão de etapa e evidências de
-- contestação. Mesmo padrão de policies por dono de 0003/0004.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('obras', 'obras', true)
on conflict (id) do nothing;

create policy obras_public_read on storage.objects for select
  using (bucket_id = 'obras');
create policy obras_owner_write on storage.objects for insert
  with check (bucket_id = 'obras' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: lê um valor numérico de settings (jsonb escalar).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_setting_numeric(p_chave text)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select (valor::text)::numeric from settings where chave = p_chave;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Internas: liberação e reembolso de etapa. Compartilhadas por
-- stage_approve, dispute_resolve, admin_force_payment e os crons.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function _release_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
  v_payment payments;
  v_all_done boolean;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  select * into v_payment from payments
    where stage_id = p_stage_id and status = 'pago_retido'
    order by criado_em desc limit 1;
  if v_payment.id is null then
    raise exception 'Nenhum pagamento retido para esta etapa';
  end if;

  update job_stages set status = 'liberada' where id = p_stage_id;
  update payments set status = 'liberado', liberado_em = now() where id = v_payment.id;
  insert into payment_events (payment_id, tipo, payload_json)
    values (v_payment.id, 'released', '{}'::jsonb);
  insert into ledger_entries (user_id, payment_id, tipo, valor, simulado) values
    (v_job.professional_id, v_payment.id, 'credito_liberado', v_payment.valor_liquido, true),
    (v_job.professional_id, v_payment.id, 'taxa', v_payment.taxa_plataforma, true);

  select not exists (
    select 1 from job_stages where job_id = v_job.id and status <> 'liberada'
  ) into v_all_done;

  if v_all_done then
    update jobs set status = 'concluida', concluido_em = now() where id = v_job.id;
    update professional_profiles
      set obras_concluidas = obras_concluidas + 1
      where user_id = v_job.professional_id;
  end if;
end;
$$;

create or replace function _refund_stage(p_stage_id uuid, p_valor numeric default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
  v_job jobs;
  v_stage job_stages;
  v_valor numeric;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  select * into v_payment from payments
    where stage_id = p_stage_id and status = 'pago_retido'
    order by criado_em desc limit 1;
  if v_payment.id is null then
    raise exception 'Nenhum pagamento retido para esta etapa';
  end if;
  v_valor := coalesce(p_valor, v_payment.valor);

  update job_stages set status = 'reembolsada' where id = p_stage_id;
  update payments set status = 'reembolsado' where id = v_payment.id;
  insert into payment_events (payment_id, tipo, payload_json)
    values (v_payment.id, 'refunded', jsonb_build_object('valor', v_valor));
  insert into ledger_entries (user_id, payment_id, tipo, valor, simulado)
    values (v_job.professional_id, v_payment.id, 'estorno', v_valor, true);
end;
$$;

create or replace function _release_stage_partial(
  p_stage_id uuid, p_valor_profissional numeric, p_valor_cliente numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs;
  v_payment payments;
  v_taxa_pct numeric;
  v_taxa numeric;
  v_liquido numeric;
begin
  select * into v_job from jobs j join job_stages js on js.job_id = j.id where js.id = p_stage_id;
  select * into v_payment from payments
    where stage_id = p_stage_id and status = 'pago_retido'
    order by criado_em desc limit 1;
  if v_payment.id is null then
    raise exception 'Nenhum pagamento retido para esta etapa';
  end if;

  v_taxa_pct := get_setting_numeric('taxa_percentual');
  v_taxa := round(p_valor_profissional * v_taxa_pct / 100, 2);
  v_liquido := p_valor_profissional - v_taxa;

  update job_stages set status = 'liberada' where id = p_stage_id;
  update payments set status = 'liberado', liberado_em = now() where id = v_payment.id;
  insert into payment_events (payment_id, tipo, payload_json) values
    (v_payment.id, 'released', jsonb_build_object('dividido', true, 'valor', p_valor_profissional)),
    (v_payment.id, 'refunded', jsonb_build_object('dividido', true, 'valor', p_valor_cliente));
  insert into ledger_entries (user_id, payment_id, tipo, valor, simulado) values
    (v_job.professional_id, v_payment.id, 'credito_liberado', v_liquido, true),
    (v_job.professional_id, v_payment.id, 'taxa', v_taxa, true),
    (v_job.professional_id, v_payment.id, 'estorno', p_valor_cliente, true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Automações (seção 7.5) — chamadas pelo pg_cron no fim deste arquivo.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function cron_auto_approve_stages()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r job_stages;
begin
  for r in select * from job_stages where status = 'concluida_aguardando' and prazo_aprovacao < now() loop
    perform _release_stage(r.id);
  end loop;
end;
$$;

create or replace function cron_expire_pending_payments()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r payments;
begin
  for r in select * from payments where status = 'pendente' and criado_em < now() - interval '30 minutes' loop
    update payments set status = 'expirado' where id = r.id;
    insert into payment_events (payment_id, tipo, payload_json)
      values (r.id, 'failed', jsonb_build_object('auto_expirado', true));
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Funções públicas (RPC via supabase.rpc(...) do front-end).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function payments_create(p_stage_id uuid, p_metodo text)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
  v_taxa_pct numeric;
  v_taxa numeric;
  v_liquido numeric;
  v_payment payments;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  if v_stage.id is null then raise exception 'Etapa não encontrada'; end if;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.cliente_id then raise exception 'Sem permissão'; end if;
  if v_stage.status <> 'aguardando_pagamento' then
    raise exception 'Etapa não está aguardando pagamento';
  end if;
  if p_metodo not in ('pix', 'cartao') then raise exception 'Método inválido'; end if;

  select * into v_payment from payments
    where stage_id = p_stage_id and status = 'pendente'
    order by criado_em desc limit 1;
  if v_payment.id is not null then
    return v_payment;
  end if;

  v_taxa_pct := get_setting_numeric('taxa_percentual');
  v_taxa := round(v_stage.valor * v_taxa_pct / 100, 2);
  v_liquido := v_stage.valor - v_taxa;

  insert into payments (stage_id, provider, metodo, valor, taxa_plataforma, valor_liquido, status, simulado)
  values (p_stage_id, 'mock', p_metodo, v_stage.valor, v_taxa, v_liquido, 'pendente', true)
  returning * into v_payment;

  insert into payment_events (payment_id, tipo, payload_json)
    values (v_payment.id, 'charge_created', jsonb_build_object('metodo', p_metodo));

  return v_payment;
end;
$$;
grant execute on function payments_create(uuid, text) to authenticated;

create or replace function payments_confirm(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
  v_stage job_stages;
  v_job jobs;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Pagamento não encontrado'; end if;
  select * into v_stage from job_stages where id = v_payment.stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.cliente_id then raise exception 'Sem permissão'; end if;
  if v_payment.status <> 'pendente' then raise exception 'Pagamento não está pendente'; end if;

  update payments set status = 'pago_retido', pago_em = now() where id = p_payment_id;
  insert into payment_events (payment_id, tipo, payload_json) values (p_payment_id, 'paid', '{}'::jsonb);
  update job_stages set status = 'paga_retida' where id = v_stage.id;
  insert into ledger_entries (user_id, payment_id, tipo, valor, simulado)
    values (v_job.professional_id, p_payment_id, 'credito_retido', v_payment.valor_liquido, true);
end;
$$;
grant execute on function payments_confirm(uuid) to authenticated;

create or replace function stage_complete(p_stage_id uuid, p_fotos text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
  v_horas numeric;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.professional_id then raise exception 'Sem permissão'; end if;
  if v_stage.status <> 'paga_retida' then raise exception 'Etapa não está paga/retida'; end if;
  if p_fotos is null or array_length(p_fotos, 1) is null or array_length(p_fotos, 1) < 1 then
    raise exception 'Envie ao menos uma foto de conclusão';
  end if;

  v_horas := get_setting_numeric('prazo_aprovacao_horas');
  update job_stages
    set status = 'concluida_aguardando',
        fotos_conclusao = p_fotos,
        prazo_aprovacao = now() + (v_horas::text || ' hours')::interval
    where id = p_stage_id;
end;
$$;
grant execute on function stage_complete(uuid, text[]) to authenticated;

create or replace function stage_approve(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.cliente_id then raise exception 'Sem permissão'; end if;
  if v_stage.status <> 'concluida_aguardando' then
    raise exception 'Etapa não está aguardando aprovação';
  end if;
  perform _release_stage(p_stage_id);
end;
$$;
grant execute on function stage_approve(uuid) to authenticated;

create or replace function stage_dispute(p_stage_id uuid, p_motivo text, p_fotos text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.cliente_id then raise exception 'Sem permissão'; end if;
  if v_stage.status <> 'concluida_aguardando' then
    raise exception 'Etapa não está aguardando aprovação';
  end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da contestação'; end if;

  update job_stages set status = 'contestada' where id = p_stage_id;
  insert into disputes (stage_id, aberta_por, motivo, fotos)
    values (p_stage_id, auth.uid(), p_motivo, coalesce(p_fotos, '{}'));
end;
$$;
grant execute on function stage_dispute(uuid, text, text[]) to authenticated;

create or replace function stage_cancel(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage job_stages;
  v_job jobs;
begin
  select * into v_stage from job_stages where id = p_stage_id;
  select * into v_job from jobs where id = v_stage.job_id;
  if auth.uid() <> v_job.cliente_id then raise exception 'Sem permissão'; end if;
  if v_stage.status <> 'paga_retida' then
    raise exception 'Etapa não pode mais ser cancelada';
  end if;
  perform _refund_stage(p_stage_id, null);
end;
$$;
grant execute on function stage_cancel(uuid) to authenticated;

create or replace function dispute_resolve(
  p_dispute_id uuid,
  p_decisao text,
  p_valor_cliente numeric default null,
  p_valor_profissional numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute disputes;
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  if p_decisao not in ('liberar', 'reembolsar', 'dividir') then
    raise exception 'Decisão inválida';
  end if;

  select * into v_dispute from disputes where id = p_dispute_id;
  if v_dispute.id is null then raise exception 'Contestação não encontrada'; end if;
  if v_dispute.resolvida_em is not null then raise exception 'Contestação já resolvida'; end if;

  update disputes
    set decisao = p_decisao,
        valor_cliente = p_valor_cliente,
        valor_profissional = p_valor_profissional,
        resolvida_em = now()
    where id = p_dispute_id;

  if p_decisao = 'liberar' then
    perform _release_stage(v_dispute.stage_id);
  elsif p_decisao = 'reembolsar' then
    perform _refund_stage(v_dispute.stage_id, null);
  elsif p_decisao = 'dividir' then
    perform _release_stage_partial(v_dispute.stage_id, p_valor_profissional, p_valor_cliente);
  end if;
end;
$$;
grant execute on function dispute_resolve(uuid, text, numeric, numeric) to authenticated;

create or replace function admin_force_payment(p_payment_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  if not is_admin() then raise exception 'Sem permissão'; end if;
  if p_acao not in ('falhar', 'expirar', 'estornar') then raise exception 'Ação inválida'; end if;

  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Pagamento não encontrado'; end if;

  if p_acao = 'falhar' then
    if v_payment.status <> 'pendente' then
      raise exception 'Só é possível falhar um pagamento pendente';
    end if;
    update payments set status = 'falhou' where id = p_payment_id;
    insert into payment_events (payment_id, tipo, payload_json)
      values (p_payment_id, 'failed', jsonb_build_object('forcado_por_admin', true));
  elsif p_acao = 'expirar' then
    if v_payment.status <> 'pendente' then
      raise exception 'Só é possível expirar um pagamento pendente';
    end if;
    update payments set status = 'expirado' where id = p_payment_id;
    insert into payment_events (payment_id, tipo, payload_json)
      values (p_payment_id, 'failed', jsonb_build_object('expirado_por_admin', true));
  elsif p_acao = 'estornar' then
    if v_payment.status <> 'pago_retido' then
      raise exception 'Só é possível estornar um pagamento retido';
    end if;
    perform _refund_stage(v_payment.stage_id, null);
  end if;
end;
$$;
grant execute on function admin_force_payment(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- pg_cron (seção 7.5). Em bloco protegido: se a extensão não estiver
-- disponível no projeto, o resto da migration (todas as funções acima)
-- já foi aplicado — só o agendamento automático fica de fora, e as
-- automações continuam funcionando via ação manual (admin/usuário).
-- ─────────────────────────────────────────────────────────────────────────

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'obra-facil-auto-approve-stages', '*/15 * * * *',
    $cron$select cron_auto_approve_stages();$cron$
  );
  perform cron.schedule(
    'obra-facil-expire-pending-payments', '*/10 * * * *',
    $cron$select cron_expire_pending_payments();$cron$
  );
exception when others then
  raise notice 'pg_cron indisponível neste projeto — automações por tempo (aprovação em 72h, expiração em 30min) precisarão ser acionadas manualmente. Detalhe: %', sqlerrm;
end;
$$;
