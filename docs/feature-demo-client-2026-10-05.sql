-- One-time, fictional Feature demo client for the production coach account.
-- This script adds data only. It deliberately creates no wearable records.
-- The fixed dates make the sample reproducible and are labelled fictional.
-- Do not rerun: the guard rejects an existing demo client.

do $demo$
declare
  coach uuid := 'aca78a32-d373-4959-a0f3-d020fc15188d';
  client text := 'feature_demo_20261005';
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
  if not exists (select 1 from public.clients where id = 'ihw9kzb' and "coachId" = coach and name = 'Sharafath Client') then
    raise exception 'Expected Sharafath client and coach were not found';
  end if;
  if exists (select 1 from public.clients where id = client) then
    raise exception 'Feature demo client already exists';
  end if;

  insert into public.clients (id, "coachId", name, goal, level, status, joined, notes, "monitorOptIn", anthro, intake)
  values (client, coach, 'Feature Demo Client', 'Build consistent strength and conditioning',
    'Intermediate', 'Active', '2026-08-10',
    '[feature-demo-2026-10-05] Entire profile and all observations are fictional software demonstration data. No clinical or training decisions should use them.',
    false, '{"age":32,"heightCm":175,"massKg":77.4}'::jsonb,
    '{"reportPreferences":{"sections":{"exposure":true,"wellbeing":true,"outcomes":true,"body":true,"appendix":false},"note":"Fictional demonstration report: training consistency and measured progress across eight weeks.","noteDate":"2026-09-30"}}'::jsonb);

  insert into public.exercises (id,"coachId",name,category,mode,pattern,"muscleTargets",source) values
    ('feature-demo-squat',coach,'Demo Back Squat','Strength','Strength','Squat','{"direct":["Quadriceps","Glutes"],"indirect":["Adductors","Spinal erectors","Abdominals"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-rdl',coach,'Demo Romanian Deadlift','Strength','Strength','Hinge','{"direct":["Hamstrings","Glutes"],"indirect":["Spinal erectors","Forearms"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-bench',coach,'Demo Bench Press','Strength','Strength','Push','{"direct":["Chest"],"indirect":["Front delts","Triceps"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-pulldown',coach,'Demo Lat Pulldown','Strength','Strength','Pull','{"direct":["Lats"],"indirect":["Upper back","Biceps"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-raise',coach,'Demo Lateral Raise','Strength','Strength','Shoulder','{"direct":["Side delts"],"indirect":["Trapezius"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-jump',coach,'Demo Jump Squat','Ballistic','Ballistic','Squat','{"direct":["Quadriceps","Glutes","Calves"],"indirect":[],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-press',coach,'Demo Overhead Press','Strength','Strength','Push','{"direct":["Front delts","Triceps"],"indirect":["Side delts","Upper back"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-row',coach,'Demo Seated Cable Row','Strength','Strength','Pull','{"direct":["Upper back","Lats"],"indirect":["Biceps","Rear delts"],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-calf',coach,'Demo Standing Calf Raise','Strength','Strength','Calf','{"direct":["Calves"],"indirect":[],"source":"coach"}'::jsonb,'Fictional demo'),
    ('feature-demo-goblet',coach,'Demo Goblet Squat','Strength','Strength','Squat','{"direct":["Quadriceps","Glutes"],"indirect":["Adductors","Abdominals"],"source":"coach"}'::jsonb,'Fictional demo');

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
          jsonb_build_object('id','demo-squat-' || d::text,'exId','feature-demo-squat','name','Demo Back Squat','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',6,'load',squat_load)) from generate_series(1,4) n)),
          jsonb_build_object('id','demo-rdl-' || d::text,'exId','feature-demo-rdl','name','Demo Romanian Deadlift','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',8,'load',50 + 2.5 * wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-calf-' || d::text,'exId','feature-demo-calf','name','Demo Standing Calf Raise','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',12,'load',30 + 2.5 * wk)) from generate_series(1,3) n)));
      elsif day_number = 1 then
        title := 'Demo Upper Strength'; rpe_value := 7; minutes := 55;
        main_items := jsonb_build_array(
          jsonb_build_object('id','demo-bench-' || d::text,'exId','feature-demo-bench','name','Demo Bench Press','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',6,'load',bench_load)) from generate_series(1,4) n)),
          jsonb_build_object('id','demo-pulldown-' || d::text,'exId','feature-demo-pulldown','name','Demo Lat Pulldown','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',10,'load',35 + 1.25 * wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-raise-' || d::text,'exId','feature-demo-raise','name','Demo Lateral Raise','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',12,'load',7.5 + 0.5 * wk)) from generate_series(1,3) n)));
      else
        title := 'Demo Power and Full Body'; rpe_value := 6; minutes := 50;
        main_items := jsonb_build_array(
          jsonb_build_object('id','demo-jump-' || d::text,'exId','feature-demo-jump','name','Demo Jump Squat','blockType','Power',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',5,'load',0)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-press-' || d::text,'exId','feature-demo-press','name','Demo Overhead Press','blockType','Main Lifts',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',8,'load',25 + wk)) from generate_series(1,3) n)),
          jsonb_build_object('id','demo-row-' || d::text,'exId','feature-demo-row','name','Demo Seated Cable Row','blockType','Assisted',
            'setRows',(select jsonb_agg(jsonb_build_object('n',n,'done',true,'purpose','working','reps',10,'load',35 + 1.25 * wk)) from generate_series(1,3) n)));
      end if;

      insert into public.workouts (id,"coachId","clientId",date,title,source,note,status,"startedAt","endedAt","durationSec",warmup,main,cooldown)
      values ('feature-demo-workout-' || d::text,coach,client,d::text,title,'Fictional demo',
        'Fictional completed session. Warm-up is recorded separately and excluded from working muscle volume.',
        'completed',d::text || 'T08:00:00Z',d::text || 'T09:00:00Z',minutes * 60,warmup_items,main_items,'[]'::jsonb);

      insert into public.sessions (id,"coachId","clientId",date,time,type,dur,status)
      values ('feature-demo-session-' || d::text,coach,client,d::text,'08:00','Personal Training',minutes,'Completed');

      insert into public.srpe (id,"coachId","clientId",date,"sessionId",rpe,duration,tl,source)
      values ('feature-demo-srpe-' || d::text,coach,client,d::text,'feature-demo-session-' || d::text,
        rpe_value,minutes,rpe_value * minutes,'Fictional manual entry');
    end loop;
  end loop;

  -- 52 dated self-reports through 30 September. Scores follow the app's 4–28 formula.
  insert into public.wellness (id,"coachId","clientId",date,sleep,stress,fatigue,soreness,score,source)
  select 'feature-demo-wellness-' || values_by_day.d::text,coach,client,values_by_day.d::text,sleep,stress,fatigue,soreness,
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
  select 'feature-demo-resistance-' || x.d::text,coach,client,x.d::text,'Demo Goblet Squat','Squat',3,10,
    22.5 + 2.5 * (x.ordinality - 1),3 * 10 * (22.5 + 2.5 * (x.ordinality - 1)),'Fictional manual entry'
  from unnest(array[date '2026-08-22',date '2026-09-05',date '2026-09-19',date '2026-09-26']) with ordinality as x(d,ordinality);

  -- Conditioning is self-reported. HR-, power-, and wearable-derived fields stay NULL.
  insert into public.cardio (id,"coachId","clientId",date,modality,source)
  select 'feature-demo-cardio-' || x.d::text,coach,client,x.d::text,
    'Easy cycle, 30 min (manual note)','Fictional manual entry'
  from (select date '2026-08-16' + 7 * n as d from generate_series(0,6) n) x;

  insert into public.logs (id,"coachId","clientId",date,"weightKg",squat) values
    ('feature-demo-measure-1',coach,client,'2026-08-10',78.2,55),
    ('feature-demo-measure-2',coach,client,'2026-08-31',77.9,62.5),
    ('feature-demo-measure-3',coach,client,'2026-09-14',77.6,67.5),
    ('feature-demo-measure-4',coach,client,'2026-09-28',77.4,72.5);

  insert into public.assessments (id,"coachId","clientId",type,date,phase,data,notes) values
    ('feature-demo-fitness-baseline',coach,client,'fitness','2026-08-10','baseline',
      '{"source":"Fictional coach entry","strength":[{"lift":"Back Squat 5RM","valueKg":55},{"lift":"Bench Press 5RM","valueKg":40}],"endurance":{"test":"6-minute walk","result":"550 m"}}'::jsonb,
      'Fictional baseline test.'),
    ('feature-demo-fitness-retest',coach,client,'fitness','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","strength":[{"lift":"Back Squat 5RM","valueKg":72.5},{"lift":"Bench Press 5RM","valueKg":48.75}],"endurance":{"test":"6-minute walk","result":"585 m"}}'::jsonb,
      'Fictional retest using the same protocols.'),
    ('feature-demo-movement-baseline',coach,client,'movement','2026-08-10','baseline',
      '{"source":"Fictional coach entry","protocol":"Demo movement screen v1","screens":[{"pattern":"squat","score":2,"pain":false},{"pattern":"hinge","score":2,"pain":false},{"pattern":"lunge","score":2,"pain":false},{"pattern":"push","score":3,"pain":false},{"pattern":"pull","score":2,"pain":false}]}'::jsonb,
      'Fictional movement baseline.'),
    ('feature-demo-movement-retest',coach,client,'movement','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","protocol":"Demo movement screen v1","screens":[{"pattern":"squat","score":3,"pain":false},{"pattern":"hinge","score":3,"pain":false},{"pattern":"lunge","score":2,"pain":false},{"pattern":"push","score":3,"pain":false},{"pattern":"pull","score":3,"pain":false}]}'::jsonb,
      'Fictional movement retest.'),
    ('feature-demo-body-baseline',coach,client,'body_comp','2026-08-10','baseline',
      '{"source":"Fictional coach entry","method":"Scale","massKg":78.2}'::jsonb,
      'Fictional scale measurement; no body-fat estimate.'),
    ('feature-demo-body-retest',coach,client,'body_comp','2026-09-28','reassessment',
      '{"source":"Fictional coach entry","method":"Scale","massKg":77.4}'::jsonb,
      'Fictional scale measurement with the same method.');

  insert into public.concerns (id,"coachId","clientId",date,category,severity,source,text,status,resolution)
  values ('feature-demo-equipment-note',coach,client,'2026-09-09','Equipment','Low','Fictional coach entry',
    'Cable station unavailable at the scheduled time.','Resolved','Used a free station at the next session.');

  -- The programme library entry makes the Training page useful alongside the
  -- dated, editable prescriptions in the workout builder.
  insert into public.plans (id,"coachId",name,"desc",items)
  values ('feature-demo-plan-20261005',coach,'Feature Demo — Strength & Conditioning',
    'Fictional programme for testing; future sessions are planned below.',
    jsonb_build_array(
      jsonb_build_object('exId','feature-demo-squat','sets',4,'reps','6','rest','150s'),
      jsonb_build_object('exId','feature-demo-bench','sets',4,'reps','6','rest','150s'),
      jsonb_build_object('exId','feature-demo-row','sets',3,'reps','10','rest','90s')));
  update public.clients set "planId"='feature-demo-plan-20261005',
    "trackedLifts"='["Demo Back Squat","Demo Bench Press"]'::jsonb
  where id=client and "coachId"=coach;

  -- Six future builder sessions across two weeks. Each has a main lift and
  -- an accessory, with editable set rows in the app's native blocks format.
  for day_number in 1..6 loop
    d := case day_number
      when 1 then date '2026-10-06' when 2 then date '2026-10-08'
      when 3 then date '2026-10-10' when 4 then date '2026-10-13'
      when 5 then date '2026-10-15' else date '2026-10-17' end;
    title := case (day_number - 1) % 3
      when 0 then 'Lower strength' when 1 then 'Upper strength'
      else 'Power and full body' end;

    insert into public.prescriptions (id,"coachId","clientId",date,name,notes,items,blocks)
    values ('feature-demo-presc-' || d::text,coach,client,d::text,title,
      'Fictional planned workout. Adjust loads and sets in the builder.',
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('blockId','feature-demo-block-main-' || d::text,
          'blockType','Main Lifts','order',1,'autoCalculate1RM',true,
          'exercises',jsonb_build_array(jsonb_build_object(
            'exerciseId','feature-demo-main-' || d::text,
            'exerciseDbRef',case (day_number - 1) % 3
              when 0 then 'feature-demo-squat' when 1 then 'feature-demo-bench'
              else 'feature-demo-press' end,
            'exerciseName',case (day_number - 1) % 3
              when 0 then 'Demo Back Squat' when 1 then 'Demo Bench Press'
              else 'Demo Overhead Press' end,
            'order',1,'intensityType','RIR',
            'sets',(select jsonb_agg(jsonb_build_object(
              'setId','feature-demo-main-' || d::text || '-' || n::text,
              'setNumber',n,'prescribedReps',6,'prescribedIntensityValue',2,
              'prescribedLoadKg',case (day_number - 1) % 3
                when 0 then 72.5 when 1 then 50 else 30 end,
              'prescribedRestSeconds',150,'status','Pending') order by n)
              from generate_series(1,4) n)))),
        jsonb_build_object('blockId','feature-demo-block-accessory-' || d::text,
          'blockType','Assisted','order',2,'autoCalculate1RM',false,
          'exercises',jsonb_build_array(jsonb_build_object(
            'exerciseId','feature-demo-accessory-' || d::text,
            'exerciseDbRef',case (day_number - 1) % 3
              when 0 then 'feature-demo-rdl' when 1 then 'feature-demo-pulldown'
              else 'feature-demo-row' end,
            'exerciseName',case (day_number - 1) % 3
              when 0 then 'Demo Romanian Deadlift' when 1 then 'Demo Lat Pulldown'
              else 'Demo Seated Cable Row' end,
            'order',1,'intensityType','RIR',
            'sets',(select jsonb_agg(jsonb_build_object(
              'setId','feature-demo-accessory-' || d::text || '-' || n::text,
              'setNumber',n,'prescribedReps',10,'prescribedIntensityValue',3,
              'prescribedLoadKg',case (day_number - 1) % 3
                when 0 then 60 when 1 then 42.5 else 42.5 end,
              'prescribedRestSeconds',90,'status','Pending') order by n)
              from generate_series(1,3) n))))));
  end loop;

  insert into public.sessions (id,"coachId","clientId",date,time,type,dur,status) values
    ('feature-demo-future-session-2026-10-06',coach,client,'2026-10-06','08:00','Personal Training',60,'Confirmed'),
    ('feature-demo-future-session-2026-10-08',coach,client,'2026-10-08','08:00','Personal Training',60,'Confirmed');

  insert into public.maxes (id,"coachId","clientId",exercise,date,kind,"valueKg",source) values
    ('feature-demo-squat-tm',coach,client,'Demo Back Squat','2026-09-28','tm',75,'Fictional coach entry'),
    ('feature-demo-bench-tm',coach,client,'Demo Bench Press','2026-09-28','tm',52.5,'Fictional coach entry');
end
$demo$;
