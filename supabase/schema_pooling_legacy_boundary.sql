-- Conditional legacy boundary. Feature-off retains Classic policy behaviour;
-- R1 clients use minimal projections instead of raw protected source rows.
begin;
create or replace function public.pooling_enabled() returns boolean language sql stable security definer set search_path='' as
 $$select coalesce((select r1 from public.pooling_runtime where singleton),false)$$;
create or replace function public.pooling_linked(target_client text) returns boolean language sql stable security definer set search_path='' as
 $$select exists(select 1 from public.clients c where c.id=target_client and c."userId"=auth.uid())$$;
revoke all on function public.pooling_enabled(),public.pooling_linked(text) from public,anon;
grant execute on function public.pooling_enabled(),public.pooling_linked(text) to authenticated;
drop policy if exists athlete_reads_self on public.clients;
create policy athlete_reads_self on public.clients for select to authenticated using ("userId"=auth.uid() and not public.pooling_enabled());
drop policy if exists athlete_reads_assessments on public.assessments;
create policy athlete_reads_assessments on public.assessments for select to authenticated using (public.pooling_linked("clientId") and not public.pooling_enabled());
drop policy if exists athlete_reads_screenings on public.screenings;
create policy athlete_reads_screenings on public.screenings for select to authenticated using (public.pooling_linked("clientId") and not public.pooling_enabled());
do $$ declare t text; begin
 foreach t in array array['sessions','logs','wellness','srpe','resistance','cardio','wearable','concerns','prescriptions','workouts'] loop
   execute format('drop policy if exists athlete_reads on public.%I',t);
   execute format('create policy athlete_reads on public.%I for select to authenticated using (public.pooling_linked("clientId") and not public.pooling_enabled())',t);
 end loop;
end $$;

-- Direct client writes to private/raw R1 sources stop here. Guarded reports remain
-- available; no client-submitted clearance or workout target can become authority.
create or replace function public.pooling_guard_legacy_write() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; cid text; actor uuid:=auth.uid(); before_row jsonb; after_row jsonb;
begin
 if actor is null or not public.pooling_enabled() then if TG_OP='DELETE' then return old; else return new; end if; end if;
 before_row:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 after_row:=case when TG_OP='DELETE' then '{}'::jsonb else to_jsonb(new) end;
 cid:=coalesce(after_row->>'clientId',before_row->>'clientId');
 select * into c from public.clients where id=cid for update;
 if not found or (c."coachId" is distinct from actor and c."userId" is distinct from actor) then raise exception 'forbidden'; end if;
 if TG_OP='UPDATE' and before_row->>'clientId' is distinct from after_row->>'clientId' then raise exception 'client_reparent_forbidden'; end if;
 if TG_TABLE_NAME='workouts' then
   if TG_OP='UPDATE' and before_row->>'status'='in_progress' and after_row->>'status'='stopped' and (before_row-'status')=(after_row-'status') then return new; end if;
   raise exception 'governed_workflow_required';
 end if;
 if TG_TABLE_NAME='prescriptions' then raise exception 'governed_workflow_required'; end if;
 if c."coachId" is distinct from actor then raise exception 'guarded_report_required'; end if;
 if TG_OP<>'DELETE' and after_row->>'coachId' is distinct from c."coachId"::text then raise exception 'protected_field'; end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text; begin
 foreach t in array array['screenings','assessments','workouts','prescriptions','wellness','srpe','concerns','maxes','wearable'] loop
   execute format('drop trigger if exists pooling_legacy_guard on public.%I',t);
   execute format('create trigger pooling_legacy_guard before insert or update or delete on public.%I for each row execute function public.pooling_guard_legacy_write()',t);
 end loop;
end $$;
revoke all on function public.pooling_guard_legacy_write() from public,anon,authenticated;

create or replace function public.pooling_athlete_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; result jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden'; end if;
 if not public.pooling_enabled() then raise exception 'feature_disabled'; end if;
 -- Multiple links need explicit client selection, not an arbitrary first match.
 if (select count(*) from public.clients where "userId"=auth.uid())>1 then raise exception 'client_selection_required'; end if;
 select * into c from public.clients where "userId"=auth.uid();
 if not found then return '{"client":null}'; end if;
 result:=jsonb_build_object('client',jsonb_build_object('id',c.id,'coachId',c."coachId",'userId',c."userId",'name',c.name,'goal',c.goal,'level',c.level,'status',c.status),
   'assignments',public.pooling_read_assignments(c.id),'plans','[]'::jsonb,'exercises','[]'::jsonb,'prescriptions','[]'::jsonb,'workouts','[]'::jsonb,'screenings','[]'::jsonb,'assessments','[]'::jsonb,'wellness','[]'::jsonb,'srpe','[]'::jsonb,'sessions','[]'::jsonb,'wearable','[]'::jsonb,'wearable_tokens','[]'::jsonb,'maxes','[]'::jsonb,
   'sourceAvailability','protected_projection','message','Legacy private source records are not part of this client projection. Use attributed reports and coach-reviewed assignments.');
 return result;
end $$;
revoke all on function public.pooling_athlete_snapshot() from public,anon;
grant execute on function public.pooling_athlete_snapshot() to authenticated;
commit;
