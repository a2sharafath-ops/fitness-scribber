-- A request is not a clearance. Reviewed authority is separately provisioned.
begin;
create table if not exists public.pooling_reassessment_requests (
 id bigint generated always as identity primary key,client_id text not null references public.clients(id),actor_id uuid not null references auth.users(id),
 operation_key text not null,request jsonb not null,recorded_at timestamptz not null default now(),unique(actor_id,client_id,operation_key)
);
create table if not exists public.pooling_reviewer_authorizations (
 id text primary key,actor_id uuid not null references auth.users(id),client_id text not null references public.clients(id),
 field_key text not null,side text not null,protocol text not null,evidence_reference text not null,valid_until timestamptz not null,revoked_at timestamptz
);
create table if not exists public.pooling_reassessment_reviews (
 id bigint generated always as identity primary key,request_id bigint not null references public.pooling_reassessment_requests(id),
 authorization_id text not null references public.pooling_reviewer_authorizations(id),evidence_reference text not null,
 restriction_id bigint not null references public.pooling_restriction_records(id),resolution_id bigint not null references public.pooling_restriction_resolutions(id),recorded_at timestamptz not null default now(),unique(request_id)
);
do $$declare t text;begin foreach t in array array['pooling_reassessment_requests','pooling_reviewer_authorizations','pooling_reassessment_reviews'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);
end loop;end $$;
create or replace function public.pooling_request_reassessment(target_client text,operation_key text,review_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;r public.pooling_reassessment_requests%rowtype;rid bigint;field_name text;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden';end if;
 if (select r1 and r3 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled';end if;
 if operation_key is null or length(operation_key) not between 8 and 180 or review_request is null or jsonb_typeof(review_request)<>'object' or not(review_request ?& array['field','side','protocol','sourceReference','reason']) or exists(select 1 from jsonb_object_keys(review_request) k where k not in ('field','side','protocol','sourceReference','reason')) then raise exception 'invalid_request';end if;
 foreach field_name in array array['field','protocol','sourceReference','reason'] loop
  if jsonb_typeof(review_request->field_name) is distinct from 'string' or length(trim(review_request->>field_name)) not between 1 and 1000 then raise exception 'invalid_request';end if;
 end loop;
 if review_request->>'side' is null or review_request->>'side' not in ('left','right','bilateral','midline','not_applicable') then raise exception 'invalid_request';end if;
 select * into r from public.pooling_reassessment_requests q where q.client_id=target_client and q.actor_id=auth.uid() and q.operation_key=pooling_request_reassessment.operation_key;
 if found then
  if r.request is distinct from review_request then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',r.id,'status','committed','resolvesRestriction',false);
 end if;
 insert into public.pooling_reassessment_requests(client_id,actor_id,operation_key,request) values(target_client,auth.uid(),pooling_request_reassessment.operation_key,review_request) returning id into rid;
 return jsonb_build_object('id',rid,'status','committed','resolvesRestriction',false);
end $$;
create or replace function public.pooling_read_reassessments(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'request',q.request,'recordedAt',q.recorded_at,'state',case when v.id is null then 'review_requested' else 'scoped_evidence_recorded' end) order by q.id desc),'[]') from public.pooling_reassessment_requests q left join public.pooling_reassessment_reviews v on v.request_id=q.id where q.client_id=target_client and (c."coachId"=auth.uid() or q.actor_id=auth.uid()));
end $$;
create or replace function public.pooling_record_reassessment(verified_actor uuid,target_request bigint,authorization_id text,target_restriction bigint,evidence_reference text,effective_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.pooling_reassessment_requests%rowtype;r public.pooling_restriction_records%rowtype;a public.pooling_reviewer_authorizations%rowtype;v public.pooling_reassessment_reviews%rowtype;receipt jsonb;rid bigint;
begin
 select * into q from public.pooling_reassessment_requests where id=target_request;
 if not found then raise exception 'forbidden';end if;
 perform 1 from public.clients where id=q.client_id for update;
 select * into a from public.pooling_reviewer_authorizations where id=authorization_id and actor_id=verified_actor and client_id=q.client_id for share;
 if not found or verified_actor is null or a.revoked_at is not null or a.valid_until<=clock_timestamp() or length(trim(a.evidence_reference))=0 then raise exception 'forbidden';end if;
 select * into r from public.pooling_restriction_records where id=target_restriction and client_id=q.client_id;
 if not found or r.field_key is distinct from q.request->>'field' or r.side is distinct from q.request->>'side' or r.protocol is distinct from q.request->>'protocol' or r.evidence_reference is distinct from q.request->>'sourceReference'
  or a.field_key is distinct from r.field_key or a.side is distinct from r.side or a.protocol is distinct from r.protocol then raise exception 'invalid_resolution';end if;
 select * into v from public.pooling_reassessment_reviews where request_id=q.id;
 if found then
  if v.authorization_id is distinct from authorization_id or v.restriction_id is distinct from target_restriction or v.evidence_reference is distinct from evidence_reference or (select x.effective_at from public.pooling_restriction_resolutions x where x.id=v.resolution_id) is distinct from effective_at then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',v.id,'status','committed','assignment',null);
 end if;
 receipt:=public.pooling_resolve_restriction(q.client_id,r.id,r.field_key,r.side,r.protocol,verified_actor::text,evidence_reference,effective_at);
 insert into public.pooling_reassessment_reviews(request_id,authorization_id,evidence_reference,restriction_id,resolution_id) values(q.id,a.id,pooling_record_reassessment.evidence_reference,r.id,(receipt->>'id')::bigint) returning id into rid;
 return jsonb_build_object('id',rid,'status','committed','assignment',null);
end $$;
revoke all on function public.pooling_request_reassessment(text,text,jsonb),public.pooling_read_reassessments(text) from public,anon;
grant execute on function public.pooling_request_reassessment(text,text,jsonb),public.pooling_read_reassessments(text) to authenticated;
revoke all on function public.pooling_record_reassessment(uuid,bigint,text,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.pooling_record_reassessment(uuid,bigint,text,bigint,text,timestamptz) to service_role;
commit;
