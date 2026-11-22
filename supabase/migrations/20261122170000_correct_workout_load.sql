begin;

create or replace function public.correct_completed_workout(
  p_workout jsonb, p_expected jsonb, p_effort jsonb, p_strength jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved public.workouts;
  workout_id text := p_workout->>'id';
  effort_id text := 'workout-rpe:' || workout_id;
  existing_effort public.srpe;
  effort_found boolean;
  new_effort public.srpe;
  duration_seconds integer := (p_workout->>'durationSec')::integer;
  minutes integer;
  has_effort boolean := nullif(p_effort, 'null'::jsonb) is not null;
  has_strength boolean := nullif(p_strength, 'null'::jsonb) is not null;
  estimates jsonb := p_strength->'maxes';
  assessments jsonb := p_strength->'assessments';
begin
  select * into saved from public.workouts w
    where w.id = workout_id and w."coachId" = owner_id and w.status = 'completed'
      and exists (select 1 from public.clients c where c.id = w."clientId" and c."coachId" = owner_id)
    for update;
  if not found or p_expected->>'id' is distinct from workout_id
    or exists (select 1 from jsonb_each(p_expected - 'coachId' - 'requestHash') f
      where to_jsonb(saved)->f.key is distinct from f.value)
    then raise exception 'This workout changed. Reopen the saved workout before editing it.' using errcode = '40001';
  end if;
  if (p_workout - 'coachId' - 'requestHash' - 'title' - 'note' - 'durationSec' - 'warmup' - 'main' - 'cooldown')
    is distinct from (to_jsonb(saved) - 'coachId' - 'requestHash' - 'title' - 'note' - 'durationSec' - 'warmup' - 'main' - 'cooldown') then
    raise exception 'The workout identity and original snapshot cannot change.';
  end if;
  if duration_seconds is distinct from saved."durationSec" and (duration_seconds is null or duration_seconds < 60) then
    raise exception 'Enter the workout duration in whole minutes.';
  end if;
  if has_strength is distinct from (p_workout->'main' is distinct from to_jsonb(saved)->'main')
    then raise exception 'Strength corrections must match the recorded sets.';
  end if;
  if has_strength and (
    jsonb_typeof(estimates) is distinct from 'array' or jsonb_typeof(assessments) is distinct from 'array'
    or exists (
      select 1 from jsonb_populate_recordset(null::public.maxes, estimates) row
      where (row."clientId", row.date, row."sourceWorkoutId", row.kind, row.source)
        is distinct from (saved."clientId", saved.date, workout_id, 'e1rm'::text, 'auto'::text)
    ) or exists (
      select 1 from jsonb_populate_recordset(null::public.assessments, assessments) row
      where (row."clientId", row.date, row.data->>'sourceWorkoutId', row.type, row.phase)
        is distinct from (saved."clientId", saved.date, workout_id, 'fitness'::text, 'progress'::text)
        or not exists (select 1 from jsonb_array_elements(estimates) m where m->>'id' = row.data->>'sourceMaxId')
    )
  ) then raise exception 'Invalid strength records for this workout.'; end if;

  if has_effort then
    begin
      select * into strict existing_effort from public.srpe s
        where s."coachId" = owner_id and s."clientId" = saved."clientId" and s.date = saved.date
          and s.source = 'Workout completion' and s."sessionId" is not distinct from saved."bookingId"
          and (saved."bookingId" is not null or s.id = effort_id) for update;
      effort_found := true;
    exception
      when no_data_found then effort_found := false;
      when too_many_rows then raise exception 'More than one effort record is linked to this workout.';
    end;
    if nullif(p_effort->'expected', 'null'::jsonb) is distinct from
      (case when effort_found then to_jsonb(existing_effort) - 'coachId' end) then
      raise exception 'The session RPE changed. Reopen the saved workout before editing it.' using errcode = '40001';
    end if;
    if effort_found and jsonb_typeof(p_effort->'row') is distinct from 'object' then
      raise exception 'Enter a session RPE from 1 to 10.';
    end if;
    if jsonb_typeof(p_effort->'row') = 'object' then
      new_effort := jsonb_populate_record(null::public.srpe, p_effort->'row');
      minutes := case when duration_seconds > 0 then greatest(1, round(duration_seconds / 60.0)::integer)
        when duration_seconds is not distinct from saved."durationSec" and new_effort.rpe = existing_effort.rpe
        then existing_effort.duration end;
      if (new_effort.id, new_effort."clientId", new_effort.date, new_effort."sessionId", new_effort.source)
        is distinct from (coalesce(existing_effort.id, effort_id), saved."clientId", saved.date, saved."bookingId", 'Workout completion'::text)
        or new_effort.rpe is null or new_effort.rpe not between 1 and 10 or minutes is null or minutes < 1
        or new_effort.duration is distinct from minutes or new_effort.tl is distinct from new_effort.rpe * minutes then
        raise exception 'Invalid session RPE records for this workout.';
      end if;
      if not effort_found and saved."bookingId" is null and exists (
        select 1 from public.srpe s where s."coachId" = owner_id and s."clientId" = saved."clientId" and s.date = saved.date
          and s."sessionId" is null and s.id not like 'workout-rpe:%' and s.source in ('Workout completion', 'Client workout')
      ) then raise exception 'An older effort record can’t be linked to this workout.'; end if;
    end if;
  end if;

  perform public.save_live_workout(p_workout, p_expected);
  if has_effort then
    if not effort_found and new_effort.id is not null then
      insert into public.srpe (id,"coachId","clientId",date,"sessionId",rpe,duration,tl,source)
        values (new_effort.id,owner_id,saved."clientId",saved.date,saved."bookingId",new_effort.rpe,minutes,new_effort.rpe * minutes,'Workout completion');
    elsif effort_found and (existing_effort.rpe, existing_effort.duration, existing_effort.tl)
      is distinct from (new_effort.rpe, minutes, new_effort.rpe * minutes) then
      update public.srpe set rpe = new_effort.rpe, duration = minutes, tl = new_effort.rpe * minutes
        where id = existing_effort.id and "coachId" = owner_id;
    end if;
  end if;
  if has_strength then
    delete from public.assessments a where a."coachId" = owner_id and a."clientId" = saved."clientId"
      and a.data->>'sourceWorkoutId' = workout_id;
    delete from public.maxes m where m."coachId" = owner_id and m."clientId" = saved."clientId"
      and m."sourceWorkoutId" = workout_id;
    insert into public.maxes (id,"coachId","clientId",date,exercise,kind,"valueKg",source,"sourceWorkoutId")
      select id,owner_id,"clientId",date,exercise,kind,"valueKg",source,"sourceWorkoutId"
      from jsonb_populate_recordset(null::public.maxes, estimates);
    insert into public.assessments (id,"coachId","clientId",date,type,phase,data,notes)
      select id,owner_id,"clientId",date,type,phase,data,notes
      from jsonb_populate_recordset(null::public.assessments, assessments);
  end if;
end;
$$;

revoke all on function public.correct_completed_workout(jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.correct_completed_workout(jsonb,jsonb,jsonb,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
