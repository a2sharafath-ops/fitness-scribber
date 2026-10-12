// A failed diff must retain its original baseline so an unchanged retry still
// writes the unsaved rows. Partial writes can safely be retried as upserts.
export function createSnapshotQueue(initial, persist) {
  let baseline = initial, tail = Promise.resolve()
  return {
    reset(snapshot) { baseline = snapshot },
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
  if (!result?.saved) throw new Error('Changes could not be saved. Review the data warning, then retry.')
  return result
}
