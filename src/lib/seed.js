// Initial demo dataset so every chart/view is populated on first run.
import { uid } from './format'
import { addDays } from './dates'

export function seed() {
  const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid()
  const e1 = uid(), e2 = uid(), e3 = uid(), e4 = uid(), e5 = uid(), e6 = uid(), e7 = uid(), e8 = uid()
  const p1 = uid(), p2 = uid()
  const d = (off) => addDays(new Date().toLocaleDateString('en-CA'), off)
  // Exercise with media. video → a YouTube search for a form demo; thumb left blank
  // so the UI renders a generated placeholder tile (paste a real image URL to override).
  const ex = (id, name, muscle, equip, difficulty) => ({
    id, name, muscle, equip, difficulty,
    video: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' proper form'),
    thumb: '',
  })

  const db = {
    clients: [
      { id: c1, name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '555-0142', goal: 'Lose 8kg & tone', level: 'Intermediate', status: 'Active', plan: 'Premium', joined: '2025-11-02', notes: 'Prefers morning sessions. Knee sensitivity — avoid deep lunges.', planId: p1 },
      { id: c2, name: 'James Carter', email: 'jcarter@email.com', phone: '555-0198', goal: 'Build muscle mass', level: 'Advanced', status: 'Active', plan: 'Premium', joined: '2025-09-15', notes: 'Training for powerlifting meet in spring.', planId: p2, trackedLifts: ['Back Squat', 'Deadlift'] },
      { id: c3, name: 'Priya Nair', email: 'priya.n@email.com', phone: '555-0176', goal: 'General fitness', level: 'Beginner', status: 'Active', plan: 'Standard', joined: '2026-01-20', notes: 'New to strength training. Build confidence first.', planId: p1 },
      { id: c4, name: 'Marcus Lee', email: 'marcus.lee@email.com', phone: '555-0123', goal: 'Marathon prep', level: 'Intermediate', status: 'Paused', plan: 'Standard', joined: '2025-12-08', notes: 'Travelling for work — resumes July.', planId: null },
    ],
    exercises: [
      ex(e1, 'Barbell Back Squat', 'Legs', 'Barbell', 'Intermediate'),
      ex(e2, 'Bench Press', 'Chest', 'Barbell', 'Intermediate'),
      ex(e3, 'Deadlift', 'Back', 'Barbell', 'Advanced'),
      ex(e4, 'Pull-up', 'Back', 'Bodyweight', 'Intermediate'),
      ex(e5, 'Overhead Press', 'Shoulders', 'Barbell', 'Intermediate'),
      ex(e6, 'Dumbbell Lunge', 'Legs', 'Dumbbell', 'Beginner'),
      ex(e7, 'Plank', 'Core', 'Bodyweight', 'Beginner'),
      ex(e8, 'Romanian Deadlift', 'Hamstrings', 'Barbell', 'Intermediate'),
    ],
    plans: [
      { id: p1, name: 'Fat Loss & Tone — 3 Day', desc: 'Full-body strength + conditioning, 3x/week', items: [
        { exId: e1, sets: 3, reps: '12', rest: '60s' }, { exId: e6, sets: 3, reps: '10/leg', rest: '60s' },
        { exId: e2, sets: 3, reps: '12', rest: '60s' }, { exId: e7, sets: 3, reps: '45s', rest: '45s' }] },
      { id: p2, name: 'Strength — Powerlifting Block', desc: 'Heavy compound focus, 4x/week', items: [
        { exId: e1, sets: 5, reps: '5', rest: '3m' }, { exId: e2, sets: 5, reps: '5', rest: '3m' },
        { exId: e3, sets: 3, reps: '3', rest: '4m' }, { exId: e5, sets: 4, reps: '6', rest: '2m' }] },
    ],
    sessions: [
      { id: uid(), clientId: c1, date: d(0), time: '08:00', type: '1-on-1 Training', dur: 60, status: 'Confirmed' },
      { id: uid(), clientId: c2, date: d(0), time: '17:30', type: '1-on-1 Training', dur: 75, status: 'Confirmed' },
      { id: uid(), clientId: c3, date: d(1), time: '09:00', type: 'Assessment', dur: 45, status: 'Confirmed' },
      { id: uid(), clientId: c1, date: d(2), time: '08:00', type: '1-on-1 Training', dur: 60, status: 'Pending' },
      { id: uid(), clientId: c2, date: d(3), time: '17:30', type: '1-on-1 Training', dur: 75, status: 'Confirmed' },
      { id: uid(), clientId: c3, date: d(4), time: '09:00', type: '1-on-1 Training', dur: 60, status: 'Pending' },
      { id: uid(), clientId: c1, date: d(-2), time: '08:00', type: '1-on-1 Training', dur: 60, status: 'Completed' },
      { id: uid(), clientId: c2, date: d(-3), time: '17:30', type: '1-on-1 Training', dur: 75, status: 'Completed' },
    ],
    logs: [
      { id: uid(), clientId: c1, date: '2025-11-05', weightKg: 74, squat: 40 },
      { id: uid(), clientId: c1, date: '2025-12-05', weightKg: 72, squat: 50 },
      { id: uid(), clientId: c1, date: '2026-01-10', weightKg: 70.5, squat: 57.5 },
      { id: uid(), clientId: c1, date: '2026-02-14', weightKg: 69, squat: 62.5 },
      { id: uid(), clientId: c1, date: '2026-03-20', weightKg: 67.5, squat: 67.5 },
      { id: uid(), clientId: c2, date: '2025-10-01', weightKg: 82, squat: 120 },
      { id: uid(), clientId: c2, date: '2025-12-01', weightKg: 84, squat: 135 },
      { id: uid(), clientId: c2, date: '2026-02-01', weightKg: 86, squat: 150 },
      { id: uid(), clientId: c2, date: '2026-04-01', weightKg: 87, squat: 165 },
      { id: uid(), clientId: c3, date: '2026-02-01', weightKg: 61, squat: 25 },
      { id: uid(), clientId: c3, date: '2026-03-01', weightKg: 60.5, squat: 32.5 },
      { id: uid(), clientId: c3, date: '2026-04-15', weightKg: 60, squat: 40 },
    ],
    wellness: [], srpe: [], resistance: [], cardio: [], wearable: [],
    concerns: [
      { id: uid(), clientId: c1, date: d(-2), sessionId: null, category: 'Pain', severity: 'High', source: 'Client', text: 'Sharp pain in right knee during squats — got worse after yesterday’s session.', status: 'Open', resolution: '' },
      { id: uid(), clientId: c2, date: d(-5), sessionId: null, category: 'Equipment', severity: 'Low', source: 'Client', text: 'The heavier dumbbells (>30kg) are often missing from the rack.', status: 'Open', resolution: '' },
      { id: uid(), clientId: c3, date: d(-10), sessionId: null, category: 'Scheduling', severity: 'Medium', source: 'Client', text: 'Struggling to make the 9am slot — could we try later mornings?', status: 'Resolved', resolution: 'Moved standing session to 10:30am from next week.' },
    ],
    prescriptions: [],
    templates: [],
    assessments: [],
    // Voice-parsing synonym index: spoken/parsed phrase → database standard term.
    synonyms: [
      { id: uid(), phrase: 'bb squat', exercise: 'Barbell Back Squat' },
      { id: uid(), phrase: 'back squat', exercise: 'Barbell Back Squat' },
      { id: uid(), phrase: 'squats', exercise: 'Barbell Back Squat' },
      { id: uid(), phrase: 'rdl', exercise: 'Romanian Deadlift' },
      { id: uid(), phrase: 'db rdl', exercise: 'Romanian Deadlift' },
      { id: uid(), phrase: 'straight leg deadlift', exercise: 'Romanian Deadlift' },
      { id: uid(), phrase: 'db bench', exercise: 'Bench Press' },
      { id: uid(), phrase: 'flat dumbbell press', exercise: 'Bench Press' },
      { id: uid(), phrase: 'ohp', exercise: 'Overhead Press' },
      { id: uid(), phrase: 'military press', exercise: 'Overhead Press' },
      { id: uid(), phrase: 'chin up', exercise: 'Pull-up' },
      { id: uid(), phrase: 'chins', exercise: 'Pull-up' },
      { id: uid(), phrase: 'pull ups', exercise: 'Pull-up' },
      { id: uid(), phrase: 'deads', exercise: 'Deadlift' },
      { id: uid(), phrase: 'conventional deadlift', exercise: 'Deadlift' },
      { id: uid(), phrase: 'lunges', exercise: 'Dumbbell Lunge' },
      { id: uid(), phrase: 'split squat', exercise: 'Dumbbell Lunge' },
    ],
    // Lift-max ledger: 'e1rm' events feed the rolling 30-day Absolute 1RM;
    // 'tm' rows are Training Max checkpoints (block-start resets).
    maxes: [
      { id: uid(), clientId: c2, exercise: 'Back Squat', date: d(-24), kind: 'e1rm', valueKg: 172.5, source: 'auto' },
      { id: uid(), clientId: c2, exercise: 'Back Squat', date: d(-10), kind: 'e1rm', valueKg: 176.5, source: 'auto' },
      { id: uid(), clientId: c2, exercise: 'Back Squat', date: d(-28), kind: 'tm', valueKg: 165, source: 'block-start' },
      { id: uid(), clientId: c2, exercise: 'Deadlift', date: d(-8), kind: 'e1rm', valueKg: 205, source: 'auto' },
      { id: uid(), clientId: c2, exercise: 'Deadlift', date: d(-28), kind: 'tm', valueKg: 190, source: 'block-start' },
      { id: uid(), clientId: c1, exercise: 'Goblet Squat', date: d(-12), kind: 'e1rm', valueKg: 34, source: 'auto' },
    ],
    settings: { trainerName: 'Alex Rivera', businessName: 'Fitness Partner Studio', units: 'kg', tz: '' },
  }

  // ----- Assessments: onboarding baseline + a later reassessment for Sarah -----
  const mv = (squat, hinge, lunge, push, pull, pain = []) => ({
    screens: [
      { pattern: 'squat', score: squat, pain: pain.includes('squat') },
      { pattern: 'hinge', score: hinge, pain: pain.includes('hinge') },
      { pattern: 'lunge', score: lunge, pain: pain.includes('lunge') },
      { pattern: 'push', score: push, pain: pain.includes('push') },
      { pattern: 'pull', score: pull, pain: pain.includes('pull') },
    ],
  })
  db.assessments = [
    { id: uid(), clientId: c1, type: 'movement', date: '2025-11-02', phase: 'baseline', notes: 'Baseline screen at onboarding. Knee-limited squat.', data: mv(2, 2, 1, 3, 2, ['lunge']) },
    { id: uid(), clientId: c1, type: 'movement', date: '2026-03-20', phase: 'reassessment', notes: 'Lunge improved after mobility work.', data: mv(3, 3, 2, 3, 3) },
    { id: uid(), clientId: c1, type: 'body_comp', date: '2025-11-02', phase: 'baseline', notes: 'InBody at intake.', data: { method: 'InBody', massKg: 74, bodyFatPct: 30, leanMassKg: 51.8, skeletalMuscleKg: 27.4, visceralFat: 9, hydrationL: 33.1 } },
    { id: uid(), clientId: c1, type: 'body_comp', date: '2026-03-20', phase: 'reassessment', notes: '', data: { method: 'InBody', massKg: 67.5, bodyFatPct: 24, leanMassKg: 51.3, skeletalMuscleKg: 28.1, visceralFat: 6, hydrationL: 34.0 } },
    { id: uid(), clientId: c1, type: 'fitness', date: '2025-11-02', phase: 'baseline', notes: '', data: { strength: [{ lift: 'Back Squat 5RM', valueKg: 40 }, { lift: 'Deadlift 5RM', valueKg: 55 }], endurance: { test: '3-min step', result: 'HRrec 28 bpm' }, mobility: [{ joint: 'Ankle DF', value: '8 cm', side: 'R limited' }], posture: 'Mild anterior pelvic tilt.' } },
    { id: uid(), clientId: c2, type: 'movement', date: '2025-09-15', phase: 'baseline', notes: 'Powerlifter — strong patterns, watch lumbar on hinge.', data: mv(3, 2, 3, 3, 3) },
    { id: uid(), clientId: c2, type: 'body_comp', date: '2025-09-15', phase: 'baseline', notes: '', data: { method: 'BIA', massKg: 82, bodyFatPct: 16, leanMassKg: 68.9, skeletalMuscleKg: 39.2, visceralFat: 7, hydrationL: 50.4 } },
    { id: uid(), clientId: c3, type: 'movement', date: '2026-01-20', phase: 'baseline', notes: 'New lifter — build pattern competency.', data: mv(2, 1, 2, 2, 1) },
  ]

  // ----- Pre-participation screenings (PAR-Q+ 2024 → HHQ → Goals) -----
  // Outcomes/clearance are trainer-only fields; the athlete UI never shows them.
  const ts = (date) => date + 'T09:00:00Z'
  const noAll = (ids) => Object.fromEntries(ids.map((i) => [i, false]))
  const G = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
  const GATES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']
  db.screenings = [
    // Sarah — YES to G6 (knee), all follow-up gateways NO → Outcome B (trainer-only), ready.
    { id: uid(), clientId: c1, status: 'complete', step: 'consent', startedOn: '2025-11-02', completedOn: '2025-11-02', validUntil: '2026-11-02',
      consent: { collect: ts('2025-11-02'), share: ts('2025-11-02') },
      parq: { general: { ...noAll(G), G6: true }, lists: { G6: 'Right knee — patellofemoral pain (2023)' }, delay: {}, followup: noAll(GATES), conditionsAndMeds: '',
        declaration: { name: 'Sarah Mitchell', signature: 'Sarah Mitchell', guardian: '', witness: 'Alex Rivera', date: '2025-11-02' } },
      hhq: { personal: { age: 34, sex: 'Female', heightCm: 168, massKg: 74, occupation: 'Marketing manager', workActivity: 'sitting' },
        contacts: { emergencyName: 'Tom Mitchell', emergencyPhone: '555-0143', emergencyRelation: 'Spouse', physician: 'Dr. Reyes — Northside Clinic' },
        conditions: { respiratory: { status: 'current', note: 'Mild exercise-induced asthma; reliever inhaler as needed' } },
        symptoms: {},
        risk: { familyHistory: false, smoking: 'never', alcohol: '3–4 units/week' },
        meds: { prescriptions: 'Salbutamol inhaler (as needed)', hrbpMeds: 'no', allergies: '' },
        msk: { currentPain: '', pastInjuries: 'Right knee patellofemoral pain (2023) — largely resolved', surgeries: '', implants: '', avoidMovements: 'Deep loaded knee flexion / deep lunges', balanceFalls: false },
        womens: { pregnant: false, postpartum: false, notes: '' },
        lifestyle: { sleepHrs: 7, sleepQuality: 'good', stress: 'moderate', nutrition: '~1700 kcal, vegetarian, tracks via app', caffeine: '2 coffees/day', sedentaryHrs: 8 },
        activity: { exercises: true, detail: 'Strength 3×/week · 45–60 min · moderate', trainingAge: 'returning', priorTrainer: 'Yes — enjoyed structured blocks', selfRating: 5 } },
      goals: { primary: 'Lose fat/weight', secondary: ['Tone & body recomposition'], smart: 'Lose 8 kg and feel strong for my wedding in September', target: { metric: 'weight', value: '−8 kg', date: '2026-09-12' }, event: 'Wedding — 2026-09-12',
        availability: { daysPerWeek: 3, sessionMinutes: 60, timeOfDay: 'Mornings', start: 'Already started' },
        environment: { locations: ['Commercial gym'], equipment: ['Full gym'], groupPref: '1:1 with trainer' },
        prefs: { enjoys: ['Weightlifting', 'Walking/hiking'], dislikes: ['Running'], intensity: 'mixed', hardNo: 'Deep lunges (knee)' } },
      acknowledgements: { accurate: true, share: true, notMedicalAdvice: true, reportChanges: true, at: ts('2025-11-02') },
      outcome: 'B', programStatus: 'ready',
      clearance: { action: 'none', status: 'not_started', notes: '', dateCleared: '' }, updatedAt: ts('2025-11-02') },
    // Priya — YES to G1 (hypertension), YES to follow-up C4b → Outcome C; physician
    // clearance received (trainer actioned), so program start is no longer gated.
    { id: uid(), clientId: c3, status: 'complete', step: 'consent', startedOn: '2026-01-20', completedOn: '2026-01-20', validUntil: '2027-01-20',
      consent: { collect: ts('2026-01-20'), share: ts('2026-01-20') },
      parq: { general: { ...noAll(G), G1: true, G5: true }, lists: {}, delay: {},
        followup: { ...noAll(GATES), C4: true, C4a: false, C4b: true }, conditionsAndMeds: 'Hypertension — lisinopril 10 mg daily',
        declaration: { name: 'Priya Nair', signature: 'Priya Nair', guardian: '', witness: '', date: '2026-01-20' } },
      hhq: { personal: { age: 41, sex: 'Female', heightCm: 165, massKg: 60, occupation: 'Accountant', workActivity: 'sitting' },
        contacts: { emergencyName: 'Dev Nair', emergencyPhone: '555-0177', emergencyRelation: 'Brother', physician: 'Dr. Osei — Riverside Medical' },
        conditions: { bp_chol: { status: 'current', note: 'Hypertension, medicated & monitored' } },
        symptoms: {},
        risk: { familyHistory: true, smoking: 'never', alcohol: 'Rare' },
        meds: { prescriptions: 'Lisinopril 10 mg daily', hrbpMeds: 'yes', allergies: '' },
        msk: { currentPain: '', pastInjuries: 'Right shoulder impingement (resolved)', surgeries: '', implants: '', avoidMovements: '', balanceFalls: false },
        womens: { pregnant: false, postpartum: false, notes: '' },
        lifestyle: { sleepHrs: 6.5, sleepQuality: 'fair', stress: 'high', nutrition: 'Maintenance, building meal routine', caffeine: '1 tea/day', sedentaryHrs: 9 },
        activity: { exercises: false, detail: '', trainingAge: 'new', priorTrainer: 'No', selfRating: 3 } },
      goals: { primary: 'Improve general health & energy', secondary: ['Increase strength'], smart: 'Train consistently 2×/week and feel confident with barbells by summer', target: {}, event: '',
        availability: { daysPerWeek: 2, sessionMinutes: 45, timeOfDay: 'Late mornings', start: 'Immediately' },
        environment: { locations: ['Studio'], equipment: ['Dumbbells', 'Resistance bands'], groupPref: '1:1 with trainer' },
        prefs: { enjoys: ['Bodyweight', 'Walking/hiking'], dislikes: ['HIIT'], intensity: 'steady', hardNo: '' } },
      acknowledgements: { accurate: true, share: true, notMedicalAdvice: true, reportChanges: true, at: ts('2026-01-20') },
      outcome: 'C', programStatus: 'ready',
      clearance: { action: 'eparmedx_or_physician', status: 'received', notes: 'GP letter on file — cleared for moderate-intensity progressive training.', dateCleared: '2026-02-03' }, updatedAt: ts('2026-02-03') },
  ]

  // ----- 28 days of monitoring data for active athletes -----
  const monitored = [
    { cid: c1, opt: true, baseHrv: 62, baseRhr: 58, vlBase: 4200, exs: [['Back Squat', 'Squat'], ['Romanian Deadlift', 'Hinge'], ['Bench Press', 'Push'], ['Seated Row', 'Pull']] },
    { cid: c2, opt: true, baseHrv: 78, baseRhr: 50, vlBase: 9800, exs: [['Back Squat', 'Squat'], ['Deadlift', 'Hinge'], ['Overhead Press', 'Push'], ['Pull-up', 'Pull']] },
    { cid: c3, opt: false, baseHrv: 55, baseRhr: 64, vlBase: 2100, exs: [['Goblet Squat', 'Squat'], ['Hip Thrust', 'Hinge'], ['DB Press', 'Push'], ['Lat Pulldown', 'Pull']] },
  ]
  monitored.forEach((m) => {
    const cli = db.clients.find((c) => c.id === m.cid)
    cli.monitorOptIn = m.opt
    for (let off = -27; off <= 0; off++) {
      const date = d(off)
      const wk = 27 + off
      const wobble = Math.sin(off / 3) * 1.2
      const clamp = (v) => Math.max(1, Math.min(7, Math.round(v)))
      const sleep = clamp(5 + wobble + (Math.random() - 0.5))
      const stress = clamp(3 - wobble * 0.6 + (Math.random() - 0.5))
      const fatigue = clamp(3 - wobble * 0.7 + (Math.random() - 0.5))
      const soreness = clamp(3 - wobble * 0.5 + (Math.random() - 0.5))
      db.wellness.push({ id: uid(), clientId: m.cid, date, sleep, stress, fatigue, soreness, score: sleep + (8 - stress) + (8 - fatigue) + (8 - soreness) })
      if (m.opt) {
        db.wearable.push({ id: uid(), clientId: m.cid, date,
          hrv: Math.round(m.baseHrv + wobble * 4 + (Math.random() - 0.5) * 6),
          rhr: Math.round(m.baseRhr - wobble * 1.5 + (Math.random() - 0.5) * 4),
          sleepHrs: +(7 + wobble * 0.3 + (Math.random() - 0.5) * 0.8).toFixed(1), source: 'Oura (simulated)' })
      }
      if ([1, 2, 4, 6].includes(wk % 7)) {
        const load = m.vlBase * (0.85 + wk / 40) + (Math.random() - 0.5) * m.vlBase * 0.2
        m.exs.forEach(([ex, pat]) => {
          const sets = 3 + (Math.random() < 0.3 ? 1 : 0)
          const reps = 8 + Math.floor(Math.random() * 5)
          const weight = Math.round(load / (sets * reps * 4) / 2.5) * 2.5
          db.resistance.push({ id: uid(), clientId: m.cid, date, exercise: ex, pattern: pat, sets, reps, weight, volumeLoad: sets * reps * weight })
        })
        const rpe = Math.max(3, Math.min(10, Math.round(6 - wobble * 0.8 + (Math.random() - 0.5) * 1.5)))
        const duration = 55 + Math.floor(Math.random() * 30)
        db.srpe.push({ id: uid(), clientId: m.cid, date, sessionId: null, rpe, duration, tl: rpe * duration })
      }
      if ([3, 6].includes(wk % 7)) {
        db.cardio.push({ id: uid(), clientId: m.cid, date, modality: off % 2 ? 'Zone 2 Run' : 'Intervals',
          trimp: Math.round(60 + Math.random() * 60), tiz: Math.round(20 + Math.random() * 25),
          tss: Math.round(40 + Math.random() * 60), hsd: +(0.4 + Math.random() * 1.6).toFixed(2) })
      }
    }
  })

  // ----- static profile data -----
  const profiles = {
    [c1]: { anthro: { age: 34, heightCm: 168, massKg: 67.5, bodyFatPct: 24, leanMassKg: 51.3 }, intake: { questionnaire: 'Goal: lose 8kg & tone for wedding in Sept. Trains 3×/week, prefers mornings.', medical: 'Mild exercise-induced asthma (reliever inhaler as needed).', injury: 'Right knee — patellofemoral pain (2023). Avoid deep loaded knee flexion / deep lunges.', diet: '~1700 kcal target, vegetarian, tracks via app. Low protein intake flagged.' } },
    [c2]: { anthro: { age: 28, heightCm: 182, massKg: 87, bodyFatPct: 14, leanMassKg: 74.8 }, intake: { questionnaire: 'Goal: build maximal strength for spring powerlifting meet. Trains 4×/week.', medical: 'No significant history. Annual physical clear.', injury: 'Lower-back tightness after heavy deadlifts — monitor, no diagnosed pathology.', diet: '~3200 kcal lean-bulk, 180g protein, works with a sports dietitian.' } },
    [c3]: { anthro: { age: 41, heightCm: 165, massKg: 60, bodyFatPct: 27, leanMassKg: 43.8 }, intake: { questionnaire: 'Goal: general fitness & confidence with strength training. New to lifting.', medical: 'Hypertension — managed with medication. Cleared for moderate exercise.', injury: 'None current. History of right shoulder impingement (resolved).', diet: 'Maintenance, no formal tracking. Building consistent meal routine.' } },
    [c4]: { anthro: { age: 36, heightCm: 178, massKg: 75, bodyFatPct: 18, leanMassKg: 61.5 }, intake: { questionnaire: 'Goal: marathon preparation. Currently travelling — programme paused.', medical: 'No significant history.', injury: 'Left IT band tightness during high mileage.', diet: 'Endurance-focused, high carbohydrate periodised around long runs.' } },
  }
  db.clients.forEach((c) => { const p = profiles[c.id]; if (p) { c.anthro = p.anthro; c.intake = p.intake } })

  db.prescriptions = [
    { id: uid(), clientId: c1, date: d(1), notes: 'Lower body — knee-friendly', items: [
      { exercise: 'Goblet Squat', sets: 3, reps: 10, load: 24, intensity: 70, intensityType: '%1RM', group: '', mode: 'Straight', tempo: '30X1', volumeLoad: 720 },
      { exercise: 'Romanian Deadlift', sets: 3, reps: 8, load: 50, intensity: 7, intensityType: 'RPE', group: '', mode: 'Straight', tempo: '31X1', volumeLoad: 1200 },
      { exercise: 'Leg Press', sets: 3, reps: 12, load: 120, intensity: 65, intensityType: '%1RM', group: '', mode: 'Straight', tempo: '20X0', volumeLoad: 4320 }] },
    { id: uid(), clientId: c2, date: d(0), notes: 'Heavy squat day', items: [
      { exercise: 'Back Squat', sets: 5, reps: 5, load: 150, intensity: 85, intensityType: '%1RM', group: '', mode: 'Straight', tempo: '21X1', volumeLoad: 3750 },
      { exercise: 'Deadlift', sets: 3, reps: 3, load: 180, intensity: 88, intensityType: '%1RM', group: '', mode: 'Straight', tempo: 'X1X1', volumeLoad: 1620 }] },
  ]
  return db
}
