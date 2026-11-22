-- Add an atomic finish for the coach's live runner. Existing records are untouched.
begin;

create or replace function public.finish_live_workout(p_workout jsonb, p_expected jsonb, p_progress jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved public.workouts;
  workout_id text := p_workout->>'id';
  completion_id text := p_workout->'liveState'->>'completionId';
  duration_seconds integer := (p_workout->>'durationSec')::integer;
  effort jsonb := p_progress->'srpe';
  estimates jsonb := p_progress->'maxes';
  assessments jsonb := p_progress->'assessments';
begin
  if owner_id is null then raise exception 'Sign in before finishing a workout.'; end if;
  if coalesce(completion_id, '') = '' or p_workout->>'status' is distinct from 'completed'
    or duration_seconds is null or duration_seconds < 60 then
    raise exception 'A finished workout and its duration are required.';
  end if;
  if jsonb_typeof(effort) is distinct from 'array' or jsonb_typeof(estimates) is distinct from 'array'
    or jsonb_typeof(assessments) is distinct from 'array' then
    raise exception 'Finish records must be provided.';
  end if;

  select * into saved from public.workouts w where w.id = workout_id and w."coachId" = owner_id
    and exists (select 1 from public.clients c where c.id = w."clientId" and c."coachId" = owner_id)
    for update;
  if not found or (p_workout->>'clientId', p_workout->>'date', p_workout->>'bookingId')
    is distinct from (saved."clientId", saved.date, saved."bookingId") then
    raise exception 'The saved workout is no longer available.' using errcode = '40001';
  end if;

  -- A request whose response was lost can safely be replayed. The marker is
  -- written in the same transaction as all records, even when RPE was skipped.
  if saved."liveState"->>'completionId' is distinct from completion_id then
    if saved.status is distinct from 'in_progress' or p_expected->>'id' is distinct from workout_id
      or exists (
        select 1 from jsonb_each(p_expected - 'coachId' - 'requestHash') field
        where (to_jsonb(saved)->field.key) is distinct from field.value
      ) then
      raise exception 'This workout was changed in another window or device.' using errcode = '40001';
    end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(saved.warmup,'[]') || coalesce(saved.main,'[]') || coalesce(saved.cooldown,'[]')) item,
        jsonb_array_elements(coalesce(item->'setRows','[]')) old_set
      where old_set->>'done' = 'true' and not exists (
        select 1 from jsonb_array_elements((p_workout->'warmup') || (p_workout->'main') || (p_workout->'cooldown')) entry,
          jsonb_array_elements(coalesce(entry->'setRows','[]')) new_set where new_set = old_set
      )
    ) then
      raise exception 'Finishing cannot change a recorded set.' using errcode = '40001';
    end if;
    if jsonb_array_length(effort) > 1 or exists (
      select 1 from jsonb_populate_recordset(null::public.srpe, effort) row
      where (row."clientId", row.date, row."sessionId", row.source)
        is distinct from (saved."clientId", saved.date, saved."bookingId", 'Workout completion'::text)
        or row.rpe is null or row.rpe not between 1 and 10
        or row.duration is distinct from round(duration_seconds / 60.0)::integer
        or row.tl is distinct from row.rpe * row.duration
    ) then raise exception 'Invalid effort record for this workout.'; end if;
    if exists (
      select 1 from jsonb_populate_recordset(null::public.maxes, estimates) row
      where (row."clientId", row.date, row."sourceWorkoutId", row.kind, row.source)
        is distinct from (saved."clientId", saved.date, workout_id, 'e1rm'::text, 'auto'::text)
    ) then raise exception 'Invalid strength record for this workout.'; end if;
    if exists (
      select 1 from jsonb_populate_recordset(null::public.assessments, assessments) row
      where (row."clientId", row.date, row.data->>'sourceWorkoutId', row.type, row.phase)
        is distinct from (saved."clientId", saved.date, workout_id, 'fitness'::text, 'progress'::text)
        or not exists (select 1 from jsonb_array_elements(estimates) estimate
          where estimate->>'id' = row.data->>'sourceMaxId')
    ) then raise exception 'Invalid assessment for this workout.'; end if;

    perform public.save_live_workout(p_workout, p_expected);
    insert into public.srpe (id,"coachId","clientId",date,"sessionId",rpe,duration,tl,source)
      select id,owner_id,"clientId",date,"sessionId",rpe,duration,tl,source
      from jsonb_populate_recordset(null::public.srpe, effort);
    insert into public.maxes (id,"coachId","clientId",date,exercise,kind,"valueKg",source,"sourceWorkoutId")
      select id,owner_id,"clientId",date,exercise,kind,"valueKg",source,"sourceWorkoutId"
      from jsonb_populate_recordset(null::public.maxes, estimates);
    insert into public.assessments (id,"coachId","clientId",date,type,phase,data,notes)
      select id,owner_id,"clientId",date,type,phase,data,notes
      from jsonb_populate_recordset(null::public.assessments, assessments);
    select * into saved from public.workouts where id = workout_id and "coachId" = owner_id;
  end if;

  return jsonb_build_object('workout', to_jsonb(saved) - 'coachId' - 'requestHash', 'progress', jsonb_build_object(
    'srpe', (select coalesce(jsonb_agg(to_jsonb(s) - 'coachId'), '[]') from public.srpe s
      where s."coachId" = owner_id and s."clientId" = saved."clientId" and s.date = saved.date
        and s."sessionId" is not distinct from saved."bookingId" and s.source = 'Workout completion'
        and exists (select 1 from jsonb_array_elements(effort) e where e->>'id' = s.id)),
    'maxes', (select coalesce(jsonb_agg(to_jsonb(m) - 'coachId'), '[]') from public.maxes m
      where m."coachId" = owner_id and m."clientId" = saved."clientId" and m."sourceWorkoutId" = workout_id
        and exists (select 1 from jsonb_array_elements(estimates) e where e->>'id' = m.id)),
    'assessments', (select coalesce(jsonb_agg(to_jsonb(a) - 'coachId'), '[]') from public.assessments a
      where a."coachId" = owner_id and a."clientId" = saved."clientId" and a.data->>'sourceWorkoutId' = workout_id
        and exists (select 1 from jsonb_array_elements(assessments) e where e->>'id' = a.id))
  ));
end;
$$;

revoke all on function public.finish_live_workout(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.finish_live_workout(jsonb,jsonb,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
