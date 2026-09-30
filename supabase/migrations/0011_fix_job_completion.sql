-- Obra Fácil — corrige fechamento de obra quando a última etapa é
-- resolvida por reembolso/divisão em vez de aprovação normal.
--
-- `_release_stage` (0007) checava "todas as etapas liberadas?" pra
-- marcar `jobs.status='concluida'` e somar `obras_concluidas`, mas
-- `_refund_stage` e `_release_stage_partial` não tinham essa checagem —
-- uma obra cuja última etapa fosse reembolsada ou dividida (via
-- contestação) ficava presa em `em_andamento` pra sempre. Confirmado
-- testando o caminho de contestação em produção.
--
-- Extrai a checagem para uma função compartilhada: a obra fecha quando
-- todas as etapas chegaram a um estado terminal (liberada OU
-- reembolsada), chamada pelas três funções de resolução de etapa.

create or replace function _maybe_complete_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_done boolean;
begin
  select not exists (
    select 1 from job_stages
    where job_id = p_job_id and status not in ('liberada', 'reembolsada')
  ) into v_all_done;

  if v_all_done then
    update jobs set status = 'concluida', concluido_em = now()
      where id = p_job_id and status <> 'concluida';
    if found then
      update professional_profiles
        set obras_concluidas = obras_concluidas + 1
        where user_id = (select professional_id from jobs where id = p_job_id);
    end if;
  end if;
end;
$$;
revoke execute on function _maybe_complete_job(uuid) from anon, authenticated, public;

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

  perform _maybe_complete_job(v_job.id);
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

  perform _maybe_complete_job(v_job.id);
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

  perform _maybe_complete_job(v_job.id);
end;
$$;

-- Corrige o job de teste que ficou preso em em_andamento antes deste fix.
select _maybe_complete_job(id) from jobs where status = 'em_andamento';
