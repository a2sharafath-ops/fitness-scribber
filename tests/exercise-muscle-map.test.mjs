import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { EXERCISE_LIBRARY } from '../src/lib/exerciseLibrary.js'
import { CORRECTIVE_LIBRARY } from '../src/lib/correctiveLibrary.js'
import { recommendedMuscleTargets } from '../src/lib/exerciseMuscleMap.js'
import { MUSCLES, muscleTargets, muscleVolume } from '../src/lib/muscleVolume.js'
import { EXERCISE_LIBRARY_EXPANSION, EXERCISE_LIBRARY_ADDITIONS_2026_10_24, EXERCISE_LIBRARY_ADDITIONS_BATCH_3, EXERCISE_LIBRARY_ADDITIONS_BATCH_4, EXERCISE_LIBRARY_ADDITIONS_BATCH_5, EXERCISE_LIBRARY_ADDITIONS_BATCH_6, EXERCISE_LIBRARY_ADDITIONS_BATCH_7 } from '../src/lib/exerciseLibraryExpansion.js'
import { EXERCISE_ALIASES, matchesExerciseSearch, exerciseSearchRank, exerciseAliases, exerciseSuggestionDescription } from '../src/lib/exerciseSearch.js'
import { validatePrescription } from '../src/lib/prescription.js'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const { mergeExerciseLibrary } = await vite.ssrLoadModule('/src/lib/program.js')

test('crunch defaults do not add spinal-extensor exposure and catalog repairs preserve coach overrides', () => {
  const names = ['Abdominal Crunch', 'Reverse Crunch', 'Cable Crunch', 'Machine Abdominal Crunch', 'Bicycle Crunch']
  const db = {
    exercises: names.map((name, i) => ({ id: `crunch-${i}`, name, muscleTargets: { direct: ['Abdominals'], indirect: ['Spinal erectors'], source: 'catalog' } })),
    resistance: names.map((exercise, i) => ({ id: `log-${i}`, clientId: 'audit', date: '2026-10-24', exercise, sets: 1, reps: 10, weight: 0 })),
  }
  mergeExerciseLibrary(db)
  const report = muscleVolume(db, 'audit', '2026-10-24', '2026-10-24')
  assert.equal(report.muscles.find(row => row.muscle === 'Abdominals').directSets, names.length)
  assert.ok(!report.muscles.some(row => row.muscle === 'Spinal erectors'))
  names.forEach((name, i) => {
    assert.equal(db.exercises.find(e => e.name === name).id, `crunch-${i}`)
    assert.equal(db.exercises.filter(e => e.name === name).length, 1)
    assert.deepEqual(muscleTargets({ name }), { direct: ['Abdominals'], indirect: [] })
  })
  const override = { direct: ['Abdominals'], indirect: ['Hip flexors'], source: 'coach' }
  const coachDb = { exercises: [{ id: 'coach-crunch', name: 'Cable Crunch', muscleTargets: override }] }
  mergeExerciseLibrary(coachDb)
  assert.deepEqual(coachDb.exercises.find(e => e.id === 'coach-crunch').muscleTargets, override)
})

