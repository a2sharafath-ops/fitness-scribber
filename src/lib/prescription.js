// Shared checks for every path that writes a coach's prescription.
export const PRESCRIPTION_FIELDS = ['prescribedReps', 'prescribedRepsMax', 'prescribedRir', 'prescribedIntensityValue', 'prescribedLoadKg', 'prescribedTempo', 'prescribedRestSeconds']
export function editPrescribedSet(sets, index, key, value) {
  return sets.map((set, row) => {
    if (row === index) return { ...set, [key]: value, ...(index > 0 && PRESCRIPTION_FIELDS.includes(key) ? { touchedFields: { ...(set.touched && !set.touchedFields ? Object.fromEntries(PRESCRIPTION_FIELDS.map(field => [field, true])) : set.touchedFields || {}), [key]: true } } : {}) }
    const legacyOptOut = set.touched && !set.touchedFields
    if (index === 0 && row > 0 && set.status === 'Pending' && PRESCRIPTION_FIELDS.includes(key) && !legacyOptOut && !set.touchedFields?.[key]) return { ...set, [key]: value }
    return set
  })
}
export function followFirstSet(sets) {
  return sets.map((set, index) => index > 0 && set.status === 'Pending'
    ? { ...set, ...Object.fromEntries(PRESCRIPTION_FIELDS.map(key => [key, sets[0][key]])), touched: false, touchedFields: {} } : set)
}

export function changeIntensity(exercise, intensityType) {
  if (exercise.intensityType === intensityType) return exercise
  return {
    ...exercise, intensityType,
    sets: exercise.sets.map(set => {
      const touchedFields = { ...(set.touchedFields || {}) }
      delete touchedFields.prescribedIntensityValue
      if (intensityType === 'RIR' && ['%1RM', 'Load'].includes(exercise.intensityType) && set.touchedFields?.prescribedRir) touchedFields.prescribedIntensityValue = true
      if (exercise.intensityType === 'RIR' && ['%1RM', 'Load'].includes(intensityType) && set.touchedFields?.prescribedIntensityValue) touchedFields.prescribedRir = true
      return {
        ...set, ...(set.touchedFields ? { touchedFields } : {}),
        prescribedIntensityValue: intensityType === 'RIR' ? (['%1RM', 'Load'].includes(exercise.intensityType) ? set.prescribedRir ?? null : null) : null,
        prescribedRir: exercise.intensityType === 'RIR' && ['%1RM', 'Load'].includes(intensityType) ? set.prescribedIntensityValue ?? null : set.prescribedRir ?? null,
      }
    }),
  }
}

export function validatePrescription(name, blocks) {
  if (!String(name || '').trim()) throw new Error('Enter a session name before saving or copying.')
  const exercises = (blocks || []).flatMap(block => block.exercises || [])
  if (!exercises.length) throw new Error('Add at least one exercise before saving or copying.')
  const finite = value => typeof value === 'number' && Number.isFinite(value)
  for (const exercise of exercises) {
    if (!String(exercise.exerciseName || '').trim()) throw new Error('Choose a name for every exercise.')
    if (exercise.unmapped) throw new Error(`${exercise.exerciseName}: validate the dictated exercise name first.`)
    if (!exercise.sets?.length) throw new Error(`${exercise.exerciseName}: add at least one set.`)
    const type = exercise.intensityType
    if (!['%1RM', 'Load', 'RIR', 'RPE', 'Seconds', 'Minutes', 'Target HR'].includes(type)) throw new Error(`${exercise.exerciseName}: choose a valid intensity metric.`)
    exercise.sets.forEach((set, index) => {
      const fail = message => { throw new Error(`${exercise.exerciseName}, set ${index + 1}: ${message}`) }
      const reps = set.prescribedReps
      if (reps != null && (!finite(reps) || !Number.isInteger(reps) || reps <= 0)) fail('Enter a positive whole number of reps.')
      if (['%1RM', 'Load', 'RIR', 'RPE'].includes(type) && reps == null) fail('add a rep target.')
      const max = set.prescribedRepsMax
      if (max != null && (!finite(max) || !Number.isInteger(max) || reps == null || max < reps)) fail('Maximum reps must be a whole number at least as high as the rep target.')
      const load = set.prescribedLoadKg
      if (load != null && (!finite(load) || load < 0)) fail('Enter a load of zero or more.')
      const rest = set.prescribedRestSeconds
      if (rest != null && (!finite(rest) || !Number.isInteger(rest) || rest < 0)) fail('Enter rest in whole seconds, zero or more.')
      const intensity = set.prescribedIntensityValue
      if (type !== 'Load') {
        if (!finite(intensity)) fail(`add a ${type} target.`)
        if (type === 'RIR' && (!Number.isInteger(intensity) || intensity < 0 || intensity > 10)) fail('Enter a whole-number RIR from 0 to 10.')
        else if (type === 'RPE' && (intensity < 1 || intensity > 10 || intensity * 2 % 1 !== 0)) fail('Enter RPE from 1 to 10 in 0.5 steps.')
        else if (type === '%1RM' && (intensity <= 0 || intensity > 100)) fail('Enter a percentage above 0 and up to 100.')
        else if (!['RIR', 'RPE', '%1RM'].includes(type) && intensity <= 0) fail(`${type} must be greater than zero.`)
      }
      if (['%1RM', 'Load'].includes(type) && set.prescribedRir != null && (!finite(set.prescribedRir) || !Number.isInteger(set.prescribedRir) || set.prescribedRir < 0 || set.prescribedRir > 10)) fail('If provided, enter a whole-number RIR from 0 to 10.')
    })
  }
  return true
}
