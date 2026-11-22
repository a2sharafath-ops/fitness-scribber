begin;
set local lock_timeout = '5s';

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
      and lower(s.type) in ('1-on-1 training','personal training')
      and (s.status in ('Pending','Confirmed') or (
        s.status = 'Completed' and s.date::date <= (
          current_timestamp at time zone coalesce(
            (select nullif(tz,'') from public.settings where "coachId"=new."coachId"), 'UTC')
        )::date
      ))
      for share;
    if not found then raise exception 'The training booking is unavailable for this workout.'; end if;
  end if;
  return new;
end;
$$;

commit;
