-- =====================================================================
-- FitScribe — Admin layer (run AFTER schema.sql and schema_athlete.sql)
-- Adds the 'admin' role, platform-wide read access for admins,
-- invite-only coach signup, and the coach_invites table.
--
-- Bootstrap the FIRST admin manually after running this file:
--   insert into profiles(id, role)
--     select id, 'admin' from auth.users where email = 'admin@cureo.city'
--   on conflict (id) do update set role = 'admin';
-- =====================================================================

-- ---- Role guard -------------------------------------------------------
-- 'pending' = signed up but not yet a coach (invite-only) or athlete.
-- Owned by postgres (table owner), so it bypasses profiles RLS — safe to
-- use inside profiles policies without recursion.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- New self-signups must NOT default to coach anymore.
alter table profiles alter column "role" set default 'pending';

-- Users may create/read their own profile row but can no longer choose
-- their own role. Table-level write grants are replaced with column-level
-- grants that exclude "role"; role changes happen only through the
-- security-definer functions below or the admin edge function.
revoke insert, update on profiles from authenticated;
grant insert ("id", "displayName"), update ("displayName") on profiles to authenticated;

-- Admins can read and update every profile.
drop policy if exists admin_all_profiles on profiles;
create policy admin_all_profiles on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---- Coach invites ----------------------------------------------------
create table if not exists coach_invites (
  "id" uuid primary key default gen_random_uuid(),
  "email" text not null unique,
  "invitedBy" uuid references auth.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "redeemedAt" timestamptz
);
alter table coach_invites enable row level security;
drop policy if exists admin_manages_invites on coach_invites;
create policy admin_manages_invites on coach_invites for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---- Invite-only coach signup ----------------------------------------
-- Replaces the old client-side `upsert role='coach'` (now blocked by the
-- column revoke above). Succeeds only when an un-redeemed coach_invites
-- row matches the caller's email.
create or replace function become_coach()
returns text language plpgsql security definer set search_path = public as $$
declare invite_email text;
begin
  select "email" into invite_email from coach_invites
   where lower("email") = lower(auth.email()) and "redeemedAt" is null;
  if invite_email is null then
    return 'not_invited';
  end if;
  update coach_invites set "redeemedAt" = now() where lower("email") = lower(invite_email);
  insert into profiles(id, role) values (auth.uid(), 'coach')
    on conflict (id) do update set role = 'coach';
  return 'ok';
end $$;
grant execute on function become_coach() to authenticated;

-- ---- Admin read access to all coach data ------------------------------
-- Read-only oversight: admins can SELECT every table; they still cannot
-- write coach data (no with-check policies added).
do $$
declare t text;
begin
  foreach t in array array[
    'clients','exercises','plans','sessions','logs','wellness','srpe',
    'resistance','cardio','wearable','concerns','prescriptions','templates',
    'settings','workouts','assessments','screenings','maxes','synonyms','messages'
  ]
  loop
    if to_regclass(t) is null then continue; end if;
    execute format('drop policy if exists admin_reads on %I', t);
    execute format('create policy admin_reads on %I for select to authenticated using (is_admin())', t);
  end loop;
end $$;
