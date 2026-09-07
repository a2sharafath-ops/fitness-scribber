-- UNVERIFIED LOCAL DRAFT: requires real PostgreSQL permission/concurrency tests.
-- Apply after schema_pooling_authority.sql, never to hosted data without approval.
-- Native SHA256 reference: https://www.postgresql.org/docs/current/functions-binarystring.html
begin;
alter table public.pooling_decisions add column if not exists source_token text;
create unique index if not exists pooling_decision_source_unique on public.pooling_decisions(draft_id,context_generation,manifest_id,source_token) where source_token is not null;
create table if not exists public.pooling_source_snapshots (
 draft_id bigint primary key references public.pooling_drafts(id),
 client_id text not null references public.clients(id),
 generation bigint not null,
 manifest_id text not null references public.pooling_manifests(id),
 context_input jsonb not null,
 session_request jsonb not null,
 verified boolean not null default false,
 valid_until timestamptz not null
);
alter table public.pooling_source_snapshots enable row level security;
revoke all on public.pooling_source_snapshots from public,anon,authenticated;

create or replace function public.pooling_decision_input(verified_actor uuid,target_client text,target_draft bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; ctx public.pooling_contexts%rowtype; d public.pooling_drafts%rowtype;
 s public.pooling_source_snapshots%rowtype; m public.pooling_manifests%rowtype; token text;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or verified_actor is null or c."coachId" is distinct from verified_actor then raise exception 'forbidden'; end if;
 if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 if not found then raise exception 'source_unavailable'; end if;
 select * into d from public.pooling_drafts where id=target_draft and client_id=target_client;
 if not found or d.context_generation<>ctx.generation then raise exception 'stale_context'; end if;
 if exists(select 1 from public.pooling_drafts child where child.parent_id=d.id) then raise exception 'stale_draft';end if;
 select * into s from public.pooling_source_snapshots where draft_id=target_draft and client_id=target_client for share;
 if not found or not s.verified or s.generation<>ctx.generation or s.valid_until<=clock_timestamp() then raise exception 'source_unavailable'; end if;
 select * into m from public.pooling_manifests where id=s.manifest_id for share;
 if not found or m.state<>'published' then raise exception 'content_revoked'; end if;
 if d.proposal->>'date' is distinct from to_char((s.context_input->>'sessionAt')::timestamptz at time zone (s.context_input->>'timeZone'),'YYYY-MM-DD') then raise exception 'session_mismatch'; end if;
 token:=encode(sha256(convert_to(jsonb_build_object('draft',d.proposal,'generation',ctx.generation,'held',ctx.held,'source',to_jsonb(s),'manifest',m.document)::text,'UTF8')),'hex');
 return jsonb_build_object('clientId',target_client,'generation',ctx.generation,'held',ctx.held,'sourceToken',token,
  'draft',jsonb_build_object('id',d.id,'clientId',d.client_id,'contextGeneration',d.context_generation,'selection',d.proposal->'selection'),
  'contextInput',s.context_input,'sessionRequest',s.session_request,'modulePolicy',m.document->'modulePolicy',
  'catalogue',m.document->'catalogue','doses',m.document->'doses',
  'manifest',(m.document->'manifest') || jsonb_build_object('id',m.id,'state',m.state));
end $$;

create or replace function public.pooling_record_decision(verified_actor uuid,target_client text,target_draft bigint,
 expected_generation bigint,expected_manifest text,expected_source_token text,decision_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; source public.pooling_source_snapshots%rowtype; decision_id bigint;
begin
 -- Re-enters the same locks and ownership checks used by source edits/approval.
 snapshot:=public.pooling_decision_input(verified_actor,target_client,target_draft);
 if (snapshot->>'generation')::bigint is distinct from expected_generation then raise exception 'stale_context'; end if;
 if snapshot->>'sourceToken' is distinct from expected_source_token or snapshot->'manifest'->>'id' is distinct from expected_manifest then raise exception 'source_changed'; end if;
 if decision_result is null or jsonb_typeof(decision_result)<>'object' or decision_result->>'contextGeneration' is distinct from expected_generation::text or decision_result->>'manifestId' is distinct from expected_manifest then raise exception 'invalid_decision'; end if;
 select * into source from public.pooling_source_snapshots where draft_id=target_draft;
 insert into public.pooling_decisions(draft_id,context_generation,manifest_id,result,valid_until,source_token)
 values(target_draft,expected_generation,expected_manifest,decision_result,source.valid_until,expected_source_token)
 on conflict(draft_id,context_generation,manifest_id,source_token) where source_token is not null do nothing returning id into decision_id;
 if decision_id is null then
   select id into decision_id from public.pooling_decisions where draft_id=target_draft and context_generation=expected_generation and manifest_id=expected_manifest and source_token=expected_source_token and result=decision_result;
   if decision_id is null then raise exception 'source_changed'; end if;
 end if;
 return jsonb_build_object('decisionId',decision_id,'status','committed');
end $$;
revoke all on function public.pooling_decision_input(uuid,text,bigint) from public,anon,authenticated;
revoke all on function public.pooling_record_decision(uuid,text,bigint,bigint,text,text,jsonb) from public,anon,authenticated;
-- Supabase service_role is a server credential only. Test harness must create an
-- isolated equivalents of anon/authenticated/service_role before this migration;
-- do not grant browser actors the service role. Explicit anon revocation is
-- necessary even when platform default privileges grant it direct EXECUTE.
grant execute on function public.pooling_decision_input(uuid,text,bigint) to service_role;
grant execute on function public.pooling_record_decision(uuid,text,bigint,bigint,text,text,jsonb) to service_role;
create or replace function public.pooling_assert_decision_current(verified_actor uuid,target_client text,target_draft bigint,target_decision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; d public.pooling_decisions%rowtype;
begin
 snapshot:=public.pooling_decision_input(verified_actor,target_client,target_draft);
 select * into d from public.pooling_decisions where id=target_decision and draft_id=target_draft;
 if not found or d.source_token is null or d.source_token is distinct from snapshot->>'sourceToken' then raise exception 'source_changed'; end if;
end $$;
revoke all on function public.pooling_assert_decision_current(uuid,text,bigint,bigint) from public,anon,authenticated;
commit;
