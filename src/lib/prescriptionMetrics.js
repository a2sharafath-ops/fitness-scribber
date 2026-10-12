import { targetLoadKg } from './workout'

// Planned volume only. Missing targets stay unknown; timed/HR targets are not
// weight-based volume. Resolved relative loads are explicitly estimates.
export function prescriptionVolume(blocks, resolveTm = () => null) {
  let total = 0, known = 0, missing = 0, estimated = false, hasRange = false
  for (const block of blocks || []) for (const exercise of block.exercises || []) {
    if (!['Load', '%1RM', 'RIR', 'RPE'].includes(exercise.intensityType)) continue
    const tm = resolveTm(exercise.exerciseName)
    for (const set of exercise.sets || []) {
      if (set.prescribedRepsMax != null && set.prescribedRepsMax !== set.prescribedReps) hasRange = true
      const load = targetLoadKg(exercise.intensityType, set, tm)
      if (load == null || !Number.isFinite(load) || !(set.prescribedReps > 0)) { missing++; continue }
      known++
      total += load * set.prescribedReps
      if (set.prescribedLoadKg == null) estimated = true
    }
  }
  return { total: known ? total : null, known, missing, estimated, hasRange }
}
