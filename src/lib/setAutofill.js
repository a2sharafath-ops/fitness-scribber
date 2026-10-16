const fields = ['load', 'reps']
const targetFields = ['purpose', 'pLoadKg', 'pReps', 'pRepsMax', 'pIntensityType', 'pIntensityValue', 'pRir']
const sameTarget = (a, b) => targetFields.every((key) => String(a[key] ?? '') === String(b[key] ?? ''))
const valid = (field, value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && (field !== 'reps' || Number.isInteger(value))

// Provenance travels with the draft so resuming preserves manual overrides.
// Completion patches never propagate: filling a value is not performing a set.
export function editRunSet(rows, index, patch) {
  if (!rows[index]) return rows
  const source = rows[index]
  const edited = fields.filter((field) => Object.hasOwn(patch, field) && !Object.hasOwn(patch, 'done'))
  const next = rows.map((row, i) => i === index ? {
    ...row, ...patch,
    ...(edited.length ? { autofill: { ...row.autofill, ...Object.fromEntries(edited.map((field) => [field, 'manual'])) } } : {}),
  } : row)
  for (const field of edited) {
    const value = patch[field]
    for (let i = index + 1; i < next.length; i++) {
      const row = next[i]
      if (row.done || !sameTarget(source, row)) continue
      const origin = row.autofill?.[field]
      const inherited = Number.isInteger(origin) && origin <= index
      const untouched = origin == null && (row[field] == null || (field === 'load' && row.load === row.pLoadKg))
      if (!inherited && !untouched) continue
      // Clear only suggestions from this source; never broadcast invalid input.
      if (!valid(field, value) && origin !== index) continue
      next[i] = { ...row, [field]: valid(field, value) ? value : null, autofill: { ...row.autofill, [field]: index } }
    }
  }
  return next
}