test('trunk and linked-power tasks do not alias unrelated curls, presses or barbell cleans', () => {
  assert.ok(matchesExerciseSearch('Floor Sit-Up', 'bent knee sit up'))
  assert.ok(!matchesExerciseSearch('Abdominal Crunch', 'full sit up'))
  assert.ok(matchesExerciseSearch('Dumbbell Side Bend', 'dumbbell lateral trunk flexion'))
  assert.ok(exerciseSearchRank('Dumbbell Side Bend', 'dumbbell side bend') < exerciseSearchRank('Dumbbell Wrist Radial and Ulnar Deviation', 'dumbbell side bend'))
  assert.ok(matchesExerciseSearch('Single-Arm Kettlebell Clean', 'one arm KB clean'))
  assert.ok(!matchesExerciseSearch('Clean', 'one arm KB clean'))
  assert.ok(matchesExerciseSearch('Barbell Thruster', 'barbell squat to press'))
  assert.ok(!matchesExerciseSearch('Push Press', 'barbell squat to press'))
  const kbClean = EXERCISE_LIBRARY.find(e => e.name === 'Single-Arm Kettlebell Clean')
  const thruster = EXERCISE_LIBRARY.find(e => e.name === 'Barbell Thruster')
  assert.equal(kbClean.category, 'Ballistic')
  assert.equal(thruster.category, 'Ballistic')
  assert.deepEqual(muscleTargets(kbClean).direct, ['Hamstrings', 'Glutes'])
  assert.ok(muscleTargets(thruster).direct.includes('Quadriceps'))
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_BATCH_7) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise))
    assert.ok(exerciseAliases(exercise).length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('pelvic-control and compression entries stay distinct and the L-sit accepts a timed prescription', () => {
  assert.ok(matchesExerciseSearch('Hip Hike (Step)', 'pelvic drop and hike'))
  assert.ok(!matchesExerciseSearch('Lateral Step-Down', 'hip hike'))
  assert.ok(!matchesExerciseSearch('Standing Cable Hip Abduction', 'pelvic drop'))
  assert.deepEqual(muscleTargets({ name: 'Hip Hike (Step)' }).direct, ['Hip abductors'])
  assert.ok(matchesExerciseSearch('L-Sit Hold (Parallel Bars)', 'parallette L sit'))
  assert.ok(matchesExerciseSearch('Seated Pike Leg Lift', 'seated pike compression lift'))
  assert.ok(!matchesExerciseSearch('Lying Leg Raise', 'seated straight leg lift'))
  assert.ok(!matchesExerciseSearch('L-Sit Hold (Parallel Bars)', 'hanging leg raise'))
  const timedSet = { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null }
  const blocks = [{ blockType: 'Core/Others', exercises: [{ exerciseName: 'L-Sit Hold (Parallel Bars)', intensityType: 'Seconds', sets: [timedSet] }] }]
  assert.equal(validatePrescription('Bodyweight hold', JSON.parse(JSON.stringify(blocks))), true)
  timedSet.prescribedIntensityValue = 0
  assert.throws(() => validatePrescription('Bodyweight hold', blocks), /Seconds must be greater than zero/)
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_BATCH_6) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise))
    assert.ok(exerciseAliases(exercise).length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('rotational and band batch keeps wrist directions together and distinguishes equipment and shoulder position', () => {
  const wrist = EXERCISE_LIBRARY.find(e => e.name === 'Dumbbell Wrist Radial and Ulnar Deviation')
  for (const query of ['dumbbell wrist radial deviation', 'dumbbell wrist ulnar deviation', 'DB wrist side bend']) assert.ok(matchesExerciseSearch(wrist, query))
  assert.equal(EXERCISE_LIBRARY.filter(e => /wrist.*(?:radial|ulnar).*deviation/i.test(e.name)).length, 1)
  assert.ok(!matchesExerciseSearch('Dumbbell Forearm Pronation', 'wrist radial deviation'))
  assert.ok(!matchesExerciseSearch('Dumbbell Wrist Curl', 'wrist ulnar deviation'))
  assert.ok(matchesExerciseSearch('Landmine Rotation', 'landmine 180'))
  assert.ok(!matchesExerciseSearch('Standing Split-Stance Single-Arm Landmine Press', 'landmine rotation'))
  assert.ok(matchesExerciseSearch('Banded Face Pull', 'resistance band face pull'))
  assert.ok(!matchesExerciseSearch('Face Pull', 'resistance band face pull'))
  assert.ok(matchesExerciseSearch('Banded Overhead Triceps Extension', 'overhead band tricep extension'))
  assert.ok(!matchesExerciseSearch('Banded Triceps Pushdown', 'overhead triceps'))
  assert.deepEqual(muscleTargets(wrist).direct, ['Forearms'])
  assert.deepEqual(muscleTargets({ name: 'Landmine Rotation' }).direct, ['Abdominals'])
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_BATCH_5) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise))
    assert.ok(exerciseAliases(exercise).length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('bodyweight batch separates assistance, elbow isolation and warm-up movement', () => {
  assert.ok(matchesExerciseSearch('Band-Assisted Push-Up', 'elastic assisted push up'))
  assert.ok(matchesExerciseSearch('Banded Push-Up', 'band resisted push up'))
  assert.ok(!matchesExerciseSearch('Banded Push-Up', 'assisted band push up'))
  assert.ok(!matchesExerciseSearch('Band-Assisted Push-Up', 'resisted push up'))
  assert.ok(matchesExerciseSearch('Hamstring Walkout', 'bridge heel walkout'))
  assert.ok(!matchesExerciseSearch('Bridge Lift and Curl (Slide Board)', 'heel walkout'))
  assert.ok(matchesExerciseSearch('Bodyweight Triceps Extension (Fixed Bar)', 'fixed bar bodyweight skull crusher'))
  assert.ok(!matchesExerciseSearch('EZ-Bar Skull Crusher', 'bodyweight skull crusher'))
  assert.ok(matchesExerciseSearch('Standing Banded Overhead Press', 'resistance band shoulder press'))
  assert.ok(matchesExerciseSearch('Supported Kneeling-to-Standing', 'chair supported floor to stand'))
  assert.ok(matchesExerciseSearch('Inchworm', 'inch worm walkout'))
  assert.ok(!matchesExerciseSearch('Plank Walk-Up', 'inchworm'))
  assert.deepEqual(muscleTargets({ name: 'Bodyweight Triceps Extension (Fixed Bar)' }).direct, ['Triceps'])
  assert.ok(!muscleTargets({ name: 'Inchworm' }).direct.includes('Hamstrings'), 'hamstring lengthening is not classified as direct resistance work')
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_BATCH_4) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise))
    assert.ok(exerciseAliases(exercise).length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('quality batch preserves assistance, equipment and movement-plane distinctions', () => {
  for (const [name, query] of [
    ['Hand-Assisted Pistol Squat', 'supported pistol squat'],
    ['Dumbbell Deficit Reverse Lunge', 'DB reverse lunge from a step'],
    ['Single-Leg Cable Romanian Deadlift', 'cable single leg RDL'],
    ['Standing Split-Stance Single-Arm Landmine Press', 'standing one arm landmine press'],
    ['Dumbbell Scaption Raise (Thumbs Up)', 'thumbs up scaption'],
    ['Cable Serratus Punch', 'cable scapular protraction'],
    ['Chest-Supported Dumbbell Y Raise', 'prone incline DB Y raise'],
  ]) assert.ok(matchesExerciseSearch(name, query), name)
  assert.ok(!matchesExerciseSearch('Pistol Squat', 'supported pistol squat'))
  assert.ok(!matchesExerciseSearch('Dumbbell Front Raise', 'scaption'))
  assert.ok(!matchesExerciseSearch('Dumbbell Lateral Raise', 'scaption'))
  assert.ok(!matchesExerciseSearch('DB Romanian Deadlift 2-Arm/1-Leg', 'cable single leg RDL'))
  assert.ok(!matchesExerciseSearch('1/2 Kneeling Land Mine Press', 'standing landmine press'))
  assert.deepEqual(muscleTargets({ name: 'Cable Serratus Punch' }).direct, ['Serratus anterior'])
  assert.deepEqual(muscleTargets({ name: 'Seated Barbell Good Morning' }).direct, ['Spinal erectors'])
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_BATCH_3) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise))
    assert.ok(exerciseAliases(exercise).length)
    assert.equal(exercise.relTo, undefined)
    assert.equal(exercise.relPct, undefined)
  }
})

