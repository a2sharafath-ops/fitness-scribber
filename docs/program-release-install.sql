-- Production release setup, prepared 2026-10-11; requires approval before execution.
-- Delete ONLY the six reviewed duplicate prescriptions for Sharafath (ihw9kzb).
-- Full row snapshots remain private for administrator recovery. No workouts, logs,
-- bookings or clients are deleted. Existing triggers remain enabled.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select 1 from public.clients where id='ihw9kzb' for update;
lock table public.prescriptions in share row exclusive mode;
create temporary table release_expected (id text primary key,date text,fingerprint text) on commit drop;
insert into release_expected values
('x10w7ic','2026-07-21','45e8ba9261685baa37b72839791e91b4'),
('xy6i31n','2026-07-23','c192380bbca13c086db05c3443869b4e'),
('wi3x83n','2026-07-24','57b293084f6fbc9c8b47e2c314554f8e'),
('sd50-presc-34','2026-07-21','71c04f02b6c6e2e769b1439e8695b2c9'),
('sd50-presc-36','2026-07-23','d70204afa91d2dee0eec9c751b539783'),
('sd50-presc-37','2026-07-24','7042da2f3aab5524ea51585a7038bd43');
do $$ begin
 if (select count(*) from public.prescriptions p join release_expected e using(id)
     where p."clientId"='ihw9kzb' and p.date=e.date and md5(to_jsonb(p)::text)=e.fingerprint) <> 6 then
   raise exception 'Reviewed plans changed. Nothing removed; recheck the six plans.';
 end if;
 if exists(select 1 from public.workouts w join release_expected e on w."planId"=e.id) then
   raise exception 'A workout references a reviewed plan. Nothing removed; review the workout first.';
 end if;
end $$;
create schema if not exists app_private;
create table if not exists app_private.release_prescription_backup (
 id text primary key, archived_at timestamptz not null default now(), reason text not null, row_data jsonb not null
);
alter table app_private.release_prescription_backup enable row level security;
revoke all on app_private.release_prescription_backup from public,anon,authenticated;
insert into app_private.release_prescription_backup(id,reason,row_data)
 select p.id,'User-approved duplicate-plan cleanup, 2026-10-11',to_jsonb(p)
 from public.prescriptions p join release_expected e using(id);
delete from public.prescriptions p using release_expected e where p.id=e.id and p."clientId"='ihw9kzb';
do $$ begin
 if exists(select 1 from public.prescriptions p join release_expected e using(id)) then
   raise exception 'Cleanup incomplete; rolling back.';
 end if;
 if exists(select 1 from public.prescriptions group by "coachId","clientId",date having count(*)>1) then
   raise exception 'Other duplicate plan dates exist; rolling back for review.';
 end if;
end $$;

-- Source: supabase/schema_program_library.sql
-- Multi-week Programs. Run after schema.sql, schema_program.sql and schema_workouts.sql.
-- Local preview does not need this file. This setup is intentionally not applied remotely.

create table if not exists public.programs (
  id text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  data jsonb not null check (jsonb_typeof(data->'weeks') = 'array')
);
create table if not exists public."programAssignments" (
  id text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text not null references public.clients(id) on delete cascade,
  name text not null,
  "requestHash" text,
  data jsonb not null check (jsonb_typeof(data->'schedule') = 'array')
);
alter table public."programAssignments" add column if not exists "requestHash" text;
create index if not exists programs_coach_idx on public.programs ("coachId");
create index if not exists program_assignments_client_idx on public."programAssignments" ("coachId", "clientId");
create index if not exists program_assignments_fk_idx on public."programAssignments" ("clientId");
-- Fail setup rather than silently choose one of any pre-existing duplicate dates.
create unique index if not exists prescriptions_coach_client_date_unique on public.prescriptions ("coachId", "clientId", date);
alter table public.programs enable row level security;
alter table public."programAssignments" enable row level security;
drop policy if exists coach_owns on public.programs;
create policy coach_owns on public.programs for all to authenticated
  using ("coachId" = (select auth.uid())) with check ("coachId" = (select auth.uid()));
