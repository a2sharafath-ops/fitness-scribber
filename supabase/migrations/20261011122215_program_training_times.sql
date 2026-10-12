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
