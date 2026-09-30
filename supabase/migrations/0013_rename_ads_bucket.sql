-- Obra Fácil — bucket "ads" → "midia-campanhas"
--
-- Confirmado testando em produção: bloqueadores de anúncio (uBlock,
-- AdBlock etc.) bloqueiam por padrão qualquer URL contendo "/ads/" no
-- caminho — a imagem da campanha voltava HTTP 503 no navegador mesmo
-- com o arquivo correto no Storage (confirmado por download direto,
-- bytes idênticos). Renomeia pra um nome neutro que não cai em listas
-- de bloqueio.

insert into storage.buckets (id, name, public)
values ('midia-campanhas', 'midia-campanhas', true)
on conflict (id) do nothing;

create policy midia_campanhas_public_read on storage.objects for select
  using (bucket_id = 'midia-campanhas');
create policy midia_campanhas_admin_write on storage.objects for insert
  with check (bucket_id = 'midia-campanhas' and is_admin());

-- Move o(s) objeto(s) de teste já enviados pro bucket antigo (bucket
-- "ads" fica sem uso a partir daqui; não precisa apagar) e corrige a
-- URL já salva em ad_campaigns.criativo_url pra apontar pro bucket novo.
update storage.objects set bucket_id = 'midia-campanhas' where bucket_id = 'ads';
update ad_campaigns
  set criativo_url = replace(criativo_url, '/object/public/ads/', '/object/public/midia-campanhas/')
  where criativo_url like '%/object/public/ads/%';