test('second expansion preserves distinct support and movement options in search and muscle reporting', () => {
  const supported = EXERCISE_LIBRARY.find(e => e.name === 'Supported Single-Leg Dumbbell Romanian Deadlift')
  assert.ok(matchesExerciseSearch(supported, 'hand supported single leg rdl'))
  assert.deepEqual(muscleTargets(supported).direct, ['Hamstrings', 'Glutes'])
  assert.ok(EXERCISE_LIBRARY.some(e => e.name === 'DB Romanian Deadlift 2-Arm/1-Leg'))
  assert.ok(matchesExerciseSearch('Cable Hammer Curl', 'rope hammer curl'))
  assert.ok(matchesExerciseSearch('Plank Walk-Up', 'commando plank'))
  assert.ok(matchesExerciseSearch('Kettlebell Turkish Get-Up', 'kb tgu'))
  assert.ok(!matchesExerciseSearch('Dumbbell Forearm Pronation', 'supination'))
  assert.ok(!muscleTargets({ name: 'Scapular Pull-Up' }).direct.includes('Biceps'))
  assert.deepEqual(muscleTargets({ name: 'Scapular Push-Up' }).direct, ['Serratus anterior'])
  for (const exercise of EXERCISE_LIBRARY_ADDITIONS_2026_10_24) {
    assert.ok(EXERCISE_LIBRARY.includes(exercise), exercise.name)
    assert.ok(exerciseAliases(exercise).length, exercise.name)
  }
})

