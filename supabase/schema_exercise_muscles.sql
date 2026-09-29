-- Additive catalog migration. Coach ownership and RLS remain unchanged.
-- Null muscleTargets means the exercise needs review.
alter table public.exercises add column if not exists "muscleTargets" jsonb;
-- Existing exercise editor fields missing from some older live projects.
alter table public.exercises add column if not exists "difficulty" text;
alter table public.exercises add column if not exists "video" text;
alter table public.exercises add column if not exists "thumb" text;
-- Catalog metadata used by the current exercise editor and program builder.
alter table public.exercises add column if not exists "category" text;
alter table public.exercises add column if not exists "pattern" text;
alter table public.exercises add column if not exists "relPct" numeric;
alter table public.exercises add column if not exists "relTo" text;
alter table public.exercises add column if not exists "mode" text;
alter table public.exercises add column if not exists "target" jsonb;
alter table public.exercises add column if not exists "source" text;
notify pgrst, 'reload schema';
