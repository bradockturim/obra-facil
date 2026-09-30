-- Obra Fácil — seed inicial + Storage (Fase 1, Semana 2-3)

-- ─────────────────────────────────────────────────────────────────────────
-- Seed: cidade, bairros (lista inicial, não exaustiva — complete pelo
-- Table Editor ou por uma tela de admin futura), categorias (seção 4).
-- ─────────────────────────────────────────────────────────────────────────

insert into cities (nome, uf) values ('Três Rios', 'RJ');

insert into neighborhoods (city_id, nome)
select id, bairro
from cities, unnest(array['Centro', 'Werneck']) as bairro
where cities.nome = 'Três Rios';

insert into categories (nome, slug, tipo, ordem) values
  ('Pedreiro', 'pedreiro', 'servico', 10),
  ('Pintor', 'pintor', 'servico', 20),
  ('Gesseiro/Drywall', 'gesseiro-drywall', 'servico', 30),
  ('Eletricista', 'eletricista', 'servico', 40),
  ('Encanador', 'encanador', 'servico', 50),
  ('Azulejista', 'azulejista', 'servico', 60),
  ('Serralheiro', 'serralheiro', 'servico', 70),
  ('Marceneiro', 'marceneiro', 'servico', 80),
  ('Vidraceiro', 'vidraceiro', 'servico', 90),
  ('Telhadista', 'telhadista', 'servico', 100),
  ('Limpeza pós-obra', 'limpeza-pos-obra', 'servico', 110),
  ('Montador de móveis', 'montador-de-moveis', 'servico', 120),
  ('Corretor de imóveis', 'corretor-de-imoveis', 'lead', 200),
  ('Legalização/Despachante', 'legalizacao-despachante', 'lead', 210),
  ('Arquiteto', 'arquiteto', 'lead', 220),
  ('Engenheiro', 'engenheiro', 'lead', 230),
  ('Topógrafo', 'topografo', 'lead', 240);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: avatars e portfolio são públicos (leitura); verification-docs
-- é PRIVADO (seção 9) — só o dono e admin leem, via signed URL.
-- Convenção de path em todos os buckets: "{user_id}/arquivo.ext", checada
-- com storage.foldername(name).
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true),
  ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy portfolio_public_read on storage.objects for select
  using (bucket_id = 'portfolio');
create policy portfolio_owner_write on storage.objects for insert
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy portfolio_owner_update on storage.objects for update
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy portfolio_owner_delete on storage.objects for delete
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy verification_docs_owner_or_admin_read on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
create policy verification_docs_owner_write on storage.objects for insert
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
