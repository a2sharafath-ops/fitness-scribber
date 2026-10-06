-- One-time cleanup for the specifically named fictional pooling test client.
-- The coach approved permanent deletion and a one-time bypass of its
-- immutable-evidence triggers for four synthetic rows on 2026-10-06.
-- All trigger changes, deletes, and final checks share one transaction.

begin;
select set_config('request.jwt.claim.sub',
  'aca78a32-d373-4959-a0f3-d020fc15188d', true);

do $preflight$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
  target text := 'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df';
begin
  if (select count(*) from public.clients where "coachId" = coach) <> 3 or
     (select count(*) from public.clients where "coachId" = coach and
       ((id = 'ihw9kzb' and name = 'Sharafath Client') or
        (id = 'feature_demo_20261005' and name = 'Feature Demo Client'))) <> 2 or
     (select count(*) from public.clients where id = target and "coachId" = coach
       and name = 'FICTIONAL SOFTWARE TEST — DO NOT TRAIN'
       and notes like '%Software workflow testing only%') <> 1 or
     (select count(*) from public.pooling_test_workspaces where client_id = target) <> 1 or
     (select count(*) from public.pooling_suggestions where client_id = target) <> 2 or
     (select count(*) from public.pooling_scope_grants where client_id = target) <> 1 or
     (select count(*) from public.pooling_consent_events where client_id = target) <> 1 then
    raise exception 'Fictional client identity or evidence counts changed; cleanup cancelled';
  end if;

  if (select count(*) from pg_catalog.pg_trigger
      where tgenabled = 'O' and
      (tgrelid, tgname) in (
        ('public.pooling_suggestions'::regclass, 'pooling_suggestion_immutable'),
        ('public.pooling_scope_grants'::regclass, 'pooling_governance_immutable'),
        ('public.pooling_consent_events'::regclass, 'pooling_governance_immutable'))
      ) <> 3 then
    raise exception 'Expected immutable-evidence triggers are not enabled';
  end if;
end
$preflight$;

-- ALTER TABLE holds its lock until commit; these exceptions are confined to
-- this one transaction and each named trigger is re-enabled before commit.
alter table public.pooling_suggestions disable trigger pooling_suggestion_immutable;
alter table public.pooling_scope_grants disable trigger pooling_governance_immutable;
alter table public.pooling_consent_events disable trigger pooling_governance_immutable;

select public.delete_client_and_data(
  'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df');

alter table public.pooling_suggestions enable trigger pooling_suggestion_immutable;
alter table public.pooling_scope_grants enable trigger pooling_governance_immutable;
alter table public.pooling_consent_events enable trigger pooling_governance_immutable;

do $postflight$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
begin
  if (select count(*) from public.clients where "coachId" = coach) <> 2 or
     (select count(*) from public.clients where "coachId" = coach and
       id in ('ihw9kzb', 'feature_demo_20261005')) <> 2 or
     (select count(*) from pg_catalog.pg_trigger
      where tgenabled = 'O' and
      (tgrelid, tgname) in (
        ('public.pooling_suggestions'::regclass, 'pooling_suggestion_immutable'),
        ('public.pooling_scope_grants'::regclass, 'pooling_governance_immutable'),
        ('public.pooling_consent_events'::regclass, 'pooling_governance_immutable'))
      ) <> 3 then
    raise exception 'Cleanup or trigger restoration failed; transaction rolled back';
  end if;
end
$postflight$;

commit;
