-- Immutable weekly constraint reviews. No client input grants assignment.
begin;
create table if not exists public.pooling_week_reviews (
 id bigint generated always as identity primary key,client_id text not null references public.clients(id),actor_id uuid not null references auth.users(id),
 operation_key text not null,request jsonb not null,source_token text not null,result jsonb not null,selection jsonb not null,
 generation bigint not null,recorded_at timestamptz not null default now(),unique(actor_id,client_id,operation_key)
);
create table if not exists public.pooling_week_approvals (
 week_id bigint primary key references public.pooling_week_reviews(id),actor_id uuid not null references auth.users(id),
 operation_key text not null,receipt jsonb not null,recorded_at timestamptz not null default now()
);
alter table public.pooling_week_reviews enable row level security;
alter table public.pooling_week_approvals enable row level security;
revoke all on public.pooling_week_reviews,public.pooling_week_approvals from public,anon,authenticated;

create or replace function public.pooling_week_input(verified_actor uuid,target_client text,week_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;ctx public.pooling_contexts%rowtype;slot jsonb;snapshot jsonb;sessions jsonb:='[]';m public.pooling_manifests%rowtype;policy jsonb;result jsonb;tokens jsonb:='[]';
begin
 select * into c from public.clients where id=target_client for update;
 if not found or verified_actor is null or c."coachId" is distinct from verified_actor then raise exception 'forbidden';end if;
 if (select r1 and r3 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled';end if;
 if week_request is null or jsonb_typeof(week_request)<>'object' or octet_length(week_request::text)>16384 or not(week_request ?& array['manifestId','policyId','constraints']) or exists(select 1 from jsonb_object_keys(week_request) k where k not in ('manifestId','policyId','constraints')) then raise exception 'invalid_week';end if;
 if jsonb_typeof(week_request->'constraints'->'slots') is distinct from 'array' then raise exception 'invalid_week';end if;
 if jsonb_array_length(week_request->'constraints'->'slots') not between 1 and 31 or (select count(distinct s->>'draftId') from jsonb_array_elements(week_request->'constraints'->'slots') s)<>jsonb_array_length(week_request->'constraints'->'slots') then raise exception 'invalid_week';end if;
 select * into ctx from public.pooling_contexts where client_id=target_client;
 select * into m from public.pooling_manifests where id=week_request->>'manifestId' for share;
 if not found or m.state<>'published' then raise exception 'content_revoked';end if;
 select p into policy from jsonb_array_elements(coalesce(m.document->'extensionPolicies','[]')) p where p->>'id'=week_request->>'policyId' and p->>'kind'='weekly';
 if policy is null then raise exception 'unsupported_policy';end if;
 for slot in select value from jsonb_array_elements(week_request->'constraints'->'slots') loop
  if coalesce(slot->>'draftId','')!~'^[1-9][0-9]*$' then raise exception 'invalid_week';end if;
  snapshot:=public.pooling_decision_input(verified_actor,target_client,(slot->>'draftId')::bigint);
  if snapshot->'manifest'->>'id' is distinct from m.id or (snapshot->'draft'->>'contextGeneration')::bigint is distinct from ctx.generation or exists(select 1 from public.pooling_drafts where parent_id=(slot->>'draftId')::bigint) then raise exception 'stale_draft';end if;
  sessions:=sessions||jsonb_build_array(snapshot);
  tokens:=tokens||jsonb_build_array(jsonb_build_object('draftId',slot->'draftId','sourceToken',snapshot->'sourceToken'));
 end loop;
 result:=jsonb_build_object('clientId',target_client,'generation',ctx.generation,'constraints',week_request->'constraints','sessions',sessions,'policy',policy,'manifest',m.document->'manifest');
 return result||jsonb_build_object('weekToken',encode(sha256(convert_to(jsonb_build_object('request',week_request,'tokens',tokens,'generation',ctx.generation,'manifest',m.document)::text,'UTF8')),'hex'));
end $$;
create or replace function public.pooling_record_week(verified_actor uuid,target_client text,operation_key text,week_request jsonb,expected_generation bigint,expected_token text,week_result jsonb,selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior public.pooling_week_reviews%rowtype;input jsonb;rid bigint;item jsonb;
begin
 perform 1 from public.clients where id=target_client and "coachId"=verified_actor for update;
 if not found or verified_actor is null then raise exception 'forbidden';end if;
 if operation_key is null or length(operation_key) not between 8 and 150 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_week_reviews w where w.actor_id=verified_actor and w.client_id=target_client and w.operation_key=pooling_record_week.operation_key;
 if found then
  if prior.request is distinct from week_request or prior.generation is distinct from expected_generation then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',prior.id,'status','committed','assignment',null);
 end if;
 input:=public.pooling_week_input(verified_actor,target_client,week_request);
 if (input->>'generation')::bigint is distinct from expected_generation then raise exception 'stale_context';end if;
 if input->>'weekToken' is distinct from expected_token then raise exception 'source_changed';end if;
 if week_result is null or week_result->>'state' not in ('unsupported_policy','blocked','ready_for_coach_review') or jsonb_typeof(selection) is distinct from 'array' then raise exception 'invalid_week';end if;
 if jsonb_array_length(selection)<>jsonb_array_length(week_request->'constraints'->'slots') then raise exception 'invalid_week';end if;
 for item in select value from jsonb_array_elements(selection) loop
  if not exists(select 1 from jsonb_array_elements(week_request->'constraints'->'slots') s where s->'draftId'=item->'draftId') then raise exception 'invalid_week';end if;
  perform public.pooling_assert_decision_current(verified_actor,target_client,(item->>'draftId')::bigint,(item->>'decisionId')::bigint);
 end loop;
 insert into public.pooling_week_reviews(client_id,actor_id,operation_key,request,source_token,result,selection,generation)
 values(target_client,verified_actor,pooling_record_week.operation_key,week_request,expected_token,week_result,pooling_record_week.selection,expected_generation) returning id into rid;
 return jsonb_build_object('id',rid,'status','committed','assignment',null);
end $$;
create or replace function public.pooling_read_weeks(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.clients where id=target_client and "coachId"=auth.uid()) then raise exception 'forbidden';end if;
 return (select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('approval',(select a.receipt from public.pooling_week_approvals a where a.week_id=w.id)) order by w.id desc),'[]') from public.pooling_week_reviews w where w.client_id=target_client);
end $$;
create or replace function public.pooling_approve_week(target_client text,target_week bigint,expected_generation bigint,operation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.pooling_week_reviews%rowtype;input jsonb;receipt jsonb;
begin
 perform 1 from public.clients where id=target_client and "coachId"=auth.uid() for update;
 if not found or auth.uid() is null then raise exception 'forbidden';end if;
 if operation_key is null or length(operation_key) not between 8 and 120 then raise exception 'invalid_request';end if;
 select * into w from public.pooling_week_reviews where id=target_week and client_id=target_client;
 if not found then raise exception 'invalid_week';end if;
 select a.receipt into receipt from public.pooling_week_approvals a where a.week_id=w.id;
 if found then
  if expected_generation is distinct from w.generation then raise exception 'idempotency_conflict';end if;
  return receipt;
 end if;
 input:=public.pooling_week_input(auth.uid(),target_client,w.request);
 if (input->>'generation')::bigint is distinct from expected_generation or w.generation is distinct from expected_generation then raise exception 'stale_context';end if;
 if input->>'weekToken' is distinct from w.source_token then raise exception 'source_changed';end if;
 if w.result->>'state' is distinct from 'ready_for_coach_review' then raise exception 'required_gap';end if;
 -- Revisions are new reviews; an older unassigned review is not silently reused.
 if exists(select 1 from public.pooling_week_reviews n where n.client_id=target_client and n.request->'constraints'->>'startDate'=w.request->'constraints'->>'startDate' and n.id>w.id) then raise exception 'stale_draft';end if;
 receipt:=public.pooling_approve_batch(target_client,expected_generation,operation_key||':week',w.selection);
 insert into public.pooling_week_approvals(week_id,actor_id,operation_key,receipt) values(w.id,auth.uid(),pooling_approve_week.operation_key,receipt);
 return receipt;
end $$;
revoke all on function public.pooling_week_input(uuid,text,jsonb),public.pooling_record_week(uuid,text,text,jsonb,bigint,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.pooling_week_input(uuid,text,jsonb),public.pooling_record_week(uuid,text,text,jsonb,bigint,text,jsonb,jsonb) to service_role;
revoke all on function public.pooling_read_weeks(text),public.pooling_approve_week(text,bigint,bigint,text) from public,anon;
grant execute on function public.pooling_read_weeks(text),public.pooling_approve_week(text,bigint,bigint,text) to authenticated;
-- A later review of the same explicit week invalidates reliance on the earlier
-- approved week's sessions. Recorded actuals and completed history are untouched.
create or replace function public.pooling_assert_decision_current(verified_actor uuid,target_client text,target_draft bigint,target_decision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;d public.pooling_decisions%rowtype;
begin
 snapshot:=public.pooling_decision_input(verified_actor,target_client,target_draft);
 select * into d from public.pooling_decisions where id=target_decision and draft_id=target_draft;
 if not found or d.source_token is null or d.source_token is distinct from snapshot->>'sourceToken' then raise exception 'source_changed';end if;
 if exists(select 1 from public.pooling_week_reviews w join public.pooling_week_approvals a on a.week_id=w.id
  where w.client_id=target_client and exists(select 1 from jsonb_array_elements(w.selection) s where s->>'draftId'=target_draft::text)
   and exists(select 1 from public.pooling_week_reviews n where n.client_id=target_client and n.id>w.id and n.request->'constraints'->>'startDate'=w.request->'constraints'->>'startDate')) then raise exception 'stale_draft';end if;
end $$;
revoke all on function public.pooling_assert_decision_current(uuid,text,bigint,bigint) from public,anon,authenticated;
drop trigger if exists pooling_week_immutable on public.pooling_week_reviews;
create trigger pooling_week_immutable before update or delete on public.pooling_week_reviews for each row execute function public.pooling_governance_immutable();
drop trigger if exists pooling_week_approval_immutable on public.pooling_week_approvals;
create trigger pooling_week_approval_immutable before update or delete on public.pooling_week_approvals for each row execute function public.pooling_governance_immutable();
commit;
