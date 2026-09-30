-- Obra Fácil — habilita Realtime (seção 10.2: "Realtime (chat, status da
-- obra/pagamento)") para as tabelas usadas pelo chat da Semana 4.
-- Sem isso, supabase.channel(...).on('postgres_changes', ...) não recebe
-- nenhum evento, mesmo com RLS liberando o SELECT.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table proposals;
