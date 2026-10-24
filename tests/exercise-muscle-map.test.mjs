import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { EXERCISE_LIBRARY } from '../src/lib/exerciseLibrary.js'
import { CORRECTIVE_LIBRARY, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_31, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_32, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_33, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_34, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_35, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_36, CORRECTIVE_LIBRARY_ADDITIONS_BATCH_37 } from '../src/lib/correctiveLibrary.js'
import { POSTURE_ITEMS } from '../src/lib/posture.js'
import { recommendedMuscleTargets } from '../src/lib/exerciseMuscleMap.js'
import { MUSCLES, muscleTargets, muscleVolume } from '../src/lib/muscleVolume.js'
import { EXERCISE_LIBRARY_EXPANSION, EXERCISE_LIBRARY_ADDITIONS_2026_10_24, EXERCISE_LIBRARY_ADDITIONS_BATCH_3, EXERCISE_LIBRARY_ADDITIONS_BATCH_4, EXERCISE_LIBRARY_ADDITIONS_BATCH_5, EXERCISE_LIBRARY_ADDITIONS_BATCH_6, EXERCISE_LIBRARY_ADDITIONS_BATCH_7 } from '../src/lib/exerciseLibraryExpansion.js'
import { EXERCISE_ALIASES, matchesExerciseSearch, exerciseSearchRank, exerciseAliases, exerciseSuggestionDescription } from '../src/lib/exerciseSearch.js'
import { validatePrescription } from '../src/lib/prescription.js'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const { mergeExerciseLibrary } = await vite.ssrLoadModule('/src/lib/program.js')

test('final coordination and core additions do not redirect band walks, static holds or other leg tasks', () => {
  for (const [name, query, others, timed] of [
    ['Jump Rope (Single-Under)', 'single under skipping rope', ['Rope Climbs', 'Battle Rope Alternating Waves', 'Pogo Jump'], true],
    ['Crab Walk (Floor)', 'floor crab crawl', ['Banded Lateral Walk', 'Bear Crawl', 'Floor Glute Bridge'], true],
    ['High-Knee Run (In Place)', 'stationary high knee run', ['Suitcase March', 'Mountain Climber', 'Hanging Knee Raise'], true],
    ['Flutter Kick (Supine)', 'supine flutter kicks', ['Lying Leg Raise', 'Hollow Body Rock', 'Mountain Climber'], true],
    ['Hanging Windshield Wiper', 'bar hanging windshield wipers', ['Hanging Leg Raise', 'Russian Twist', 'Supine Lower Trunk Rotation'], false],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${other} must not resolve ${query}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.ok(muscleTargets(exercise).direct.length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Coordination and core', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null }
        : { prescribedReps: 4, prescribedLoadKg: 0 }],
    }] }]), true)
  }
  assert.ok(matchesExerciseSearch('Banded Lateral Walk', 'crab walk with band'))
  assert.ok(!matchesExerciseSearch('Crab Walk (Floor)', 'crab walk with band'))
  assert.ok(!matchesExerciseSearch('Jump Rope (Single-Under)', 'double under'))
  assert.ok(!matchesExerciseSearch('Hanging Windshield Wiper', 'lying lower trunk rotation'))
})

test('final shoulder mobility choices remain separate from activation work and retain stable coach records', () => {
  const queries = ['back to wall shoulder angel', 'side lying internal rotation stretch']
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const custom = { id: 'coach-wall-angel', name: 'Wall Angel (Back-to-Wall)', equip: 'My Wall', video: 'coach-demo' }
  const plan = { items: [{ exId: custom.id, sets: 2, reps: '5' }] }
  const db = { exercises: [custom], plans: [plan] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = CORRECTIVE_LIBRARY_ADDITIONS_BATCH_37.map((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(recommendedMuscleTargets(exercise.name, exercise.mode), null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.ok(definition.target.every(target => !postureTargets.has(target)))
    const timed = definition.name.includes('Stretch')
    assert.equal(validatePrescription('Shoulder mobility', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: 0 }],
    }] }]), true)
    return exercise.id
  })
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.equal(new Set(ids).size, 2)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_37.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.equal(custom.id, 'coach-wall-angel')
  assert.equal(custom.equip, 'My Wall')
  assert.equal(custom.video, 'coach-demo')
  assert.equal(plan.items[0].exId, custom.id)
  assert.ok(!matchesExerciseSearch('Serratus Wall Slide', 'back to wall shoulder angel'))
  assert.ok(!matchesExerciseSearch('Side-Lying External Rotation', 'side lying internal rotation stretch'))
})

