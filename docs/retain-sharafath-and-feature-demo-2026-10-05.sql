-- Production cleanup for this coach only. Permanently removes the four
-- pre-existing clients other than Sharafath after the new demo is verified.
-- Do not run until the owner confirms permanent deletion at action time.
-- Other coaches' clients and the new feature demo are excluded by fixed IDs.

do $cleanup$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
  targets text[] := array[
    'classic_demo_20260930', '5vvsxmi',
    'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df',
    '7g77zp6'];
  pool_client text := 'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df';
  pool_drafts bigint[];
  pool_assignments bigint[];
  pool_requests bigint[];
  t text;
  col text;
  row_data record;
  actual jsonb := '{}'::jsonb;
  expected jsonb := '{
    "5vvsxmi:assessments":1,"5vvsxmi:cardio":1,"5vvsxmi:maxes":1,
    "5vvsxmi:pooling_contexts":1,"5vvsxmi:prescriptions":1,
    "5vvsxmi:resistance":1,"5vvsxmi:srpe":2,"5vvsxmi:wellness":1,
    "5vvsxmi:workouts":1,
    "7g77zp6:assessments":6,"7g77zp6:screenings":1,
    "classic_demo_20260930:assessments":6,
    "classic_demo_20260930:cardio":7,
    "classic_demo_20260930:concerns":1,
    "classic_demo_20260930:logs":4,
    "classic_demo_20260930:pooling_contexts":1,
    "classic_demo_20260930:prescriptions":1,
    "classic_demo_20260930:resistance":4,
    "classic_demo_20260930:sessions":23,
    "classic_demo_20260930:srpe":23,
    "classic_demo_20260930:wellness":52,
    "classic_demo_20260930:workouts":22,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_assignments":2,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_confirmations":6,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_consent_events":1,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_context_reviews":1,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_contexts":1,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_drafts":8,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_extension_requests":2,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_extension_reviews":2,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_scope_grants":1,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_source_snapshots":5,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_suggestions":2,
    "fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df:pooling_test_workspaces":1
  }'::jsonb;
begin
  if (select count(*) from public.clients where "coachId"=coach) <> 6 or
     (select count(*) from public.clients where "coachId"=coach and
       ((id='ihw9kzb' and name='Sharafath Client') or
        (id='feature_demo_20261005' and name='Feature Demo Client' and notes like '%[feature-demo-2026-10-05]%'))) <> 2 or
     (select count(*) from public.clients where "coachId"=coach and id=any(targets)) <> 4 or
     (select count(*) from public.clients where "coachId"=coach and id='7g77zp6' and name='Jobin') <> 1 then
    raise exception 'Coach/client identities changed; cleanup cancelled';
  end if;
  if (select count(*) from public.workouts where "clientId"='feature_demo_20261005' and status='completed') <> 23 or
     (select count(*) from public.prescriptions where "clientId"='feature_demo_20261005' and date > '2026-10-05') <> 6 or
     (select count(*) from public.wearable where "clientId"='feature_demo_20261005') <> 0 or
     (select count(*) from public.plans where id='feature-demo-plan-20261005' and "coachId"=coach) <> 1 then
    raise exception 'Replacement demo is missing required data; cleanup cancelled';
  end if;

  -- Reject any newly changed or unexpected direct client-linked rows.
  foreach t in array array[
    'assessments','cardio','concerns','logs','maxes',
    'pooling_approval_batches','pooling_assignments',
    'pooling_catalogue_submissions','pooling_confirmations',
    'pooling_consent_events','pooling_context_reviews','pooling_contexts',
    'pooling_development_operations','pooling_drafts',
    'pooling_engineering_releases','pooling_extension_requests',
    'pooling_extension_reviews','pooling_reassessment_requests',
    'pooling_reports','pooling_restriction_records',
    'pooling_reviewer_authorizations','pooling_scope_grants',
    'pooling_source_snapshots','pooling_suggestions',
    'pooling_test_workspaces','pooling_week_reviews',
    'prescriptions','resistance','screenings','sessions','srpe',
    'wearable','wellness','workouts']
  loop
    col := case when t like 'pooling_%' then 'client_id' else 'clientId' end;
    for row_data in execute format(
      'select %I as client_id, count(*) as n from public.%I where %I=any($1) group by %I',
      col,t,col,col) using targets
    loop
      actual := actual || jsonb_build_object(row_data.client_id || ':' || t,row_data.n);
    end loop;
  end loop;
  if actual <> expected then
    raise exception 'Client-linked row counts changed; cleanup cancelled: %', actual;
  end if;

  select coalesce(array_agg(id),'{}'::bigint[]) into pool_drafts
  from public.pooling_drafts where client_id=pool_client;
  select coalesce(array_agg(id),'{}'::bigint[]) into pool_assignments
  from public.pooling_assignments where client_id=pool_client;
  select coalesce(array_agg(id),'{}'::bigint[]) into pool_requests
  from public.pooling_extension_requests where client_id=pool_client;
  if (select count(*) from public.pooling_decisions where draft_id=any(pool_drafts)) <> 4 or
     (select count(*) from public.pooling_execution_events where assignment_id=any(pool_assignments)) <> 2 or
     (select count(*) from public.pooling_extension_proposals where draft_id=any(pool_drafts)
       or request_id=any(pool_requests) or baseline_assignment_id=any(pool_assignments)) <> 2 then
    raise exception 'Pooling dependency counts changed; cleanup cancelled';
  end if;

  -- Remove pooling graph leaves before parents.
  delete from public.pooling_execution_events where assignment_id=any(pool_assignments);
  delete from public.pooling_extension_proposals where draft_id=any(pool_drafts)
    or request_id=any(pool_requests) or baseline_assignment_id=any(pool_assignments);
  delete from public.pooling_assignments where client_id=any(targets);
  delete from public.pooling_confirmations where client_id=any(targets);
  delete from public.pooling_consent_events where client_id=any(targets);
  delete from public.pooling_context_reviews where client_id=any(targets);
  delete from public.pooling_extension_reviews where client_id=any(targets);
  delete from public.pooling_source_snapshots where client_id=any(targets);
  delete from public.pooling_suggestions where client_id=any(targets);
  delete from public.pooling_scope_grants where client_id=any(targets);
  delete from public.pooling_contexts where client_id=any(targets);
  delete from public.pooling_extension_requests where client_id=any(targets);
  delete from public.pooling_decisions where draft_id=any(pool_drafts);
  delete from public.pooling_drafts where client_id=any(targets);
  delete from public.pooling_test_workspaces where client_id=any(targets);

  foreach t in array array['assessments','cardio','concerns','logs','maxes',
    'prescriptions','resistance','screenings','sessions','srpe','wearable',
    'wellness','workouts']
  loop
    execute format('delete from public.%I where "clientId"=any($1)',t) using targets;
  end loop;
  delete from public.clients where "coachId"=coach and id=any(targets);
  delete from public.exercises where "coachId"=coach and id like 'classic-demo-%';

  if (select count(*) from public.clients where "coachId"=coach) <> 2 or
     (select count(*) from public.clients where "coachId"=coach and id in ('ihw9kzb','feature_demo_20261005')) <> 2 then
    raise exception 'Final client verification failed; cleanup rolled back';
  end if;
end
$cleanup$;
