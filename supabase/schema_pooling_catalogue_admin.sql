-- Draft/review access does not grant release authority. Operators and exact
-- acceptance hashes are provisioned by a separately authorized release process.
begin;
create table if not exists public.pooling_catalogue_submissions (
 id bigint generated always as identity primary key,client_id text not null references public.clients(id),actor_id uuid not null references auth.users(id),
 operation_key text not null,document jsonb not null,digest text not null,note text not null,recorded_at timestamptz not null default now(),unique(actor_id,client_id,operation_key)
);
create table if not exists public.pooling_release_operators (
 actor_id uuid primary key references auth.users(id),evidence_reference text not null,valid_until timestamptz not null,revoked_at timestamptz
);
alter table public.pooling_catalogue_submissions enable row level security;
alter table public.pooling_release_operators enable row level security;
revoke all on public.pooling_catalogue_submissions,public.pooling_release_operators from public,anon,authenticated;
create or replace function public.pooling_submit_catalogue(target_client text,operation_key text,release_document jsonb,review_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior public.pooling_catalogue_submissions%rowtype;rid bigint;digest text;
begin
 perform 1 from public.clients where id=target_client and "coachId"=auth.uid() for update;
 if not found or auth.uid() is null then raise exception 'forbidden';end if;
 if operation_key is null or length(operation_key) not between 8 and 180 or release_document is null or jsonb_typeof(release_document)<>'object' or octet_length(release_document::text)>2097152 or review_note is null or length(trim(review_note)) not between 1 and 4000 then raise exception 'invalid_request';end if;
 select * into prior from public.pooling_catalogue_submissions s where s.client_id=target_client and s.actor_id=auth.uid() and s.operation_key=pooling_submit_catalogue.operation_key;
 if found then
  if prior.document is distinct from release_document or prior.note is distinct from review_note then raise exception 'idempotency_conflict';end if;
  return jsonb_build_object('id',prior.id,'digest',prior.digest,'status','committed','published',false);
 end if;
 digest:=encode(sha256(convert_to(release_document::text,'UTF8')),'hex');
 insert into public.pooling_catalogue_submissions(client_id,actor_id,operation_key,document,digest,note) values(target_client,auth.uid(),pooling_submit_catalogue.operation_key,release_document,digest,review_note) returning id into rid;
 return jsonb_build_object('id',rid,'digest',digest,'status','committed','published',false);
end $$;
create or replace function public.pooling_read_catalogue_admin(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.clients where id=target_client and "coachId"=auth.uid()) then raise exception 'forbidden';end if;
 return jsonb_build_object('canRelease',exists(select 1 from public.pooling_release_operators o where o.actor_id=auth.uid() and o.revoked_at is null and o.valid_until>clock_timestamp() and length(trim(o.evidence_reference))>0),
  'submissions',(select coalesce(jsonb_agg(to_jsonb(s) order by id desc),'[]') from public.pooling_catalogue_submissions s where s.client_id=target_client),
  'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id desc),'[]') from public.pooling_catalogue_events e where exists(select 1 from public.pooling_catalogue_submissions s where s.client_id=target_client and s.document->'manifest'->>'id'=e.manifest_id)));
end $$;
create or replace function public.pooling_publication_input(verified_actor uuid,target_client text,target_submission bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.pooling_catalogue_submissions%rowtype;
begin
 perform 1 from public.clients where id=target_client and "coachId"=verified_actor for update;
 if not found or verified_actor is null then raise exception 'forbidden';end if;
 perform 1 from public.pooling_release_operators o where o.actor_id=verified_actor and o.revoked_at is null and o.valid_until>clock_timestamp() and length(trim(o.evidence_reference))>0 for share;
 if not found then raise exception 'forbidden';end if;
 select * into s from public.pooling_catalogue_submissions where id=target_submission and client_id=target_client;
 if not found then raise exception 'forbidden';end if;
 return jsonb_build_object('document',s.document,'digest',s.digest);
end $$;
create or replace function public.pooling_apply_publication(verified_actor uuid,target_client text,target_submission bigint,expected_digest text,acceptance_id text,action text,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare input jsonb;manifest_id text;
begin
 input:=public.pooling_publication_input(verified_actor,target_client,target_submission);
 if input->>'digest' is distinct from expected_digest then raise exception 'source_changed';end if;
 manifest_id:=input->'document'->'manifest'->>'id';
 if action='publish' then return public.pooling_publish_catalogue(manifest_id,input->'document',acceptance_id);
 elsif action='revoke' then
  if not exists(select 1 from public.pooling_catalogue_events e where e.manifest_id=pooling_apply_publication.manifest_id and e.action='published' and e.evidence_id=acceptance_id) then raise exception 'acceptance_mismatch';end if;
  return public.pooling_revoke_catalogue(manifest_id,acceptance_id,reason);
 else raise exception 'invalid_request';end if;
end $$;
create or replace function public.pooling_acceptance_immutable() returns trigger language plpgsql security definer set search_path='' as $$
declare e record;
begin
 if TG_OP='DELETE' or (to_jsonb(old)-'revoked_at') is distinct from (to_jsonb(new)-'revoked_at') or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at) then raise exception 'immutable_evidence';end if;
 if old.revoked_at is null and new.revoked_at is not null then
  for e in select distinct manifest_id from public.pooling_catalogue_events where evidence_id=old.id and action='published' order by manifest_id loop
   perform public.pooling_revoke_catalogue(e.manifest_id,old.id,'Acceptance evidence withdrawn; future reliance blocked');
  end loop;
 end if;
 return new;
end $$;
drop trigger if exists pooling_acceptance_immutable on public.pooling_content_acceptances;
create trigger pooling_acceptance_immutable before update or delete on public.pooling_content_acceptances for each row execute function public.pooling_acceptance_immutable();
drop trigger if exists pooling_submission_immutable on public.pooling_catalogue_submissions;
create trigger pooling_submission_immutable before update or delete on public.pooling_catalogue_submissions for each row execute function public.pooling_governance_immutable();
revoke all on function public.pooling_submit_catalogue(text,text,jsonb,text),public.pooling_read_catalogue_admin(text) from public,anon;
grant execute on function public.pooling_submit_catalogue(text,text,jsonb,text),public.pooling_read_catalogue_admin(text) to authenticated;
revoke all on function public.pooling_publication_input(uuid,text,bigint),public.pooling_apply_publication(uuid,text,bigint,text,text,text,text),public.pooling_acceptance_immutable() from public,anon,authenticated;
grant execute on function public.pooling_publication_input(uuid,text,bigint),public.pooling_apply_publication(uuid,text,bigint,text,text,text,text) to service_role;
commit;