test('new conditioning and support tasks preserve movement identity and accept duration without invented distance or load', () => {
  for (const [name, query, others, timed] of [
    ['Archer Push-Up (Floor)', 'floor archer press up', ['Push Ups (Wide)', 'Push Ups (Normal)', 'Ring PushUps (Wide)'], false],
    ['Seated Sled Rope Pull', 'seated hand over hand sled pull', ['Rope Climbs', 'Cable Row (Rope)', 'Backward Sled Drag (Straps)'], true],
    ['Backward Sled Drag (Straps)', 'strap backward sled pull', ['Sled Backward Pushes', 'Sled Marching', 'Seated Sled Rope Pull'], true],
    ['Battle Rope Alternating Waves', 'alternating arm rope waves', ['Rope Climbs', 'Seated Sled Rope Pull', 'Medicine Ball Slam'], true],
    ['Mountain Climber', 'alternating plank knee drive', ['Bear Crawl', 'Suspension Knee Tuck', 'Plank Shoulder Tap'], true],
    ['Burpee (Chest-to-Floor and Jump)', 'chest to floor burpee', ['Inchworm', 'Plyometric Push-Up', 'Countermovement Jump'], false],
    ['Jumping Jack', 'side straddle hop', ['Tuck Jump', 'Split Squat Jump', 'Pogo Jump'], true],
    ['Dumbbell Hang Power Clean (Two-Arm)', 'double db hang power clean', ['Power Clean (Hang)', 'Single-Arm Kettlebell Clean', 'Single-Arm Dumbbell Snatch (From Floor)'], false],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${other} must not resolve ${query}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.ok(muscleTargets(exercise).direct.length)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Mixed task session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 20, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: name.startsWith('Dumbbell') ? 12 : 0 }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('Dumbbell Hang Power Clean (Two-Arm)', 'snatch'))
  assert.ok(!matchesExerciseSearch('Burpee (Chest-to-Floor and Jump)', 'squat thrust'))
  assert.ok(!matchesExerciseSearch('Jumping Jack', 'star jump'))
})

test('heel slides and reach-under mobility avoid strength and posture mappings while preserving coach records', () => {
  const queries = ['unloaded supine heel slide', 'all fours thread the needle']
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const custom = { id: 'coach-heel-slide', name: 'Supine Heel Slide (Knee Mobility)', equip: 'My Mat', video: 'coach-demo' }
  const plan = { items: [{ exId: custom.id, sets: 2, reps: '5' }] }
  const db = { exercises: [custom], plans: [plan] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = CORRECTIVE_LIBRARY_ADDITIONS_BATCH_36.map((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(recommendedMuscleTargets(exercise.name, exercise.mode), null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.ok(definition.target.every(target => !postureTargets.has(target)))
    assert.equal(validatePrescription('Mobility session', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: 'Load', sets: [{ prescribedReps: 5, prescribedLoadKg: 0 }],
    }] }]), true)
    return exercise.id
  })
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.equal(new Set(ids).size, 2)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_36.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.equal(custom.id, 'coach-heel-slide')
  assert.equal(custom.equip, 'My Mat')
  assert.equal(custom.video, 'coach-demo')
  assert.equal(plan.items[0].exId, custom.id)
  assert.ok(!matchesExerciseSearch('Bridge Lift and Curl (Slide Board)', 'unloaded supine heel slide'))
  assert.ok(!matchesExerciseSearch('Side-Lying Thoracic Rotation (Open Book)', 'all fours thread the needle'))
})

test('ankle resistance, dynamic core and jump paths have distinct searches and supported prescriptions', () => {
  for (const [name, query, others, direct, banded] of [
    ['Seated Banded Ankle Plantarflexion', 'band resisted ankle plantar flexion', ['Seated Banded Ankle Dorsiflexion', 'Seated Calf Raise', 'Seated Ankle Circles'], ['Calves'], true],
    ['Seated Banded Ankle Dorsiflexion', 'seated band toe pull', ['Wall Tibialis Raise', 'Half-Kneeling Ankle Dorsiflexion Rock', 'Seated Banded Ankle Plantarflexion'], ['Tibialis anterior'], true],
    ['Stability Ball Pike', 'swiss ball pike', ['Suspension Knee Tuck', 'Stability Ball Rollout', 'Pike Push-Up'], ['Abdominals', 'Hip flexors'], false],
    ['Side Plank Hip Dip', 'side bridge hip lift', ['Side Plank', 'Kneeling Side Plank', 'Hip Hike (Step)'], ['Abdominals', 'Hip abductors'], false],
    ['Lateral Box Jump', 'sideways box jump', ['Box Jump', 'Lateral Bound', 'Dumbbell Box Step-Over'], ['Quadriceps', 'Glutes', 'Calves'], false],
    ['Tuck Jump', 'knees to chest jump', ['Countermovement Jump', 'Squat Jump (Static Start)', 'Suspension Knee Tuck'], ['Quadriceps', 'Glutes', 'Calves'], false],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${other} must not resolve ${query}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.deepEqual([...muscleTargets(exercise).direct].sort(), [...direct].sort())
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Distinct movement session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: banded ? 'RIR' : 'Load', sets: [banded
        ? { prescribedReps: 10, prescribedIntensityValue: 3, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: 0 }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('Seated Banded Ankle Dorsiflexion', 'ankle mobilization'))
  assert.ok(!matchesExerciseSearch('Stability Ball Pike', 'knee tuck'))
  assert.ok(exerciseSearchRank('Box Jump', 'box jump') < exerciseSearchRank('Lateral Box Jump', 'box jump'))
  assert.ok(exerciseSearchRank('Side Plank', 'side plank') < exerciseSearchRank('Side Plank Hip Dip', 'side plank'))
})

test('general groin, neck and ankle mobility merges once without automatic posture or volume mappings', () => {
  const queries = ['butterfly groin stretch', 'kneeling frog rockback', 'seated cervical rotation', 'sitting foot circles']
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const custom = { id: 'coach-frog', name: 'Dynamic Frog Stretch', equip: 'My Mat', video: 'coach-demo' }
  const plan = { items: [{ exId: custom.id, sets: 2, reps: '5' }] }
  const db = { exercises: [custom], plans: [plan] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = CORRECTIVE_LIBRARY_ADDITIONS_BATCH_35.map((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(recommendedMuscleTargets(exercise), null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.ok(definition.target.every(target => !postureTargets.has(target)))
    const timed = definition.name.startsWith('Static')
    assert.equal(validatePrescription('Mobility session', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: 0 }],
    }] }]), true)
    return exercise.id
  })
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.equal(new Set(ids).size, 4)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_35.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.equal(custom.id, 'coach-frog')
  assert.equal(custom.equip, 'My Mat')
  assert.equal(custom.video, 'coach-demo')
  assert.equal(plan.items[0].exId, custom.id)
  assert.ok(!matchesExerciseSearch('Quadruped Adductor Rockback', 'kneeling frog rockback'))
  assert.ok(!matchesExerciseSearch('Static Standing Adductor Stretch', 'butterfly groin stretch'))
  assert.ok(!matchesExerciseSearch('Chin Tuck (Cervical Retraction)', 'seated cervical rotation'))
  assert.ok(!matchesExerciseSearch('Seated Banded Ankle Dorsiflexion', 'unresisted ankle circles'))
})

