-- R2/R3 request and review lifecycle. Proposal acceptance creates a draft only.
-- Numerical proposals may be inserted only by the trusted decision service.
begin;
create table if not exists public.pooling_extension_requests (
 id bigint generated always as identity primary key,
 client_id text not null references public.clients(id), actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('daily','progression')), proposal jsonb not null,
 generation bigint not null, operation_key text not null, recorded_at timestamptz not null default now(),
 unique(actor_id,client_id,operation_key)
);
create table if not exists public.pooling_extension_proposals (
 id bigint generated always as identity primary key, request_id bigint not null references public.pooling_extension_requests(id),
 draft_id bigint not null references public.pooling_drafts(id), decision_id bigint not null references public.pooling_decisions(id),
 result jsonb not null, recorded_at timestamptz not null default now()
);
create table if not exists public.pooling_extension_reviews (
 id bigint generated always as identity primary key, request_id bigint not null references public.pooling_extension_requests(id),
 actor_id uuid not null references auth.users(id), client_id text not null references public.clients(id),
 action text not null check(action in ('accept','amend','reject')), reason text not null,
 draft_id bigint references public.pooling_drafts(id), generation bigint not null,
 operation_key text not null, payload jsonb not null, recorded_at timestamptz not null default now(),
 unique(actor_id,client_id,operation_key), unique(request_id)
);
do $$declare t text;begin
 foreach t in array array['pooling_extension_requests','pooling_extension_proposals','pooling_extension_reviews'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;

create or replace function public.pooling_request_extension(target_client text,expected_generation bigint,operation_key text,proposal jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; ctx public.pooling_contexts%rowtype; prior public.pooling_extension_requests%rowtype; rid bigint;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 if operation_key is null or length(operation_key) not between 8 and 180 then raise exception 'invalid_operation_key'; end if;
 if proposal is null or jsonb_typeof(proposal)<>'object' or octet_length(proposal::text)>8192 or proposal->>'kind' is null or proposal->>'kind' not in ('daily','progression') then raise exception 'invalid_request'; end if;
 if exists(select 1 from jsonb_object_keys(proposal) k where k not in ('kind','date','requestedChange','blocks','authority','state'))
  or proposal->'blocks' is distinct from '[]'::jsonb or proposal->>'authority' is distinct from 'none' or proposal->>'state' is distinct from 'review_requested'
  or jsonb_typeof(proposal->'requestedChange') is distinct from 'string' or length(trim(proposal->>'requestedChange')) not between 1 and 4000
  or proposal->>'date' is null or proposal->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'invalid_request'; end if;
 perform (proposal->>'date')::date;
 select * into prior from public.pooling_extension_requests r where r.client_id=target_client and r.actor_id=auth.uid() and r.operation_key=pooling_request_extension.operation_key;
 if found then
  if prior.proposal is distinct from pooling_request_extension.proposal then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('id',prior.id,'status','saved');
 end if;
 if not exists(select 1 from public.pooling_runtime where singleton and r1 and case when proposal->>'kind'='daily' then r2 else r3 end) then raise exception 'feature_disabled'; end if;
 insert into public.pooling_contexts(client_id) values(target_client) on conflict do nothing;
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 if ctx.generation is distinct from expected_generation then raise exception 'stale_context'; end if;
 insert into public.pooling_extension_requests(client_id,actor_id,kind,proposal,generation,operation_key)
 values(target_client,auth.uid(),proposal->>'kind',pooling_request_extension.proposal,ctx.generation,pooling_request_extension.operation_key) returning id into rid;
 return jsonb_build_object('id',rid,'status','saved');
end $$;

create or replace function public.pooling_read_extensions(target_client text,request_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 if request_kind not in ('daily','progression') or request_kind is null then raise exception 'invalid_request'; end if;
 -- Clients see their own attributed request and disposition, not coach evidence.
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'operationKey',r.operation_key,'proposal',r.proposal,'recordedAt',r.recorded_at,
   'review',(select jsonb_build_object('action',v.action,'draftId',v.draft_id,'recordedAt',v.recorded_at) from public.pooling_extension_reviews v where v.request_id=r.id),
   'numericalProposals',case when c."coachId"=auth.uid() then (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'draftId',p.draft_id,'decisionId',p.decision_id,'result',p.result) order by p.id desc),'[]') from public.pooling_extension_proposals p where p.request_id=r.id) else '[]'::jsonb end) order by r.id desc)
   from public.pooling_extension_requests r where r.client_id=target_client and r.kind=request_kind and (c."coachId"=auth.uid() or r.actor_id=auth.uid())),'[]');
