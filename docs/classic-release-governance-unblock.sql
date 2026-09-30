-- Executed 2026-09-30 after owner approval on Supabase project haxxetirrcrwzwdzsdui.
-- Audit copy of the guarded release operation; it will reject a repeat run.
-- The owner approved changing the legacy development setting
-- for the coach who owns the fictional client 5vvsxmi. This affects the coach's
-- other clients too. It does not delete any pooling tables, functions, or rows.
-- Snapshot observed 2026-09-30: 4 coach clients, 3 development-governed,
-- 1 pooling test workspace, global pooling disabled.

begin;

do $release$
declare
  target_coach uuid;
  changed_rows integer;
begin
  select "coachId" into target_coach
  from public.clients where id = '5vvsxmi';
  if target_coach is null then
    raise exception 'release_test_client_missing';
  end if;
  if public.pooling_enabled() then
    raise exception 'global_pooling_now_enabled';
  end if;
  if (select count(*) from public.clients where "coachId" = target_coach) <> 4 then
    raise exception 'coach_client_scope_changed';
  end if;
  if (select count(*) from public.clients c where c."coachId" = target_coach
      and public.pooling_development_enabled(c.id)) <> 3 then
    raise exception 'development_scope_changed';
  end if;
  if (select count(*) from public.pooling_test_workspaces w
      join public.clients c on c.id = w.client_id
      where c."coachId" = target_coach) <> 1 then
    raise exception 'test_workspace_scope_changed';
  end if;

  perform 1 from public.pooling_development_coaches
  where coach_id = target_coach and enabled is true for update;
  if not found then
    raise exception 'enabled_development_row_missing';
  end if;
  update public.pooling_development_coaches
  set enabled = false
  where coach_id = target_coach and enabled is true;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'unexpected_update_count: %', changed_rows;
  end if;
end;
$release$;

commit;

-- Expected after the transaction: 4 clients, 0 development-governed,
-- 1 governed test-workspace client. Verify before the workout write/readback.
select count(*) as clients,
  count(*) filter (where public.pooling_development_enabled(c.id)) as development_governed,
  count(*) filter (where public.pooling_governed_client(c.id)) as governed
from public.clients c
where c."coachId" = (select "coachId" from public.clients where id = '5vvsxmi');

-- Rollback, if specifically requested: set enabled=true for the same coach.
-- That restores the prior governance behavior and will block Classic writes again.
