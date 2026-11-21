-- Existing workouts remain unlinked. No workout, plan or booking rows are updated.
begin;
set local lock_timeout = '5s';

alter table public.workouts add column if not exists "bookingId" text
  references public.sessions(id) on delete no action;
create unique index if not exists workouts_booking_uidx on public.workouts ("bookingId")
  where "bookingId" is not null;

create or replace function public.guard_workout_booking()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old."bookingId" is distinct from new."bookingId" or
       (old."bookingId" is not null and (new.id, new."coachId", new."clientId", new.date)
         is distinct from (old.id, old."coachId", old."clientId", old.date)) then
      raise exception 'The workout booking, coach, client and date cannot change.';
    end if;
  end if;
  if new."bookingId" is null then return new; end if;
  if auth.uid() is distinct from new."coachId" then
    raise exception 'Only the booking coach can save this workout.';
  end if;
  if tg_op = 'INSERT' then
    perform 1 from public.sessions s where s.id=new."bookingId" and s."coachId"=new."coachId"
      and s."clientId"=new."clientId" and s.date=new.date
      and lower(s.type) in ('1-on-1 training','personal training') and s.status in ('Pending','Confirmed')
      for share;
    if not found then raise exception 'The training booking is unavailable for this workout.'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_workout_booking on public.workouts;
create trigger enforce_workout_booking before insert or update on public.workouts
  for each row execute function public.guard_workout_booking();

create or replace function public.guard_booking_with_workout()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (old.id, old."coachId", old."clientId", old.date, old.time, old.dur, old.type)
       is distinct from (new.id, new."coachId", new."clientId", new.date, new.time, new.dur, new.type)
     and exists(select 1 from public.workouts where "bookingId"=old.id) then
    raise exception 'A workout is linked to this booking. Keep its time, client and type.';
  end if;
  return new;
end;
$$;
drop trigger if exists preserve_booking_with_workout on public.sessions;
create trigger preserve_booking_with_workout before update on public.sessions
  for each row execute function public.guard_booking_with_workout();

-- Calendar writes are one transaction; prescription contents and templates are never replaced.
create or replace function public.save_schedule_booking(p_request jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); old_row jsonb := nullif(p_request->'original','null'::jsonb);
  new_row jsonb := nullif(p_request->'next','null'::jsonb); current_row jsonb;
  expected_plan jsonb := nullif(p_request->'plan','null'::jsonb); current_plan jsonb;
  expected_assignments jsonb := coalesce(p_request->'assignments','[]'::jsonb); current_assignments jsonb;
  client_id text := coalesce(old_row->>'clientId',new_row->>'clientId'); booking_id text := coalesce(old_row->>'id',new_row->>'id');
  zone text; now_local timestamp; changed boolean; old_training boolean;
  target_date date; start_min int; duration_min int; source_count int; booking_count int;
  conflicting record;
