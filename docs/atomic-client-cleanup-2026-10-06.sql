-- One-time production cleanup after schema_delete_client.sql is installed.
-- Owner approved deletion of all four old clients. The fictional pooling test
-- client has immutable governance evidence and needs separate handling; this
-- transaction removes the other three or none of them.

begin;
select set_config('request.jwt.claim.sub',
  'aca78a32-d373-4959-a0f3-d020fc15188d', true);

do $cleanup$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
begin
  if (select count(*) from public.clients where "coachId" = coach) <> 6 or
     (select count(*) from public.clients where "coachId" = coach and
       ((id = 'ihw9kzb' and name = 'Sharafath Client') or
        (id = 'feature_demo_20261005' and name = 'Feature Demo Client'))) <> 2 or
     (select count(*) from public.clients where "coachId" = coach and
       ((id = 'classic_demo_20260930' and name = 'Classic Demo Athlete') or
        (id = '5vvsxmi' and name = 'CODEX RELEASE TEST 2026-09-24') or
        (id = 'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df'
          and name = 'FICTIONAL SOFTWARE TEST — DO NOT TRAIN') or
        (id = '7g77zp6' and name = 'Jobin'))) <> 4 or
     (select count(*) from public.workouts
       where "clientId" = 'feature_demo_20261005' and status = 'completed') <> 23 or
     (select count(*) from public.prescriptions
       where "clientId" = 'feature_demo_20261005' and date > '2026-10-05') <> 6 then
    raise exception 'Client identities or replacement demo changed; cleanup cancelled';
  end if;

  perform public.delete_client_and_data('classic_demo_20260930');
  perform public.delete_client_and_data('5vvsxmi');
  perform public.delete_client_and_data('7g77zp6');

  if (select count(*) from public.clients where "coachId" = coach) <> 3 or
     (select count(*) from public.clients where "coachId" = coach and
       id in ('ihw9kzb', 'feature_demo_20261005',
         'fs_pool_coachtest_e235df8a-0e8d-46f8-a40f-56e1122d63df')) <> 3 then
    raise exception 'Final client verification failed; cleanup rolled back';
  end if;
end
$cleanup$;

commit;
