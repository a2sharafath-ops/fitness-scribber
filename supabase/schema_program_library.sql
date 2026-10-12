-- Multi-week Programs. Run after schema.sql, schema_program.sql and schema_workouts.sql.
-- Local offline preview does not need this file. Production installed 2026-10-11.
begin;
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
commit;
