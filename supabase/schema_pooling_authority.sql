-- Additive server authority. Apply after schema_pooling.sql, local testing first.
-- WORK IN PROGRESS: trusted decision generation and full field/transition validation
-- are not integrated. Interrupted authority tests are unverified. Do not deploy.
begin;
create table if not exists public.pooling_manifests (
  id text primary key,
  state text not null check(state in ('draft','published','revoked')),
  document jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.pooling_decisions (
  id bigint generated always as identity primary key,
  draft_id bigint not null references public.pooling_drafts(id),
  context_generation bigint not null,
  manifest_id text not null references public.pooling_manifests(id),
  result jsonb not null,
  valid_until timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.pooling_assignments (
  id bigint generated always as identity primary key,
  client_id text not null references public.clients(id),
  draft_id bigint not null references public.pooling_drafts(id),
  decision_id bigint not null references public.pooling_decisions(id),
  coach_id uuid not null references auth.users(id),
  context_generation bigint not null,
  operation_key text not null,
  approved_at timestamptz not null default now(),
  unique(coach_id, client_id, operation_key),
  unique(draft_id)
);
create table if not exists public.pooling_execution_events (
  id bigint generated always as identity primary key,
  assignment_id bigint not null references public.pooling_assignments(id),
  actor_id uuid not null references auth.users(id),
  kind text not null check(kind in ('start','pause','resume','stop','complete','actual')),
  payload jsonb not null default '{}'::jsonb,
  operation_key text not null,
  recorded_at timestamptz not null default now(),
  unique(actor_id, assignment_id, operation_key)
);
do $$ declare t text; begin
  foreach t in array array['pooling_manifests','pooling_decisions','pooling_assignments','pooling_execution_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
end $$;
-- Decisions and raw manifests are coach-only. Clients get a narrow RPC projection.
grant select on public.pooling_assignments, public.pooling_execution_events to authenticated;
drop policy if exists assignment_read on public.pooling_assignments;
create policy assignment_read on public.pooling_assignments for select to authenticated using (
 exists(select 1 from public.clients c where c.id=client_id and (c."coachId"=auth.uid() or c."userId"=auth.uid()))
);
drop policy if exists execution_read on public.pooling_execution_events;
create policy execution_read on public.pooling_execution_events for select to authenticated using (
 exists(select 1 from public.pooling_assignments a join public.clients c on c.id=a.client_id where a.id=assignment_id and (c."coachId"=auth.uid() or c."userId"=auth.uid()))
);

create or replace function public.pooling_approve(
 target_client text, draft_id bigint, decision_id bigint, expected_generation bigint, operation_key text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; ctx public.pooling_contexts%rowtype; d public.pooling_drafts%rowtype;
 v public.pooling_decisions%rowtype; m public.pooling_manifests%rowtype; a public.pooling_assignments%rowtype; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'forbidden'; end if;
 select * into c from public.clients where id=target_client for update;
 if not found or c."coachId" is distinct from actor then raise exception 'forbidden'; end if;
 if operation_key is null or length(operation_key) not between 8 and 200 then raise exception 'invalid_operation_key'; end if;
 select * into a from public.pooling_assignments x where x.coach_id=actor and x.client_id=target_client and x.operation_key=pooling_approve.operation_key;
 if found then
   if a.draft_id is distinct from pooling_approve.draft_id or a.decision_id is distinct from pooling_approve.decision_id or a.context_generation is distinct from expected_generation then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('assignmentId',a.id,'draftId',a.draft_id,'approvedAt',a.approved_at,'status','committed');
 end if;
 select * into a from public.pooling_assignments x where x.coach_id=actor and x.client_id=target_client and x.draft_id=pooling_approve.draft_id;
 if found then
   if a.decision_id is distinct from pooling_approve.decision_id or a.context_generation is distinct from expected_generation then raise exception 'draft_conflict';end if;
   return jsonb_build_object('assignmentId',a.id,'draftId',a.draft_id,'approvedAt',a.approved_at,'status','committed');
 end if;
 if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 if not found or ctx.generation is distinct from expected_generation then raise exception 'stale_context'; end if;
 if ctx.held then raise exception 'context_held'; end if;
 select * into d from public.pooling_drafts x where x.id=pooling_approve.draft_id and x.client_id=target_client;
 if not found or d.context_generation<>ctx.generation then raise exception 'stale_draft'; end if;
 if exists(select 1 from public.pooling_drafts x where x.parent_id=d.id) then raise exception 'stale_draft'; end if;
 select * into v from public.pooling_decisions x where x.id=pooling_approve.decision_id and x.draft_id=d.id;
 if not found or v.context_generation<>ctx.generation or v.valid_until<=clock_timestamp() then raise exception 'decision_unavailable'; end if;
 select * into m from public.pooling_manifests where id=v.manifest_id for share;
 if not found or m.state<>'published' then raise exception 'content_revoked'; end if;
 -- Added by decision-gateway migration. Fail closed if the gateway is absent.
 perform public.pooling_assert_decision_current(c."coachId",target_client,d.id,v.id);
 if v.result->>'completeness' is distinct from 'ready_for_coach_review' or v.result->>'sessionState' is distinct from 'eligible_for_coach_review' or jsonb_typeof(v.result->'blocks') is distinct from 'array' then raise exception 'required_gap'; end if;
 if jsonb_array_length(v.result->'blocks')<1 then raise exception 'required_gap'; end if;
 insert into public.pooling_assignments(client_id,draft_id,decision_id,coach_id,context_generation,operation_key)
 values(target_client,d.id,v.id,actor,ctx.generation,pooling_approve.operation_key) returning * into a;
 return jsonb_build_object('assignmentId',a.id,'draftId',a.draft_id,'approvedAt',a.approved_at,'status','committed');
end $$;

create or replace function public.pooling_execution(
 assignment_id bigint, expected_generation bigint, operation_key text, event_kind text, event_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pooling_assignments%rowtype; c public.clients%rowtype; ctx public.pooling_contexts%rowtype;
 v public.pooling_decisions%rowtype; m public.pooling_manifests%rowtype; prior public.pooling_execution_events%rowtype;
 last_kind text; event_id bigint; actor uuid:=auth.uid(); session_source record; target_block jsonb;
begin
 if actor is null then raise exception 'forbidden'; end if;
 select * into a from public.pooling_assignments x where x.id=pooling_execution.assignment_id;
 if not found then raise exception 'forbidden'; end if;
 select * into c from public.clients where id=a.client_id for update;
 if c."coachId" is distinct from actor and c."userId" is distinct from actor then raise exception 'forbidden'; end if;
 if operation_key is null or length(operation_key) not between 8 and 200 then raise exception 'invalid_operation_key'; end if;
 if event_kind is null or event_kind not in ('start','pause','resume','stop','complete','actual') or event_payload is null or jsonb_typeof(event_payload)<>'object' then raise exception 'invalid_event'; end if;
 if octet_length(event_payload::text)>65536 then raise exception 'protected_field'; end if;
 if event_kind in ('start','resume') then
   if exists(select 1 from jsonb_object_keys(event_payload) k where k<>'healthChange') then raise exception 'protected_field'; end if;
 elsif event_kind='actual' then
   if exists(select 1 from jsonb_object_keys(event_payload) k where k not in ('occurrenceId','setIndex','actual','unit','side','loadKg','effort','effortMethod','supersedes','correctionReason','performedAt')) then raise exception 'protected_field'; end if;
   if jsonb_typeof(event_payload->'occurrenceId') is distinct from 'string' or jsonb_typeof(event_payload->'setIndex') is distinct from 'number'
     or (event_payload->>'setIndex')::numeric<>trunc((event_payload->>'setIndex')::numeric) or (event_payload->>'setIndex')::numeric<1
     or jsonb_typeof(event_payload->'actual') is distinct from 'number' or (event_payload->>'actual')::numeric<0
     or event_payload->>'unit' not in ('repetitions','seconds') or event_payload->>'unit' is null then raise exception 'invalid_actual'; end if;
   if event_payload ? 'loadKg' and (jsonb_typeof(event_payload->'loadKg') is distinct from 'number' or (event_payload->>'loadKg')::numeric<0) then raise exception 'invalid_actual'; end if;
   if event_payload ?| array['effort','effortMethod'] and (jsonb_typeof(event_payload->'effort') is distinct from 'number' or jsonb_typeof(event_payload->'effortMethod') is distinct from 'string' or length(trim(event_payload->>'effortMethod')) not between 1 and 100) then raise exception 'invalid_actual'; end if;
   if event_payload ? 'performedAt' and (jsonb_typeof(event_payload->'performedAt') is distinct from 'string' or (event_payload->>'performedAt')::timestamptz>clock_timestamp() or not isfinite((event_payload->>'performedAt')::timestamptz)) then raise exception 'invalid_actual'; end if;
 else
   if event_payload<>'{}'::jsonb then raise exception 'protected_field'; end if;
 end if;
 select * into prior from public.pooling_execution_events x where x.actor_id=actor and x.assignment_id=a.id and x.operation_key=pooling_execution.operation_key;
 if found then
   if prior.kind<>event_kind or prior.payload<>event_payload then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('eventId',prior.id,'status','committed');
 end if;
 select kind into last_kind from public.pooling_execution_events x where x.assignment_id=a.id and x.kind<>'actual' order by id desc limit 1;
 if event_kind in ('start','resume') then
   if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
   if (event_kind='start' and last_kind is not null) or (event_kind='resume' and last_kind is distinct from 'pause') then raise exception 'invalid_transition'; end if;
   select * into ctx from public.pooling_contexts where client_id=a.client_id for update;
   if ctx.generation is distinct from expected_generation or a.context_generation is distinct from ctx.generation then raise exception 'stale_context'; end if;
   if ctx.held then raise exception 'context_held'; end if;
   if event_payload->>'healthChange' is distinct from 'no_change' then raise exception 'health_check_required'; end if;
   select * into v from public.pooling_decisions where id=a.decision_id;
   select * into m from public.pooling_manifests where id=v.manifest_id for share;
   if m.state is distinct from 'published' or v.valid_until<=clock_timestamp() then raise exception 'content_revoked'; end if;
   perform public.pooling_assert_decision_current(c."coachId",a.client_id,a.draft_id,a.decision_id);
   select * into session_source from public.pooling_source_snapshots where draft_id=a.draft_id;
   if to_char(clock_timestamp() at time zone (session_source.context_input->>'timeZone'),'YYYY-MM-DD') is distinct from to_char((session_source.context_input->>'sessionAt')::timestamptz at time zone (session_source.context_input->>'timeZone'),'YYYY-MM-DD') then raise exception 'session_mismatch'; end if;
 elsif event_kind in ('pause','complete','actual') and (last_kind is null or last_kind not in ('start','resume','pause')) and not (event_kind='actual' and last_kind in ('stop','complete') and event_payload ? 'performedAt') then
   raise exception 'invalid_transition';
 end if;
 if event_kind='stop' and (last_kind is null or last_kind not in ('start','resume','pause')) then raise exception 'invalid_transition'; end if;
 if event_kind='actual' then
   select * into v from public.pooling_decisions where id=a.decision_id;
   select b into target_block from jsonb_array_elements(v.result->'blocks') b where b->>'occurrenceId'=event_payload->>'occurrenceId';
   if target_block is null or (event_payload->>'setIndex')::numeric > (target_block->'dose'->'prescription'->>'sets')::numeric
      or event_payload->>'unit' is distinct from (case when target_block->'dose'->'prescription'->>'mode'='repetitions' then 'repetitions' else 'seconds' end)
      or (event_payload->>'unit'='repetitions' and (event_payload->>'actual')::numeric<>trunc((event_payload->>'actual')::numeric)) then raise exception 'invalid_actual'; end if;
   if (target_block->'dose'->'prescription'->>'sideMultiplier')::int=2 then
     if event_payload->>'side' is null or event_payload->>'side' not in ('left','right') then raise exception 'invalid_actual'; end if;
   elsif coalesce(event_payload->>'side','not_applicable')<>'not_applicable' then raise exception 'invalid_actual'; end if;
   if event_payload ? 'performedAt' and ((event_payload->>'performedAt')::timestamptz < (select min(recorded_at) from public.pooling_execution_events e where e.assignment_id=a.id and e.kind='start')
     or (last_kind in ('stop','complete') and (event_payload->>'performedAt')::timestamptz > (select max(recorded_at) from public.pooling_execution_events e where e.assignment_id=a.id and e.kind in ('stop','complete')))) then raise exception 'invalid_actual'; end if;
   if event_payload ? 'supersedes' then
     if jsonb_typeof(event_payload->'supersedes') is distinct from 'number' or (event_payload->>'supersedes')::numeric<1 or (event_payload->>'supersedes')::numeric<>trunc((event_payload->>'supersedes')::numeric)
       or jsonb_typeof(event_payload->'correctionReason') is distinct from 'string' or length(trim(event_payload->>'correctionReason')) not between 1 and 1000 then raise exception 'invalid_actual'; end if;
     if not exists(select 1 from public.pooling_execution_events e where e.id=(event_payload->>'supersedes')::bigint and e.assignment_id=a.id and e.kind='actual'
        and e.payload->>'occurrenceId'=event_payload->>'occurrenceId' and e.payload->>'setIndex'=event_payload->>'setIndex' and coalesce(e.payload->>'side','not_applicable')=coalesce(event_payload->>'side','not_applicable'))
        or exists(select 1 from public.pooling_execution_events e where e.assignment_id=a.id and e.payload->>'supersedes'=event_payload->>'supersedes') then raise exception 'invalid_actual'; end if;
   elsif exists(select 1 from public.pooling_execution_events e where e.assignment_id=a.id and e.kind='actual' and e.payload->>'occurrenceId'=event_payload->>'occurrenceId'
     and e.payload->>'setIndex'=event_payload->>'setIndex' and coalesce(e.payload->>'side','not_applicable')=coalesce(event_payload->>'side','not_applicable')) then raise exception 'correction_required';
   end if;
 end if;
 insert into public.pooling_execution_events(assignment_id,actor_id,kind,payload,operation_key)
 values(a.id,actor,event_kind,event_payload,pooling_execution.operation_key) returning id into event_id;
 return jsonb_build_object('eventId',event_id,'status','committed');
end $$;
revoke all on function public.pooling_approve(text,bigint,bigint,bigint,text) from public,anon;
revoke all on function public.pooling_execution(bigint,bigint,text,text,jsonb) from public,anon;
grant execute on function public.pooling_approve(text,bigint,bigint,bigint,text) to authenticated;
grant execute on function public.pooling_execution(bigint,bigint,text,text,jsonb) to authenticated;
commit;