test('upgrading a library preserves a matching manually created new exercise and its workout reference', () => {
  const exercise = { id: 'coach-supported-rdl', name: 'Supported Single-Leg Dumbbell Romanian Deadlift', video: 'coach-demo', muscleTargets: { direct: ['Hamstrings'], indirect: ['Glutes'], source: 'coach' } }
  const db = { exercises: [exercise], plans: [{ name: 'Client session', items: [{ exId: exercise.id }] }] }
  mergeExerciseLibrary(db, 'coach-a')
  mergeExerciseLibrary(db, 'coach-a')
  const matches = db.exercises.filter(e => e.name === exercise.name)
  assert.equal(matches.length, 1)
  assert.equal(matches[0].id, 'coach-supported-rdl')
  assert.equal(matches[0].video, 'coach-demo')
  assert.equal(db.plans[0].items[0].exId, 'coach-supported-rdl')
  assert.deepEqual(muscleTargets(matches[0]), { direct: ['Hamstrings'], indirect: ['Glutes'] })
})

test('catalog mapping covers all unambiguous strength names and all corrective activations', () => {
  const pending = EXERCISE_LIBRARY.filter((e) => !e.muscleTargets?.direct?.length).map((e) => e.name)
  assert.deepEqual(pending, [
    'Bridge Drop Downs (Ball)', 'Bridge Drop Downs (Slide Board)',
    'Bridge Drop Downs 1-Leg (Ball)', 'Bridge Drop Downs 1-Leg (Slide Board)',
    'DB Press 1-Arm', 'DB Press 2-Arm', 'DB Press 2-Arm (Alternating)',
  ])
  for (const e of CORRECTIVE_LIBRARY) {
    const m = recommendedMuscleTargets(e.name, e.mode)
    assert.equal(Boolean(m?.direct?.length), e.mode === 'Activation', e.name)
  }
  for (const e of EXERCISE_LIBRARY) {
    for (const raw of [...(e.muscleTargets?.direct || []), ...(e.muscleTargets?.indirect || [])]) assert.ok(MUSCLES.includes(raw), `${e.name}: ${raw}`)
    const m = muscleTargets(e)
    assert.ok(m.direct.every((muscle) => MUSCLES.includes(muscle)))
    assert.ok(m.indirect.every((muscle) => MUSCLES.includes(muscle) && !m.direct.includes(muscle)))
  }
  for (const e of CORRECTIVE_LIBRARY.filter((item) => item.mode === 'Activation')) {
    const raw = recommendedMuscleTargets(e.name, e.mode)
    for (const muscle of [...raw.direct, ...raw.indirect]) assert.ok(MUSCLES.includes(muscle), `${e.name}: ${muscle}`)
  }
})

