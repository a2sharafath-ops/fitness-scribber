-- =====================================================================
-- FitScribe — Athlete logins (run AFTER schema.sql)
-- Adds roles, invite-code linking, and athlete row-level security so an
-- athlete can read their own data and submit their own wellness / RPE / concerns.
-- =====================================================================

-- ---- Roles ------------------------------------------------------------
create table if not exists profiles (
  "id" uuid primary key references auth.users(id) on delete cascade,
  "role" text not null default 'coach',     -- 'coach' | 'athlete'
  "displayName" text
);
alter table profiles enable row level security;
drop policy if exists own_profile on profiles;
create policy own_profile on profiles for all to authenticated
  using ("id" = auth.uid()) with check ("id" = auth.uid());

-- ---- Link columns on clients -----------------------------------------
alter table clients add column if not exists "userId" uuid references auth.users(id);
alter table clients add column if not exists "inviteCode" text;
create index if not exists clients_user_idx on clients ("userId");
create unique index if not exists clients_invite_idx on clients ("inviteCode") where "inviteCode" is not null;

-- Athlete can read the client row that belongs to them (in addition to coach_owns).
drop policy if exists athlete_reads_self on clients;
create policy athlete_reads_self on clients for select to authenticated
  using ("userId" = auth.uid());

-- ---- Athlete access to child tables ----------------------------------
-- Read-only for objective/programming data; read+insert for self-reported data.
do $$
declare t text;
begin
  -- read access to all of the athlete's own related rows
  foreach t in array array['sessions','logs','wellness','srpe','resistance','cardio','wearable','concerns','prescriptions']
  loop
    execute format('drop policy if exists athlete_reads on %I', t);
    execute format(
      'create policy athlete_reads on %I for select to authenticated using ("clientId" in (select id from clients where "userId" = auth.uid()))',
      t
    );
  end loop;
  -- insert access for self-reported data only
  foreach t in array array['wellness','srpe','concerns']
  loop
    execute format('drop policy if exists athlete_inserts on %I', t);
    execute format(
      'create policy athlete_inserts on %I for insert to authenticated with check ("clientId" in (select id from clients where "userId" = auth.uid()))',
      t
    );
  end loop;
end $$;

-- ---- Invite redemption (runs as definer to link across coach ownership) --
create or replace function redeem_invite(code text)
returns text language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  update clients set "userId" = auth.uid(), "inviteCode" = null
   where "inviteCode" = code and "userId" is null
   returning id into cid;
  if cid is null then
    return 'invalid';
  end if;
  insert into profiles(id, role) values (auth.uid(), 'athlete')
    on conflict (id) do update set role = 'athlete';
  return cid;
end $$;
grant execute on function redeem_invite(text) to authenticated;
