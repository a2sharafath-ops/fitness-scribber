begin;
create table if not exists public.pooling_suggestions (
 id bigint generated always as identity primary key,client_id text not null references public.clients(id),actor_id uuid not null references auth.users(id),
 operation_key text not null,request jsonb not null,source_token text not null,result jsonb not null,draft_id bigint references public.pooling_drafts(id),
 recorded_at timestamptz not null default now(),unique(actor_id,client_id,operation_key)
);
alter table public.pooling_suggestions enable row level security;
revoke all on public.pooling_suggestions from public,anon,authenticated;
create or replace function public.pooling_record_suggestion(verified_actor uuid,target_client text,suggestion_request jsonb,expected_token text,suggestion_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior public.pooling_suggestions%rowtype;snapshot jsonb;d public.pooling_drafts%rowtype;rid bigint;child bigint;selected jsonb;
begin
 perform 1 from public.clients where id=target_client and "coachId"=verified_actor for update;
 if not found or verified_actor is null then raise exception 'forbidden';end if;
 if suggestion_request is null or suggestion_request->>'clientId' is distinct from target_client or length(suggestion_request->>'operationKey') not between 8 and 150 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_suggestions s where s.client_id=target_client and s.actor_id=verified_actor and s.operation_key=suggestion_request->>'operationKey';
 if found then
  if prior.request is distinct from suggestion_request then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',prior.id,'draftId',prior.draft_id,'status','committed','assignment',null);
 end if;
 snapshot:=public.pooling_decision_input(verified_actor,target_client,(suggestion_request->>'draftId')::bigint);
 if snapshot->>'generation' is distinct from suggestion_request->>'expectedGeneration' then raise exception 'stale_context';end if;
 if snapshot->>'sourceToken' is distinct from expected_token then raise exception 'source_changed';end if;
 select * into d from public.pooling_drafts where id=(suggestion_request->>'draftId')::bigint;
 if suggestion_result is null or suggestion_result->>'completeness' not in ('blocked','ready_for_coach_review') or octet_length(suggestion_result::text)>262144 then raise exception 'invalid_proposal';end if;
 if suggestion_result->>'completeness'='ready_for_coach_review' then
  if snapshot->'held' is distinct from 'false'::jsonb or suggestion_result->>'sessionState' is distinct from 'eligible_for_coach_review' then raise exception 'context_held';end if;
  if exists(select 1 from public.pooling_drafts where parent_id=d.id) then raise exception 'stale_draft';end if;
  select jsonb_agg(jsonb_build_object('occurrenceId',b->'occurrenceId','role',b->'role','exerciseId',b->'exerciseId','exerciseRevision',b->'exerciseRevision','doseId',b->'dose'->'id','doseRevision',b->'dose'->'revision') order by ord) into selected from jsonb_array_elements(suggestion_result->'blocks') with ordinality as x(b,ord);
  if selected is null or jsonb_array_length(selected)=0 then raise exception 'required_gap';end if;
  insert into public.pooling_drafts(client_id,actor_id,revision,context_generation,parent_id,proposal,operation_key)
  values(target_client,verified_actor,d.revision+1,d.context_generation,d.id,d.proposal||jsonb_build_object('source','pooling_suggestion','selection',selected),suggestion_request->>'operationKey'||':suggestion') returning id into child;
 end if;
 insert into public.pooling_suggestions(client_id,actor_id,operation_key,request,source_token,result,draft_id)
 values(target_client,verified_actor,suggestion_request->>'operationKey',suggestion_request,expected_token,suggestion_result,child) returning id into rid;
 return jsonb_build_object('id',rid,'draftId',child,'status','committed','assignment',null);
end $$;
create or replace function public.pooling_read_suggestions(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.clients where id=target_client and "coachId"=auth.uid()) then raise exception 'forbidden';end if;
 return (select coalesce(jsonb_agg(to_jsonb(s) order by id desc),'[]') from public.pooling_suggestions s where client_id=target_client);
end $$;
revoke all on function public.pooling_record_suggestion(uuid,text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.pooling_record_suggestion(uuid,text,jsonb,text,jsonb) to service_role;
revoke all on function public.pooling_read_suggestions(text) from public,anon;
grant execute on function public.pooling_read_suggestions(text) to authenticated;
drop trigger if exists pooling_suggestion_immutable on public.pooling_suggestions;
create trigger pooling_suggestion_immutable before update or delete on public.pooling_suggestions for each row execute function public.pooling_governance_immutable();
commit;