begin
  if owner_id is null then raise exception 'Sign in before changing the schedule.'; end if;
  perform 1 from public.clients where id=client_id and "coachId"=owner_id for update;
  if not found then raise exception 'Client unavailable.'; end if;
  -- Also serializes with ordinary writes from older application versions.
  lock table public.sessions, public.prescriptions, public.workouts, public."programAssignments" in share row exclusive mode;
  select to_jsonb(s)-'coachId' into current_row from public.sessions s where id=booking_id and "coachId"=owner_id;
  if current_row is distinct from old_row then raise exception 'Booking changed. Reload the schedule and reopen it.'; end if;
  select nullif(tz,'') into zone from public.settings where "coachId"=owner_id;
  now_local := current_timestamp at time zone coalesce(zone,'UTC');
  old_training := coalesce(lower(old_row->>'type') in ('1-on-1 training','personal training'),false);
  changed := old_row is null or new_row is null or (old_row->>'date',old_row->>'time',old_row->>'dur',old_row->>'type',old_row->>'clientId') is distinct from (new_row->>'date',new_row->>'time',new_row->>'dur',new_row->>'type',new_row->>'clientId');
  if old_row is not null and changed then
    if old_row->>'status' not in ('Pending','Confirmed') or ((old_row->>'date')||' '||(old_row->>'time'))::timestamp <= now_local then
      raise exception 'Session protected. Past or started bookings cannot be moved or deleted. Update the booking status instead.';
    end if;
    if old_training and exists(select 1 from public.workouts where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date' and ("bookingId" is null or "bookingId"=booking_id)) then
      raise exception 'Workout already recorded. Keep this booking in place and review Training.';
    end if;
  end if;
  if new_row is null then
    delete from public.sessions where id=booking_id and "coachId"=owner_id;
    return;
  end if;
  if new_row->>'clientId' is distinct from client_id or new_row->>'id' is distinct from booking_id then raise exception 'Client and booking identity cannot change.'; end if;
  if old_row is not null and changed and old_row->>'status' is distinct from new_row->>'status' then raise exception 'Change the schedule and booking status separately.'; end if;
  if new_row->>'status' is null or new_row->>'status' not in ('Pending','Confirmed','Completed','Cancelled','Missed') then raise exception 'Choose a valid booking status.'; end if;
  if new_row->>'date' is null or new_row->>'time' is null or new_row->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or new_row->>'time' !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'Choose a valid date and time.'; end if;
  target_date := (new_row->>'date')::date;
  duration_min := (new_row->>'dur')::int;
  start_min := split_part(new_row->>'time',':',1)::int * 60 + split_part(new_row->>'time',':',2)::int;
  if duration_min is null or duration_min < 15 or duration_min > 480 or start_min + duration_min > 1440 then raise exception 'Use 15–480 minutes, ending on the same day.'; end if;
  if changed and ((new_row->>'date')||' '||(new_row->>'time'))::timestamp <= now_local then raise exception 'Choose a future date and time.'; end if;
  if old_row is not null and old_training and old_row->>'type' is distinct from new_row->>'type' and exists(select 1 from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date') then raise exception 'Workout linked to this booking. Keep its training type.'; end if;
  if new_row->>'status' <> 'Cancelled' and (changed or old_row->>'status' = 'Cancelled') then
    for conflicting in select * from public.sessions where "coachId"=owner_id and id<>booking_id and date=new_row->>'date' and status<>'Cancelled' loop
      if start_min < split_part(conflicting.time,':',1)::int*60+split_part(conflicting.time,':',2)::int+conflicting.dur and split_part(conflicting.time,':',1)::int*60+split_part(conflicting.time,':',2)::int < start_min+duration_min then
        raise exception 'Coach time already occupied at %–%. Choose another time or shorten the session.', conflicting.time, conflicting.time::time + make_interval(mins=>conflicting.dur);
      end if;
    end loop;
  end if;
  if old_row is not null and old_training and old_row->>'date'<>new_row->>'date' then
    select count(*) into source_count from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date';
    select count(*) into booking_count from public.sessions where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date' and status<>'Cancelled' and lower(type) in ('1-on-1 training','personal training');
    if source_count>1 or source_count=1 and booking_count>1 then raise exception 'Workout link is ambiguous. Review the original day before moving.'; end if;
    select to_jsonb(p)-'coachId' into current_plan from public.prescriptions p where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date';
    -- A date-based prescription may still move under the original rules.
    if current_plan is not null and new_row->>'status'<>'Cancelled' then
      if exists(select 1 from public.workouts where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date') then
        raise exception 'Workout already recorded. The prescription cannot move onto this day.';
      end if;
      if exists(select 1 from public.sessions where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date' and status='Completed') then
        raise exception 'Day already completed. The prescription cannot move onto this day.';
      end if;
      if exists(select 1 from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date') or exists(select 1 from public."programAssignments" a, jsonb_array_elements(a.data->'schedule') s where a."coachId"=owner_id and a."clientId"=client_id and s->>'date'=new_row->>'date') then
        raise exception 'Day already prescribed. Open the existing workout or choose an unprescribed day.';
      end if;
    end if;
  end if;
  if current_plan is distinct from expected_plan then raise exception 'The workout changed. Reopen the booking and try again.'; end if;
  select coalesce(jsonb_agg(to_jsonb(a)-'coachId'-'requestHash' order by a.id),'[]'::jsonb) into current_assignments from public."programAssignments" a
    where a."coachId"=owner_id and exists(select 1 from jsonb_array_elements(a.data->'schedule') s where s->>'prescriptionId'=current_plan->>'id');
  select coalesce(jsonb_agg(a order by a->>'id'),'[]'::jsonb) into expected_assignments from jsonb_array_elements(expected_assignments) a;
  if current_assignments is distinct from expected_assignments then raise exception 'The program changed. Reopen the booking and try again.'; end if;
  if current_plan is not null then
    update public.prescriptions set date=new_row->>'date' where id=current_plan->>'id' and "coachId"=owner_id;
    update public."programAssignments" a set data=jsonb_set(a.data,'{schedule}',(select jsonb_agg(case when s->>'prescriptionId'=current_plan->>'id' then jsonb_set(s,'{date}',new_row->'date') else s end order by ord) from jsonb_array_elements(a.data->'schedule') with ordinality t(s,ord)))
      where a."coachId"=owner_id and exists(select 1 from jsonb_array_elements(a.data->'schedule') s where s->>'prescriptionId'=current_plan->>'id');
  end if;
  if old_row is null then
    insert into public.sessions(id,"clientId",date,time,type,dur,status) values(booking_id,client_id,new_row->>'date',new_row->>'time',new_row->>'type',duration_min,new_row->>'status');
  else
    update public.sessions set date=new_row->>'date',time=new_row->>'time',type=new_row->>'type',dur=duration_min,status=new_row->>'status' where id=booking_id and "coachId"=owner_id;
  end if;
end;
$$;
revoke all on function public.save_schedule_booking(jsonb) from public, anon;
grant execute on function public.save_schedule_booking(jsonb) to authenticated;

-- Row policies still control every read/write. A stale editor must reload before
-- it can overwrite newer work from another device. Retries are idempotent.
create or replace function public.save_live_workout(p_workout jsonb, p_expected jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  current_row public.workouts;
  current_json jsonb;
  requested jsonb := p_workout - 'coachId' - 'requestHash';
  expected jsonb := p_expected - 'coachId' - 'requestHash';
begin
  if auth.uid() is null then raise exception 'Sign in before saving a workout.'; end if;
  if jsonb_typeof(requested) <> 'object' or coalesce(requested->>'id', '') = '' then
    raise exception 'A workout identity is required.';
  end if;
  -- Maintain the same table lock order as scheduling when a booking workout is created.
  if p_expected is null and requested->>'bookingId' is not null then
    lock table public.sessions in share mode;
  end if;
  select * into current_row from public.workouts where id = requested->>'id' for update;
  if not found then
    if p_expected is not null then raise exception 'Workout changed or is no longer accessible. Reload before saving.'; end if;
    insert into public.workouts select * from jsonb_populate_record(null::public.workouts,
      p_workout || jsonb_build_object('coachId', coalesce(p_workout->>'coachId', auth.uid()::text)));
    return;
  end if;
  current_json := to_jsonb(current_row) - 'coachId' - 'requestHash';
  if not exists (select 1 from jsonb_each(requested) field where current_json->field.key is distinct from field.value) then return; end if;
  if expected is null or exists (select 1 from jsonb_each(expected) field where current_json->field.key is distinct from field.value) then
    raise exception 'This workout was changed in another window or device. Reload before saving your changes.';
  end if;
  if requested->>'clientId' is distinct from current_row."clientId" or
     requested->>'date' is distinct from current_row.date then
    raise exception 'The workout client and date cannot change.';
  end if;
  if requested ? 'bookingId' and requested->>'bookingId' is distinct from current_row."bookingId" then
    raise exception 'The workout booking cannot change.';
  end if;
  if current_row."liveState"->'original' is not null and
    requested->'liveState'->'original' is distinct from current_row."liveState"->'original' then
    raise exception 'The original workout snapshot cannot change.';
  end if;
  update public.workouts set
    title = requested->>'title', note = requested->>'note', status = requested->>'status',
    "startedAt" = requested->>'startedAt', "endedAt" = requested->>'endedAt',
    "durationSec" = (requested->>'durationSec')::integer,
    "hrAvg" = (requested->>'hrAvg')::integer, "hrMax" = (requested->>'hrMax')::integer,
    warmup = requested->'warmup', main = requested->'main', cooldown = requested->'cooldown',
    "liveState" = requested->'liveState'
  where id = current_row.id;
end;
$$;
revoke all on function public.save_live_workout(jsonb,jsonb) from public, anon;
grant execute on function public.save_live_workout(jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
