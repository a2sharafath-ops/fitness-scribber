-- Publication admission requires an exact acceptance artefact, not browser flags.
-- The evidence registry is maintained only by an authorized trusted release process.
begin;
create table if not exists public.pooling_content_acceptances (
 id text primary key, document_digest text not null, evidence jsonb not null,
 accepted_at timestamptz not null, accepted_by text not null,
 revoked_at timestamptz
);
create table if not exists public.pooling_catalogue_events (
 id bigint generated always as identity primary key, manifest_id text not null references public.pooling_manifests(id),
 action text not null check(action in ('published','revoked')), evidence_id text not null references public.pooling_content_acceptances(id),
 reason text not null, recorded_at timestamptz not null default now()
);
alter table public.pooling_content_acceptances enable row level security;
alter table public.pooling_catalogue_events enable row level security;
revoke all on public.pooling_content_acceptances,public.pooling_catalogue_events from public,anon,authenticated;

create or replace function public.pooling_manifest_immutable() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception 'immutable_release'; end if;
 if old.state in ('published','revoked') and (old.document is distinct from new.document or old.id is distinct from new.id or old.created_at is distinct from new.created_at or (old.state='revoked' and new.state<>'revoked') or (old.state='published' and new.state not in ('published','revoked'))) then raise exception 'immutable_release'; end if;
 return new;
end $$;
drop trigger if exists pooling_manifest_immutable on public.pooling_manifests;
create trigger pooling_manifest_immutable before update or delete on public.pooling_manifests for each row execute function public.pooling_manifest_immutable();

create or replace function public.pooling_publish_catalogue(target_manifest text,release_document jsonb,acceptance_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare evidence public.pooling_content_acceptances%rowtype; existing public.pooling_manifests%rowtype; digest text; record jsonb; kind text;
begin
 select * into evidence from public.pooling_content_acceptances where id=acceptance_id for share;
 if not found or evidence.revoked_at is not null or evidence.accepted_at>clock_timestamp() or length(trim(evidence.accepted_by))=0 then raise exception 'acceptance_required'; end if;
 if release_document is null or jsonb_typeof(release_document)<>'object' or octet_length(release_document::text)>2097152 then raise exception 'invalid_release'; end if;
 digest:=encode(sha256(convert_to(release_document::text,'UTF8')),'hex');
 if digest is distinct from evidence.document_digest then raise exception 'acceptance_mismatch'; end if;
 if release_document->'manifest'->>'id' is distinct from target_manifest or release_document->'manifest'->>'state' is distinct from 'published'
  or nullif(release_document->'manifest'->>'releaseEvidence','') is null or jsonb_typeof(release_document->'catalogue') is distinct from 'array' or jsonb_typeof(release_document->'doses') is distinct from 'array' or jsonb_typeof(release_document->'modulePolicy') is distinct from 'object' then raise exception 'invalid_release'; end if;
 for record in select value from jsonb_array_elements(jsonb_build_array(release_document->'modulePolicy')||(release_document->'catalogue')||(release_document->'doses')||coalesce(release_document->'extensionPolicies','[]')) loop
  if record->>'reviewStatus' is distinct from 'published' or record->'automationEligible' is distinct from 'true'::jsonb or record->>'rightsStatus' is distinct from 'accepted'
    or not exists(select 1 from jsonb_array_elements(release_document->'manifest'->'records') m where m->>'id'=record->>'id' and m->'revision'=record->'revision') then raise exception 'record_not_admitted'; end if;
  foreach kind in array array['content','rights','scope'] loop
   if not exists(select 1 from jsonb_array_elements(record->'approvalEvidence') e where e->>'kind'=kind and e->>'decision'='accepted' and e->'revision'=record->'revision' and nullif(e->>'reviewerId','') is not null and nullif(e->>'reference','') is not null) then raise exception 'acceptance_required'; end if;
  end loop;
 end loop;
 select * into existing from public.pooling_manifests where id=target_manifest for update;
 if found then
  if existing.state='published' and existing.document=release_document then return jsonb_build_object('manifestId',target_manifest,'status','committed');end if;
  raise exception 'immutable_release';
 end if;
 insert into public.pooling_manifests(id,state,document) values(target_manifest,'published',release_document);
 insert into public.pooling_catalogue_events(manifest_id,action,evidence_id,reason) values(target_manifest,'published',acceptance_id,'Exact accepted artefact admitted by trusted release process');
 return jsonb_build_object('manifestId',target_manifest,'status','committed');
end $$;
create or replace function public.pooling_revoke_catalogue(target_manifest text,acceptance_id text,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if reason is null or length(trim(reason)) not between 1 and 4000 or not exists(select 1 from public.pooling_content_acceptances where id=acceptance_id) then raise exception 'acceptance_required'; end if;
 perform 1 from public.pooling_manifests where id=target_manifest for update;
 if not found then raise exception 'invalid_release'; end if;
 if (select state from public.pooling_manifests where id=target_manifest)='revoked' then return jsonb_build_object('manifestId',target_manifest,'status','committed');end if;
 update public.pooling_manifests set state='revoked' where id=target_manifest;
 insert into public.pooling_catalogue_events(manifest_id,action,evidence_id,reason) values(target_manifest,'revoked',acceptance_id,pooling_revoke_catalogue.reason);
 return jsonb_build_object('manifestId',target_manifest,'status','committed');
end $$;
revoke all on function public.pooling_manifest_immutable(),public.pooling_publish_catalogue(text,jsonb,text),public.pooling_revoke_catalogue(text,text,text) from public,anon,authenticated;
grant execute on function public.pooling_publish_catalogue(text,jsonb,text),public.pooling_revoke_catalogue(text,text,text) to service_role;
commit;