test('machine and overhead task searches preserve resistance type and throw direction', () => {
  for (const [name, query, others] of [
    ['Rotary Torso Machine', 'seated torso rotation machine', ['Russian Twist', 'Cable Wood Chop', 'Machine Abdominal Crunch']],
    ['Seated Lumbar Extension Machine', 'seated back extension machine', ['Hyper 90 degree', 'Hyper 45 degree', 'Ball Back Extension']],
    ['Seated Dip Machine (Plate-Loaded)', 'plate loaded seated dip', ['Assisted Dip', 'Machine Triceps Extension', 'Bench Dip']],
    ['American Kettlebell Swing (Overhead)', 'american kb swing', ['Kettlebell Swing', 'Single-Arm Kettlebell Swing', 'Single-Arm Kettlebell Snatch']],
    ['Medicine Ball Overhead Forward Throw', 'med ball soccer throw', ['Medicine Ball Slam', 'Medicine Ball Chest Pass', 'Medicine Ball Overhead Backward Throw']],
    ['Medicine Ball Overhead Backward Throw', 'two hand overhead backward throw', ['Medicine Ball Overhead Forward Throw', 'Medicine Ball Scoop Toss', 'Medicine Ball Slam']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query))
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Machine and throw session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 5, prescribedLoadKg: 4 }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('American Kettlebell Swing (Overhead)', 'russian kettlebell swing'))
  assert.ok(matchesExerciseSearch('Kettlebell Swing', 'russian kettlebell swing'))
  assert.ok(!matchesExerciseSearch('Medicine Ball Overhead Forward Throw', 'overhead backward throw'))
  assert.ok(!matchesExerciseSearch('Seated Dip Machine (Plate-Loaded)', 'assisted dip'))
})

test('new mobility names retain push-up search priority and avoid strength and posture mappings', () => {
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const queries = ['lying single knee hug', 'prone lumbar extension press up', 'shoulder controlled articular rotation', 'lying hip controlled articular rotation']
  const db = { exercises: [] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = CORRECTIVE_LIBRARY_ADDITIONS_BATCH_34.map((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(exercise.muscleTargets, null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.ok(definition.target.every(target => !postureTargets.has(target)))
    const timed = definition.name.includes('Stretch')
    assert.equal(validatePrescription('Mobility session', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: 0 }],
    }] }]), true)
    return exercise.id
  })
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.equal(new Set(ids).size, 4)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_34.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.ok(!matchesExerciseSearch('Press Up', 'prone lumbar extension press up'))
  assert.ok(exerciseSearchRank('Press Up', 'press up') < exerciseSearchRank('Prone Press-Up (Lumbar Mobility)', 'press up'))
  assert.ok(!matchesExerciseSearch('Standing Shoulder CAR', 'hip controlled articular rotation'))
  assert.ok(!matchesExerciseSearch('Side-Lying Hip CAR', 'shoulder controlled articular rotation'))
})

test('hand opening, wrist rolling and neck isometrics stay distinct from existing strength tasks', () => {
  for (const [name, query, others, timed, target] of [
    ['Rubber-Band Finger Opening', 'finger spring', ['Hand Gripper', 'Dumbbell Reverse Wrist Curl', 'Plate Pinch Hold'], false, 'Forearms'],
    ['Wrist Roller (Handheld)', 'hand held forearm roller', ['Dumbbell Wrist Curl', 'Dumbbell Reverse Wrist Curl', 'Farmer Carry'], true, 'Forearms'],
    ['Neck Isometric Flexion (Hand Resistance)', 'hand resisted neck flexion hold', ['Chin Tuck (Cervical Retraction)', 'Superman Hold (Floor)'], true, 'Neck flexors'],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query))
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.deepEqual(muscleTargets(exercise).direct, [target])
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Small-area strength', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: timed ? 'Seconds' : 'RIR', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 10, prescribedLoadKg: null }
        : { prescribedReps: 12, prescribedIntensityValue: 3, prescribedLoadKg: null }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('Wrist Roller (Handheld)', 'rack mounted wrist roller'))
  assert.ok(!matchesExerciseSearch('Neck Isometric Flexion (Hand Resistance)', 'neck extension hold'))
})

