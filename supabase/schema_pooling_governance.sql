-- Additive evidence ledger. Recorded consent/review is not legal or clinical certification.
-- Real scope grants and policy publication require the separately authorized reviewers.
begin;
create table if not exists public.pooling_scope_grants (
 id text primary key, client_id text not null references public.clients(id),
 scope text not null, market text not null, reviewer_id text not null, evidence_reference text not null,
 valid_until timestamptz not null, revoked_at timestamptz, recorded_at timestamptz not null default now()
);
create table if not exists public.pooling_policy_documents (
 id text primary key, scope text not null, market text not null, title text not null, body text not null,
 state text not null check(state in ('draft','published','withdrawn')), evidence_reference text not null,
 recorded_at timestamptz not null default now()
);
create table if not exists public.pooling_consent_events (
 id bigint generated always as identity primary key, client_id text not null references public.clients(id),
 actor_id uuid not null references auth.users(id), document_id text not null references public.pooling_policy_documents(id),
 decision text not null check(decision in ('accepted','withdrawn')), operation_key text not null,
 recorded_at timestamptz not null default now(), unique(actor_id,client_id,operation_key)
);
create table if not exists public.pooling_restriction_records (
 id bigint generated always as identity primary key, client_id text not null references public.clients(id),
 field_key text not null, side text not null check(side in ('left','right','bilateral','midline','not_applicable')),
 protocol text not null, evidence_reference text not null, reviewer_id text not null,
 effective_at timestamptz not null, recorded_at timestamptz not null default now()
);
create table if not exists public.pooling_restriction_resolutions (
 id bigint generated always as identity primary key, restriction_id bigint not null unique references public.pooling_restriction_records(id),
 reviewer_id text not null, evidence_reference text not null, field_key text not null, side text not null,
 protocol text not null, effective_at timestamptz not null, recorded_at timestamptz not null default now()
);
do $$declare t text;begin
 foreach t in array array['pooling_scope_grants','pooling_policy_documents','pooling_consent_events','pooling_restriction_records','pooling_restriction_resolutions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;

create or replace function public.pooling_governance_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare cid text; item record;
begin
 if TG_TABLE_NAME='pooling_restriction_resolutions' then
  select client_id into cid from public.pooling_restriction_records where id=new.restriction_id;
 elsif TG_TABLE_NAME='pooling_policy_documents' then
  for item in select distinct client_id from public.pooling_consent_events where document_id=case when TG_OP='DELETE' then old.id else new.id end order by client_id loop
   perform 1 from public.clients where id=item.client_id for update;
   update public.pooling_contexts set generation=generation+1,held=true,updated_at=now() where client_id=item.client_id;
  end loop;
  if TG_OP='DELETE' then return old;else return new;end if;
 else cid:=case when TG_OP='DELETE' then old.client_id else new.client_id end;
 end if;
 perform 1 from public.clients where id=cid for update;
 insert into public.pooling_contexts(client_id) values(cid) on conflict do nothing;
 update public.pooling_contexts set generation=generation+1,held=true,updated_at=now() where client_id=cid;
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
do $$declare t text;begin
 foreach t in array array['pooling_scope_grants','pooling_policy_documents','pooling_consent_events','pooling_restriction_records','pooling_restriction_resolutions'] loop
  execute format('drop trigger if exists pooling_governance_changed on public.%I',t);
  execute format('create trigger pooling_governance_changed before insert or update or delete on public.%I for each row execute function public.pooling_governance_changed()',t);
 end loop;
end $$;

create or replace function public.pooling_read_governance(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden';end if;
 return jsonb_build_object('documents',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'scope',d.scope,'market',d.market,'title',d.title,'body',d.body,
  'decision',(select e.decision from public.pooling_consent_events e where e.client_id=target_client and e.document_id=d.id order by e.id desc limit 1)) order by d.id),'[]') from public.pooling_policy_documents d
  where d.state='published' and exists(select 1 from public.pooling_scope_grants g where g.client_id=target_client and g.scope=d.scope and g.market=d.market and g.revoked_at is null and g.valid_until>clock_timestamp())),
  'recordedConsents',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'documentId',e.document_id,'decision',e.decision,'recordedAt',e.recorded_at) order by e.id desc),'[]') from public.pooling_consent_events e where e.client_id=target_client),
  'restrictions',case when c."coachId"=auth.uid() then (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('resolution',(select to_jsonb(v) from public.pooling_restriction_resolutions v where v.restriction_id=r.id)) order by r.id),'[]') from public.pooling_restriction_records r where r.client_id=target_client) else '[]'::jsonb end);