test('common variants receive different, defensible roles', () => {
  assert.deepEqual(muscleTargets({ name: 'Hip Thrust (Bench)' }).direct, ['Glutes'])
  assert.deepEqual(muscleTargets({ name: 'Romanian Deadlift' }).direct, ['Hamstrings', 'Glutes'])
  assert.deepEqual(muscleTargets({ name: 'Deadlift' }).direct, ['Quadriceps', 'Glutes', 'Spinal erectors'])
  assert.deepEqual(muscleTargets({ name: 'Military Press' }).direct, ['Front delts', 'Side delts', 'Triceps'])
  assert.deepEqual(muscleTargets({ name: 'Bench Press' }).direct, ['Chest'])
  assert.deepEqual(muscleTargets({ name: 'Barbell Curls' }).direct, ['Biceps'])
  assert.deepEqual(muscleTargets({ name: 'Push Ups (Narrow)' }).direct, ['Chest', 'Triceps'])
  assert.deepEqual(muscleTargets({ name: 'Leg Press' }).indirect, ['Adductors'])
  assert.deepEqual(muscleTargets({ name: 'Clean & Jerk' }).direct, ['Trapezius', 'Front delts', 'Triceps', 'Quadriceps', 'Glutes'])
  assert.deepEqual(muscleTargets({ name: 'DB Press 1-Arm' }).direct, [])
})

test('library merge keeps IDs and coach overrides on repeated loads', () => {
  const edited = { id: 'existing-bench', name: 'Bench Press', muscle: 'Chest', muscleTargets: { direct: ['Triceps'], indirect: [], source: 'coach' }, video: 'custom-video' }
  const db = { exercises: [edited, { id: 'custom', name: 'My exercise', muscle: 'Arms' }] }
  mergeExerciseLibrary(db)
  const count = db.exercises.length
  const bench = db.exercises.find((e) => e.name === 'Bench Press')
  assert.equal(bench.id, 'existing-bench')
  assert.equal(bench.video, 'custom-video')
  assert.deepEqual(muscleTargets(bench).direct, ['Triceps'])
  assert.equal(db.exercises.find((e) => e.id === 'custom').name, 'My exercise')
  mergeExerciseLibrary(db)
  assert.equal(db.exercises.length, count)
  assert.equal(db.exercises.find((e) => e.name === 'Bench Press').id, 'existing-bench')
})

test('new catalog ids are stable across independent backend loads', () => {
  const first = { exercises: [] }, second = { exercises: [] }
  mergeExerciseLibrary(first, 'coach-a')
  mergeExerciseLibrary(second, 'coach-a')
  assert.equal(first.exercises.find((e) => e.name === 'Bench Press').id, second.exercises.find((e) => e.name === 'Bench Press').id)
  assert.equal(new Set(first.exercises.map((e) => e.id)).size, first.exercises.length)
  const anotherCoach = { exercises: [] }
  mergeExerciseLibrary(anotherCoach, 'coach-b')
  assert.notEqual(first.exercises.find((e) => e.name === 'Bench Press').id, anotherCoach.exercises.find((e) => e.name === 'Bench Press').id)
})

test('old seeded plans regain only their known orphaned library slots', () => {
  const plan = { name: 'Strength — Powerlifting Block', items: [
    { exId: 'kept', sets: 5, reps: '5' },
    { exId: 'lost-bench', sets: 5, reps: '5' },
    { exId: 'lost-deadlift', sets: 3, reps: '3' },
  ] }
  const custom = { name: 'Custom plan', items: [{ exId: 'lost', sets: 5, reps: '5' }] }
  const db = { exercises: [{ id: 'kept', name: 'Back Squat' }], plans: [plan, custom] }
  mergeExerciseLibrary(db)
  assert.equal(plan.items[0].exId, 'kept')
  assert.equal(plan.items[1].exId, db.exercises.find((e) => e.name === 'Bench Press').id)
  assert.equal(plan.items[2].exId, db.exercises.find((e) => e.name === 'Deadlift').id)
  assert.equal(custom.items[0].exId, 'lost')
})

test('catalog corrections replace catalog mappings but preserve coach mappings', () => {
  const db = { exercises: [
    { id: 'wrong', name: 'Push Ups (Narrow)', muscleTargets: { direct: ['Lats', 'Upper back'], indirect: ['Biceps'] } },
    { id: 'coach', name: 'Bench Press', muscleTargets: { direct: ['Triceps'], indirect: [], source: 'coach' } },
  ] }
  mergeExerciseLibrary(db)
  assert.deepEqual(muscleTargets(db.exercises.find((e) => e.id === 'wrong')).direct, ['Chest', 'Triceps'])
  assert.deepEqual(muscleTargets(db.exercises.find((e) => e.id === 'coach')).direct, ['Triceps'])
})

