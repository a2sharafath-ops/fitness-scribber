-- =====================================================================
-- FitScribe — Assessments (onboarding baselines + reassessments)
-- Run AFTER schema.sql and schema_athlete.sql.
-- One typed table backs every assessment kind; the type-specific fields
-- live in the jsonb "data" column (matching anthro/intake conventions).
-- Coach owns the record; the linked athlete can read their own and (from
-- Phase 2) self-submit lifestyle / pain / goals.
-- =====================================================================

create table if not exists assessments (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text not null references clients(id) on delete cascade,
  "type" text not null,                       -- fitness | movement | pain | body_comp | lifestyle | goals
  "date" text not null,
  "phase" text not null default 'reassessment', -- baseline | reassessment
  "data" jsonb not null default '{}'::jsonb,
  "notes" text,
  "createdAt" timestamptz not null default now()
);
create index if not exists assessments_client_idx on assessments ("clientId", "type", "date");
create index if not exists assessments_coach_idx on assessments ("coachId");

alter table assessments enable row level security;

-- Coach: full access to their own clients' assessments.
drop policy if exists coach_assessments on assessments;
create policy coach_assessments on assessments for all to authenticated
  using ("clientId" in (select id from clients where "coachId" = auth.uid()))
  with check ("clientId" in (select id from clients where "coachId" = auth.uid()));

-- Athlete: read their own assessments.
drop policy if exists athlete_reads_assessments on assessments;
create policy athlete_reads_assessments on assessments for select to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));

-- Athlete: self-submit pain / lifestyle / goals for their own linked client.
drop policy if exists athlete_writes_assessments on assessments;
create policy athlete_writes_assessments on assessments for insert to authenticated
  with check (
    "clientId" in (select id from clients where "userId" = auth.uid())
    and "type" in ('pain', 'lifestyle', 'goals')
  );
