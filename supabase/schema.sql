-- =====================================================================
-- FitScribe — Supabase schema (Postgres)
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Every row is owned by a coach (auth.users.id). Row-Level Security
-- isolates each coach's data. Column names are quoted camelCase to match
-- the frontend object shapes 1:1 (no mapping layer needed).
-- Nested structures (anthro, intake, prescription/template items) are jsonb.
-- =====================================================================

-- ---- Tables -----------------------------------------------------------
create table if not exists clients (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name" text not null,
  "email" text, "phone" text, "goal" text, "level" text, "status" text,
  "plan" text, "joined" text, "notes" text, "planId" text,
  "monitorOptIn" boolean default false,
  "anthro" jsonb default '{}'::jsonb,
  "intake" jsonb default '{}'::jsonb
);

create table if not exists exercises (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name" text not null, "muscle" text, "equip" text,
  "difficulty" text, "video" text, "thumb" text
);

create table if not exists plans (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name" text not null, "desc" text, "items" jsonb default '[]'::jsonb
);

create table if not exists sessions (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "time" text, "type" text, "dur" integer, "status" text
);

create table if not exists logs (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "weightKg" numeric, "squat" numeric
);

create table if not exists wellness (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text,
  "sleep" integer, "stress" integer, "fatigue" integer, "soreness" integer, "score" integer
);

create table if not exists srpe (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "sessionId" text, "rpe" integer, "duration" integer, "tl" integer
);

create table if not exists resistance (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "exercise" text, "pattern" text,
  "sets" integer, "reps" integer, "weight" numeric, "volumeLoad" numeric
);

create table if not exists cardio (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "modality" text,
  "trimp" numeric, "tiz" numeric, "tss" numeric, "hsd" numeric
);

create table if not exists wearable (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "hrv" numeric, "rhr" numeric, "sleepHrs" numeric, "source" text
);

create table if not exists concerns (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "sessionId" text, "category" text, "severity" text,
  "source" text, "text" text, "status" text, "resolution" text
);

create table if not exists prescriptions (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "date" text, "notes" text, "items" jsonb default '[]'::jsonb
);

create table if not exists templates (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name" text not null, "items" jsonb default '[]'::jsonb
);

create table if not exists settings (
  "coachId" uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  "trainerName" text, "businessName" text, "units" text default 'kg', "tz" text default ''
);

-- ---- Helpful indexes --------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clients','exercises','plans','sessions','logs','wellness','srpe','resistance','cardio','wearable','concerns','prescriptions','templates']
  loop
    execute format('create index if not exists %I on %I ("coachId")', t || '_coach_idx', t);
  end loop;
end $$;

-- ---- Row-Level Security: a coach can only touch their own rows --------
do $$
declare t text;
begin
  foreach t in array array['clients','exercises','plans','sessions','logs','wellness','srpe','resistance','cardio','wearable','concerns','prescriptions','templates','settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists coach_owns on %I', t);
    execute format(
      'create policy coach_owns on %I for all to authenticated using ("coachId" = auth.uid()) with check ("coachId" = auth.uid())',
      t
    );
  end loop;
end $$;
