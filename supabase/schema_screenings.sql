-- =====================================================================
-- FitScribe — Pre-participation health screenings
-- (PAR-Q+ 2024 → HHQ → Goals). Run AFTER schema.sql and schema_athlete.sql.
-- Answers live in jsonb columns; computed outcome fields are first-class
-- columns so the trainer dashboard can query/filter them.
-- The client-facing app NEVER renders outcome/programStatus/clearance —
-- those are trainer-only (communicated by the trainer, not the app).
-- =====================================================================

create table if not exists screenings (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text not null references clients(id) on delete cascade,
  "status" text not null default 'draft',        -- draft | complete
  "step" text not null default 'consent',        -- save & resume position (step id)
  "startedOn" text,
  "completedOn" text,
  "validUntil" text,                             -- completedOn + 12 months (invalid on health change)
  "consent" jsonb not null default '{}'::jsonb,  -- collect/share timestamps (before Q1)
  "parq" jsonb not null default '{}'::jsonb,     -- general/lists/delay/followup/declaration (verbatim instrument answers)
  "hhq" jsonb not null default '{}'::jsonb,
  "goals" jsonb not null default '{}'::jsonb,
  "acknowledgements" jsonb,                      -- final consents (3F)
  "outcome" text,                                -- A | B | C  (trainer-only)
  "programStatus" text,                          -- ready | gated (trainer-only)
  "clearance" jsonb,                             -- { action, status, notes, dateCleared } (trainer-only)
  "updatedAt" timestamptz not null default now()
);
create index if not exists screenings_client_idx on screenings ("clientId", "status");
create index if not exists screenings_coach_idx on screenings ("coachId");

alter table screenings enable row level security;

-- Coach: full access to their own clients' screenings.
drop policy if exists coach_screenings on screenings;
create policy coach_screenings on screenings for all to authenticated
  using ("clientId" in (select id from clients where "coachId" = auth.uid()))
  with check ("clientId" in (select id from clients where "coachId" = auth.uid()));

-- Athlete: read their own screenings.
drop policy if exists athlete_reads_screenings on screenings;
create policy athlete_reads_screenings on screenings for select to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));

-- Athlete: create and update their own screening (drafts + submit).
drop policy if exists athlete_inserts_screenings on screenings;
create policy athlete_inserts_screenings on screenings for insert to authenticated
  with check ("clientId" in (select id from clients where "userId" = auth.uid()));

drop policy if exists athlete_updates_screenings on screenings;
create policy athlete_updates_screenings on screenings for update to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()))
  with check ("clientId" in (select id from clients where "userId" = auth.uid()));
