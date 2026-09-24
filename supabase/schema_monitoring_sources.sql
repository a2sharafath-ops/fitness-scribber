-- Phase 5: preserve provenance for newly entered monitoring observations.
-- Existing rows remain NULL because their original source cannot be recovered.
alter table wellness add column if not exists "source" text;
alter table srpe add column if not exists "source" text;
alter table resistance add column if not exists "source" text;
alter table cardio add column if not exists "source" text;
