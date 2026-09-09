-- A35: normal client flow, development accounts only. Additive; Classic retained.
begin;
create table public.pooling_development_coaches (
 coach_id uuid primary key references auth.users(id), enabled boolean not null default true,
 authorization_reference text not null, updated_at timestamptz not null default now()
);
create table public.pooling_development_operations (
 actor_id uuid not null references auth.users(id), client_id text not null references public.clients(id),
 kind text not null, operation_key text not null, request jsonb not null, receipt jsonb not null,
 recorded_at timestamptz not null default now(), primary key(actor_id,client_id,kind,operation_key)
);
alter table public.pooling_development_coaches enable row level security;
alter table public.pooling_development_operations enable row level security;
revoke all on public.pooling_development_coaches,public.pooling_development_operations from public,anon,authenticated;
grant all on public.pooling_development_coaches,public.pooling_development_operations to service_role;

create function public.pooling_development_enabled(target_client text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clients c join public.pooling_development_coaches d on d.coach_id=c."coachId"
 where c.id=target_client and d.enabled and not exists(select 1 from public.pooling_test_workspaces w where w.client_id=c.id))
$$;
alter function public.pooling_module_enabled(text,text) rename to pooling_module_enabled_a34;
create function public.pooling_module_enabled(target_client text,module text)
returns boolean language sql volatile security definer set search_path='' as $$
 select module in ('r1','r2','r3') and (public.pooling_development_enabled(target_client) or public.pooling_module_enabled_a34(target_client,module))
$$;
alter function public.pooling_governed_client(text) rename to pooling_governed_client_a34;
create function public.pooling_governed_client(target_client text)
returns boolean language sql stable security definer set search_path='' as $$
 select public.pooling_development_enabled(target_client) or public.pooling_governed_client_a34(target_client)
$$;
alter function public.pooling_manifest_allowed(text,text) rename to pooling_manifest_allowed_a34;
create function public.pooling_manifest_allowed(target_client text,target_manifest text)
returns boolean language sql stable security definer set search_path='' as $$
 select case when (select document->'manifest'->>'audience' from public.pooling_manifests where id=target_manifest)='development'
 then public.pooling_development_enabled(target_client)
 else not public.pooling_development_enabled(target_client) and public.pooling_manifest_allowed_a34(target_client,target_manifest) end
