-- Obra Fácil — Semana 4: etapas da proposta + bucket de fotos do pedido

-- ─────────────────────────────────────────────────────────────────────────
-- proposal_stages: a seção 5.3 diz que "a proposta define as etapas (1 a 6)",
-- mas o schema original (seção 9) só tem job_stages (que pertence a um job,
-- criado depois que a proposta é aceita). Esta tabela guarda a divisão por
-- etapas ainda na fase de proposta; ao aceitar, essas linhas são copiadas
-- para job_stages pelo app.
-- ─────────────────────────────────────────────────────────────────────────

create table proposal_stages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  ordem int not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  created_at timestamptz not null default now(),
  unique (proposal_id, ordem)
);

alter table proposal_stages enable row level security;

create policy proposal_stages_select on proposal_stages for select
  using (
    is_admin()
    or exists (
      select 1 from proposals p
      join conversations c on c.id = p.conversation_id
      where p.id = proposal_id
        and (c.cliente_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

create policy proposal_stages_insert_professional on proposal_stages for insert
  with check (
    exists (
      select 1 from proposals p
      join conversations c on c.id = p.conversation_id
      where p.id = proposal_id and c.professional_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Bucket "pedidos" (público) para fotos anexadas ao pedido de orçamento,
-- mesmo padrão de policies por dono usado em avatars/portfolio (0003).
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('pedidos', 'pedidos', true)
on conflict (id) do nothing;

create policy pedidos_public_read on storage.objects for select
  using (bucket_id = 'pedidos');
create policy pedidos_owner_write on storage.objects for insert
  with check (bucket_id = 'pedidos' and (storage.foldername(name))[1] = auth.uid()::text);
