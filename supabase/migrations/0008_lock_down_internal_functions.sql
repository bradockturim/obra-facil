-- Obra Fácil — revoga EXECUTE de PUBLIC nas funções internas do
-- Pagamento Garantido simulado (0007).
--
-- Postgres concede EXECUTE a PUBLIC por padrão em toda função nova, a
-- menos que seja revogado explicitamente. As funções "internas" de 0007
-- (prefixo `_`, mais `cron_*` e `get_setting_numeric`) não fazem nenhuma
-- checagem de auth.uid() — foram desenhadas pra só ser chamadas de
-- dentro de outra função SECURITY DEFINER ou pelo pg_cron. Sem este
-- REVOKE, qualquer usuário autenticado conseguiria chamar
-- `_release_stage(qualquer_etapa)` direto via supabase.rpc(...) e liberar
-- o valor de uma obra que não é dele.
--
-- Funções SECURITY DEFINER continuam conseguindo chamar essas internas
-- entre si normalmente: dentro delas, o "current_user" efetivo passa a
-- ser o dono (postgres), que sempre tem privilégio de EXECUTE.

revoke execute on function get_setting_numeric(text) from public;
revoke execute on function _release_stage(uuid) from public;
revoke execute on function _refund_stage(uuid, numeric) from public;
revoke execute on function _release_stage_partial(uuid, numeric, numeric) from public;
revoke execute on function cron_auto_approve_stages() from public;
revoke execute on function cron_expire_pending_payments() from public;