$$;
alter function public.pooling_client_runtime(text) rename to pooling_client_runtime_a34;
create function public.pooling_client_runtime(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; enrolled boolean;
begin
 result:=public.pooling_client_runtime_a34(target_client); -- includes ownership check
 select exists(select 1 from public.clients c join public.pooling_development_coaches d on d.coach_id=c."coachId" where c.id=target_client) into enrolled;
 return result||jsonb_build_object('development',enrolled,'developmentEnabled',public.pooling_development_enabled(target_client));
end $$;
alter function public.pooling_governance_bundle(uuid,text,text,timestamptz) rename to pooling_governance_bundle_a34;
create function public.pooling_governance_bundle(verified_actor uuid,target_client text,target_scope text,session_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.pooling_governance_bundle_a34(verified_actor,target_client,target_scope,session_at);
 if public.pooling_development_enabled(target_client) and target_scope='adult_general_fitness' then
  -- Development purpose only. No client consent, scope grant or clinical sign-off is invented.
  result:=result||jsonb_build_object('purposeAuthority',true,'authorityValidUntil',null,'developmentOnly',true);
 end if;
 return result;
end $$;

create function public.pooling_development_context(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare inventory jsonb; data jsonb; t text; rows jsonb;
begin
 inventory:=public.pooling_source_inventory(auth.uid(),target_client);
 if not public.pooling_development_enabled(target_client) then raise exception 'feature_disabled';end if;
 data:=jsonb_build_object('clients',(select jsonb_agg(to_jsonb(c)) from public.clients c where id=target_client));
 foreach t in array array['assessments','screenings','wellness','wearable','concerns','maxes'] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r where "clientId"=$1',t) into rows using target_client;
  data:=data||jsonb_build_object(t,rows);
 end loop;
 return jsonb_build_object('data',data,'sources',inventory,'generation',coalesce((select generation from public.pooling_contexts where client_id=target_client),1),
  'release',(select document from public.pooling_manifests where id='fitness-scribber-development-v1' and state='published'),'at',clock_timestamp());
end $$;

create function public.pooling_prepare_client(target_client text,expected_generation bigint,operation_key text,proposal jsonb,observations jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); prior public.pooling_development_operations%rowtype; request jsonb; receipt jsonb; generation bigint; item jsonb; idx integer:=0;
begin
 perform public.pooling_source_inventory(actor,target_client); -- owner check and shared client lock
 if not public.pooling_development_enabled(target_client) then raise exception 'feature_disabled';end if;
 if operation_key is null or length(operation_key) not between 8 and 160 or jsonb_typeof(observations) is distinct from 'array' or jsonb_array_length(observations)>150 then raise exception 'invalid_request';end if;
 request:=jsonb_build_object('generation',expected_generation,'proposal',proposal,'observations',observations);
 select * into prior from public.pooling_development_operations o where o.actor_id=actor and o.client_id=target_client and o.kind='preparation' and o.operation_key=pooling_prepare_client.operation_key;
 if found then if prior.request<>request then raise exception 'idempotency_conflict';end if;return prior.receipt;end if;
 if proposal->>'manifestId' is distinct from 'fitness-scribber-development-v1' or not public.pooling_manifest_allowed(target_client,proposal->>'manifestId') then raise exception 'unsupported_policy';end if;
 insert into public.pooling_contexts(client_id) values(target_client) on conflict do nothing;
 select c.generation into generation from public.pooling_contexts c where client_id=target_client for update;
 if generation is distinct from expected_generation then raise exception 'stale_context';end if;
 for item in select value from jsonb_array_elements(observations) loop
  idx:=idx+1;
  receipt:=public.pooling_confirm_source(target_client,generation,operation_key||':source:'||idx,item);
  generation:=(receipt->>'generation')::bigint;
 end loop;
 receipt:=public.pooling_save_draft(target_client,generation,operation_key||':draft',proposal,null)||jsonb_build_object('generation',generation,'status','committed');
 insert into public.pooling_development_operations values(actor,target_client,'preparation',operation_key,request,receipt,now());
 return receipt;
end $$;

create function public.pooling_set_development(target_client text,enabled boolean,operation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); prior public.pooling_development_operations%rowtype; receipt jsonb;
begin
 perform public.pooling_source_inventory(actor,target_client);
 if enabled is null or operation_key is null or length(operation_key) not between 8 and 160 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_development_operations o where o.actor_id=actor and o.client_id=target_client and o.kind='development_mode' and o.operation_key=pooling_set_development.operation_key;
 if found then if prior.request<>jsonb_build_object('enabled',enabled) then raise exception 'idempotency_conflict';end if;return prior.receipt;end if;
 update public.pooling_development_coaches d set enabled=pooling_set_development.enabled,updated_at=now() where coach_id=actor;
 if not found then raise exception 'forbidden';end if;
 receipt:=jsonb_build_object('status','committed','enabled',enabled);
 insert into public.pooling_development_operations values(actor,target_client,'development_mode',operation_key,jsonb_build_object('enabled',enabled),receipt,now());
 return receipt;
end $$;

-- Do not replace the source token pinned by an assignment, including via direct Edge calls.
create function public.pooling_guard_assigned_snapshot()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.clients where id=coalesce(new.client_id,old.client_id) for update;
 if exists(select 1 from public.pooling_assignments where draft_id=coalesce(new.draft_id,old.draft_id)) then raise exception 'assigned_snapshot_immutable';end if;
 if TG_OP='DELETE' then return old;end if;return new;
end $$;
create trigger pooling_assigned_snapshot before insert or update or delete on public.pooling_source_snapshots for each row execute function public.pooling_guard_assigned_snapshot();

alter function public.pooling_operation_status(text,text,text) rename to pooling_operation_status_a34;
create function public.pooling_operation_status(target_client text,operation_kind text,operation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt jsonb;
begin
 if operation_kind not in ('preparation','development_mode') then return public.pooling_operation_status_a34(target_client,operation_kind,operation_key);end if;
 perform public.pooling_source_inventory(auth.uid(),target_client);
 select o.receipt into receipt from public.pooling_development_operations o where o.actor_id=auth.uid() and o.client_id=target_client and o.kind=operation_kind and o.operation_key=pooling_operation_status.operation_key;
 return coalesce(receipt,'{"status":"not_found"}'::jsonb);
end $$;

revoke all on function public.pooling_development_enabled(text),public.pooling_module_enabled(text,text),public.pooling_governed_client(text),public.pooling_manifest_allowed(text,text),public.pooling_client_runtime(text),public.pooling_governance_bundle(uuid,text,text,timestamptz),public.pooling_development_context(text),public.pooling_prepare_client(text,bigint,text,jsonb,jsonb),public.pooling_set_development(text,boolean,text),public.pooling_guard_assigned_snapshot(),public.pooling_operation_status(text,text,text) from public,anon,authenticated;
grant execute on function public.pooling_development_enabled(text),public.pooling_module_enabled(text,text),public.pooling_governed_client(text),public.pooling_manifest_allowed(text,text) to authenticated,service_role;
grant execute on function public.pooling_governance_bundle(uuid,text,text,timestamptz) to service_role;
grant execute on function public.pooling_client_runtime(text),public.pooling_development_context(text),public.pooling_prepare_client(text,bigint,text,jsonb,jsonb),public.pooling_set_development(text,boolean,text),public.pooling_operation_status(text,text,text) to authenticated;

-- Policy expressions reference function OIDs; rebind them after the rename.
do $$ declare p record; expression text; check_expression text;
begin
 for p in select * from pg_policies where schemaname='public' and (coalesce(qual,'') like '%pooling_governed_client_a34%' or coalesce(with_check,'') like '%pooling_governed_client_a34%') loop
  expression:=replace(p.qual,'pooling_governed_client_a34','pooling_governed_client');
  check_expression:=replace(p.with_check,'pooling_governed_client_a34','pooling_governed_client');
  execute format('alter policy %I on public.%I%s%s',p.policyname,p.tablename,case when expression is null then '' else ' using ('||expression||')' end,case when check_expression is null then '' else ' with check ('||check_expression||')' end);
 end loop;
end $$;

alter function public.pooling_read_assignments(text) rename to pooling_read_assignments_a34;
create function public.pooling_read_assignments(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb; item jsonb; result jsonb:='[]'; doc jsonb; session jsonb; blocks jsonb;
begin
 items:=public.pooling_read_assignments_a34(target_client); -- own coach / linked client check
 for item in select value from jsonb_array_elements(items) loop
  select m.document,d.proposal->'session' into doc,session from public.pooling_drafts d join public.pooling_manifests m on m.id=d.proposal->>'manifestId' where d.id=(item->>'draftId')::bigint;
  select coalesce(jsonb_agg(b||jsonb_build_object('exerciseName',coalesce((select e->>'name' from jsonb_array_elements(doc->'catalogue') e where e->>'id'=b->>'exerciseId'),b->>'exerciseId'))),'[]') into blocks from jsonb_array_elements(item->'blocks') b;
  result:=result||jsonb_build_array(item||jsonb_build_object('clientId',target_client,'sessionAt',session->>'sessionAt','timeZone',session->>'timeZone','blocks',blocks));
 end loop;
 return result;
end $$;
create function public.pooling_coach_sessions()
returns jsonb language plpgsql security definer set search_path='' as $$
declare c record; result jsonb:='[]';
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='coach') then raise exception 'forbidden';end if;
 for c in select id from public.clients where "coachId"=auth.uid() and exists(select 1 from public.pooling_assignments where client_id=clients.id) loop
  result:=result||public.pooling_read_assignments(c.id);
 end loop;
 return result;
end $$;
revoke all on function public.pooling_read_assignments(text),public.pooling_coach_sessions() from public,anon;
grant execute on function public.pooling_read_assignments(text),public.pooling_coach_sessions() to authenticated;
notify pgrst,'reload schema';
commit;
