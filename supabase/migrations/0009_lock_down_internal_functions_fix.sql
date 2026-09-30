-- Obra Fácil — 0008 revogou EXECUTE de PUBLIC, mas o Supabase configura
-- `alter default privileges in schema public grant execute on functions
-- to anon, authenticated` no projeto inteiro — toda função nova já nasce
-- com EXECUTE concedido a esses dois papéis diretamente, independente de
-- PUBLIC. Revogo explicitamente dos papéis certos desta vez.

revoke execute on function get_setting_numeric(text) from anon, authenticated;
revoke execute on function _release_stage(uuid) from anon, authenticated;
revoke execute on function _refund_stage(uuid, numeric) from anon, authenticated;
revoke execute on function _release_stage_partial(uuid, numeric, numeric) from anon, authenticated;
revoke execute on function cron_auto_approve_stages() from anon, authenticated;
revoke execute on function cron_expire_pending_payments() from anon, authenticated;

-- E revoga de anon nas públicas também — essas ações exigem login
-- (auth.uid() precisa existir), então anon não tem uso legítimo delas.
revoke execute on function payments_create(uuid, text) from anon;
revoke execute on function payments_confirm(uuid) from anon;
revoke execute on function stage_complete(uuid, text[]) from anon;
revoke execute on function stage_approve(uuid) from anon;
revoke execute on function stage_dispute(uuid, text, text[]) from anon;
revoke execute on function stage_cancel(uuid) from anon;
revoke execute on function dispute_resolve(uuid, text, numeric, numeric) from anon;
revoke execute on function admin_force_payment(uuid, text) from anon;
