-- =====================================================================
-- FitScribe — Today's Workout sessions (run AFTER schema.sql & schema_athlete.sql)
-- One row per client per workout: the suggested/selected session, its
-- warmup/main/cooldown structure (jsonb), and run state (timer, HR, status).
-- Coaches own rows (coach_owns); the linked athlete can read & write their own.
-- =====================================================================

create table if not exists workouts (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text,
  "date" text,
  "title" text,
  "source" text,                       -- 'plan' | 'ai' | 'manual'
  "planId" text,
  "note" text,
  "status" text default 'suggested',   -- 'suggested' | 'in_progress' | 'completed'
  "startedAt" text,
  "endedAt" text,
  "durationSec" integer,
  "hrAvg" integer,
  "hrMax" integer,
  "warmup" jsonb default '[]'::jsonb,
  "main" jsonb default '[]'::jsonb,
  "cooldown" jsonb default '[]'::jsonb
);

create index if not exists workouts_coach_idx on workouts ("coachId");
create index if not exists workouts_client_idx on workouts ("clientId");

-- Coach owns their rows.
alter table workouts enable row level security;
drop policy if exists coach_owns on workouts;
create policy coach_owns on workouts for all to authenticated
  using ("coachId" = auth.uid()) with check ("coachId" = auth.uid());

-- The linked athlete can read and write the workouts of the client they own.
drop policy if exists athlete_reads on workouts;
create policy athlete_reads on workouts for select to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));

drop policy if exists athlete_writes on workouts;
create policy athlete_writes on workouts for insert to authenticated
  with check ("clientId" in (select id from clients where "userId" = auth.uid()));

drop policy if exists athlete_updates on workouts;
create policy athlete_updates on workouts for update to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()))
  with check ("clientId" in (select id from clients where "userId" = auth.uid()));

-- Athlete can read their coach's plan + exercise library so the portal can
-- build/suggest a workout. Scoped to the coach who owns the athlete's client row.
drop policy if exists athlete_reads_library on plans;
create policy athlete_reads_library on plans for select to authenticated
  using ("coachId" in (select "coachId" from clients where "userId" = auth.uid()));

drop policy if exists athlete_reads_library on exercises;
create policy athlete_reads_library on exercises for select to authenticated
  using ("coachId" in (select "coachId" from clients where "userId" = auth.uid()));
