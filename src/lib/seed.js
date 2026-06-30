// Initial demo dataset so every chart/view is populated on first run.
import { uid } from './format'
import { addDays } from './dates'

export function seed() {
  const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid()
  const e1 = uid(), e2 = uid(), e3 = uid(), e4 = uid(), e5 = uid(), e6 = uid(), e7 = uid(), e8 = uid()
  const p1 = uid(), p2 = uid()
  const d = (off) => addDays(new Date().toLocaleDateString('en-CA'), off)

  const db = {
    clients: [
      { id: c1, name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '555-0142', goal: 'Lose 8kg & tone', level: 'Intermediate', status: 'Active', plan: 'Premium', joined: '2025-11-02', notes: 'Prefers morning sessions. Knee sensitivity — avoid deep lunges.', planId: p1 },
      { id: c2, name: 'James Carter', email: 'jcarter@email.com', phone: '555-0198', goal: 'Build muscle mass', level: 'Advanced', status: 'Active', plan: 'Premium', joined: '2025-09-15', notes: 'Training for powerlifting meet in spring.', planId: p2 },
      { id: c3, name: 'Priya Nair', email: 'priya.n@email.com', phone: '555-0176', goal: 'General fitness', level: 'Beginner', status: 'Active', plan: 'Standard', joined: '2026-01-20', notes: 'New to strength training. Build confidence first.', planId: p1 },
      { id: c4, name: 'Marcus Lee', email: 'marcus.lee@email.com', phone: '555-0123', goal: 'Marathon prep', level: 'Intermediate', status: 'Paused', plan: 'Standard', joined: '2025-12-08', notes: 'Travelling for work — resumes July.', planId: null },
    ],
    exercises: [
      { id: e1, name: 'Barbell Back Squat', muscle: 'Legs', equip: 'Barbell' },
      { id: e2, name: 'Bench Press', muscle: 'Chest', equip: 'Barbell' },
      { id: e3, name: 'Deadlift', muscle: 'Back', equip: 'Barbell' },
      { id: e4, name: 'Pull-up', muscle: 'Back', equip: 'Bodyweight' },
      { id: e5, name: 'Overhead Press', muscle: 'Shoulders', equip: 'Barbell' },
      { id: e6, name: 'Dumbbell Lunge', muscle: 'Legs', equip: 'Dumbbell' },
      { id: e7, name: 'Plank', muscle: 'Core', equip: 'Bodyweight' },
      { id: e8, name: 'Romanian Deadlift', muscle: 'Hamstrings', equip: 'Barbell' },
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
    settings: { trainerName: 'Alex Rivera', businessName: 'FitScribe Studio', units: 'kg', tz: '' },
  }

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