drop policy if exists coach_owns on public."programAssignments";
create policy coach_owns on public."programAssignments" for all to authenticated
  using ("coachId" = (select auth.uid()))
  with check ("coachId" = (select auth.uid()) and exists (
    select 1 from public.clients c where c.id = "clientId" and c."coachId" = (select auth.uid())
  ));
revoke all on public.programs, public."programAssignments" from anon;
grant select, insert, update, delete on public.programs, public."programAssignments" to authenticated;

-- Serialize calendar writes against assignment preflight, including an athlete
-- starting a workout concurrently. Definer is only used for this narrow lock;
-- it never changes rows or grants access to client data. Original RLS still applies.
create or replace function public.lock_program_calendar_client() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.clients where id = coalesce(new."clientId", old."clientId") for update;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.lock_program_calendar_client() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['prescriptions','workouts','sessions'] loop
    execute format('drop trigger if exists program_calendar_lock on public.%I', t);
    execute format('create trigger program_calendar_lock before insert or update or delete on public.%I for each row execute function public.lock_program_calendar_client()', t);
  end loop;
end $$;

create or replace function public.assign_program(p_assignment jsonb, p_rows jsonb, p_expected jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  client_id text := p_assignment->>'clientId';
  existing public."programAssignments";
  r jsonb; current_row jsonb; expected_row jsonb; i integer := 0;
  tz text; today text;
begin
  if owner_id is null then raise exception 'Sign in before assigning a program.'; end if;
  perform 1 from public.clients where id = client_id and "coachId" = owner_id for update;
  if not found then raise exception 'Client not found.'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 364
     or jsonb_typeof(p_expected) is distinct from 'array' or jsonb_array_length(p_expected) <> jsonb_array_length(p_rows)
     or jsonb_array_length(p_assignment->'data'->'schedule') <> jsonb_array_length(p_rows) then
    raise exception 'Invalid program schedule.';
  end if;
  select * into existing from public."programAssignments" where id = p_assignment->>'id';
  if found then
    if (to_jsonb(existing) - 'coachId' - 'requestHash') is distinct from p_assignment then raise exception 'Assignment ID already used.'; end if;
    if existing."requestHash" is distinct from md5(p_rows::text) then
      raise exception 'The assignment was already saved with different sessions. Review the saved copy before retrying.';
    end if;
    -- Retry after a lost response: never overwrite later client edits.
    return;
  end if;
  select nullif(s.tz, '') into tz from public.settings s where s."coachId" = owner_id;
  today := to_char(current_timestamp at time zone coalesce(tz, 'UTC'), 'YYYY-MM-DD');
  if (select count(distinct x->>'date') from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows)
     or (select count(distinct x->>'id') from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows) then
    raise exception 'Program dates and session IDs must be unique.';
  end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    if r->>'clientId' is distinct from client_id or r->>'date' is null or r->>'date' < today
       or to_char((r->>'date')::date, 'YYYY-MM-DD') <> r->>'date'
       or nullif(trim(r->>'name'), '') is null or jsonb_typeof(r->'blocks') is distinct from 'array'
       or not exists (select 1 from jsonb_array_elements(p_assignment->'data'->'schedule') s
                      where s->>'prescriptionId' = r->>'id' and s->>'date' = r->>'date') then
      raise exception 'Invalid session or past date.';
    end if;
    if exists (select 1 from public.workouts w where w."clientId" = client_id and w.date = r->>'date')
      or exists (select 1 from public.sessions s where s."clientId" = client_id and s.date = r->>'date' and lower(s.status) = 'completed')
      or exists (select 1 from public."programAssignments" a, jsonb_array_elements(a.data->'schedule') s
                 where a."clientId" = client_id and s->>'date' = r->>'date') then
      raise exception 'A date is occupied by a protected workout or another program.';
    end if;
    select to_jsonb(p) - 'coachId' into current_row from public.prescriptions p
      where p."coachId" = owner_id and p."clientId" = client_id and p.date = r->>'date' for update;
    expected_row := nullif(p_expected->i, 'null'::jsonb);
    -- Compare only persisted prescription fields. Missing optional fields and SQL
    -- null are equivalent; normalize to the same row shape as PostgREST.
    if (current_row is null) <> (expected_row is null) or (current_row is not null and (
      current_row->>'id' is distinct from expected_row->>'id' or current_row->>'name' is distinct from expected_row->>'name'
      or current_row->>'notes' is distinct from expected_row->>'notes'
      or coalesce(current_row->'blocks', '[]') is distinct from coalesce(expected_row->'blocks', '[]')
      or coalesce(current_row->'items', '[]') is distinct from coalesce(expected_row->'items', '[]'))) then
      raise exception 'The calendar changed. Reload and review the assignment.';
    end if;
    if current_row is not null and current_row->>'id' <> r->>'id' then raise exception 'Session identity changed.'; end if;
    if current_row is null then
      insert into public.prescriptions (id, "clientId", date, name, notes, items, blocks)
        values (r->>'id', client_id, r->>'date', r->>'name', r->>'notes', r->'items', r->'blocks');
    else
      update public.prescriptions set name = r->>'name', notes = r->>'notes', items = r->'items', blocks = r->'blocks'
        where id = r->>'id' and "coachId" = owner_id;
    end if;
    i := i + 1;
  end loop;
  insert into public."programAssignments" (id, "clientId", name, data, "requestHash")
    values (p_assignment->>'id', client_id, p_assignment->>'name', p_assignment->'data', md5(p_rows::text));
end;
$$;
revoke all on function public.assign_program(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.assign_program(jsonb, jsonb, jsonb) to authenticated;


-- Source: supabase/schema_session_name.sql
-- Classic workout planner: trainer-facing name kept separate from session notes.
-- Safe to run more than once before deploying the matching client build.
alter table public.prescriptions add column if not exists "name" text;

-- Source: supabase/migrations/20261011102502_protected_schedule.sql
-- Apply only after schema_program_library.sql. Not applied to any live database.
-- Calendar writes are one transaction; prescription contents and templates are never replaced.
create or replace function public.save_schedule_booking(p_request jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); old_row jsonb := nullif(p_request->'original','null'::jsonb);
  new_row jsonb := nullif(p_request->'next','null'::jsonb); current_row jsonb;
  expected_plan jsonb := nullif(p_request->'plan','null'::jsonb); current_plan jsonb;
  expected_assignments jsonb := coalesce(p_request->'assignments','[]'::jsonb); current_assignments jsonb;
  client_id text := coalesce(old_row->>'clientId',new_row->>'clientId'); booking_id text := coalesce(old_row->>'id',new_row->>'id');
  zone text; now_local timestamp; changed boolean; old_training boolean; new_training boolean;
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
  new_training := coalesce(lower(new_row->>'type') in ('1-on-1 training','personal training'),false);
  changed := old_row is null or new_row is null or (old_row->>'date',old_row->>'time',old_row->>'dur',old_row->>'type',old_row->>'clientId') is distinct from (new_row->>'date',new_row->>'time',new_row->>'dur',new_row->>'type',new_row->>'clientId');
  if old_row is not null and changed then
    if old_row->>'status' not in ('Pending','Confirmed') or ((old_row->>'date')||' '||(old_row->>'time'))::timestamp <= now_local then
      raise exception 'Session protected. Past or started bookings cannot be moved or deleted. Update the booking status instead.';
    end if;
    if old_training and exists(select 1 from public.workouts where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date') then
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
      if new_training and conflicting."clientId"=client_id and lower(conflicting.type) in ('1-on-1 training','personal training') then raise exception 'Client already has a training booking on this day. Choose another day.'; end if;
    end loop;
    if new_training and (old_row is null or old_row->>'date'<>new_row->>'date') and exists(select 1 from public.workouts where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date') then raise exception 'Workout already recorded on this day. Choose another day.'; end if;
    if new_training and (old_row is null or old_row->>'date'<>new_row->>'date') and exists(select 1 from public.sessions where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date' and id<>booking_id and status='Completed') then raise exception 'Day already completed. Choose another day or review its recorded status.'; end if;
    if old_row is not null and old_training and old_row->>'date'<>new_row->>'date' then
      if exists(select 1 from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=new_row->>'date') or exists(select 1 from public."programAssignments" a, jsonb_array_elements(a.data->'schedule') s where a."coachId"=owner_id and a."clientId"=client_id and s->>'date'=new_row->>'date') then
        raise exception 'Day already prescribed. Open the existing workout or choose an unprescribed day.';
      end if;
    end if;
  end if;
  if old_row is not null and old_training and old_row->>'date'<>new_row->>'date' then
    select count(*) into source_count from public.prescriptions where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date';
    select count(*) into booking_count from public.sessions where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date' and status<>'Cancelled' and lower(type) in ('1-on-1 training','personal training');
    if source_count>1 or source_count=1 and booking_count>1 then raise exception 'Workout link is ambiguous. Review the original day before moving.'; end if;
    select to_jsonb(p)-'coachId' into current_plan from public.prescriptions p where "coachId"=owner_id and "clientId"=client_id and date=old_row->>'date';
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


-- Source: supabase/migrations/20261011122215_program_training_times.sql
-- Requires schema_program_library.sql and 20261011102502_protected_schedule.sql.
-- One transaction creates the client program copy and all its appointments.
create or replace function public.assign_program_scheduled(p_assignment jsonb, p_rows jsonb, p_expected jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); client_id text := p_assignment->>'clientId';
  timing jsonb; bookings jsonb := p_assignment->'data'->'initialBookings';
  booking jsonb; already_saved boolean; target_date text;
begin
  if owner_id is null then raise exception 'Sign in before assigning a program.'; end if;
  select c.intake->'trainingSchedule' into timing from public.clients c where c.id=client_id and c."coachId"=owner_id for update;
  if not found then raise exception 'Client not found.'; end if;
  lock table public.sessions, public.prescriptions, public.workouts, public."programAssignments" in share row exclusive mode;
  select exists(select 1 from public."programAssignments" where id=p_assignment->>'id' and "coachId"=owner_id) into already_saved;
  if already_saved then
    -- The existing RPC verifies the immutable request receipt. Never recreate or
    -- reset appointments after a response was lost or a coach later moved them.
    perform public.assign_program(p_assignment,p_rows,p_expected);
    return;
  end if;
  if timing is null or timing='null'::jsonb or timing is distinct from p_assignment->'data'->'trainingTiming' then
    raise exception 'Profile training time changed. Reload and review the assignment.';
  end if;
  if jsonb_typeof(bookings) is distinct from 'array' or jsonb_array_length(bookings) is distinct from jsonb_array_length(p_rows)
     or (select count(distinct b->>'id') from jsonb_array_elements(bookings) b) <> jsonb_array_length(bookings)
     or (select count(distinct b->>'date') from jsonb_array_elements(bookings) b) <> jsonb_array_length(bookings) then
    raise exception 'Each program day must have one unique booking.';
  end if;
  perform public.assign_program(p_assignment,p_rows,p_expected);
  for booking in select value from jsonb_array_elements(bookings) loop
    target_date := booking->>'date';
    if booking->>'clientId' is distinct from client_id or booking->>'time' is distinct from timing->>'time'
       or booking->'dur' is distinct from timing->'duration' or booking->>'status' is distinct from 'Confirmed'
       or booking->>'type' is distinct from 'Personal training' or nullif(booking->>'id','') is null
       or not exists(select 1 from jsonb_array_elements(p_rows) r where r->>'date'=target_date) then
      raise exception 'Booking does not match the client program or Profile timing.';
    end if;
    begin
      perform public.save_schedule_booking(jsonb_build_object('original',null,'next',booking,'plan',null,'assignments','[]'::jsonb));
    exception when others then
      raise exception '%: % Update Profile timing, resolve the booking in Schedule, or change program dates. Nothing was assigned.', target_date, sqlerrm;
    end;
  end loop;
end;
$$;
revoke all on function public.assign_program_scheduled(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.assign_program_scheduled(jsonb,jsonb,jsonb) to authenticated;

-- Source: supabase/migrations/20261011123312_training_plan_sync.sql
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

notify pgrst, 'reload schema';
commit;
select 'Program release installed; 6 plans backed up and removed' as result;