end $$;
create or replace function public.pooling_governance_bundle(verified_actor uuid,target_client text,target_scope text,session_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; authority boolean; expiry timestamptz;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or verified_actor is null or c."coachId" is distinct from verified_actor then raise exception 'forbidden';end if;
 select min(g.valid_until) into expiry from public.pooling_scope_grants g where g.client_id=target_client and g.scope=target_scope and g.revoked_at is null and g.valid_until>greatest(session_at,clock_timestamp())
  and nullif(g.reviewer_id,'') is not null and nullif(g.evidence_reference,'') is not null
  and exists(select 1 from public.pooling_policy_documents d where d.state='published' and d.scope=g.scope and d.market=g.market and
    (select e.decision from public.pooling_consent_events e where e.client_id=target_client and e.document_id=d.id order by e.id desc limit 1)='accepted');
 authority:=expiry is not null;
 return jsonb_build_object('purposeAuthority',authority,'authorityValidUntil',expiry,
  'restrictions',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id::text,'clientId',r.client_id,'field',r.field_key,'side',r.side,'protocol',r.protocol,
   'effectiveAt',r.effective_at,'recordedAt',r.recorded_at,'state',case when v.id is null then 'unresolved' else 'resolved' end,
   'resolvedBy',v.reviewer_id,'resolvedAt',v.effective_at,'resolutionRecordedAt',v.recorded_at,'resolutionEvidence',v.evidence_reference) order by r.id),'[]')
   from public.pooling_restriction_records r left join public.pooling_restriction_resolutions v on v.restriction_id=r.id where r.client_id=target_client));
end $$;

create or replace function public.pooling_governance_immutable() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.pooling_restriction_records%rowtype;
begin
 if TG_OP='DELETE' then raise exception 'immutable_evidence';end if;
 if TG_TABLE_NAME='pooling_restriction_resolutions' and TG_OP='INSERT' then
  select * into r from public.pooling_restriction_records where id=new.restriction_id;
  if r.field_key is distinct from new.field_key or r.side is distinct from new.side or r.protocol is distinct from new.protocol or length(trim(new.reviewer_id))=0 or length(trim(new.evidence_reference))=0 or not isfinite(new.effective_at) or new.effective_at<r.effective_at or new.effective_at>clock_timestamp() then raise exception 'invalid_resolution';end if;
 end if;
 if TG_OP='UPDATE' then
  if TG_TABLE_NAME='pooling_scope_grants' then
   if (to_jsonb(old)-'revoked_at') is distinct from (to_jsonb(new)-'revoked_at') or (old.revoked_at is not null and old.revoked_at is distinct from new.revoked_at) then raise exception 'immutable_evidence';end if;
  elsif TG_TABLE_NAME='pooling_policy_documents' then
   if old.state in ('published','withdrawn') and ((to_jsonb(old)-'state') is distinct from (to_jsonb(new)-'state') or new.state not in (old.state,'withdrawn')) then raise exception 'immutable_evidence';end if;
  else raise exception 'immutable_evidence';end if;
 end if;
 return new;
end $$;
do $$declare t text;begin
 foreach t in array array['pooling_scope_grants','pooling_policy_documents','pooling_consent_events','pooling_restriction_records','pooling_restriction_resolutions'] loop
  execute format('drop trigger if exists pooling_governance_immutable on public.%I',t);
  execute format('create trigger pooling_governance_immutable before insert or update or delete on public.%I for each row execute function public.pooling_governance_immutable()',t);
 end loop;
