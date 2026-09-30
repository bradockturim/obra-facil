-- Obra Fácil — as funções "públicas" de 0007 receberam
-- `grant execute ... to authenticated`, mas nunca tiveram o grant padrão
-- a PUBLIC removido (Postgres concede EXECUTE a PUBLIC em toda função
-- nova por padrão). Resultado: `anon` conseguia chamá-las mesmo sem
-- sessão — confirmado via `proacl` (`=X/postgres` = PUBLIC com EXECUTE).
-- Revoga de PUBLIC; o grant explícito a `authenticated` continua valendo
-- porque é uma entrada de ACL separada.

revoke execute on function payments_create(uuid, text) from public;
revoke execute on function payments_confirm(uuid) from public;
revoke execute on function stage_complete(uuid, text[]) from public;
revoke execute on function stage_approve(uuid) from public;
revoke execute on function stage_dispute(uuid, text, text[]) from public;
revoke execute on function stage_cancel(uuid) from public;
revoke execute on function dispute_resolve(uuid, text, numeric, numeric) from public;
revoke execute on function admin_force_payment(uuid, text) from public;
