-- Obra Fácil — schema inicial (Fase 1, Semana 1)
-- Baseado na seção 9 (Modelo de dados) da especificação.
-- Convenção: status/tipo como text + CHECK (mais fácil de evoluir que enum
-- do Postgres, que exige ALTER TYPE fora de transação).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Catálogo / geografia
-- ─────────────────────────────────────────────────────────────────────────

create table cities (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text not null default 'RJ',
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table neighborhoods (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (city_id, nome)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  tipo text not null check (tipo in ('servico', 'lead')),
  icone text,
  ativa boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Perfis
-- ─────────────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  whatsapp text,
  foto_url text,
  papeis text[] not null default '{}', -- ex: {cliente,profissional,parceiro,admin}
  cidade_id uuid references cities(id),
  status text not null default 'ativo' check (status in ('ativo', 'suspenso', 'excluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Cria automaticamente a linha em profiles quando um usuário se cadastra
-- via Supabase Auth (Google ou magic link).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, foto_url, papeis)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    '{cliente}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table professional_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  bio text,
  categorias uuid[] not null default '{}', -- ids de categories
  bairros uuid[] not null default '{}',    -- ids de neighborhoods
  verificado boolean not null default false,
  verificado_em timestamptz,
  docs_status text not null default 'pendente'
    check (docs_status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
  chave_pix text,
  score numeric(6, 4) not null default 0,
  nota_media numeric(3, 2) not null default 0,
  total_avaliacoes int not null default 0,
  obras_concluidas int not null default 0,
  tempo_resposta_medio_minutos int,
  destaque_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_professional_profiles_updated_at
  before update on professional_profiles
  for each row execute function set_updated_at();

create table verification_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  doc_url text not null,       -- bucket PRIVADO
  selfie_url text not null,    -- bucket PRIVADO
  referencia text,
  status text not null default 'em_analise'
    check (status in ('em_analise', 'aprovado', 'rejeitado')),
  created_at timestamptz not null default now()
);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references profiles(id) on delete cascade,
  foto_url text not null,
  descricao text,
  categoria_id uuid references categories(id),
  origem text not null default 'upload' check (origem in ('upload', 'obra_concluida')),
  created_at timestamptz not null default now()
);

create table partner_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('corretor', 'despachante', 'arquiteto', 'engenheiro', 'topografo')),
  registro_profissional text,
  plano_ate timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Pedidos, chat, propostas
-- ─────────────────────────────────────────────────────────────────────────

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references profiles(id) on delete cascade,
  categoria_id uuid not null references categories(id),
  descricao text not null,
  fotos text[] not null default '{}',
  bairro_id uuid references neighborhoods(id),
  prazo text,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_atendimento', 'concluido', 'cancelado')),
  created_at timestamptz not null default now()
);

create table request_targets (
  request_id uuid not null references service_requests(id) on delete cascade,
  professional_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'enviado'
    check (status in ('enviado', 'visualizado', 'recusado', 'proposta_enviada')),
  created_at timestamptz not null default now(),
  primary key (request_id, professional_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete set null,
  cliente_id uuid not null references profiles(id) on delete cascade,
  professional_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, professional_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  tipo text not null default 'texto' check (tipo in ('texto', 'foto', 'proposta')),
  conteudo text,
  flag_contato_externo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  valor_total numeric(12, 2) not null check (valor_total > 0),
  prazo_dias int not null check (prazo_dias > 0),
  material_por text check (material_por in ('cliente', 'profissional', 'combinado')),
  observacoes text,
  status text not null default 'enviada'
    check (status in ('enviada', 'aceita', 'recusada', 'expirada')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Obras (jobs) e etapas
-- ─────────────────────────────────────────────────────────────────────────

create table jobs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id),
  cliente_id uuid not null references profiles(id),
  professional_id uuid not null references profiles(id),
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida', 'cancelada', 'em_disputa')),
  comprovante_hash text,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

create table job_stages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  ordem int not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  status text not null default 'aguardando_pagamento' check (
    status in (
      'aguardando_pagamento', 'paga_retida', 'concluida_aguardando',
      'aprovada', 'liberada', 'contestada', 'reembolsada'
    )
  ),
  fotos_conclusao text[] not null default '{}',
  prazo_aprovacao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, ordem)
);

