-- Production cleanup of exactly two coach-owned fictional clients.
-- Run only after the owner confirms permanent deletion at action time.
-- The Classic Demo Athlete must exist and be verified first.
-- Other coaches' historical pooling test clients are intentionally untouched.
-- This removes rows, not pooling schema objects or shared policy documents.

do $cleanup$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
  release_client text := '5vvsxmi';
  pool_client text := 'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df';
  pool_drafts bigint[];
  pool_assignments bigint[];
  pool_requests bigint[];
  actual jsonb;
  expected jsonb := '{"release_assessments":1,"release_cardio":1,"release_maxes":1,"release_contexts":1,"release_prescriptions":1,"release_resistance":1,"release_srpe":2,"release_wellness":1,"release_workouts":1,"pool_assignments":2,"pool_confirmations":6,"pool_consent_events":1,"pool_context_reviews":1,"pool_contexts":1,"pool_drafts":8,"pool_extension_requests":2,"pool_extension_reviews":2,"pool_scope_grants":1,"pool_source_snapshots":5,"pool_suggestions":2,"pool_workspace":1,"pool_decisions":4,"pool_execution_events":2,"pool_extension_proposals":2}'::jsonb;
begin
  if (select count(*) from public.clients where "coachId"=coach and
      ((id=release_client and name='CODEX RELEASE TEST 2026-09-24' and notes like '%Disposable fictional test client%') or
       (id=pool_client and name='FICTIONAL SOFTWARE TEST — DO NOT TRAIN' and notes like '%Software workflow testing only%'))) <> 2 then
    raise exception 'The two expected fictional client identities were not found';
  end if;
  if (select count(*) from public.clients where id='classic_demo_20260930' and "coachId"=coach and notes like '%[classic-full-demo]%') <> 1 or
     (select count(*) from public.workouts where "clientId"='classic_demo_20260930' and status='completed') <> 23 or
     (select count(*) from public.wearable where "clientId"='classic_demo_20260930') <> 0 then
    raise exception 'Replacement demo is absent or not verified';
  end if;

  select coalesce(array_agg(id),'{}'::bigint[]) into pool_drafts from public.pooling_drafts where client_id=pool_client;
  select coalesce(array_agg(id),'{}'::bigint[]) into pool_assignments from public.pooling_assignments where client_id=pool_client;
  select coalesce(array_agg(id),'{}'::bigint[]) into pool_requests from public.pooling_extension_requests where client_id=pool_client;

  select jsonb_build_object(
    'release_assessments',(select count(*) from public.assessments where "clientId"=release_client),
    'release_cardio',(select count(*) from public.cardio where "clientId"=release_client),
    'release_maxes',(select count(*) from public.maxes where "clientId"=release_client),
    'release_contexts',(select count(*) from public.pooling_contexts where client_id=release_client),
    'release_prescriptions',(select count(*) from public.prescriptions where "clientId"=release_client),
    'release_resistance',(select count(*) from public.resistance where "clientId"=release_client),
    'release_srpe',(select count(*) from public.srpe where "clientId"=release_client),
    'release_wellness',(select count(*) from public.wellness where "clientId"=release_client),
    'release_workouts',(select count(*) from public.workouts where "clientId"=release_client),
    'pool_assignments',(select count(*) from public.pooling_assignments where client_id=pool_client),
    'pool_confirmations',(select count(*) from public.pooling_confirmations where client_id=pool_client),
    'pool_consent_events',(select count(*) from public.pooling_consent_events where client_id=pool_client),
    'pool_context_reviews',(select count(*) from public.pooling_context_reviews where client_id=pool_client),
    'pool_contexts',(select count(*) from public.pooling_contexts where client_id=pool_client),
    'pool_drafts',(select count(*) from public.pooling_drafts where client_id=pool_client),
    'pool_extension_requests',(select count(*) from public.pooling_extension_requests where client_id=pool_client),
    'pool_extension_reviews',(select count(*) from public.pooling_extension_reviews where client_id=pool_client),
    'pool_scope_grants',(select count(*) from public.pooling_scope_grants where client_id=pool_client),
    'pool_source_snapshots',(select count(*) from public.pooling_source_snapshots where client_id=pool_client),
    'pool_suggestions',(select count(*) from public.pooling_suggestions where client_id=pool_client),
    'pool_workspace',(select count(*) from public.pooling_test_workspaces where client_id=pool_client),
    'pool_decisions',(select count(*) from public.pooling_decisions where draft_id=any(pool_drafts)),
    'pool_execution_events',(select count(*) from public.pooling_execution_events where assignment_id=any(pool_assignments)),
    'pool_extension_proposals',(select count(*) from public.pooling_extension_proposals where draft_id=any(pool_drafts) or request_id=any(pool_requests) or baseline_assignment_id=any(pool_assignments))
  ) into actual;
  if actual <> expected then raise exception 'Fictional record counts changed: %', actual; end if;

  -- Remove references to the old pooling draft/assignment graph, leaves first.
  delete from public.pooling_execution_events where assignment_id=any(pool_assignments);
  delete from public.pooling_extension_proposals where draft_id=any(pool_drafts) or request_id=any(pool_requests) or baseline_assignment_id=any(pool_assignments);
  delete from public.pooling_assignments where client_id=pool_client;
  delete from public.pooling_confirmations where client_id=pool_client;
  delete from public.pooling_consent_events where client_id=pool_client;
  delete from public.pooling_context_reviews where client_id=pool_client;
  delete from public.pooling_extension_reviews where client_id=pool_client;
  delete from public.pooling_source_snapshots where client_id=pool_client;
  delete from public.pooling_suggestions where client_id=pool_client;
  delete from public.pooling_scope_grants where client_id=pool_client;
  delete from public.pooling_contexts where client_id in (release_client,pool_client);
  delete from public.pooling_extension_requests where client_id=pool_client;
  delete from public.pooling_decisions where draft_id=any(pool_drafts);
  delete from public.pooling_drafts where client_id=pool_client;
  delete from public.pooling_test_workspaces where client_id=pool_client;

  -- Classic release-test rows. Assessments also cascade, but are explicit here.
  delete from public.assessments where "clientId"=release_client;
  delete from public.cardio where "clientId"=release_client;
  delete from public.maxes where "clientId"=release_client;
  delete from public.prescriptions where "clientId"=release_client;
  delete from public.resistance where "clientId"=release_client;
  delete from public.srpe where "clientId"=release_client;
  delete from public.wellness where "clientId"=release_client;
  delete from public.workouts where "clientId"=release_client;
  delete from public.clients where id in (release_client,pool_client) and "coachId"=coach;

  if exists (select 1 from public.clients where id in (release_client,pool_client)) then
    raise exception 'Cleanup incomplete; rolled back';
  end if;
end
$cleanup$;
