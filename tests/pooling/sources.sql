begin;
update public.pooling_runtime set r1=true where singleton;
select set_config('test.generation',coalesce((select generation::text from public.pooling_contexts where client_id='recovery-client-a'),'1'),true);
select set_config('test.source',(select s->>'token' from jsonb_array_elements(public.pooling_source_inventory('00000000-0000-4000-8000-000000000001','recovery-client-a')) s where s->>'source'='clients' and s->>'id'='recovery-client-a'),true);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 begin
   perform public.pooling_read_source_review('recovery-client-a'); raise exception 'TEST: client private source read';
 exception when raise_exception then if SQLERRM<>'forbidden' then raise; end if; end;
 if (select count(*) from public.pooling_assignments)>0 then raise exception 'TEST: client raw assignment read'; end if;
 if (select count(*) from public.pooling_execution_events)>0 then raise exception 'TEST: client raw event read'; end if;
 if jsonb_typeof(public.pooling_read_assignments('recovery-client-a'))<>'array' then raise exception 'TEST: client projection unavailable'; end if;
 begin
   perform public.pooling_read_assignments('recovery-client-b'); raise exception 'TEST: cross-client projection';
 exception when raise_exception then if SQLERRM<>'forbidden' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ declare input jsonb; receipt jsonb; begin
 input:=jsonb_build_object('key','synthetic-zero','source','clients','sourceId','recovery-client-a','sourceToken',current_setting('test.source'),
 'state','measured','value',0,'unit','seconds','protocol','synthetic-v1','side','left','effectiveAt',now(),'evidenceReference','synthetic-only');
 receipt:=public.pooling_confirm_source('recovery-client-a',current_setting('test.generation')::bigint,'source-test-zero',input);
 if receipt<>public.pooling_confirm_source('recovery-client-a',current_setting('test.generation')::bigint,'source-test-zero',input) then raise exception 'TEST: confirmation retry'; end if;
 begin
   perform public.pooling_confirm_source('recovery-client-a',(receipt->>'generation')::bigint,'source-test-forge',input||'{"confirmedBy":"forged"}');raise exception 'TEST: attribution forged';
 exception when raise_exception then if SQLERRM<>'protected_field' then raise; end if; end;
 perform set_config('test.confirmed_generation',receipt->>'generation',true);
 update public.clients set notes='synthetic changed source' where id='recovery-client-a';
 if (select generation from public.pooling_contexts where client_id='recovery-client-a')<>current_setting('test.confirmed_generation')::bigint+1 then raise exception 'TEST: source edit did not invalidate'; end if;
 begin
   perform public.pooling_confirm_source('recovery-client-a',current_setting('test.confirmed_generation')::bigint+1,'source-test-stale',input);raise exception 'TEST: obsolete source confirmed';
 exception when raise_exception then if SQLERRM<>'source_changed' then raise; end if; end;
end $$;
rollback;