end $$;

create or replace function public.pooling_review_extension(target_client text,request_id bigint,expected_generation bigint,operation_key text,action text,reason text,proposal_id bigint default null,amended_draft jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; r public.pooling_extension_requests%rowtype; prior public.pooling_extension_reviews%rowtype; p public.pooling_extension_proposals%rowtype;
 ctx public.pooling_contexts%rowtype; payload jsonb; draft_receipt jsonb; rid bigint; proposed jsonb;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or auth.uid() is null or c."coachId" is distinct from auth.uid() then raise exception 'forbidden'; end if;
 if operation_key is null or length(operation_key) not between 8 and 180 or action is null or action not in ('accept','amend','reject') or reason is null or length(trim(reason)) not between 1 and 4000 then raise exception 'invalid_request'; end if;
 payload:=jsonb_build_object('requestId',request_id,'action',action,'reason',reason,'proposalId',proposal_id,'amendedDraft',amended_draft,'generation',expected_generation);
 select * into prior from public.pooling_extension_reviews v where v.actor_id=auth.uid() and v.client_id=target_client and v.operation_key=pooling_review_extension.operation_key;
 if found then
  if prior.payload is distinct from payload then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('id',prior.id,'draftId',prior.draft_id,'status','saved','assignment',null);
 end if;
 select * into r from public.pooling_extension_requests x where x.id=pooling_review_extension.request_id and x.client_id=target_client;
 if not found then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.pooling_runtime where singleton and r1 and case when r.kind='daily' then r2 else r3 end) then raise exception 'feature_disabled'; end if;
 if exists(select 1 from public.pooling_extension_reviews v where v.request_id=r.id) then raise exception 'draft_conflict'; end if;
 select * into ctx from public.pooling_contexts where client_id=target_client for update;
 if ctx.generation is distinct from expected_generation then raise exception 'stale_context'; end if;
 if action='accept' then
  select * into p from public.pooling_extension_proposals x where x.id=proposal_id and x.request_id=r.id;
  if not found then raise exception 'decision_unavailable'; end if;
  perform public.pooling_assert_decision_current(c."coachId",target_client,p.draft_id,p.decision_id);
  if p.source_token is distinct from public.pooling_extension_input(c."coachId",target_client,r.id,p.draft_id,p.baseline_assignment_id,p.policy_id)->>'extensionToken' then raise exception 'source_changed'; end if;
  proposed:=p.result->'suggestedDraft';
  if proposed is null or proposed='null'::jsonb then raise exception 'dose_review_required'; end if;
 elsif action='amend' then proposed:=amended_draft;
 end if;
 if action<>'reject' then
  if ctx.held then raise exception 'context_held'; end if;
  if proposed is null or proposed->>'date' is distinct from r.proposal->>'date' or jsonb_typeof(proposed->'selection') is distinct from 'array' then raise exception 'invalid_proposal'; end if;
  draft_receipt:=public.pooling_save_draft(target_client,expected_generation,operation_key||':draft',proposed);
 end if;
 insert into public.pooling_extension_reviews(request_id,actor_id,client_id,action,reason,draft_id,generation,operation_key,payload)
 values(r.id,auth.uid(),target_client,pooling_review_extension.action,pooling_review_extension.reason,(draft_receipt->>'id')::bigint,expected_generation,pooling_review_extension.operation_key,payload) returning id into rid;
 return jsonb_build_object('id',rid,'draftId',(draft_receipt->>'id')::bigint,'status','saved','assignment',null);
end $$;
revoke all on function public.pooling_request_extension(text,bigint,text,jsonb),public.pooling_read_extensions(text,text),public.pooling_review_extension(text,bigint,bigint,text,text,text,bigint,jsonb) from public,anon;
grant execute on function public.pooling_request_extension(text,bigint,text,jsonb),public.pooling_read_extensions(text,text),public.pooling_review_extension(text,bigint,bigint,text,text,text,bigint,jsonb) to authenticated;
commit;
