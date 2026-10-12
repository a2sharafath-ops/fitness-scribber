-- Captured production function definitions, 2026-10-11. TEST FIXTURE ONLY; DO NOT DEPLOY.
CREATE OR REPLACE FUNCTION public.pooling_development_enabled(target_client text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.clients c join public.pooling_development_coaches d on d.coach_id=c."coachId"
 where c.id=target_client and d.enabled and not exists(select 1 from public.pooling_test_workspaces w where w.client_id=c.id))
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_enabled()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select coalesce((select r1 from public.pooling_runtime where singleton),false)$function$
;
CREATE OR REPLACE FUNCTION public.pooling_governed_client(target_client text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.pooling_development_enabled(target_client) or public.pooling_governed_client_a34(target_client)
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_governed_client_a34(target_client text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.pooling_enabled() or exists(select 1 from public.pooling_test_workspaces where client_id=target_client)
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_linked(target_client text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.clients c where c.id=target_client and c."userId"=auth.uid())$function$
;
CREATE OR REPLACE FUNCTION public.pooling_manifest_allowed(target_client text, target_manifest text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when (select document->'manifest'->>'audience' from public.pooling_manifests where id=target_manifest)='development'
 then public.pooling_development_enabled(target_client)
 else not public.pooling_development_enabled(target_client) and public.pooling_manifest_allowed_a34(target_client,target_manifest) end
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_manifest_allowed_a34(target_client text, target_manifest text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select not exists(select 1 from public.pooling_test_workspaces where manifest_id=target_manifest and client_id<>target_client)
 and not exists(select 1 from public.pooling_engineering_releases where manifest_id=target_manifest and client_id<>target_client)
 and (
 not exists(select 1 from public.pooling_test_workspaces where client_id=target_client and manifest_id<>target_manifest)
 or exists(select 1 from public.pooling_engineering_releases r join public.pooling_test_workspaces w using(client_id)
 join public.pooling_engineering_slots g on g.coach_id=w.coach_id
 where r.client_id=target_client and r.manifest_id=target_manifest and r.revoked_at is null and g.revoked_at is null and g.expires_at>now())
 )
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_module_enabled(target_client text, module text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select module in ('r1','r2','r3') and (public.pooling_development_enabled(target_client) or public.pooling_module_enabled_a34(target_client,module))
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_module_enabled_a34(target_client text, module text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select module in ('r1','r2','r3') and (
 exists(select 1 from public.pooling_runtime where singleton and r1 and case module when 'r2' then r2 when 'r3' then r3 else true end)
 or exists(select 1 from public.pooling_test_workspaces w join public.pooling_test_config x on x.singleton
 join public.clients c on c.id=w.client_id and c."coachId"=w.coach_id and c."userId"=w.coach_id
 where w.client_id=target_client and w.revoked_at is null and w.expires_at>clock_timestamp()
 and x.enabled and x.ends_at>clock_timestamp() and w.coach_id=any(x.coach_ids)))
$function$
;
CREATE OR REPLACE FUNCTION public.pooling_read_catalogue_admin(target_client text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.clients where id=target_client and "coachId"=auth.uid()) then raise exception 'forbidden';end if;
 return jsonb_build_object('canRelease',exists(select 1 from public.pooling_release_operators o where o.actor_id=auth.uid() and o.revoked_at is null and o.valid_until>clock_timestamp() and length(trim(o.evidence_reference))>0),
 'submissions',(select coalesce(jsonb_agg(to_jsonb(s) order by id desc),'[]') from public.pooling_catalogue_submissions s where s.client_id=target_client),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id desc),'[]') from public.pooling_catalogue_events e where exists(select 1 from public.pooling_catalogue_submissions s where s.client_id=target_client and s.document->'manifest'->>'id'=e.manifest_id)));
end $function$
;
CREATE OR REPLACE FUNCTION public.pooling_submit_catalogue(target_client text, operation_key text, release_document jsonb, review_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
