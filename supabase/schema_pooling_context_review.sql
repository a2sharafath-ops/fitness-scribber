-- Trusted service stores a coach-requested, source-bound context review.
-- It creates an unassigned child draft; it never grants clinical scope or consent.
begin;
create table if not exists public.pooling_context_reviews (
 id bigint generated always as identity primary key,client_id text not null references public.clients(id),
 actor_id uuid not null references auth.users(id),operation_key text not null,reference text not null,
 source_token text not null,parent_draft_id bigint not null references public.pooling_drafts(id),
 draft_id bigint not null references public.pooling_drafts(id),context_generation bigint not null,result jsonb not null,
 recorded_at timestamptz not null default now(),unique(actor_id,client_id,operation_key)
);
alter table public.pooling_context_reviews enable row level security;
revoke all on public.pooling_context_reviews from public,anon,authenticated;
create or replace function public.pooling_record_context_review(verified_actor uuid,target_client text,target_draft bigint,expected_token text,operation_key text,review_reference text,resolved_context jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; ctx public.pooling_contexts%rowtype; d public.pooling_drafts%rowtype; bundle jsonb; prior public.pooling_context_reviews%rowtype; child bigint; rid bigint;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or verified_actor is null or c."coachId" is distinct from verified_actor then raise exception 'forbidden';end if;
 if operation_key is null or length(operation_key) not between 8 and 180 or review_reference is null or length(trim(review_reference)) not between 1 and 1000 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_context_reviews r where r.client_id=target_client and r.actor_id=verified_actor and r.operation_key=pooling_record_context_review.operation_key;
 if found then
  if prior.parent_draft_id is distinct from target_draft or prior.reference is distinct from review_reference then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',prior.id,'draftId',prior.draft_id,'generation',prior.context_generation,'status','committed','assignment',null);
 end if;
 bundle:=public.pooling_source_bundle(verified_actor,target_client,target_draft);
 if bundle->>'sourceBundleToken' is distinct from expected_token then raise exception 'source_changed';end if;
 if bundle->'purposeAuthority' is distinct from 'true'::jsonb or bundle->'modulePolicy'->>'scope' is distinct from 'adult_general_fitness' then raise exception 'unsupported_policy';end if;
 if resolved_context->>'clientId' is distinct from target_client or resolved_context->>'generation' is distinct from bundle->>'generation' or resolved_context->>'state' is distinct from 'eligible_for_coach_review'
   or resolved_context->'restrictions' is distinct from '[]'::jsonb then raise exception 'context_held';end if;
 -- Stored resolved_context is created by the verified service, never posted by a browser.
 if exists(select 1 from jsonb_array_elements(bundle->'restrictions') r where r->>'state'<>'resolved' or r->>'resolvedAt' is null or (r->>'resolvedAt')::timestamptz>(bundle->'session'->>'sessionAt')::timestamptz or r->>'resolutionEvidence' is null) then raise exception 'context_held';end if;
 -- A subsequent no-change answer cannot erase a previously reported concern or
 -- declined required check. Each such report needs its own scoped review record.
 if exists(select 1 from public.pooling_reports report where report.client_id=target_client and report.field='healthChange' and report.value<>'"no_change"'::jsonb and not exists(
  select 1 from public.pooling_restriction_records r join public.pooling_restriction_resolutions v on v.restriction_id=r.id
  where r.client_id=target_client and r.evidence_reference='pooling_reports/'||report.id::text and r.field_key='healthChange' and r.side='not_applicable' and r.protocol='reported-health-change-v1'
    and v.effective_at<= (bundle->'session'->>'sessionAt')::timestamptz and v.recorded_at<=clock_timestamp())) then raise exception 'context_held';end if;
 select * into d from public.pooling_drafts where id=target_draft and client_id=target_client;
 if exists(select 1 from public.pooling_drafts where parent_id=d.id) then raise exception 'draft_conflict';end if;
 update public.pooling_contexts set generation=generation+1,held=false,updated_at=now() where client_id=target_client returning * into ctx;
 insert into public.pooling_drafts(client_id,actor_id,revision,context_generation,parent_id,proposal,operation_key)
 values(target_client,verified_actor,d.revision+1,ctx.generation,d.id,d.proposal,operation_key||':context-review') returning id into child;
 insert into public.pooling_context_reviews(client_id,actor_id,operation_key,reference,source_token,parent_draft_id,draft_id,context_generation,result)
 values(target_client,verified_actor,pooling_record_context_review.operation_key,review_reference,expected_token,d.id,child,ctx.generation,resolved_context) returning id into rid;
 return jsonb_build_object('id',rid,'draftId',child,'generation',ctx.generation,'status','committed','assignment',null);
end $$;
revoke all on function public.pooling_record_context_review(uuid,text,bigint,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.pooling_record_context_review(uuid,text,bigint,text,text,text,jsonb) to service_role;
commit;
