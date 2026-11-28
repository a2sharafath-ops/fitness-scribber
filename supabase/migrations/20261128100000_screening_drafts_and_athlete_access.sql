begin;

alter table public.screenings add column if not exists "rescreenLog" jsonb not null default '[]'::jsonb;

create or replace function public.stamp_screening_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new."updatedAt" := clock_timestamp();
  return new;
end $$;

revoke all on function public.stamp_screening_updated_at() from public, anon, authenticated;
drop trigger if exists stamp_screening_updated_at on public.screenings;
create trigger stamp_screening_updated_at before update on public.screenings
  for each row execute function public.stamp_screening_updated_at();

drop policy if exists athlete_reads_screenings on public.screenings;
drop policy if exists athlete_inserts_screenings on public.screenings;
drop policy if exists athlete_updates_screenings on public.screenings;
drop policy if exists admin_reads on public.screenings;

-- Retain coach_screenings' ownership check and also require a native coach.
-- A restrictive policy keeps this boundary even if the admin setup is reapplied.
drop policy if exists screenings_coach_role on public.screenings;
create policy screenings_coach_role on public.screenings as restrictive for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));

create or replace function public.screening_athlete_answers(s public.screenings)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'clientId', s."clientId", 'status', s.status, 'step', s.step,
    'startedOn', s."startedOn", 'completedOn', s."completedOn", 'validUntil', s."validUntil",
    'consent', s.consent, 'parq', s.parq, 'hhq', s.hhq, 'goals', s.goals,
    'acknowledgements', s.acknowledgements, 'updatedAt', s."updatedAt"
  )
$$;

create or replace function public.athlete_screenings(p_client_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.screening_athlete_answers(s) order by s."updatedAt" desc), '[]'::jsonb)
  from public.screenings s
  join public.clients c on c.id = s."clientId" and c."userId" = auth.uid()
  join public.profiles p on p.id = c."userId" and p.role = 'athlete'
  where c.id = p_client_id
$$;

