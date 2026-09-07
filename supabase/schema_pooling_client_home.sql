-- Client-safe reports/history; no raw screening or private coach notes.
begin;
create or replace function public.pooling_client_home(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 if not public.pooling_enabled() then raise exception 'feature_disabled'; end if;
 return jsonb_build_object('context',(select jsonb_build_object('generation',generation,'held',held) from public.pooling_contexts where client_id=target_client),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'field',r.field,'value',r.value,'effectiveAt',r.effective_at,'recordedAt',r.recorded_at,'reporterKind',r.reporter_kind) order by r.id desc),'[]') from public.pooling_reports r where r.client_id=target_client and (r.actor_id=auth.uid() or c."coachId"=auth.uid())),
  'classicHistory',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'status',w.status,'durationSeconds',w."durationSec") order by w.date desc),'[]') from public.workouts w where w."clientId"=target_client));
end $$;
create or replace function public.pooling_stop_legacy(target_client text,target_workout text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; w public.workouts%rowtype;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 select * into w from public.workouts where id=target_workout and "clientId"=target_client for update;
 if not found then raise exception 'forbidden'; end if;
 if w.status='stopped' then return jsonb_build_object('workoutId',w.id,'status','committed');end if;
 if w.status is distinct from 'in_progress' then raise exception 'invalid_transition'; end if;
 update public.workouts set status='stopped' where id=w.id;
 return jsonb_build_object('workoutId',w.id,'status','committed');
end $$;
revoke all on function public.pooling_client_home(text),public.pooling_stop_legacy(text,text) from public,anon;
grant execute on function public.pooling_client_home(text),public.pooling_stop_legacy(text,text) to authenticated;
commit;
