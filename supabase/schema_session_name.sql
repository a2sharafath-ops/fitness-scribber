-- Classic workout planner: trainer-facing name kept separate from session notes.
-- Safe to run more than once before deploying the matching client build.
alter table public.prescriptions add column if not exists "name" text;