test('expanded catalog has unique names, supported metadata and explicit muscle roles without invented max ratios', () => {
  const all = [...EXERCISE_LIBRARY, ...CORRECTIVE_LIBRARY]
  const names = all.map(exercise => exercise.name.trim().replace(/\s+/g, ' ').toLowerCase())
  assert.equal(new Set(names).size, names.length)
  for (const exercise of EXERCISE_LIBRARY_EXPANSION) {
    assert.ok(exercise.name && exercise.equip && exercise.pattern && exercise.muscle)
    assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(exercise.difficulty), exercise.name)
    assert.equal(exercise.category, exercise.pattern === 'Power' ? 'Ballistic' : 'Grinding')
    assert.equal(exercise.source, 'expanded-library')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.ok(exercise.muscleTargets.direct.length > 0)
    for (const muscle of [...exercise.muscleTargets.direct, ...exercise.muscleTargets.indirect]) assert.ok(MUSCLES.includes(muscle), `${exercise.name}: ${muscle}`)
    assert.ok(exercise.muscleTargets.indirect.every(muscle => !exercise.muscleTargets.direct.includes(muscle)))
    assert.deepEqual(muscleTargets(exercise), muscleTargets({ name: exercise.name }))
  }
  assert.deepEqual(muscleTargets({ name: 'Reverse Nordic Curl' }).direct, ['Quadriceps'])
  assert.deepEqual(muscleTargets({ name: 'Seated Leg Curl' }).direct, ['Hamstrings'])
  assert.deepEqual(muscleTargets({ name: 'Dumbbell Lateral Raise' }).direct, ['Side delts'])
  assert.deepEqual(muscleTargets({ name: 'Rope Triceps Pushdown' }).direct, ['Triceps'])
})

test('aliases resolve to real catalog names and search preserves equipment and movement distinctions', () => {
  const allNames = new Set([...EXERCISE_LIBRARY, ...CORRECTIVE_LIBRARY].map(exercise => exercise.name))
  for (const [name, aliases] of Object.entries(EXERCISE_ALIASES)) {
    assert.ok(allNames.has(name), name)
    for (const alias of aliases) assert.equal(matchesExerciseSearch(name, alias), true, `${alias} -> ${name}`)
  }
  for (const [name, query] of [['DB Bench Press 2-Arm', 'dumbbell bench press'], ['Seated Dumbbell Shoulder Press', 'db shoulder press'],
    ['Ketilebell Front Squat', 'kettlebell front squat'], ['Cable Row (Neutral)', 'seated cable rows'], ['Romanian Deadlift', 'barbell rdl'],
    ['Farmer Carry', "farmer's walk"], ['Pull Down (Wide)', 'wide lat pulldown'], ['Rope Triceps Pushdown', 'rope tricep pressdown']]) {
    assert.equal(matchesExerciseSearch(name, query), true, query)
  }
  assert.equal(matchesExerciseSearch('Seated Leg Curl', 'leg extension'), false)
  assert.equal(matchesExerciseSearch('DB Bench Press 2-Arm', 'shoulder press'), false)
  assert.equal(matchesExerciseSearch('Trap Bar Deadlift', 'sumo deadlift'), false)
  assert.equal(matchesExerciseSearch(EXERCISE_LIBRARY_EXPANSION.find(exercise => exercise.name === 'Seated Leg Curl'), 'machine hamstrings'), true)
  assert.equal(EXERCISE_LIBRARY_EXPANSION.some(exercise => exercise.name === 'Slider Hamstring Curl'), false, 'existing slide-board curl is reused by alias')
})

