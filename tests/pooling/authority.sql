-- Fictional trusted-decision fixtures exercise transactions, not clinical acceptance.
begin;
update public.pooling_runtime set r1=true where singleton;
insert into public.pooling_contexts(client_id,held) values('recovery-client-a',false) on conflict(client_id) do update set held=false;
insert into public.pooling_manifests(id,state,document) values('synthetic-only','published','{}');
insert into public.pooling_drafts(client_id,actor_id,revision,context_generation,proposal,operation_key)
 values('recovery-client-a','00000000-0000-4000-8000-000000000001',1,1,'{}','authority-fixture-draft');
insert into public.pooling_decisions(draft_id,context_generation,manifest_id,result,valid_until)
 select id,1,'synthetic-only','{"completeness":"ready_for_coach_review","sessionState":"eligible_for_coach_review","blocks":[{"synthetic":true}]}',now()+interval '1 hour'
 from public.pooling_drafts where operation_key='authority-fixture-draft';
-- Fixed fixture handles copied to session settings before ordinary-role checks.
select set_config('test.draft',(select id::text from public.pooling_drafts where operation_key='authority-fixture-draft'),true);
select set_config('test.decision',(select id::text from public.pooling_decisions where manifest_id='synthetic-only'),true);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 begin
  perform public.pooling_approve('recovery-client-a',current_setting('test.draft')::bigint,current_setting('test.decision')::bigint,1,'approve-test-01');
  raise exception 'TEST: client approved';
 exception when raise_exception then if SQLERRM<>'forbidden' then raise; end if; end;
 begin
  insert into public.pooling_assignments(client_id,draft_id,decision_id,coach_id,context_generation,operation_key)
    values('recovery-client-a',current_setting('test.draft')::bigint,current_setting('test.decision')::bigint,auth.uid(),1,'forged-approval');
  raise exception 'TEST: direct assignment allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ declare receipt jsonb; begin
 receipt:=public.pooling_approve('recovery-client-a',current_setting('test.draft')::bigint,current_setting('test.decision')::bigint,1,'approve-test-01');
 if receipt<>public.pooling_approve('recovery-client-a',current_setting('test.draft')::bigint,current_setting('test.decision')::bigint,1,'approve-test-01') then raise exception 'Approval retry mismatch'; end if;
 perform set_config('test.assignment',receipt->>'assignmentId',true);
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ declare a bigint:=current_setting('test.assignment')::bigint; begin
 begin
  perform public.pooling_execution(a,1,'start-check-01','start','{}');
  raise exception 'TEST: missing health check accepted';
 exception when raise_exception then if SQLERRM<>'health_check_required' then raise; end if; end;
 perform public.pooling_execution(a,1,'start-check-02','start','{"healthChange":"no_change"}');
 perform public.pooling_execution(a,1,'pause-check-01','pause','{}');
 perform public.pooling_submit_report('recovery-client-a',1,'changed-after-start','healthChange','"changed"','2026-09-01T10:00:00Z');
 begin
  perform public.pooling_execution(a,1,'resume-check-01','resume','{"healthChange":"no_change"}');
  raise exception 'TEST: stale resume accepted';
 exception when raise_exception then if SQLERRM<>'stale_context' then raise; end if; end;
 -- Recording performed work and stop remains possible under the new hold.
 perform public.pooling_execution(a,2,'actual-check-01','actual','{"occurrenceId":"synthetic","actual":0}');
 perform public.pooling_execution(a,2,'stop-check-01','stop','{}');
end $$;
rollback;
