-- Additive session metadata. No existing workout, prescription, or log is rewritten.
alter table public.workouts add column if not exists "liveState" jsonb;

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
-- Older open app tabs cannot erase the original snapshot or remove a logged
-- set while updating a session that has adopted the live editor.
create or replace function public.guard_live_workout_history()
returns trigger language plpgsql set search_path = public as $$
declare
  old_set jsonb;
  all_new_sets jsonb;
begin
  if old."liveState" is null then return new; end if;
  if new."liveState"->'original' is distinct from old."liveState"->'original' then
    raise exception 'The original workout snapshot must be preserved. Reload the session.';
  end if;
  select coalesce(jsonb_agg(set_row), '[]'::jsonb) into all_new_sets
    from jsonb_array_elements(coalesce(new.warmup,'[]') || coalesce(new.main,'[]') || coalesce(new.cooldown,'[]')) item,
         jsonb_array_elements(coalesce(item->'setRows','[]')) set_row;
  for old_set in select set_row from jsonb_array_elements(coalesce(old.warmup,'[]') || coalesce(old.main,'[]') || coalesce(old.cooldown,'[]')) item,
      jsonb_array_elements(coalesce(item->'setRows','[]')) set_row where set_row->>'done' = 'true' and set_row->>'id' is not null
  loop
    if not exists (select 1 from jsonb_array_elements(all_new_sets) entry where entry->>'id' = old_set->>'id') then
      raise exception 'A recorded set cannot be removed. Skip future sets instead.';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists preserve_live_workout_history on public.workouts;
create trigger preserve_live_workout_history before update on public.workouts
  for each row execute function public.guard_live_workout_history();
notify pgrst, 'reload schema';