-- Match src/lib/parq.js. Only an answered follow-up gate activates its questions.
create or replace function public.screening_parq_outcome(p_parq jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  question_answer jsonb;
  general_yes boolean := false;
  followup_yes boolean := false;
  gate_id text;
  sub_counts integer[] := array[3, 2, 4, 2, 5, 2, 4, 3, 3, 3];
begin
  for i in 1..7 loop
    question_answer := p_parq->'general'->('G' || i);
    if jsonb_typeof(question_answer) is distinct from 'boolean' then return null; end if;
    general_yes := general_yes or question_answer = 'true'::jsonb;
  end loop;
  if not general_yes then return 'A'; end if;
  for i in 1..10 loop
    gate_id := 'C' || i;
    question_answer := p_parq->'followup'->gate_id;
    if jsonb_typeof(question_answer) is distinct from 'boolean' then return null; end if;
    if question_answer = 'false'::jsonb then continue; end if;
    for j in 1..sub_counts[i] loop
      question_answer := p_parq->'followup'->(gate_id || chr(96 + j));
      if jsonb_typeof(question_answer) is distinct from 'boolean' then return null; end if;
      followup_yes := followup_yes or question_answer = 'true'::jsonb;
    end loop;
  end loop;
  if followup_yes then return 'C'; end if;
  return 'B';
end $$;

create or replace function public.save_athlete_screening(p_client_id text, p_answers jsonb, p_submit boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  saved public.screenings%rowtype;
  prior public.screenings%rowtype;
  entry_id text := p_answers->>'id';
  next_step text := case when p_submit then 'final' else p_answers->>'step' end;
  consent_answers jsonb := p_answers->'consent';
  parq_answers jsonb := p_answers->'parq';
  hhq_answers jsonb := p_answers->'hhq';
  goal_answers jsonb := p_answers->'goals';
  acks jsonb := nullif(p_answers->'acknowledgements', 'null'::jsonb);
  screening_date date := (now() at time zone 'UTC')::date;
  outcome_code text;
  status_code text := case when p_submit then 'complete' else 'draft' end;
  review_needed boolean;
  rescreen_log jsonb := '[]'::jsonb;
begin
  select c."coachId" into owner_id from public.clients c
    join public.profiles p on p.id = c."userId" and p.role = 'athlete'
    where c.id = p_client_id and c."userId" = auth.uid()
    for share of c, p;
  if not found then raise exception 'Screening is unavailable for this client.' using errcode = '42501'; end if;

  if entry_id is null or btrim(entry_id) = '' or length(entry_id) > 100 or p_submit is null
     or next_step is null or next_step not in (
       'consent','parq','followup','declaration','personal','medical','health','lifestyle','goals','logistics','final'
     )
     or jsonb_typeof(consent_answers) is distinct from 'object'
     or jsonb_typeof(parq_answers) is distinct from 'object'
     or jsonb_typeof(hhq_answers) is distinct from 'object'
     or jsonb_typeof(goal_answers) is distinct from 'object'
     or (acks is not null and jsonb_typeof(acks) <> 'object')
  then raise exception 'Screening answers are invalid.' using errcode = '22023'; end if;

  if p_submit then
    outcome_code := public.screening_parq_outcome(parq_answers);
    if outcome_code is null
       or nullif(btrim(consent_answers->>'collect'), '') is null
       or nullif(btrim(consent_answers->>'share'), '') is null
       or nullif(btrim(parq_answers#>>'{declaration,name}'), '') is null
       or nullif(btrim(parq_answers#>>'{declaration,signature}'), '') is null
       or not coalesce(acks @> '{"accurate":true,"share":true,"notMedicalAdvice":true,"reportChanges":true}'::jsonb, false)
    then raise exception 'Complete the required screening answers and declaration before submitting.' using errcode = '22023'; end if;
    review_needed := outcome_code = 'C' or exists (
      select 1 from unnest(array['chest_pain','dyspnea','dizziness','palpitations']) symptom
      where hhq_answers->'symptoms'->symptom = 'true'::jsonb
    );
  end if;

  select * into saved from public.screenings
    where id = entry_id and "clientId" = p_client_id for update;
  if not found then
    if p_answers->>'updatedAt' is not null then
      raise exception 'This screening changed. Reopen the saved record before continuing.' using errcode = '40001';
    end if;
    select * into prior from public.screenings
      where "clientId" = p_client_id and status = 'complete'
      order by "completedOn" desc nulls last, "updatedAt" desc limit 1;
    if found then
      rescreen_log := prior."rescreenLog" || jsonb_build_array(jsonb_build_object(
        'date', screening_date::text, 'reason',
        case when screening_date::text > prior."validUntil" then 'expired' else 'health_changed' end
      ));
    end if;
    insert into public.screenings(id, "clientId", "coachId", step, "startedOn", "rescreenLog")
      values (entry_id, p_client_id, owner_id, 'consent', screening_date::text, rescreen_log)
      on conflict (id) do nothing returning * into saved;
    if not found then
      raise exception 'This screening changed. Reopen the saved record before continuing.' using errcode = '40001';
    end if;
  else
    -- The same dashboard/card may retry after losing a response. Keep the
    -- original submission and any clearance a coach has since recorded.
    if row(saved.status, saved.step, saved.consent, saved.parq, saved.hhq, saved.goals, saved.acknowledgements)
       is not distinct from row(status_code, next_step, consent_answers, parq_answers, hhq_answers, goal_answers, acks)
    then return public.screening_athlete_answers(saved); end if;
    if saved.status <> 'draft' or (p_answers->>'updatedAt')::timestamptz is distinct from saved."updatedAt" then
      raise exception 'This screening changed. Reopen the saved record before continuing.' using errcode = '40001';
    end if;
  end if;

  update public.screenings
    set step = next_step, consent = consent_answers, parq = parq_answers, hhq = hhq_answers,
      goals = goal_answers, acknowledgements = acks, status = status_code,
      "completedOn" = case when p_submit then screening_date::text end,
      "validUntil" = case when p_submit then (make_date(extract(year from screening_date)::integer + 1, extract(month from screening_date)::integer, 1)
        + (extract(day from screening_date)::integer - 1))::text end,
      outcome = outcome_code,
      "programStatus" = case when p_submit then case when review_needed then 'gated' else 'ready' end end,
      clearance = case when p_submit then jsonb_build_object(
        'action', case when outcome_code = 'C' then 'eparmedx_or_physician' else 'none' end,
        'status', 'not_started', 'notes', '', 'dateCleared', ''
      ) end
    where id = entry_id and "clientId" = p_client_id
    returning * into saved;
  return public.screening_athlete_answers(saved);
end $$;

revoke all on function public.screening_athlete_answers(public.screenings), public.screening_parq_outcome(jsonb),
  public.athlete_screenings(text), public.save_athlete_screening(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.athlete_screenings(text), public.save_athlete_screening(text, jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