test('new mobility drills keep planes and movement types distinct and add no automatic posture rules', () => {
  const queries = ['adductor rock back', 'foam roller thoracic extension', 'active knee extension hamstring stretch', 'sagittal leg swing', 'lateral leg swing', 'palm supported wrist extension rock', 'supine dowel external rotation']
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const db = { exercises: [] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = CORRECTIVE_LIBRARY_ADDITIONS_BATCH_33.map((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.ok(definition.target.every(target => !postureTargets.has(target)))
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(exercise.muscleTargets, null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.equal(validatePrescription('Mobility session', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: 'Load', sets: [{ prescribedReps: 6, prescribedLoadKg: 0 }],
    }] }]), true)
    return exercise.id
  })
  assert.equal(new Set(ids).size, 7)
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_33.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  for (const [name, query, others] of [
    ['Thoracic Extension (Foam Roller)', 'thoracic extension mobilization', ['Foam Roll — Thoracic Spine', 'Cat-Cow']],
    ['Standing Leg Swing (Front-to-Back)', 'sagittal leg swing', ['Standing Leg Swing (Side-to-Side)', '90/90 Hip Switch']],
    ['Standing Leg Swing (Side-to-Side)', 'lateral leg swing', ['Standing Leg Swing (Front-to-Back)', 'Banded Lateral Walk']],
    ['Supine Shoulder External Rotation (Dowel-Assisted)', 'supine dowel external rotation', ['Cable External Rotation', 'Supine Shoulder Flexion (Dowel-Assisted)']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query))
  }
})

test('support and suspension aliases distinguish bench dips, facing-wall holds and rear shoulder flies', () => {
  for (const [name, query, others, timed] of [
    ['Bench Dip', 'triceps bench dip', ['Dips', 'Ring Dips', 'Bodyweight Triceps Extension (Fixed Bar)'], false],
    ['Wall-Facing Handstand Hold', 'chest to wall handstand hold', ['Handstand Push-Up', 'Pike Push-Up', 'Ring Support Hold (Top)'], true],
    ['Suspension Reverse Fly (T)', 'trx t delt fly', ['Suspension Row', 'Suspension Chest Fly', 'Cable Rear Delt Fly'], false],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query))
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Support session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 10, prescribedLoadKg: null }
        : { prescribedReps: 8, prescribedLoadKg: 0 }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('Wall-Facing Handstand Hold', 'back to wall handstand'))
  assert.ok(!matchesExerciseSearch('Suspension Reverse Fly (T)', 'trx chest fly'))
})

test('general mobility drills support reps or holds without adding posture matches or working-muscle maps', () => {
  const postureTargets = new Set(POSTURE_ITEMS.flatMap(item => [...item.overactive, ...item.underactive]))
  const queries = ['cat camel', 'open book stretch', 'knee to wall ankle rock', 'shin box switch', 'supine dowel shoulder flexion', 'lying lower trunk rotation', 'standing biceps wall stretch']
  const db = { exercises: [] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = []
  CORRECTIVE_LIBRARY_ADDITIONS_BATCH_32.forEach((definition, i) => {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.ok(matchesExerciseSearch(exercise, queries[i]))
    assert.ok(definition.target.every(target => !postureTargets.has(target)), definition.name)
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(exercise.category, 'Corrective')
    assert.equal(exercise.muscleTargets, null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    const timed = definition.name.startsWith('Static')
    assert.equal(validatePrescription('Mobility session', [{ blockType: 'Warm-up', exercises: [{
      exerciseName: exercise.name, intensityType: timed ? 'Seconds' : 'Load', sets: [timed
        ? { prescribedReps: null, prescribedIntensityValue: 20, prescribedLoadKg: null }
        : { prescribedReps: 6, prescribedLoadKg: 0 }],
    }] }]), true)
    ids.push(exercise.id)
  })
  assert.equal(new Set(ids).size, 7)
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_32.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.ok(!matchesExerciseSearch('90/90 Hip Switch', 'static piriformis stretch'))
  assert.ok(!matchesExerciseSearch('Supine Shoulder Flexion (Dowel-Assisted)', 'serratus wall slide'))
  assert.ok(!matchesExerciseSearch('Supine Lower Trunk Rotation', 'open book stretch'))
})

test('mixed quality batch keeps distinct strength tasks searchable and records reps versus holds', () => {
  for (const [name, query, others] of [
    ['Barbell Push Jerk', 'push jerk', ['Push Press', 'Military Press', 'Barbell Split Jerk']],
    ['Hollow Body Rock', 'hollow rock', ['Hollow Body Hold', 'V-Up', 'Floor Sit-Up']],
    ['Superman Hold (Floor)', 'prone superman hold', ['Prone Cobra', 'Bird Dog', 'Ball Back Extension']],
    ['Suspension Chest Fly', 'trx chest flye', ['Ring PushUps (Normal)', 'Cable Chest Fly', 'Suspension Row']],
    ['Dumbbell Box Step-Over', 'db box step over', ['DB Step Up', 'Dumbbell Lateral Step-Up', 'Box Jump']],
    ['Dragon Flag (Body Lever)', 'body lever', ['Lying Leg Raise', 'Reverse Crunch', 'Hollow Body Hold']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    const hold = name === 'Superman Hold (Floor)'
    assert.equal(validatePrescription('Mixed session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: hold ? 'Seconds' : 'Load', sets: [hold
        ? { prescribedReps: null, prescribedIntensityValue: 10, prescribedLoadKg: null }
        : { prescribedReps: 5, prescribedLoadKg: name === 'Barbell Push Jerk' ? 20 : 0 }],
    }] }]), true)
  }
  assert.ok(!matchesExerciseSearch('Barbell Push Jerk', 'split jerk'))
  assert.ok(!matchesExerciseSearch('Dragon Flag (Body Lever)', 'hanging front lever'))
})

