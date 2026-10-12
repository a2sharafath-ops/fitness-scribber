import { createProgram } from './programLibrary'
import { newProgExercise, newSet } from './program'

// Editable examples: progression is coach-led; no automatic load increases.
const definitions = [
  ['foundation', 'Full-body Foundation', 6, 'General fitness', 'Beginner', [
    ['Full body A', 'Goblet Squat', 'Bench Press', 'Lat Pulldown', 'Seated Leg Curl', 'Dead Bug'],
    ['Full body B', 'Dumbbell Romanian Deadlift', 'Dumbbell Shoulder Press', 'Seated Cable Row', 'Reverse Lunge', 'Dead Bug'],
  ]],
  ['fullbody', 'Full-body Strength & Muscle', 8, 'Hypertrophy', 'All levels', [
    ['Full body A', 'Back Squat', 'Bench Press', 'Chest Supported Row', 'Seated Leg Curl'],
    ['Full body B', 'Romanian Deadlift', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Reverse Lunge'],
    ['Full body C', 'Leg Press', 'Incline Dumbbell Press', 'Seated Cable Row', 'Dumbbell Curl'],
  ]],
  ['upperlower', 'Upper / Lower Hypertrophy', 8, 'Hypertrophy', 'Intermediate', [
    ['Upper A', 'Bench Press', 'Chest Supported Row', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Dumbbell Curl'],
    ['Lower A', 'Back Squat', 'Romanian Deadlift', 'Seated Leg Curl', 'Standing Calf Raise'],
    ['Upper B', 'Incline Dumbbell Press', 'Seated Cable Row', 'Lateral Raise', 'Triceps Pressdown', 'Reverse Fly'],
    ['Lower B', 'Leg Press', 'Bulgarian Split Squat', 'Seated Leg Curl', 'Seated Calf Raise'],
  ]],
  ['fiveday', 'Five-day Hypertrophy', 8, 'Hypertrophy', 'Intermediate', [
    ['Legs A', 'Back Squat', 'Leg Press', 'Seated Leg Curl', 'Standing Calf Raise'],
    ['Push', 'Bench Press', 'Incline Dumbbell Press', 'Lateral Raise', 'Triceps Pressdown'],
    ['Pull', 'Lat Pulldown', 'Chest Supported Row', 'Reverse Fly', 'Dumbbell Curl'],
    ['Lower B', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Seated Leg Curl', 'Seated Calf Raise'],
    ['Upper B', 'Incline Dumbbell Press', 'Seated Cable Row', 'Lat Pulldown', 'Lateral Raise', 'Dumbbell Curl'],
  ]],
  ['strength', 'Strength Priority', 8, 'Strength', 'Intermediate', [
    ['Squat + bench', 'Back Squat', 'Bench Press', 'Chest Supported Row'],
    ['Hinge + press', 'Trap Bar Deadlift', 'Overhead Press', 'Lat Pulldown'],
    ['Squat + bench volume', 'Back Squat', 'Bench Press', 'Seated Cable Row'],
  ]],
  ['dumbbell', 'Dumbbell & Bodyweight', 6, 'General fitness', 'All levels', [
    ['Full body A', 'Goblet Squat', 'Dumbbell Floor Press', 'One Arm Dumbbell Row', 'Dead Bug'],
    ['Full body B', 'Dumbbell Romanian Deadlift', 'Push-up', 'Reverse Lunge', 'Dumbbell Curl'],
  ]],
]
export function programStarters(exercises = []) {
  return definitions.map(([key, name, count, goal, level, sessions]) => {
    const p = createProgram(name, count, sessions.length)
    p.id = `starter-${key}`
    Object.assign(p.data, { builtinKey: key, goal, level, equipment: key === 'dumbbell' ? 'Dumbbells & bodyweight' : 'Full gym' })
    p.data.weeks.forEach((week, wi) => week.forEach((session, si) => {
      session.name = sessions[si][0]
      session.blocks[0].exercises = sessions[si].slice(1).map((name, ei) => {
        const entry = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())
        const main = key === 'strength' && ei < 2
        return newProgExercise(entry?.name || name, { dbRef: entry?.id, order: ei + 1, intensityType: main ? '%1RM' : 'Load',
          sets: Array.from({ length: key === 'foundation' ? 2 : 3 }, (_, n) => newSet(n + 1, {
            reps: main ? si === 2 ? 6 : 3 : 8, repsMax: main ? si === 2 ? 8 : 5 : 12,
            intensity: main ? si === 2 ? 70 : 80 : null, rir: wi < 2 ? 3 : 2,
            rest: /squat|deadlift|bench/i.test(name) ? 180 : 120,
          })),
        })
      })
    }))
    return p
  })
}