end $$;
create or replace function public.pooling_record_consent(target_client text,target_document text,decision text,operation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; d public.pooling_policy_documents%rowtype; prior public.pooling_consent_events%rowtype; rid bigint;
begin
 select * into c from public.clients where id=target_client for update;
 -- Acceptance is attributable to the linked client, not implied by a coach checkbox.
 if not found or auth.uid() is null or c."userId" is distinct from auth.uid() then raise exception 'forbidden';end if;
 if decision is null or decision not in ('accepted','withdrawn') or operation_key is null or length(operation_key) not between 8 and 200 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_consent_events e where e.actor_id=auth.uid() and e.client_id=target_client and e.operation_key=pooling_record_consent.operation_key;
 if found then
  if prior.document_id is distinct from target_document or prior.decision is distinct from pooling_record_consent.decision then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',prior.id,'status','committed');
 end if;
 select * into d from public.pooling_policy_documents where id=target_document for share;
 if not found then raise exception 'invalid_request';end if;
 if decision='accepted' and (d.state<>'published' or not exists(select 1 from public.pooling_scope_grants g where g.client_id=target_client and g.scope=d.scope and g.market=d.market and g.revoked_at is null and g.valid_until>clock_timestamp())) then raise exception 'unsupported_policy';end if;
 if decision='withdrawn' and not exists(select 1 from public.pooling_consent_events e where e.client_id=target_client and e.document_id=d.id) then raise exception 'invalid_request';end if;
 insert into public.pooling_consent_events(client_id,actor_id,document_id,decision,operation_key) values(target_client,auth.uid(),target_document,pooling_record_consent.decision,pooling_record_consent.operation_key) returning id into rid;
 return jsonb_build_object('id',rid,'status','committed');
end $$;

create or replace function public.pooling_resolve_restriction(target_client text,target_restriction bigint,field_key text,side text,protocol text,reviewer_id text,evidence_reference text,effective_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pooling_restriction_records%rowtype; rid bigint;
begin
 perform 1 from public.clients where id=target_client for update;
 select * into r from public.pooling_restriction_records where id=target_restriction and client_id=target_client;
 if not found then raise exception 'forbidden';end if;
 if r.field_key is distinct from pooling_resolve_restriction.field_key or r.side is distinct from pooling_resolve_restriction.side or r.protocol is distinct from pooling_resolve_restriction.protocol
  or reviewer_id is null or length(trim(reviewer_id))=0 or evidence_reference is null or length(trim(evidence_reference))=0 or effective_at is null or not isfinite(effective_at) or effective_at<r.effective_at or effective_at>clock_timestamp() then raise exception 'invalid_resolution';end if;
 insert into public.pooling_restriction_resolutions(restriction_id,field_key,side,protocol,reviewer_id,evidence_reference,effective_at)
 values(r.id,pooling_resolve_restriction.field_key,pooling_resolve_restriction.side,pooling_resolve_restriction.protocol,pooling_resolve_restriction.reviewer_id,pooling_resolve_restriction.evidence_reference,pooling_resolve_restriction.effective_at) returning id into rid;
 -- Resolution never itself clears the broader context hold or other-side records.
 return jsonb_build_object('id',rid,'status','committed');
end $$;
revoke all on function public.pooling_governance_changed(),public.pooling_governance_immutable(),public.pooling_governance_bundle(uuid,text,text,timestamptz),public.pooling_resolve_restriction(text,bigint,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.pooling_governance_bundle(uuid,text,text,timestamptz) to service_role;
grant execute on function public.pooling_resolve_restriction(text,bigint,text,text,text,text,text,timestamptz) to service_role;
revoke all on function public.pooling_read_governance(text),public.pooling_record_consent(text,text,text,text) from public,anon;
grant execute on function public.pooling_read_governance(text),public.pooling_record_consent(text,text,text,text) to authenticated;
commit;