test('new flexibility entries merge as timed mobility with stable IDs and no working-muscle targets', () => {
  const db = { exercises: [] }
  mergeExerciseLibrary(db, 'mobility-coach')
  const ids = []
  for (const definition of CORRECTIVE_LIBRARY_ADDITIONS_BATCH_31) {
    const exercise = db.exercises.find(e => e.name === definition.name)
    assert.equal(exercise.mode, 'Stretch')
    assert.equal(exercise.category, 'Corrective')
    assert.equal(exercise.source, 'corrective-library')
    assert.equal(exercise.muscleTargets, null)
    assert.deepEqual(muscleTargets(exercise), { direct: [], indirect: [] })
    assert.ok(matchesExerciseSearch(exercise, exerciseAliases(definition)[0]))
    assert.equal(validatePrescription('Flexibility session', [{ blockType: 'Cool-down', exercises: [{
      exerciseName: exercise.name, intensityType: 'Seconds', sets: [{ prescribedReps: null, prescribedIntensityValue: 20, prescribedLoadKg: null }],
    }] }]), true)
    ids.push(exercise.id)
  }
  assert.equal(new Set(ids).size, 4)
  const count = db.exercises.length
  mergeExerciseLibrary(db, 'mobility-coach')
  assert.equal(db.exercises.length, count)
  assert.deepEqual(CORRECTIVE_LIBRARY_ADDITIONS_BATCH_31.map(d => db.exercises.find(e => e.name === d.name).id), ids)
  assert.ok(!matchesExerciseSearch('Static Wrist Flexor Stretch', 'wrist extensor stretch'))
  assert.ok(!matchesExerciseSearch('Static Wrist Extensor Stretch', 'wrist flexor stretch'))
  assert.ok(!matchesExerciseSearch('Static Cross-Body Shoulder Stretch', 'overhead triceps stretch'))
})

test('depth-drop searches distinguish landing-and-holding from rebound jumps and step-downs', () => {
  const name = 'Depth Drop (Stick Landing)'
  for (const query of ['depth drop', 'box drop landing', 'drop and stick landing']) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of ['Box Jump', 'Single-Leg Hop and Stick', 'Forward Step-Down', 'Lateral Step-Down']) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
  }
  // The broad query also finds Depth Jump through its existing "Box Drop to
  // Vertical Jump" alias. The exact landing task must appear ahead of it.
  assert.ok(exerciseSearchRank(name, 'depth drop') < exerciseSearchRank('Depth Jump', 'depth drop'))
  for (const query of ['box drop landing', 'drop and stick landing']) assert.ok(!matchesExerciseSearch('Depth Jump', query))
  for (const query of ['depth jump', 'drop to vertical jump', 'single leg depth drop']) assert.ok(!matchesExerciseSearch(name, query))
  assert.ok(matchesExerciseSearch('Depth Jump', 'box drop to vertical jump'))
  const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
  assert.equal(exercise.equip, 'Box')
  assert.equal(exercise.category, 'Ballistic')
  assert.equal(exercise.relPct, undefined)
  assert.equal(exercise.relTo, undefined)
  assert.deepEqual(new Set(muscleTargets(exercise).direct), new Set(['Quadriceps', 'Glutes', 'Calves']))
  assert.equal(validatePrescription('Landing practice', [{ blockType: 'Power', exercises: [{
    exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 3, prescribedLoadKg: 0 }],
  }] }]), true)
})

test('supported sissy squat and around-head halo searches preserve task and recording distinctions', () => {
  assert.ok(matchesExerciseSearch('Hand-Supported Sissy Squat', 'hand assisted sissy squat'))
  assert.ok(matchesExerciseSearch('Hand-Supported Sissy Squat', 'supported sissy squat'))
  for (const name of ['Reverse Nordic Curl', 'Supported Squat', 'Spanish Squat', 'Leg Extension']) assert.ok(!matchesExerciseSearch(name, 'sissy squat'))
  assert.ok(!matchesExerciseSearch('Hand-Supported Sissy Squat', 'machine sissy squat'))
  assert.ok(matchesExerciseSearch('Kettlebell Halo', 'KB halo'))
  assert.ok(matchesExerciseSearch('Kettlebell Halo', 'around head kettlebell'))
  assert.ok(!matchesExerciseSearch('Kettlebell Halo', 'around waist kettlebell'))
  for (const name of ['Kettlebell Windmill', 'Kettlebell Turkish Get-Up', 'KB Press 2-Arm']) assert.ok(!matchesExerciseSearch(name, 'halo'))
  assert.deepEqual(muscleTargets({ name: 'Hand-Supported Sissy Squat' }).direct, ['Quadriceps'])
  for (const [name, load] of [['Hand-Supported Sissy Squat', 0], ['Kettlebell Halo', 4]]) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Grinding')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Controlled session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 6, prescribedLoadKg: load }],
    }] }]), true)
  }
})

