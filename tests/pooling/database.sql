-- Run against the isolated synthetic Classic recovery fixture only.
begin;
update public.pooling_runtime set r1=true where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ declare receipt jsonb; begin
  receipt := public.pooling_save_draft('recovery-client-a',1,'draft-test-01','{"blocks":[]}'::jsonb);
  if receipt->>'state'<>'draft' then raise exception 'Draft authority failure'; end if;
  if receipt <> public.pooling_save_draft('recovery-client-a',1,'draft-test-01','{"blocks":[]}'::jsonb) then raise exception 'Retry mismatch'; end if;
  begin
    perform public.pooling_save_draft('recovery-client-a',1,'draft-test-01','{"blocks":[1]}'::jsonb);
    raise exception 'TEST: changed payload allowed';
  exception when raise_exception then if SQLERRM <> 'idempotency_conflict' then raise; end if; end;
  begin
    perform public.pooling_save_draft('recovery-client-b',1,'draft-test-02','{}'::jsonb);
    raise exception 'TEST: cross-owner draft allowed';
  exception when raise_exception then if SQLERRM <> 'forbidden' then raise; end if; end;
  begin
    perform public.pooling_save_draft('recovery-client-a',1,'draft-test-03','{"approval":true}'::jsonb);
    raise exception 'TEST: protected field allowed';
  exception when raise_exception then if SQLERRM <> 'protected_field' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ declare receipt jsonb; begin
  if (select count(*) from public.pooling_drafts)<>0 then raise exception 'Client read private draft'; end if;
  begin
    perform public.pooling_save_draft('recovery-client-a',1,'client-draft-01','{}'::jsonb);
    raise exception 'TEST: client drafted';
  exception when raise_exception then if SQLERRM <> 'forbidden' then raise; end if; end;
  receipt := public.pooling_submit_report('recovery-client-a',1,'health-test-01','healthChange','"changed"'::jsonb,'2026-09-01T10:00:00Z');
  if receipt->>'generation'<>'2' then raise exception 'Report did not invalidate'; end if;
  if receipt <> public.pooling_submit_report('recovery-client-a',1,'health-test-01','healthChange','"changed"'::jsonb,'2026-09-01T10:00:00Z') then raise exception 'Report retry mismatch'; end if;
  begin
    update public.pooling_contexts set held=false where client_id='recovery-client-a';
    raise exception 'TEST: client cleared hold';
  exception when insufficient_privilege then null; end;
  begin
    perform public.pooling_submit_report('recovery-client-b',1,'health-test-02','healthChange','"no_change"'::jsonb,'2026-09-01T10:00:00Z');
    raise exception 'TEST: cross-client report allowed';
  exception when raise_exception then if SQLERRM <> 'forbidden' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin
  begin
    perform public.pooling_save_draft('recovery-client-a',1,'stale-test-01','{}'::jsonb);
    raise exception 'TEST: stale draft allowed';
  exception when raise_exception then if SQLERRM <> 'stale_context' then raise; end if; end;
  perform public.pooling_submit_report('recovery-client-a',2,'health-test-03','healthChange','"no_change"'::jsonb,'2026-09-01T10:00:00Z');
  if not (select held from public.pooling_contexts where client_id='recovery-client-a') then raise exception 'No-change report cleared hold'; end if;
end $$;
rollback;
