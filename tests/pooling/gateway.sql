-- Real PostgreSQL role isolation and source-token tests. Synthetic data only.
begin;
update public.pooling_runtime set r1=true where singleton;
insert into public.pooling_contexts(client_id,held) values('recovery-client-a',false);
insert into public.pooling_manifests(id,state,document) values('gateway-fixture','published','{"manifest":{"id":"gateway-fixture"}}');
insert into public.pooling_drafts(client_id,actor_id,revision,context_generation,proposal,operation_key)
values('recovery-client-a','00000000-0000-4000-8000-000000000001',1,1,jsonb_build_object('date',to_char(now() at time zone 'UTC','YYYY-MM-DD')),'gateway-fixture-draft');
select set_config('test.draft',(select id::text from public.pooling_drafts where operation_key='gateway-fixture-draft'),true);
insert into public.pooling_source_snapshots(draft_id,client_id,generation,manifest_id,context_input,session_request,verified,valid_until)
values(current_setting('test.draft')::bigint,'recovery-client-a',1,'gateway-fixture',jsonb_build_object('sessionAt',now(),'timeZone','UTC'),'{}',true,now()+interval '1 hour');
do $$ declare role_name text; table_name text; begin
 foreach role_name in array array['anon','authenticated'] loop
   foreach table_name in array array['pooling_manifests','pooling_decisions','pooling_source_snapshots'] loop
     if has_table_privilege(role_name,'public.'||table_name,'INSERT,UPDATE,DELETE') then raise exception 'TEST: protected table writable'; end if;
   end loop;
   if has_function_privilege(role_name,'public.pooling_decision_input(uuid,text,bigint)','EXECUTE') then raise exception 'TEST: private source gateway callable'; end if;
   if has_function_privilege(role_name,'public.pooling_record_decision(uuid,text,bigint,bigint,text,text,jsonb)','EXECUTE') then raise exception 'TEST: decision forge callable'; end if;
 end loop;
 if has_function_privilege('anon','public.pooling_approve(text,bigint,bigint,bigint,text)','EXECUTE') then raise exception 'TEST: anonymous approval grant'; end if;
end $$;
set local role service_role;
do $$ declare source jsonb; result jsonb; receipt jsonb; draft bigint:=current_setting('test.draft')::bigint; begin
 begin
   perform public.pooling_decision_input('00000000-0000-4000-8000-000000000002','recovery-client-a',draft);
   raise exception 'TEST: cross-coach source access';
 exception when raise_exception then if SQLERRM<>'forbidden' then raise; end if; end;
 source:=public.pooling_decision_input('00000000-0000-4000-8000-000000000001','recovery-client-a',draft);
 result:='{"contextGeneration":1,"manifestId":"gateway-fixture","completeness":"blocked","sessionState":"information_required","blocks":[]}';
 receipt:=public.pooling_record_decision('00000000-0000-4000-8000-000000000001','recovery-client-a',draft,1,'gateway-fixture',source->>'sourceToken',result);
 if receipt is distinct from public.pooling_record_decision('00000000-0000-4000-8000-000000000001','recovery-client-a',draft,1,'gateway-fixture',source->>'sourceToken',result) then raise exception 'TEST: gateway retry differs'; end if;
 begin
   perform public.pooling_record_decision('00000000-0000-4000-8000-000000000001','recovery-client-a',draft,1,'gateway-fixture','obsolete',result);
   raise exception 'TEST: obsolete token accepted';
 exception when raise_exception then if SQLERRM<>'source_changed' then raise; end if; end;
 perform set_config('test.source_token',source->>'sourceToken',true);
end $$;
reset role;
update public.pooling_source_snapshots set session_request='{"changed":true}' where draft_id=current_setting('test.draft')::bigint;
do $$ begin
 begin
 perform public.pooling_assert_decision_current('00000000-0000-4000-8000-000000000001','recovery-client-a',current_setting('test.draft')::bigint,
   (select id from public.pooling_decisions where manifest_id='gateway-fixture'));
 raise exception 'TEST: changed source approved';
 exception when raise_exception then if SQLERRM<>'source_changed' then raise; end if; end;
end $$;
rollback;