test('suspension arm isolation keeps aliases and effort prescriptions distinct from rows and fixed-bar work', () => {
  for (const [name, queries, others, direct] of [
    ['Suspension Biceps Curl', ['trx biceps curl', 'trx bicep curl', 'suspension bicep curl'], ['Suspension Row', 'Suspension Hamstring Curl', 'Banded Biceps Curl', 'Cable Biceps Curl'], 'Biceps'],
    ['Suspension Overhead Triceps Extension', ['trx overhead triceps extension', 'trx tricep extension', 'suspension triceps extension'], ['Bodyweight Triceps Extension (Fixed Bar)', 'Overhead Cable Triceps Extension', 'Banded Overhead Triceps Extension', 'Ring Dips'], 'Triceps'],
  ]) {
    for (const query of queries) {
      assert.ok(matchesExerciseSearch(name, query))
      for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    }
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.equip, 'Suspension Trainer')
    assert.deepEqual(muscleTargets(exercise).direct, [direct])
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Suspension arms', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: 'RIR', sets: [{ prescribedReps: 10, prescribedIntensityValue: 2, prescribedLoadKg: null }],
    }] }]), true)
  }
})

test('dynamic core searches distinguish body saws and suspended knee tucks from existing tasks', () => {
  assert.ok(matchesExerciseSearch('Plank Body Saw', 'forearm body saw'))
  assert.ok(matchesExerciseSearch('Plank Body Saw', 'body saw plank'))
  for (const name of ['Plank', 'Ab Wheel Rollout', 'Stability Ball Rollout', 'Suspension Knee Tuck']) assert.ok(!matchesExerciseSearch(name, 'body saw'))
  assert.ok(matchesExerciseSearch('Suspension Knee Tuck', 'TRX knee tuck'))
  assert.ok(matchesExerciseSearch('Suspension Knee Tuck', 'suspended knee tuck'))
  for (const name of ['Suspension Hamstring Curl', 'Hanging Knee Raise', 'V-Up', 'Plank Body Saw']) assert.ok(!matchesExerciseSearch(name, 'TRX knee tuck'))
  assert.ok(!matchesExerciseSearch('Suspension Knee Tuck', 'push up knee tuck'))
  for (const name of ['Plank Body Saw', 'Suspension Knee Tuck']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Grinding')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Core session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 8, prescribedLoadKg: 0 }],
    }] }]), true)
  }
  assert.deepEqual(new Set(muscleTargets({ name: 'Suspension Knee Tuck' }).direct), new Set(['Abdominals', 'Hip flexors']))
})

test('floor-start implement lifts do not alias kettlebell snatches, hang variants or sandbag carries', () => {
  assert.ok(matchesExerciseSearch('Single-Arm Dumbbell Snatch (From Floor)', 'one arm DB snatch from floor'))
  assert.ok(matchesExerciseSearch('Single-Arm Dumbbell Snatch (From Floor)', 'dumbbell snatch'))
  for (const name of ['Single-Arm Kettlebell Snatch', 'Snatch', 'Power Snatch (Hang)']) assert.ok(!matchesExerciseSearch(name, 'dumbbell snatch'))
  assert.ok(!matchesExerciseSearch('Single-Arm Dumbbell Snatch (From Floor)', 'hang dumbbell snatch'))
  assert.ok(matchesExerciseSearch('Sandbag Ground-to-Shoulder', 'sandbag shouldering'))
  assert.ok(matchesExerciseSearch('Sandbag Ground-to-Shoulder', 'sandbag clean to shoulder'))
  for (const name of ['Sandbag Bear Hug Carry', 'Sandbag Bear Hug Squat']) assert.ok(!matchesExerciseSearch(name, 'sandbag shouldering'))
  assert.ok(!matchesExerciseSearch('Sandbag Ground-to-Shoulder', 'sandbag over shoulder'))
  for (const name of ['Single-Arm Dumbbell Snatch (From Floor)', 'Sandbag Ground-to-Shoulder']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Ballistic')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Power session', [{ blockType: 'Power', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 3, prescribedLoadKg: 10 }],
    }] }]), true)
  }
})

