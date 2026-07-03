-- =====================================================================
-- FitScribe — Advanced Programming Platform (run AFTER schema.sql)
-- Adds the block-structured workout program to prescriptions/templates,
-- the exercise synonym index (voice parsing), and the lift-max ledger
-- (rolling Absolute 1RM + Training Max rows).
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---- Block-structured programs on existing tables ----------------------
alter table prescriptions add column if not exists "blocks" jsonb default '[]'::jsonb;
alter table templates     add column if not exists "blocks" jsonb default '[]'::jsonb;

-- ---- Lift-max ledger ----------------------------------------------------
-- kind = 'e1rm' (Epley-estimated 1RM event, feeds the rolling 30-day
-- Absolute 1RM) or 'tm' (Training Max checkpoint, set manually or by the
-- block-start reset). valueKg is canonical kg (UI converts for display).
create table if not exists maxes (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text, "exercise" text, "date" text,
  "kind" text, "valueKg" numeric, "source" text
);
create index if not exists maxes_coach_idx  on maxes ("coachId");
create index if not exists maxes_client_idx on maxes ("clientId", "exercise", "date");

-- ---- Exercise synonym index (voice → database standard term) ------------
create table if not exists synonyms (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "phrase" text, "exercise" text
);
create index if not exists synonyms_coach_idx on synonyms ("coachId");

-- ---- RLS: coach owns rows ----------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['maxes','synonyms']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists coach_owns on %I', t);
    execute format(
      'create policy coach_owns on %I for all to authenticated using ("coachId" = auth.uid()) with check ("coachId" = auth.uid())',
      t
    );
  end loop;
end $$;

-- ---- One-time data migration: flat prescription items → one block -------
-- Legacy shape: items = [{exercise, sets, reps, load, intensity,
-- intensityType, group, mode, tempo, volumeLoad}]. Each becomes an exercise
-- in a single "Main Lifts" block; the numeric `sets` count expands into
-- individual set objects. Rows already migrated (blocks non-empty) are
-- skipped. The frontend also migrates lazily on load, so this is belt and
-- braces for backend-mode data.
update prescriptions p
set "blocks" = jsonb_build_array(jsonb_build_object(
  'blockId',           p.id || '-b1',
  'blockType',         'Main Lifts',
  'order',             1,
  'autoCalculate1RM',  true,
  'exercises', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'exerciseId',     p.id || '-e' || (it.ord)::text,
      'exerciseDbRef',  null,
      'exerciseName',   it.item->>'exercise',
      'order',          it.ord,
      'supersetLinkId', nullif(it.item->>'group', ''),
      'intensityType',  coalesce(nullif(it.item->>'intensityType', ''), 'Load'),
      'sets', (
        select jsonb_agg(jsonb_build_object(
          'setId',                    p.id || '-e' || (it.ord)::text || '-s' || s::text,
          'setNumber',                s,
          'prescribedReps',           coalesce((it.item->>'reps')::numeric, 10),
          'prescribedIntensityValue', (it.item->>'intensity')::numeric,
          'prescribedLoadKg',         (it.item->>'load')::numeric,
          'prescribedTempo',          coalesce(it.item->>'tempo', ''),
          'prescribedRestSeconds',    90,
          'completedReps',            null,
          'completedLoadKg',          null,
          'status',                   'Pending'
        ) order by s)
        from generate_series(1, greatest(coalesce((it.item->>'sets')::int, 1), 1)) s
      )
    ) order by it.ord), '[]'::jsonb)
    from jsonb_array_elements(p."items") with ordinality as it(item, ord)
  )
))
where jsonb_array_length(coalesce(p."blocks", '[]'::jsonb)) = 0
  and jsonb_array_length(coalesce(p."items", '[]'::jsonb)) > 0;
