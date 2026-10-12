import { seed } from './seed'
import { todayISO, addDays } from './dates'
import { newBlock, newProgExercise, newSet, blocksToItems, ensureProgramShape } from './program'
import { buildFromPrescription } from './workout'

export const BUILDER_QA_CLIENT = 'local-builder-100'
export const BUILDER_QA_OTHER = 'local-builder-200'

// Dedicated local-only dataset. Its storage key is separate from ordinary
// local app data, and the QA mode cannot construct a Supabase client.
export function seedBuilderQA(today = todayISO('Asia/Dubai')) {
  const db = seed()
  for (const key of Object.keys(db)) if (Array.isArray(db[key]) && db[key].some(row => row.clientId)) db[key] = []
  db.clients = [
    { id: BUILDER_QA_CLIENT, name: 'Builder Test · TM 100', email: 'coach-a@example.test', level: 'Intermediate', status: 'Active', plan: 'Standard', goal: 'Test exercise prescriptions', joined: today, planId: null, monitorOptIn: false },
    { id: BUILDER_QA_OTHER, name: 'Builder Test · TM 200', email: 'coach-b@example.test', level: 'Intermediate', status: 'Active', plan: 'Standard', goal: 'Test copied percentage targets', joined: today, planId: null, monitorOptIn: false },
  ]
  db.settings = { ...db.settings, tz: 'Asia/Dubai', trainerName: 'Local Test Coach' }
  db.maxes = db.clients.map((client, i) => ({ id: `qa-tm-${i}`, clientId: client.id, exercise: 'Bench Press', date: today, kind: 'tm', valueKg: i ? 200 : 100, source: 'Local test fixture' }))
  const lift = () => newProgExercise('Bench Press', { intensityType: '%1RM', sets: [1,2,3].map(n => newSet(n, { reps: 5, intensity: 80, rir: 2 })) })
  const plan = (clientId, offset, name, mixed = false) => {
    const block = newBlock('Main Lifts')
    block.exercises = [lift()]
    if (mixed) block.exercises.push(
      newProgExercise('Goblet Squat', { intensityType: 'RIR', sets: [newSet(1, { reps: 8, intensity: 2 })] }),
      newProgExercise('Push-up', { intensityType: 'Load', sets: [newSet(1, { reps: 10, loadKg: 0, rir: 3 })] }),
      newProgExercise('Plank', { intensityType: 'Seconds', sets: [newSet(1, { reps: null, intensity: 30 })] }),
    )
    const record = { id: `qa-plan-${clientId}-${offset}`, clientId, date: addDays(today, offset), name, notes: 'Fictional local testing data', blocks: [block], items: blocksToItems([block]) }
    db.prescriptions.push(record)
    return record
  }
  db.prescriptions = []; db.workouts = []; db.sessions = []; db.wearable = []
  plan(BUILDER_QA_CLIENT, 0, 'Mixed prescription test', true)
  plan(BUILDER_QA_CLIENT, 1, 'Existing plan — overwrite test')
  plan(BUILDER_QA_OTHER, 0, 'Copy conflict — TM 200')
  const runningPlan = plan(BUILDER_QA_CLIENT, 2, 'Protected running workout')
  const running = buildFromPrescription(runningPlan, { clientId: BUILDER_QA_CLIENT, date: runningPlan.date, resolveTm: () => 100 })
  running.status = 'in_progress'; db.workouts.push(running)
  db.sessions.push({ id: 'qa-completed-booking', clientId: BUILDER_QA_OTHER, date: addDays(today, 2), time: '09:00', type: 'Personal training', status: 'Completed', notes: 'Protected appointment test' })
  ensureProgramShape(db)
  return db
}