test('expansion merges into old saved libraries once, preserving edited entries and program references', () => {
  const existing = { id: 'custom-hammer', name: '  Hammer   Curl ', equip: 'Cable', muscleTargets: { source: 'coach', direct: ['Forearms'], indirect: [] }, video: 'my-demo' }
  const plan = { id: 'plan', items: [{ exId: existing.id, sets: 3, reps: '10' }] }
  const db = { exercises: [existing], plans: [plan] }
  mergeExerciseLibrary(db, 'coach-a')
  const count = db.exercises.length
  assert.equal(count, EXERCISE_LIBRARY.length + CORRECTIVE_LIBRARY.length)
  assert.equal(db.exercises.filter(exercise => exercise.name.trim().replace(/\s+/g, ' ').toLowerCase() === 'hammer curl').length, 1)
  assert.equal(existing.equip, 'Cable')
  assert.equal(existing.video, 'my-demo')
  assert.deepEqual(existing.muscleTargets.direct, ['Forearms'])
  assert.equal(plan.items[0].exId, 'custom-hammer')
  const newExercise = db.exercises.find(exercise => exercise.name === 'Machine Chest Press')
  assert.equal(newExercise.source, 'expanded-library')
  const stored = JSON.parse(JSON.stringify(db))
  mergeExerciseLibrary(stored, 'coach-a')
  assert.equal(stored.exercises.length, count)
  assert.equal(stored.exercises.find(exercise => exercise.name === newExercise.name).id, newExercise.id)
  assert.equal(stored.exercises.find(exercise => exercise.id === existing.id).video, 'my-demo')
  const fields = new Set(['id', 'name', 'muscle', 'equip', 'difficulty', 'category', 'pattern', 'mode', 'target', 'relPct', 'relTo', 'muscleTargets', 'video', 'thumb', 'source'])
  assert.ok(Object.keys(newExercise).every(field => fields.has(field)), 'new catalog data fits existing exercise storage columns')
})

test('rear-foot-elevated split squat aliases work across equipment, partial typing and reverse wording', () => {
  const variants = ['Barbell Bulgarian Split Squat', 'DB Bulgarian Split Squat', 'Goblet Bulgarian Split Squat', 'Rings Bulgarian Split Squat']
  for (const name of variants) {
    for (const query of ['Bulgarian split squat', 'rear foot', 'rear foot e', 'rear-foot-elevated split squat', 'back foot elevated split squat', 'RFESS', 'BSS']) assert.equal(matchesExerciseSearch(name, query), true, `${name}: ${query}`)
    assert.ok(exerciseAliases(name).some(alias => /Rear-Foot-Elevated/.test(alias)))
    assert.match(exerciseSuggestionDescription(name, 'rear foot'), /Also called:.*Rear-Foot-Elevated/)
  }
  assert.equal(matchesExerciseSearch('Rear-Foot-Elevated Split Squat', 'Bulgarian split squat'), true)
  assert.equal(matchesExerciseSearch('Front-Foot-Elevated Split Squat', 'RFESS'), false)
  assert.equal(matchesExerciseSearch('DB Bulgarian Split Squat', 'barbell RFESS'), false)
  assert.equal(matchesExerciseSearch('Bodyweight Split Squat', 'RFESS'), false)
})

test('RDL abbreviations keep all matching variations and rank the exact lift before broader variants', () => {
  const matches = EXERCISE_LIBRARY.filter(exercise => matchesExerciseSearch(exercise, 'RDL')).sort((a, b) => exerciseSearchRank(a, 'RDL') - exerciseSearchRank(b, 'RDL') || a.name.localeCompare(b.name))
  assert.ok(matches.length > 8)
  assert.equal(matches[0].name, 'Romanian Deadlift')
  for (const query of ['rd', 'rdl', 'DB RDL', 'dumbbell Romanian dead lift']) assert.equal(matchesExerciseSearch('DB Romanian Deadlift', query), true, query)
  assert.equal(matchesExerciseSearch('DB Romanian Deadlift 2-Arm/1-Leg', 'single-leg dumbbell RDL'), true)
  assert.equal(matchesExerciseSearch('Stiff-Leg Deadlift', 'RDL'), false)
  assert.equal(matchesExerciseSearch('Conventional Deadlift', 'RDL'), false)
  assert.equal(matchesExerciseSearch('Romanian Deadlift', 'stiff-leg deadlift'), false)
  assert.ok(exerciseSearchRank('Romanian Deadlift', 'RDL') < exerciseSearchRank('DB Romanian Deadlift', 'RDL'))
})
