// A failed diff must retain its original baseline so an unchanged retry still
// writes the unsaved rows. Partial writes can safely be retried as upserts.
export function createSnapshotQueue(initial, persist) {
  let baseline = initial, tail = Promise.resolve()
  return {
    reset(snapshot) { baseline = snapshot },
    confirmScreening(row) {
      baseline = { ...baseline, screenings: replaceScreening(baseline.screenings, row) }
    },
    enqueue(snapshot) {
      const result = tail.then(async () => {
        try {
          const issues = await persist(baseline, snapshot) || []
          if (issues.length) return { saved: false, local: false, issues }
          baseline = snapshot
          return { saved: true, local: false, issues: [] }
        } catch (error) {
          return { saved: false, local: false, issues: [{ table: 'database connection', kind: 'write', message: error.message || 'Save failed' }] }
        }
      })
      tail = result.then(() => undefined)
      return result
    },
  }
}

export async function confirmedPlanWrite(commit, mutate) {
  const result = await commit(mutate)
  if (!result?.saved) throw new Error('Couldn’t save changes. Review the data warning and retry.')
  return result
}

// JSONB and browser storage can return the same record with different key order.
export function sameSavedRecord(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && a.length !== b.length) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameSavedRecord(a[key], b[key]))
}

// Keep history and the pending snapshot intact when one screening is confirmed.
export function replaceScreening(screenings = [], row) {
  return screenings.some(existing => existing.id === row.id)
    ? screenings.map(existing => existing.id === row.id ? row : existing)
    : [...screenings, row]
}