test('floor flexion and adductor squeeze remain distinct and use reps versus uncalibrated hold time', () => {
  assert.ok(matchesExerciseSearch('V-Up', 'floor jackknife sit up'))
  assert.ok(matchesExerciseSearch('V-Up', 'vup'))
  for (const name of ['Floor Sit-Up', 'Lying Leg Raise', 'Hollow Body Hold', 'L-Sit Hold (Parallel Bars)']) assert.ok(!matchesExerciseSearch(name, 'floor jackknife sit up'))
  assert.ok(matchesExerciseSearch('Supine Adductor Squeeze (Ball)', 'ball squeeze between knees'))
  for (const name of ['Standing Banded Hip Adduction', 'Seated Hip Adduction', 'Copenhagen Plank (Short Lever)']) assert.ok(!matchesExerciseSearch(name, 'supine ball hip adduction'))
  const blocks = (exerciseName, intensityType, set) => [{ blockType: 'Accessory Lift', exercises: [{ exerciseName, intensityType, sets: [set] }] }]
  assert.equal(validatePrescription('Floor session', blocks('V-Up', 'Load', { prescribedReps: 8, prescribedLoadKg: 0 })), true)
  assert.equal(validatePrescription('Floor session', blocks('Supine Adductor Squeeze (Ball)', 'Seconds', { prescribedReps: null, prescribedIntensityValue: 10, prescribedLoadKg: null })), true)
  assert.deepEqual(muscleTargets({ name: 'Supine Adductor Squeeze (Ball)' }), { direct: ['Adductors'], indirect: [] })
  for (const name of ['V-Up', 'Supine Adductor Squeeze (Ball)']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('band hip isolation searches preserve direction, position and equipment', () => {
  for (const [name, query, others] of [
    ['Seated Banded Hip Abduction', 'seated band hip abduction', ['Seated Hip Abduction', 'Banded Clamshell', 'Banded Lateral Walk', 'Standing Banded Hip Adduction']],
    ['Standing Banded Hip Adduction', 'standing band hip adduction', ['Standing Cable Hip Adduction', 'Side-Lying Hip Adduction', 'Seated Banded Hip Abduction']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    assert.equal(validatePrescription('Band session', [{ blockType: 'Accessory Lift', exercises: [{
      exerciseName: name, intensityType: 'RIR', sets: [{ prescribedReps: 12, prescribedIntensityValue: 3, prescribedLoadKg: null }],
    }] }]), true)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
  assert.deepEqual(muscleTargets({ name: 'Seated Banded Hip Abduction' }).direct, ['Hip abductors'])
  assert.deepEqual(muscleTargets({ name: 'Standing Banded Hip Adduction' }).direct, ['Adductors'])
})

test('ring support and strict muscle-ups stay distinct and accept time versus rep prescriptions', () => {
  assert.ok(matchesExerciseSearch('Ring Support Hold (Top)', 'straight arm ring support'))
  assert.ok(!matchesExerciseSearch('Ring Dips', 'ring support hold'))
  assert.ok(!matchesExerciseSearch('Ring Support Hold (Top)', 'bottom ring support hold'))
  assert.ok(matchesExerciseSearch('Strict Ring Muscle-Up', 'strict RMU'))
  assert.ok(matchesExerciseSearch('Strict Ring Muscle-Up', 'strict ring muscleup'))
  for (const name of ['Ring Dips', 'Rings Pull Ups (Neutral)', 'Ring Support Hold (Top)']) assert.ok(!matchesExerciseSearch(name, 'strict muscle up'))
  assert.ok(!matchesExerciseSearch('Strict Ring Muscle-Up', 'kipping ring muscle up'))
  const makeBlocks = (exerciseName, intensityType, set) => [{ blockType: 'Accessory Lift', exercises: [{ exerciseName, intensityType, sets: [set] }] }]
  assert.equal(validatePrescription('Ring strength', makeBlocks('Ring Support Hold (Top)', 'Seconds', { prescribedReps: null, prescribedIntensityValue: 15, prescribedLoadKg: null })), true)
  assert.equal(validatePrescription('Ring strength', makeBlocks('Strict Ring Muscle-Up', 'Load', { prescribedReps: 2, prescribedLoadKg: 0 })), true)
  for (const name of ['Ring Support Hold (Top)', 'Strict Ring Muscle-Up']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Grinding')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('stationary loaded tasks do not alias carries, marches or single-leg hinges', () => {
  for (const [name, query, others] of [
    ['Single-Arm Kettlebell Suitcase Deadlift', 'one arm KB suitcase deadlift', ['Suitcase Carry', 'Suitcase March', 'Kettlebell Deadlift', 'DB Romanian Deadlift 1-Arm/1-Leg (Contralateral)']],
    ['Sandbag Bear Hug Squat', 'sandbag hug squat', ['Sandbag Bear Hug Carry', 'Goblet Squat', 'Front Squat']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Grinding')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
  assert.ok(!matchesExerciseSearch('Single-Arm Kettlebell Suitcase Deadlift', 'single leg kettlebell deadlift'))
  assert.ok(!matchesExerciseSearch('Sandbag Bear Hug Squat', 'sandbag bear hug carry'))
})

test('power task searches distinguish static starts, rebound landings and squat-to-wall throws', () => {
  for (const [name, query, others] of [
    ['Squat Jump (Static Start)', 'static squat jump', ['Countermovement Jump', 'Dumbbell Jump Squat', 'Box Jump']],
    ['Depth Jump', 'box drop to vertical jump', ['Box Jump', 'Single-Leg Hop and Stick', 'Countermovement Jump']],
    ['Wall-Ball Shot', 'medicine ball squat throw to wall', ['Medicine Ball Chest Pass', 'Medicine Ball Scoop Toss', 'Medicine Ball Rotational Throw', 'Barbell Thruster']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Ballistic')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    assert.equal(validatePrescription('Power session', [{ blockType: 'Power', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 3, prescribedLoadKg: name === 'Wall-Ball Shot' ? 4 : 0 }],
    }] }]), true)
  }
  assert.ok(matchesExerciseSearch('Wall-Ball Shot', 'wall ball'))
})

test('controlled shoulder tasks stay distinct from explosive pulls and supine floor presses', () => {
  assert.ok(matchesExerciseSearch('Barbell Upright Row', 'upright barbell row'))
  for (const name of ['Clean High Pull', 'Snatch High Pull', 'Bent Over Row']) assert.ok(!matchesExerciseSearch(name, 'upright row'))
  assert.ok(!matchesExerciseSearch('Barbell Upright Row', 'clean high pull'))
  assert.ok(matchesExerciseSearch('Barbell Z Press', 'z-press'))
  assert.ok(matchesExerciseSearch('Barbell Z Press', 'long sitting barbell overhead press'))
  for (const name of ['Floor Press', 'DB Floor Press', 'Military Press']) assert.ok(!matchesExerciseSearch(name, 'z press'))
  assert.ok(!matchesExerciseSearch('Barbell Z Press', 'barbell floor press'), 'floor overhead pressing must not pollute supine floor-press search')
  for (const name of ['Barbell Upright Row', 'Barbell Z Press']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Grinding')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('named accessories remain distinct and floor-press equipment searches reuse existing entries', () => {
  assert.ok(matchesExerciseSearch('Meadows Row', 'landmine meadows row'))
  assert.ok(matchesExerciseSearch('Meadows Row', 'meadow row'))
  assert.ok(!matchesExerciseSearch('T-Bar Row', 'meadows row'))
  assert.ok(matchesExerciseSearch('Barbell JM Press', 'J.M. press'))
  for (const name of ['Close-Grip Bench Press', 'EZ-Bar Skull Crusher', 'Floor Press']) assert.ok(!matchesExerciseSearch(name, 'JM press'))
  assert.deepEqual(muscleTargets({ name: 'Barbell JM Press' }).direct, ['Triceps'])
  // An explicit implement query finds the original canonical name, without
  // splitting its saved history into a new Barbell Floor Press record.
  assert.deepEqual(EXERCISE_LIBRARY.filter(e => matchesExerciseSearch(e.name, 'barbell floor press')).map(e => e.name), ['Floor Press'])
  assert.ok(matchesExerciseSearch('DB Floor Press', 'two arm dumbbell floor press'))
  assert.ok(!matchesExerciseSearch('Floor Press', 'dumbbell floor press'))
  for (const name of ['Meadows Row', 'Barbell JM Press']) {
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
  }
})

test('band substitutions stay distinct from terminal knee extension and elbow-bending or cable pulldowns', () => {
  for (const [name, query, others] of [
    ['Seated Banded Leg Extension', 'seated resistance band knee extension', ['Terminal Knee Extension (Band)', 'Leg Extension', 'Banded Leg Curl']],
    ['Banded Straight-Arm Pulldown', 'straight arm band pulldown', ['Kneeling Banded Lat Pulldown', 'Straight-Arm Cable Pulldown', 'Banded Triceps Pushdown']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    // Band effort can be prescribed without inventing a kilogram equivalent.
    assert.equal(validatePrescription('Band session', [{ blockType: 'AccessoryLift', exercises: [{
      exerciseName: name, intensityType: 'RIR', sets: [{ prescribedReps: 12, prescribedIntensityValue: 3, prescribedLoadKg: null }],
    }] }]), true)
  }
  assert.deepEqual(muscleTargets({ name: 'Seated Banded Leg Extension' }).direct, ['Quadriceps'])
  const pulldown = muscleTargets({ name: 'Banded Straight-Arm Pulldown' })
  assert.deepEqual(pulldown.direct, ['Lats'])
  assert.ok(![...pulldown.direct, ...pulldown.indirect].includes('Biceps'))
})

test('overhead power aliases distinguish snatches from cleans and standalone jerks from presses and complexes', () => {
  for (const [name, query, others] of [
    ['Single-Arm Kettlebell Snatch', 'one arm KB snatch', ['Single-Arm Kettlebell Clean', 'Snatch', 'Split Snatch']],
    ['Barbell Split Jerk', 'split jerk from rack', ['Push Press', 'Clean & Jerk', 'Split Snatch', 'Barbell Thruster']],
  ]) {
    assert.ok(matchesExerciseSearch(name, query))
    for (const other of others) assert.ok(!matchesExerciseSearch(other, query), `${query} must not select ${other}`)
    const exercise = EXERCISE_LIBRARY.find(e => e.name === name)
    assert.equal(exercise.category, 'Ballistic')
    assert.equal(exercise.relPct, undefined)
    assert.equal(exercise.relTo, undefined)
    // Both tasks fit existing rep/load prescriptions without a new metric.
    assert.equal(validatePrescription('Power session', [{ blockType: 'Power', exercises: [{
      exerciseName: name, intensityType: 'Load', sets: [{ prescribedReps: 3, prescribedLoadKg: 16 }],
    }] }]), true)
  }
  assert.ok(exerciseSearchRank('Barbell Split Jerk', 'split jerk') < exerciseSearchRank('Clean & Jerk', 'split jerk'))
})

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
