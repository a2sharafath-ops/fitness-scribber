-- =====================================================================
-- FitScribe — Exercise media (run on an existing DB created before these columns)
-- Adds difficulty + video link + thumbnail image to the exercise library.
-- Safe to run repeatedly.
-- =====================================================================
alter table exercises add column if not exists "difficulty" text;
alter table exercises add column if not exists "video" text;
alter table exercises add column if not exists "thumb" text;
