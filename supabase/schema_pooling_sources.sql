-- Additive source confirmation and invalidation. Local validation before release.
-- Apply after decision gateway and existing assessment/screening/workout schemas.
begin;
create table if not exists public.pooling_confirmations (
 id bigint generated always as identity primary key,
 client_id text not null references public.clients(id),
 actor_id uuid not null references auth.users(id),
 observation jsonb not null,
 confirmed_at timestamptz not null default now(),
 generation bigint not null,
 operation_key text not null,
 unique(actor_id,client_id,operation_key)
);
alter table public.pooling_confirmations enable row level security;
revoke all on public.pooling_confirmations from public,anon,authenticated;
grant select on public.pooling_confirmations to authenticated;
drop policy if exists confirmation_coach_read on public.pooling_confirmations;
create policy confirmation_coach_read on public.pooling_confirmations for select to authenticated using
 (exists(select 1 from public.clients c where c.id=client_id and c."coachId"=auth.uid()));

create or replace function public.pooling_source_inventory(verified_actor uuid,target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; table_name text; rows jsonb; result jsonb:='[]';
begin
 select * into c from public.clients where id=target_client for update;
 if not found or c."coachId" is distinct from verified_actor or verified_actor is null then raise exception 'forbidden'; end if;
 foreach table_name in array array['clients','assessments','screenings','wellness','wearable','concerns','maxes','workouts','pooling_reports'] loop
   if to_regclass('public.'||table_name) is null then
     result:=result||jsonb_build_array(jsonb_build_object('source',table_name,'status','unavailable','id',''));
   else
     execute format('select coalesce(jsonb_agg(jsonb_build_object(''source'',%L,''status'',''loaded'',''id'',t.id::text,''token'',encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex''))),''[]''::jsonb) from public.%I t where %I=$1',
       table_name,table_name,case when table_name='clients' then 'id' when table_name='pooling_reports' then 'client_id' else 'clientId' end) into rows using target_client;
     result:=result||rows||jsonb_build_array(jsonb_build_object('source',table_name,'status','loaded','id',''));
   end if;
 end loop;
 return result;
end $$;

create or replace function public.pooling_confirm_source(target_client text,expected_generation bigint,operation_key text,observation jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); inventory jsonb; ctx public.pooling_contexts%rowtype; prior public.pooling_confirmations%rowtype; receipt_id bigint;
begin
 if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
 inventory:=public.pooling_source_inventory(actor,target_client);
 if operation_key is null or length(operation_key) not between 8 and 200 then raise exception 'invalid_operation_key'; end if;
 if observation is null or jsonb_typeof(observation)<>'object' or octet_length(observation::text)>16384 then raise exception 'invalid_confirmation'; end if;
 if exists(select 1 from jsonb_object_keys(observation) k where k not in ('key','source','sourceId','sourceToken','state','value','unit','protocol','side','effectiveAt','evidenceReference','supersedes','sessionAt')) then raise exception 'protected_field'; end if;
 if exists(select 1 from unnest(array['key','source','sourceId','sourceToken','unit','protocol','evidenceReference']) k
   where jsonb_typeof(observation->k) is distinct from 'string' or length(trim(observation->>k)) not between 1 and 1000) then raise exception 'invalid_confirmation'; end if;
 if observation->>'state' is null or observation->>'state' not in ('observed_present','assessed_absent','measured','reported','unknown','not_assessed','not_applicable')
   or observation->>'side' is null or observation->>'side' not in ('left','right','bilateral','midline','not_applicable') or not observation ? 'value'
   or observation->>'effectiveAt' is null or (observation->>'effectiveAt')::timestamptz>clock_timestamp() then raise exception 'invalid_confirmation'; end if;
 if observation->>'state' in ('unknown','not_assessed','not_applicable') and observation->'value'<>'null'::jsonb then raise exception 'invalid_confirmation'; end if;
 if observation->>'state'='observed_present' and observation->'value' is distinct from 'true'::jsonb then raise exception 'invalid_confirmation'; end if;
 if observation->>'state'='assessed_absent' and observation->'value' is distinct from 'false'::jsonb then raise exception 'invalid_confirmation'; end if;
 if observation->>'state' in ('measured','reported') and observation->'value'='null'::jsonb then raise exception 'invalid_confirmation'; end if;
 select * into prior from public.pooling_confirmations p where p.actor_id=actor and p.client_id=target_client and p.operation_key=pooling_confirm_source.operation_key;
 if found then
   if prior.observation<>pooling_confirm_source.observation then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('id',prior.id,'generation',prior.generation,'status','committed');
 end if;
 if not exists(select 1 from jsonb_array_elements(inventory) s where s->>'source'=observation->>'source' and s->>'id'=observation->>'sourceId' and s->>'token'=observation->>'sourceToken' and s->>'status'='loaded') then raise exception 'source_changed'; end if;
 if observation->>'supersedes' is not null and not exists(select 1 from public.pooling_confirmations p where p.id::text=pooling_confirm_source.observation->>'supersedes' and p.client_id=target_client and p.observation->>'key'=pooling_confirm_source.observation->>'key' and p.observation->>'source'=pooling_confirm_source.observation->>'source' and p.observation->>'side'=pooling_confirm_source.observation->>'side') then raise exception 'invalid_parent'; end if;
 insert into public.pooling_contexts(client_id) values(target_client) on conflict do nothing;
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 if ctx.generation is distinct from expected_generation then raise exception 'stale_context'; end if;
 update public.pooling_contexts set generation=generation+1,updated_at=now() where client_id=target_client returning * into ctx;
 insert into public.pooling_confirmations(client_id,actor_id,observation,generation,operation_key)
 values(target_client,actor,pooling_confirm_source.observation,ctx.generation,pooling_confirm_source.operation_key) returning id into receipt_id;
 return jsonb_build_object('id',receipt_id,'generation',ctx.generation,'status','committed');
end $$;

create or replace function public.pooling_source_bundle(verified_actor uuid,target_client text,target_draft bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare inventory jsonb; d public.pooling_drafts%rowtype; m public.pooling_manifests%rowtype; ctx public.pooling_contexts%rowtype; result jsonb; governance jsonb;
begin
 if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
 inventory:=public.pooling_source_inventory(verified_actor,target_client);
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 select * into d from public.pooling_drafts where id=target_draft and client_id=target_client;
 if not found or ctx.generation is null or d.context_generation<>ctx.generation then raise exception 'stale_context'; end if;
 select * into m from public.pooling_manifests where id=d.proposal->>'manifestId' for share;
 if not found or m.state<>'published' then raise exception 'content_revoked'; end if;
 governance:=public.pooling_governance_bundle(verified_actor,target_client,m.document->'modulePolicy'->>'scope',(d.proposal->'session'->>'sessionAt')::timestamptz);
 result:=jsonb_build_object('clientId',target_client,'generation',ctx.generation,'held',ctx.held,'draftId',d.id,'sources',inventory,
   'confirmations',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'clientId',p.client_id,'observation',p.observation,'confirmedBy',p.actor_id,'confirmedAt',p.confirmed_at,'recordedAt',p.confirmed_at) order by p.id),'[]') from public.pooling_confirmations p where p.client_id=target_client),
   'restrictions',governance->'restrictions','purposeAuthority',governance->'purposeAuthority','authorityValidUntil',governance->'authorityValidUntil','session',d.proposal->'session','modulePolicy',m.document->'modulePolicy',
   'manifest',(m.document->'manifest')||jsonb_build_object('id',m.id,'state',m.state));
 -- Governance ledger is server-owned; neither client input nor a source
 -- confirmation can manufacture consent, scope grants or a restriction resolution.
 return result||jsonb_build_object('sourceBundleToken',encode(sha256(convert_to(result::text,'UTF8')),'hex'),'cutoff',clock_timestamp());
