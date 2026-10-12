-- One-time, fictional Classic demo client for the production coach account.
-- This script adds data only. It deliberately creates no wearable records.
-- The fixed dates make the sample reproducible and are labelled fictional.
-- Do not rerun: the guard rejects an existing demo client.

do $demo$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
  client text := 'classic_demo_20260930';
  d date;
  wk integer;
  day_number integer;
  main_items jsonb;
  warmup_items jsonb;
  title text;
  rpe_value integer;
  minutes integer;
  squat_load numeric;
  bench_load numeric;
begin
  if not exists (select 1 from public.clients where id = '5vvsxmi' and "coachId" = coach and name = 'CODEX RELEASE TEST 2026-09-24') then
    raise exception 'Expected release-test client and coach were not found';
  end if;
  if exists (select 1 from public.clients where id = client) then
    raise exception 'Classic demo client already exists';
  end if;

  insert into public.clients (id, "coachId", name, goal, level, status, joined, notes, "monitorOptIn", anthro, intake)
  values (client, coach, 'Classic Demo Athlete', 'Build consistent strength and conditioning',
    'Intermediate', 'Active', '2026-08-10',
    '[classic-full-demo] Entire profile and all observations are fictional software demonstration data. No clinical or training decisions should use them.',
    true, '{"age":32,"heightCm":175,"massKg":77.4}'::jsonb,
    '{"reportPreferences":{"sections":{"exposure":true,"wellbeing":true,"outcomes":true,"body":true,"appendix":false},"note":"Fictional demonstration report: training consistency and measured progress across eight weeks.","noteDate":"2026-09-30"}}'::jsonb);

  insert into public.exercises (id,"coachId",name,category,mode,pattern,"muscleTargets",source) values
    ('classic-demo-squat',coach,'Demo Back Squat','Strength','Strength','Squat','{"direct":["Quadriceps","Glutes"],"indirect":["Adductors","Spinal erectors","Abdominals"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-rdl',coach,'Demo Romanian Deadlift','Strength','Strength','Hinge','{"direct":["Hamstrings","Glutes"],"indirect":["Spinal erectors","Forearms"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-bench',coach,'Demo Bench Press','Strength','Strength','Push','{"direct":["Chest"],"indirect":["Front delts","Triceps"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-pulldown',coach,'Demo Lat Pulldown','Strength','Strength','Pull','{"direct":["Lats"],"indirect":["Upper back","Biceps"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-raise',coach,'Demo Lateral Raise','Strength','Strength','Shoulder','{"direct":["Side delts"],"indirect":["Trapezius"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-jump',coach,'Demo Jump Squat','Ballistic','Ballistic','Squat','{"direct":["Quadriceps","Glutes","Calves"],"indirect":[],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-press',coach,'Demo Overhead Press','Strength','Strength','Push','{"direct":["Front delts","Triceps"],"indirect":["Side delts","Upper back"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-row',coach,'Demo Seated Cable Row','Strength','Strength','Pull','{"direct":["Upper back","Lats"],"indirect":["Biceps","Rear delts"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-calf',coach,'Demo Standing Calf Raise','Strength','Strength','Calf','{"direct":["Calves"],"indirect":[],"source":"coach"}'::jsonb,'Fictional demo'),
    ('classic-demo-goblet',coach,'Demo Goblet Squat','Strength','Strength','Squat','{"direct":["Quadriceps","Glutes"],"indirect":["Adductors","Abdominals"],"source":"coach"}'::jsonb,'Fictional demo');

  for wk in 0..7 loop
    squat_load := 55 + 2.5 * wk;
    bench_load := 40 + 1.25 * wk;
    for day_number in 0..2 loop
      d := date '2026-08-10' + 7 * wk + 2 * day_number;
      if d > date '2026-09-30' then continue; end if;

      warmup_items := jsonb_build_array(jsonb_build_object('id','demo-warmup-' || d::text,
        'name','Easy movement preparation','blockType','Warm-up',
        'setRows',jsonb_build_array(jsonb_build_object('n',1,'done',true,'purpose','warmup','reps',8,'load',0))));

      if day_number = 0 then
        title := 'Demo Lower Strength'; rpe_value := 6 + (wk % 2); minutes := 60;
        main_items := jsonb_build_array(
          jsonb_build_object('id','demo-squat-' || d::text,'exId','classic-demo-squat','name','Demo Back Squat','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',6,'load',squat_load)) from generate_series(1,4) n)),
          jsonb_build_object('id','demo-rdl-' || d::text,'exId','classic-demo-rdl','name','Demo Romanian Deadlift','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',8,'load',50 + 2.5 * wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-calf-' || d::text,'exId','classic-demo-calf','name','Demo Standing Calf Raise','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',12,'load',30 + 2.5 * wk)) from generate_series(1,3) n)));
      elsif day_number = 1 then
        title := 'Demo Upper Strength'; rpe_value := 7; minutes := 55;
        main_items := jsonb_build_array(
          jsonb_build_object('id','demo-bench-' || d::text,'exId','classic-demo-bench','name','Demo Bench Press','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',6,'load',bench_load)) from generate_series(1,4) n)),
          jsonb_build_object('id','demo-pulldown-' || d::text,'exId','classic-demo-pulldown','name','Demo Lat Pulldown','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',10,'load',35 + 1.25 * wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-raise-' || d::text,'exId','classic-demo-raise','name','Demo Lateral Raise','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',12,'load',7.5 + 0.5 * wk)) from generate_series(1,3) n)));
      else
        title := 'Demo Power and Full Body'; rpe_value := 6; minutes := 50;
        main_items := jsonb_build_array(
          jsonb_build_object('id','demo-jump-' || d::text,'exId','classic-demo-jump','name','Demo Jump Squat','blockType','Power',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',5,'load',0)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-press-' || d::text,'exId','classic-demo-press','name','Demo Overhead Press','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',8,'load',25 + wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-row-' || d::text,'exId','classic-demo-row','name','Demo Seated Cable Row','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',10,'load',35 + 1.25 * wk)) from generate_series(1,3) n)));
      end if;

      insert into public.workouts (id,"coachId","clientId",date,title,source,note,status,"startedAt","endedAt","durationSec",warmup,main,cooldown)
      values ('classic-demo-workout-' || d::text,coach,client,d::text,title,'Fictional demo',
        'Fictional completed session. Warm-up is recorded separately and excluded from working muscle volume.',
        'completed',d::text || 'T08:00:00Z',d::text || 'T09:00:00Z',minutes * 60,warmup_items,main_items,'[]'::jsonb);

      insert into public.sessions (id,"coachId","clientId",date,time,type,dur,status)
      values ('classic-demo-session-' || d::text,coach,client,d::text,'08:00','Personal Training',minutes,'Completed');

      insert into public.srpe (id,"coachId","clientId",date,"sessionId",rpe,duration,tl,source)
      values ('classic-demo-srpe-' || d::text,coach,client,d::text,'classic-demo-session-' || d::text,
        rpe_value,minutes,rpe_value * minutes,'Fictional manual entry');
    end loop;
  end loop;

  -- 52 dated self-reports through 30 September. Scores follow the app's 4–28 formula.
  insert into public.wellness (id,"coachId","clientId",date,sleep,stress,fatigue,soreness,score,source)
  select 'classic-demo-wellness-' || values_by_day.d::text,coach,client,values_by_day.d::text,sleep,stress,fatigue,soreness,
    sleep + (8 - stress) + (8 - fatigue) + (8 - soreness),'Fictional manual entry'
  from (
    select days.d, 5 + case when n % 4 = 0 then 1 else 0 end as sleep,
      2 + case when n % 7 = 2 then 1 else 0 end as stress,
      2 + case when n % 7 = 4 then 2 else 0 end as fatigue,
      2 + case when n % 7 = 1 then 2 else 0 end as soreness
    from (select date '2026-08-10' + n as d,n from generate_series(0,51) n) days
  ) values_by_day;

  -- Separate manual logs, on dates without a completed workout; no double count.
  insert into public.resistance (id,"coachId","clientId",date,exercise,pattern,sets,reps,weight,"volumeLoad",source)
  select 'classic-demo-resistance-' || x.d::text,coach,client,x.d::text,'Demo Goblet Squat','Squat',3,10,
    22.5 + 2.5 * (x.ordinality - 1),3 * 10 * (22.5 + 2.5 * (x.ordinality - 1)),'Fictional manual entry'
  from unnest(array[date '2026-08-22',date '2026-09-05',date '2026-09-19',date '2026-09-26']) with ordinality as x(d,ordinality);

  -- Conditioning is self-reported. HR-, power-, and wearable-derived fields stay NULL.
  insert into public.cardio (id,"coachId","clientId",date,modality,source)
  select 'classic-demo-cardio-' || x.d::text,coach,client,x.d::text,
    'Easy cycle, 30 min (manual note)','Fictional manual entry'
  from (select date '2026-08-16' + 7 * n as d from generate_series(0,6) n) x;

  insert into public.logs (id,"coachId","clientId",date,"weightKg",squat) values
    ('classic-demo-measure-1',coach,client,'2026-08-10',78.2,55),
    ('classic-demo-measure-2',coach,client,'2026-08-31',77.9,62.5),
    ('classic-demo-measure-3',coach,client,'2026-09-14',77.6,67.5),
    ('classic-demo-measure-4',coach,client,'2026-09-28',77.4,72.5);

  insert into public.assessments (id,"coachId","clientId",type,date,phase,data,notes) values
    ('classic-demo-fitness-baseline',coach,client,'fitness','2026-08-10','baseline',
      '{"source":"Fictional coach entry","strength":[{"lift":"Back Squat 5RM","valueKg":55},{"lift":"Bench Press 5RM","valueKg":40}],"endurance":{"test":"6-minute walk","result":"550 m"}}'::jsonb,
      'Fictional baseline test.'),
    ('classic-demo-fitness-retest',coach,client,'fitness','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","strength":[{"lift":"Back Squat 5RM","valueKg":72.5},{"lift":"Bench Press 5RM","valueKg":48.75}],"endurance":{"test":"6-minute walk","result":"585 m"}}'::jsonb,
      'Fictional retest using the same protocols.'),
    ('classic-demo-movement-baseline',coach,client,'movement','2026-08-10','baseline',
      '{"source":"Fictional coach entry","protocol":"Demo movement screen v1","screens":[{"pattern":"squat","score":2,"pain":false},{"pattern":"hinge","score":2,"pain":false},{"pattern":"lunge","score":2,"pain":false},{"pattern":"push","score":3,"pain":false},{"pattern":"pull","score":2,"pain":false}]}'::jsonb,
      'Fictional movement baseline.'),
    ('classic-demo-movement-retest',coach,client,'movement','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","protocol":"Demo movement screen v1","screens":[{"pattern":"squat","score":3,"pain":false},{"pattern":"hinge","score":3,"pain":false},{"pattern":"lunge","score":2,"pain":false},{"pattern":"push","score":3,"pain":false},{"pattern":"pull","score":3,"pain":false}]}'::jsonb,
      'Fictional movement retest.'),
    ('classic-demo-body-baseline',coach,client,'body_comp','2026-08-10','baseline',
      '{"source":"Fictional coach entry","method":"Scale","massKg":78.2}'::jsonb,
      'Fictional scale measurement; no body-fat estimate.'),
    ('classic-demo-body-retest',coach,client,'body_comp','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","method":"Scale","massKg":77.4}'::jsonb,
      'Fictional scale measurement with the same method.');

  insert into public.concerns (id,"coachId","clientId",date,category,severity,source,text,status,resolution)
  values ('classic-demo-equipment-note',coach,client,'2026-09-09','Equipment','Low','Fictional coach entry',
    'Cable station unavailable at the scheduled time.','Resolved','Used a free station at the next session.');
end
$demo$;
