-- Narrow existing function access without changing business logic or client data.
-- Run after schema_athlete.sql and schema_admin.sql. Safe to repeat.
begin;
revoke execute on function public.become_coach() from public, anon;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.is_admin() from public, anon;
-- Preserve the existing signed-in onboarding and RLS policy calls.
grant execute on function public.become_coach(), public.redeem_invite(text), public.is_admin() to authenticated;

-- Supabase's automatic-RLS event trigger is not an application RPC.
-- Event-trigger execution by its owner remains available.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
commit;
