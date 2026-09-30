import { uid } from './format.js'
import { addDays } from './dates.js'

const exercises = [
  { name: 'Demo Back Squat', direct: ['Quadriceps', 'Glutes'], indirect: ['Adductors', 'Spinal erectors', 'Abdominals'], mode: 'Strength' },
  { name: 'Demo Romanian Deadlift', direct: ['Hamstrings', 'Glutes'], indirect: ['Spinal erectors', 'Forearms'], mode: 'Strength' },
  { name: 'Demo Bench Press', direct: ['Chest'], indirect: ['Front delts', 'Triceps'], mode: 'Strength' },
  { name: 'Demo Lat Pulldown', direct: ['Lats'], indirect: ['Upper back', 'Biceps'], mode: 'Strength' },
  { name: 'Demo Lateral Raise', direct: ['Side delts'], indirect: ['Trapezius'], mode: 'Strength' },
  { name: 'Demo Jump Squat', direct: ['Quadriceps', 'Glutes', 'Calves'], indirect: [], mode: 'Ballistic' },
  { name: 'Demo Calf Raise', direct: ['Calves'], indirect: [], mode: 'Strength' },
]

const monday = (date) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))
const demoMarker = '[muscle-volume-demo]'
export const isMuscleVolumeDemo = (client) => client?.notes?.includes(demoMarker) === true
const rows = (count, reps, load, extra = {}) => Array.from({ length: count }, (_, index) => ({
  n: index + 1, done: true, purpose: 'working', reps, load, ...extra,
}))

// Called only from the explicit sample-client action. Never updates a real client.
export function addMuscleVolumeDemo(db, today) {
  const existing = (db.clients || []).find(isMuscleVolumeDemo)
  if (existing) return existing.id

  const id = uid()
  const created = monday(today)
  const catalog = exercises.map((exercise) => ({
    id: uid(), name: exercise.name, mode: exercise.mode, category: exercise.mode === 'Ballistic' ? 'Ballistic' : 'Strength',
    muscleTargets: { direct: exercise.direct, indirect: exercise.indirect, source: 'coach' },
  }))
  const byName = Object.fromEntries(catalog.map((exercise) => [exercise.name, exercise]))
  const item = (name, blockType, setRows) => ({ id: uid(), exId: byName[name].id, name, blockType, setRows })
  const workout = (date, title, main) => ({
    id: uid(), clientId: id, date, title, status: 'completed', source: 'Muscle volume demo',
    warmup: [item('Demo Back Squat', 'Warm-up', rows(2, 8, 20))], main, cooldown: [],
  })

  db.clients.push({ id, name: 'Muscle Volume Demo', goal: 'Explore weekly training volume', level: 'Intermediate',
    status: 'Active', joined: today, notes: `${demoMarker} Sample client. All training records are fictional.` })
  db.exercises.push(...catalog)
  db.workouts.push(
    workout(created, 'Demo lower-body session', [
      item('Demo Back Squat', 'Main Lifts', [...rows(1, 8, 30, { purpose: 'warmup' }), ...rows(4, 8, 60)]),
      item('Demo Romanian Deadlift', 'Main Lifts', rows(3, 10, 50)),
      item('Demo Calf Raise', 'Assisted', rows(3, 15, null)),
    ]),
    workout(today, 'Demo upper-body and power session', [
      item('Demo Jump Squat', 'Power', rows(3, 5, 0)),
      item('Demo Bench Press', 'Main Lifts', rows(4, 8, 40)),
      item('Demo Lat Pulldown', 'Assisted', rows(3, 12, 35)),
      item('Demo Lateral Raise', 'Assisted', rows(3, 12, 10)),
    ]),
    workout(addDays(created, -5), 'Demo previous-week session', [
      item('Demo Back Squat', 'Main Lifts', rows(3, 8, 55)),
      item('Demo Bench Press', 'Main Lifts', rows(3, 8, 37.5)),
      item('Demo Lat Pulldown', 'Assisted', rows(3, 10, 30)),
    ]),
  )
  return id
}