end $$;

create or replace function public.pooling_store_source_snapshot(verified_actor uuid,target_client text,target_draft bigint,expected_bundle_token text,context_input jsonb,session_request jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare bundle jsonb; session_time timestamptz; expiry timestamptz; ttl numeric;
begin
 bundle:=public.pooling_source_bundle(verified_actor,target_client,target_draft);
 if bundle->>'sourceBundleToken' is distinct from expected_bundle_token then raise exception 'source_changed'; end if;
 if context_input->>'clientId' is distinct from target_client or context_input->>'generation' is distinct from bundle->>'generation'
   or context_input->>'sessionAt' is distinct from bundle->'session'->>'sessionAt'
   or context_input->>'timeZone' is distinct from bundle->'session'->>'timeZone'
   or context_input->'requirements' is distinct from bundle->'modulePolicy'->'requirements' then raise exception 'invalid_snapshot'; end if;
 session_time:=(context_input->>'sessionAt')::timestamptz;
 ttl:=(bundle->'modulePolicy'->>'decisionValiditySeconds')::numeric;
 if ttl is null or ttl<=0 or ttl>86400 then raise exception 'unsupported_policy'; end if;
 expiry:=least(clock_timestamp(),session_time)+make_interval(secs=>ttl::double precision);
 if context_input->>'relianceExpiresAt' is not null then expiry:=least(expiry,(context_input->>'relianceExpiresAt')::timestamptz); end if;
 if expiry<=clock_timestamp() then raise exception 'session_expired'; end if;
 insert into public.pooling_source_snapshots(draft_id,client_id,generation,manifest_id,context_input,session_request,verified,valid_until)
 values(target_draft,target_client,(bundle->>'generation')::bigint,bundle->'manifest'->>'id',pooling_store_source_snapshot.context_input,pooling_store_source_snapshot.session_request,true,expiry)
 on conflict(draft_id) do update set generation=excluded.generation,manifest_id=excluded.manifest_id,context_input=excluded.context_input,session_request=excluded.session_request,verified=true,valid_until=excluded.valid_until;
end $$;

-- Every material source edit shares the same client lock as approve/start.
create or replace function public.pooling_invalidate_source() returns trigger language plpgsql security definer set search_path='' as $$
declare cid text; old_cid text;
begin
 if TG_OP='UPDATE' and to_jsonb(old)=to_jsonb(new) then return new; end if;
 if TG_TABLE_NAME='clients' then cid:=case when TG_OP='DELETE' then old.id else new.id end;
 else
   cid:=case when TG_OP='DELETE' then to_jsonb(old)->>'clientId' else to_jsonb(new)->>'clientId' end;
   if TG_OP='UPDATE' then old_cid:=to_jsonb(old)->>'clientId'; end if;
 end if;
 if old_cid is not null and old_cid is distinct from cid then raise exception 'client_reparent_forbidden'; end if;
 perform 1 from public.clients where id=cid for update;
 insert into public.pooling_contexts(client_id) select id from public.clients where id=cid on conflict do nothing;
 update public.pooling_contexts set generation=generation+1,held=held or TG_TABLE_NAME in ('clients','screenings','assessments','concerns'),updated_at=now() where client_id=cid;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text; begin
 foreach t in array array['clients','assessments','screenings','wellness','wearable','concerns','maxes','workouts'] loop
   if to_regclass('public.'||t) is not null then
     execute format('drop trigger if exists pooling_source_changed on public.%I',t);
     execute format('create trigger pooling_source_changed %s on public.%I for each row execute function public.pooling_invalidate_source()',case when t='clients' then 'after update' else 'before insert or update or delete' end,t);
   end if;
 end loop;
end $$;
revoke all on function public.pooling_source_inventory(uuid,text), public.pooling_source_bundle(uuid,text,bigint), public.pooling_store_source_snapshot(uuid,text,bigint,text,jsonb,jsonb), public.pooling_invalidate_source() from public,anon,authenticated;
grant execute on function public.pooling_source_inventory(uuid,text), public.pooling_source_bundle(uuid,text,bigint), public.pooling_store_source_snapshot(uuid,text,bigint,text,jsonb,jsonb) to service_role;
revoke all on function public.pooling_confirm_source(text,bigint,text,jsonb) from public,anon;
grant execute on function public.pooling_confirm_source(text,bigint,text,jsonb) to authenticated;
create or replace function public.pooling_read_source_review(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return jsonb_build_object('sources',public.pooling_source_inventory(auth.uid(),target_client),
   'confirmations',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]') from public.pooling_confirmations p where p.client_id=target_client));
end $$;
revoke all on function public.pooling_read_source_review(text) from public,anon;
grant execute on function public.pooling_read_source_review(text) to authenticated;
commit;
