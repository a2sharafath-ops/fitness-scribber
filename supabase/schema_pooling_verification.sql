-- A32 bounded verification capacity. No global activation or expiry extension.
begin;
alter table public.pooling_test_config drop constraint if exists pooling_test_config_coach_ids_check;
alter table public.pooling_test_config add constraint pooling_test_config_coach_ids_check check(cardinality(coach_ids)<=5);
do $$declare definition text;begin
 select pg_get_functiondef('public.pooling_create_test_workspace(boolean)'::regprocedure) into definition;
 if position('count(*) from public.pooling_test_workspaces)>=3' in definition)>0 then
  execute replace(definition,'count(*) from public.pooling_test_workspaces)>=3','count(*) from public.pooling_test_workspaces)>=6');
 elsif position('count(*) from public.pooling_test_workspaces)>=6' in definition)=0 then
  raise exception 'unexpected_workspace_function';
 end if;
end $$;
-- Six lifetime workspaces = one retired A31 + three A32 + two original coaches.
-- Existing per-workspace 160-write quota, account checks and revocation stay intact.
commit;