create trigger trg_job_stages_updated_at
  before update on job_stages
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Pagamento Garantido (provedor simulado — seção 5.3/5.4/10.1)
-- payments / payment_events / ledger_entries: somente leitura para usuários,
-- só Edge Functions com service_role escrevem (ver 0002_rls_policies.sql).
-- ─────────────────────────────────────────────────────────────────────────

create table payments (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references job_stages(id) on delete cascade,
  provider text not null default 'mock',
  provider_charge_id text,
  metodo text not null check (metodo in ('pix', 'cartao')),
  valor numeric(12, 2) not null check (valor > 0),
  taxa_plataforma numeric(12, 2) not null default 0,
  valor_liquido numeric(12, 2) not null default 0,
  status text not null default 'pendente' check (
    status in ('pendente', 'pago_retido', 'liberado', 'reembolsado', 'falhou', 'expirado')
  ),
  simulado boolean not null default true,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  liberado_em timestamptz
);

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  tipo text not null check (tipo in ('charge_created', 'paid', 'released', 'refunded', 'failed')),
  payload_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  payment_id uuid not null references payments(id) on delete cascade,
  tipo text not null check (tipo in ('credito_retido', 'credito_liberado', 'taxa', 'estorno')),
  valor numeric(12, 2) not null,
  simulado boolean not null default true,
  criado_em timestamptz not null default now()
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references job_stages(id) on delete cascade,
  aberta_por uuid not null references profiles(id),
  motivo text not null,
  fotos text[] not null default '{}',
  decisao text check (decisao in ('liberar', 'reembolsar', 'dividir')),
  valor_cliente numeric(12, 2),
  valor_profissional numeric(12, 2),
  resolvida_em timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Avaliações
-- ─────────────────────────────────────────────────────────────────────────

create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  alvo_id uuid not null references profiles(id),
  qualidade int check (qualidade between 1 and 5),
  pontualidade int check (pontualidade between 1 and 5),
  limpeza int check (limpeza between 1 and 5),
  comunicacao int check (comunicacao between 1 and 5),
  nota_geral numeric(3, 2) not null check (nota_geral between 1 and 5),
  comentario text,
  fotos text[] not null default '{}',
  resposta text,
  publica boolean not null default true,
  created_at timestamptz not null default now(),
  unique (job_id, autor_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Leads (parceiros)
-- ─────────────────────────────────────────────────────────────────────────

create table leads (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references profiles(id),
  categoria_id uuid not null references categories(id),
  descricao text,
  bairro_id uuid references neighborhoods(id),
  created_at timestamptz not null default now()
);

create table lead_recipients (
  lead_id uuid not null references leads(id) on delete cascade,
  partner_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'enviado' check (status in ('enviado', 'visualizado', 'contatado')),
  created_at timestamptz not null default now(),
  primary key (lead_id, partner_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Anúncios e cobrança manual
-- ─────────────────────────────────────────────────────────────────────────

create table advertisers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  contato text,
  created_at timestamptz not null default now()
);

create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(id) on delete cascade,
  criativo_url text,
  categoria_id uuid references categories(id),
  link text,
  inicio date not null,
  fim date not null,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);

create table ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  tipo text not null check (tipo in ('impressao', 'clique')),
  criado_em timestamptz not null default now()
);

create table manual_payments (
  id uuid primary key default gen_random_uuid(),
  referente_tipo text not null check (referente_tipo in ('anuncio', 'destaque', 'plano_parceiro')),
  referente_id uuid not null,
  valor numeric(12, 2) not null,
  metodo text not null default 'pix',
  comprovante_url text,
  confirmado_por uuid references profiles(id),
  criado_em timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Configuração, notificações, denúncias
-- ─────────────────────────────────────────────────────────────────────────

create table settings (
  chave text primary key,
  valor jsonb not null
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  lida boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references profiles(id),
  alvo_tipo text not null check (alvo_tipo in ('usuario', 'mensagem', 'avaliacao', 'anuncio')),
  alvo_id uuid not null,
  motivo text not null,
  status text not null default 'aberto' check (status in ('aberto', 'em_analise', 'resolvido', 'arquivado')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Configuração inicial (seção 7.4 / 10.1)
-- ─────────────────────────────────────────────────────────────────────────

insert into settings (chave, valor) values
  ('PAYMENTS_MODE', '"simulation"'),
  ('taxa_percentual', '10'),
  ('taxa_cliente_percentual', '0'),
  ('prazo_aprovacao_horas', '72'),
  ('limite_profissionais_por_pedido', '3');
