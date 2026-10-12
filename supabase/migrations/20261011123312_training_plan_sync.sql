-- Requires protected_schedule and program_training_times migrations.
-- Profile timing, builder prescriptions, and missing appointments commit together.
create or replace function public.save_training_plan_batch(p_request jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); change jsonb; row_next jsonb; row_old jsonb; current_row jsonb;
  c jsonb; timing jsonb; b jsonb; client_id text; row_id text; local_today text; zone text;
begin
  if owner_id is null then raise exception 'Sign in before saving training.'; end if;
  if jsonb_typeof(p_request->'plans') is distinct from 'array' or jsonb_typeof(p_request->'clients') is distinct from 'array'
     or jsonb_typeof(p_request->'bookings') is distinct from 'array' or jsonb_typeof(p_request->'timings') is distinct from 'array' then raise exception 'Invalid training request.'; end if;
  -- Lock clients first in a stable order, consistent with other calendar writers.
  for client_id in select distinct id from (
    select value->>'id' as id from jsonb_array_elements(p_request->'clients')
    union select coalesce(value->'next'->>'clientId',value->'original'->>'clientId') from jsonb_array_elements(p_request->'plans')
    union select value->>'clientId' from jsonb_array_elements(p_request->'timings')
    union select value->>'clientId' from jsonb_array_elements(p_request->'bookings')) ids order by id loop
    perform 1 from public.clients where id=client_id and "coachId"=owner_id for update;
    if not found then raise exception 'Client unavailable.'; end if;
  end loop;
  lock table public.sessions, public.prescriptions, public.workouts, public."programAssignments" in share row exclusive mode;
  select nullif(tz,'') into zone from public.settings where "coachId"=owner_id;
  local_today := to_char(current_timestamp at time zone coalesce(zone,'UTC'),'YYYY-MM-DD');
  for c in select value from jsonb_array_elements(p_request->'clients') loop
    select coalesce(intake,'{}'::jsonb) into current_row from public.clients where id=c->>'id' and "coachId"=owner_id;
    if (c->'intake')-'trainingSchedule' is distinct from (c->'expectedIntake')-'trainingSchedule' then raise exception 'Only training timing can change here.'; end if;
    if current_row is distinct from c->'expectedIntake' and current_row is distinct from c->'intake' then raise exception 'Profile changed. Reload before saving.'; end if;
    timing := nullif(c->'intake'->'trainingSchedule','null'::jsonb);
    if timing is not null then
      if timing->>'time' is null or timing->>'time' !~ '^([01]\d|2[0-3]):[0-5]\d$' or jsonb_typeof(timing->'duration') is distinct from 'number'
        or (timing->>'duration')::numeric <> trunc((timing->>'duration')::numeric) or (timing->>'duration')::int not between 15 and 480
        or split_part(timing->>'time',':',1)::int*60+split_part(timing->>'time',':',2)::int+(timing->>'duration')::int>1440 then raise exception 'Choose a valid training time and duration ending on the same day.'; end if;
    end if;
    update public.clients set intake=c->'intake' where id=c->>'id' and "coachId"=owner_id;
  end loop;
  for c in select value from jsonb_array_elements(p_request->'timings') loop
    select nullif(intake->'trainingSchedule','null'::jsonb) into timing from public.clients where id=c->>'clientId' and "coachId"=owner_id;
    if timing is distinct from nullif(c->'timing','null'::jsonb) then raise exception 'Profile training time changed. Reload before saving.'; end if;
  end loop;
  for change in select value from jsonb_array_elements(p_request->'plans') loop
    row_next := nullif(change->'next','null'::jsonb); row_old := nullif(change->'original','null'::jsonb);
    row_id := coalesce(row_next->>'id',row_old->>'id'); client_id := coalesce(row_next->>'clientId',row_old->>'clientId');
    if row_id is null or client_id is null then raise exception 'Invalid workout identity.'; end if;
    if row_old is not null and row_next is not null and (row_old->>'id',row_old->>'clientId',row_old->>'date') is distinct from (row_next->>'id',row_next->>'clientId',row_next->>'date') then raise exception 'Move workouts through Schedule.'; end if;
    select to_jsonb(p)-'coachId' into current_row from public.prescriptions p where id=row_id and "coachId"=owner_id;
    if jsonb_strip_nulls(current_row) is distinct from jsonb_strip_nulls(row_old) then
      if jsonb_strip_nulls(current_row) is not distinct from jsonb_strip_nulls(row_next) then continue; end if;
      raise exception 'Workout changed. Reload before saving.';
    end if;
    if exists(select 1 from public.workouts where "coachId"=owner_id and "clientId"=client_id and date=coalesce(row_next->>'date',row_old->>'date'))
      or exists(select 1 from public.sessions where "coachId"=owner_id and "clientId"=client_id and date=coalesce(row_next->>'date',row_old->>'date') and status='Completed') then raise exception 'Workout or completed appointment is protected.'; end if;
    if row_next is null then
      delete from public.prescriptions where id=row_id and "coachId"=owner_id;
    else
      if row_next->>'date' is null or row_next->>'date'<local_today or to_char((row_next->>'date')::date,'YYYY-MM-DD')<>row_next->>'date'
         or nullif(trim(row_next->>'name'),'') is null or jsonb_typeof(row_next->'blocks') is distinct from 'array' then raise exception 'Choose a valid future training day and workout.'; end if;
      if current_row is null then
        if exists(select 1 from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=row_next->>'date') then raise exception 'Day already prescribed. Reload the workout.'; end if;
        insert into public.prescriptions(id,"clientId",date,name,notes,blocks,items) values(row_id,client_id,row_next->>'date',row_next->>'name',row_next->>'notes',row_next->'blocks',row_next->'items');
      else
        update public.prescriptions set name=row_next->>'name',notes=row_next->>'notes',blocks=row_next->'blocks',items=row_next->'items' where id=row_id and "coachId"=owner_id;
      end if;
    end if;
  end loop;
  for b in select value from jsonb_array_elements(p_request->'bookings') loop
    select intake->'trainingSchedule' into timing from public.clients where id=b->>'clientId' and "coachId"=owner_id;
    if timing is null or timing='null'::jsonb or b->>'time' is distinct from timing->>'time' or b->'dur' is distinct from timing->'duration'
      or b->>'status' is distinct from 'Confirmed' or b->>'type' is distinct from 'Personal training'
      or not exists(select 1 from public.prescriptions where "coachId"=owner_id and "clientId"=b->>'clientId' and date=b->>'date') then raise exception 'Booking does not match the workout and Profile time.'; end if;
    select to_jsonb(s)-'coachId' into current_row from public.sessions s where id=b->>'id' and "coachId"=owner_id;
    if current_row is not null then
      if (current_row->>'id',current_row->>'clientId',current_row->>'date',current_row->>'time',current_row->'dur',current_row->>'status',current_row->>'type') is not distinct from (b->>'id',b->>'clientId',b->>'date',b->>'time',b->'dur',b->>'status',b->>'type') then continue; end if;
      raise exception 'Booking changed. Reload Schedule; nothing was overwritten.';
    end if;
    begin
      perform public.save_schedule_booking(jsonb_build_object('original',null,'next',b,'plan',null,'assignments','[]'::jsonb));
    exception when others then raise exception '%: % Resolve the conflict in Schedule or change the Profile time. Nothing was changed.',b->>'date',sqlerrm; end;
  end loop;
end;
$$;
revoke all on function public.save_training_plan_batch(jsonb) from public,anon;
grant execute on function public.save_training_plan_batch(jsonb) to authenticated;
