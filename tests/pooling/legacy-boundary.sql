begin;
update public.pooling_runtime set r1=true where singleton;
insert into public.screenings(id,"coachId","clientId",clearance) values('private-test-screen','00000000-0000-4000-8000-000000000001','recovery-client-a','{"notes":"synthetic private evidence"}');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ declare snapshot jsonb; begin
 if exists(select 1 from public.clients) or exists(select 1 from public.screenings) then raise exception 'TEST: raw private source visible'; end if;
 snapshot:=public.pooling_athlete_snapshot();
 if snapshot->'client'->>'id'<>'recovery-client-a' or snapshot::text like '%synthetic private evidence%' or snapshot->'client' ? 'notes' then raise exception 'TEST: unsafe client projection'; end if;
 begin
   insert into public.workouts(id,"coachId","clientId",status) values('bypass-test','00000000-0000-4000-8000-000000000001','recovery-client-a','in_progress');
   raise exception 'TEST: legacy start bypass';
 exception when raise_exception then if SQLERRM<>'governed_workflow_required' then raise; end if; end;
 begin
   insert into public.screenings(id,"coachId","clientId",clearance) values('bypass-screen','00000000-0000-4000-8000-000000000001','recovery-client-a','{"status":"received"}');
   raise exception 'TEST: client clearance bypass';
 exception when raise_exception then if SQLERRM<>'guarded_report_required' then raise; end if; end;
end $$;
reset role;
update public.pooling_runtime set r1=false,r2=false,r3=false where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 if not exists(select 1 from public.clients where id='recovery-client-a') then raise exception 'TEST: feature-off Classic read broken'; end if;
end $$;
rollback;
