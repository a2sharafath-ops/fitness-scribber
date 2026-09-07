// Temporary release boundary: no frontend flag can authorize unverified RPCs.
export function executionAvailability({ enabled, operation }) {
  if (!['approve','start','resume','stop','record_actual','read_history'].includes(operation)) throw new Error('invalid_operation')
  if (!enabled) return { allowed:true, path:'classic' }
  if (['stop','record_actual','read_history'].includes(operation)) return { allowed:true, path:'preserve_existing_records' }
  return { allowed:false, reason:'authority_verification_pending' }
}

export function stoppedSnapshot(workout) {
  if (!workout || workout.status!=='in_progress') throw new Error('no_active_session')
  return {...structuredClone(workout),status:'stopped'}
}
