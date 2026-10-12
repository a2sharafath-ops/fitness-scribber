-- Reviewed production hardening; applied with user approval on 2026-10-11.
-- Requires the existing pooling schema. Safe to repeat; not a fresh-install schema.
-- No client records, prescriptions, bookings, or function signatures are removed.
begin;

-- Internal predicates remain callable by their SECURITY DEFINER owners.
-- Keep pooling_governed_client and pooling_linked available: RLS calls them.
revoke execute on function public.pooling_enabled(),
  public.pooling_development_enabled(text),
  public.pooling_governed_client_a34(text),
  public.pooling_module_enabled(text,text),
  public.pooling_module_enabled_a34(text,text),
  public.pooling_manifest_allowed(text,text),
  public.pooling_manifest_allowed_a34(text,text)
from public, anon, authenticated;

-- A submitted manifest ID is user input, not authorization to read release evidence.
-- Coaches retain their submissions; valid release operators retain matching events.
create or replace function public.pooling_read_catalogue_admin(target_client text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare can_release boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.clients where id=target_client and "coachId"=auth.uid()
  ) then raise exception 'forbidden'; end if;
  select exists (
    select 1 from public.pooling_release_operators o
    where o.actor_id=auth.uid() and o.revoked_at is null
      and o.valid_until>clock_timestamp() and length(trim(o.evidence_reference))>0
  ) into can_release;
  return jsonb_build_object(
    'canRelease',can_release,
    'submissions',(select coalesce(jsonb_agg(to_jsonb(s) order by id desc),'[]')
      from public.pooling_catalogue_submissions s where s.client_id=target_client),
    'events',case when can_release then (
      select coalesce(jsonb_agg(to_jsonb(e) order by id desc),'[]')
      from public.pooling_catalogue_events e where exists (
        select 1 from public.pooling_catalogue_submissions s
        where s.client_id=target_client and s.document->'manifest'->>'id'=e.manifest_id
      )
    ) else '[]'::jsonb end
  );
end $function$;
-- CREATE OR REPLACE retains existing grants; explicitly maintain this RPC boundary.
revoke execute on function public.pooling_read_catalogue_admin(text) from public, anon;
grant execute on function public.pooling_read_catalogue_admin(text) to authenticated;

commit;
