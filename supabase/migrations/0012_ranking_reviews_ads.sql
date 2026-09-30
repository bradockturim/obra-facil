-- Obra Fácil — Semana 7: avaliações (trigger de média), ranking real
-- (score bayesiano via pg_cron diário) e bucket para criativos de
-- anúncio.

-- ─────────────────────────────────────────────────────────────────────────
-- Avaliações: recalcula nota_media/total_avaliacoes do profissional
-- sempre que uma review pra ele é criada ou editada (seção 11:
-- "avaliação → atualiza média").
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_reviews_recalc_average()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update professional_profiles
    set nota_media = coalesce((
          select avg(nota_geral) from reviews
          where alvo_id = new.alvo_id and publica = true
        ), 0),
        total_avaliacoes = (
          select count(*) from reviews
          where alvo_id = new.alvo_id and publica = true
        )
    where user_id = new.alvo_id;
  return new;
end;
$$;

create trigger reviews_recalc_average
  after insert or update on reviews
  for each row execute function trg_reviews_recalc_average();

-- ─────────────────────────────────────────────────────────────────────────
-- Ranking real (seção 7.1). SECURITY DEFINER, sem grant — só chamável
-- pelo dono (postgres) ou pg_cron, como o padrão já usado em 0007.
--
-- score = 0,50×(nota_bayesiana/5) + 0,20×taxa_conclusão
--       + 0,15×velocidade_resposta + 0,10×verificado(+boost 30d)
--       + 0,05×atividade_recente
-- Normalizo nota_bayesiana (escala 1-5) para 0-1 antes de aplicar o
-- peso, já que os demais termos já nascem 0-1 — a especificação não
-- detalha essa normalização, decisão registrada aqui.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function cron_recalc_ranking()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r professional_profiles;
  v_global_avg numeric;
  v_bayes numeric;
  v_total_jobs int;
  v_concluidos int;
  v_taxa_conclusao numeric;
  v_velocidade_min numeric;
  v_velocidade_score numeric;
  v_verificado_score numeric;
  v_atividade numeric;
  v_score numeric;
  m constant numeric := 5;
begin
  select coalesce(avg(nota_geral), 4.0) into v_global_avg from reviews where publica = true;

  for r in select * from professional_profiles loop
    v_bayes := (r.total_avaliacoes * r.nota_media + m * v_global_avg) / (r.total_avaliacoes + m);

    select count(*), count(*) filter (where status = 'concluida')
      into v_total_jobs, v_concluidos
      from jobs where professional_id = r.user_id;
    v_taxa_conclusao := case when v_total_jobs = 0 then 0.5 else v_concluidos::numeric / v_total_jobs end;

    select avg(extract(epoch from (primeira_msg.ts - c.created_at)) / 60)
      into v_velocidade_min
      from conversations c
      join lateral (
        select min(m2.criado_em) as ts from messages m2
        where m2.conversation_id = c.id and m2.autor_id = r.user_id
      ) primeira_msg on primeira_msg.ts is not null
      where c.professional_id = r.user_id;

    v_velocidade_score := case
      when v_velocidade_min is null then 0.5
      when v_velocidade_min <= 30 then 1.0
      when v_velocidade_min >= 1440 then 0.0
      else 1.0 - (v_velocidade_min - 30) / (1440 - 30)
    end;

    v_verificado_score := least(1, (case when r.verificado then 1 else 0 end)
      + (case when r.verificado and r.verificado_em > now() - interval '30 days' then 0.3 else 0 end));

    v_atividade := case when exists (
      select 1 from messages msg
      join conversations c2 on c2.id = msg.conversation_id
      where c2.professional_id = r.user_id and msg.criado_em > now() - interval '30 days'
      union
      select 1 from jobs j
      where j.professional_id = r.user_id and j.iniciado_em > now() - interval '30 days'
    ) then 1 else 0 end;

    v_score := 0.50 * (v_bayes / 5.0)
      + 0.20 * v_taxa_conclusao
      + 0.15 * v_velocidade_score
      + 0.10 * v_verificado_score
      + 0.05 * v_atividade;

    update professional_profiles
      set score = v_score,
          tempo_resposta_medio_minutos = round(v_velocidade_min)::int
      where user_id = r.user_id;
  end loop;
end;
$$;
revoke execute on function cron_recalc_ranking() from anon, authenticated, public;

do $$
begin
  perform cron.schedule(
    'obra-facil-recalc-ranking', '0 3 * * *',
    $cron$select cron_recalc_ranking();$cron$
  );
exception when others then
  raise notice 'pg_cron indisponível — recálculo diário de ranking precisará ser chamado manualmente. Detalhe: %', sqlerrm;
end;
$$;

-- Roda uma vez agora pra popular score/tempo_resposta com os dados que
-- já existem, sem esperar o cron das 3h.
select cron_recalc_ranking();

-- ─────────────────────────────────────────────────────────────────────────
-- Bucket "ads" (público) — criativos de campanha (seção 5.6/8).
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

create policy ads_public_read on storage.objects for select
  using (bucket_id = 'ads');
create policy ads_admin_write on storage.objects for insert
  with check (bucket_id = 'ads' and is_admin());
