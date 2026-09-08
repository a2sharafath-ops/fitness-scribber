-- Separate immutable test release, not an edit to an admitted manifest.
begin;
create table if not exists public.pooling_engineering_releases (
 client_id text primary key references public.pooling_test_workspaces(client_id),
 manifest_id text not null unique references public.pooling_manifests(id),
 run_id text not null,
 revoked_at timestamptz
);
alter table public.pooling_engineering_releases enable row level security;
revoke all on public.pooling_engineering_releases from public,anon,authenticated;
grant select,insert,update on public.pooling_engineering_releases to service_role;
create or replace function public.pooling_engineering_release_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if (to_jsonb(new)-'revoked_at') is distinct from (to_jsonb(old)-'revoked_at') or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at) then raise exception 'engineering_release_immutable';end if;
  return new;
 end if;
 if not exists(select 1 from public.pooling_test_workspaces w join public.pooling_engineering_slots g on g.coach_id=w.coach_id
  join public.pooling_manifests m on m.id=new.manifest_id
  where w.client_id=new.client_id and new.run_id=g.run_id and g.revoked_at is null and g.expires_at>clock_timestamp()
  and w.revoked_at is null and w.expires_at>clock_timestamp()
  and new.manifest_id=new.client_id||'_a33_kg_manifest'
  and m.document->'manifest'->>'id'=new.manifest_id
  and m.document->'manifest'->>'releaseEvidence'='Fictional A33 kg/inventory software fixture only; no professional acceptance.'
  and m.state='published') then raise exception 'active_engineering_release_required';end if;
 return new;
end $$;
drop trigger if exists pooling_engineering_release_guard on public.pooling_engineering_releases;
create trigger pooling_engineering_release_guard before insert or update on public.pooling_engineering_releases for each row execute function public.pooling_engineering_release_guard();
revoke all on function public.pooling_engineering_release_guard() from public,anon,authenticated,service_role;
create or replace function public.pooling_manifest_allowed(target_client text,target_manifest text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.pooling_test_workspaces where manifest_id=target_manifest and client_id<>target_client)
 and not exists(select 1 from public.pooling_engineering_releases where manifest_id=target_manifest and client_id<>target_client)
 and (
  not exists(select 1 from public.pooling_test_workspaces where client_id=target_client and manifest_id<>target_manifest)
  or exists(select 1 from public.pooling_engineering_releases r join public.pooling_test_workspaces w using(client_id)
   join public.pooling_engineering_slots g on g.coach_id=w.coach_id
   where r.client_id=target_client and r.manifest_id=target_manifest and r.revoked_at is null and g.revoked_at is null and g.expires_at>now())
 )
$$;
commit;
