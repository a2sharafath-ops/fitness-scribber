export const RESOLVER_VERSION = 'pool-context-3'
const OBSERVED = new Set(['observed_present', 'assessed_absent', 'measured', 'reported'])
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(compare).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('invalid_input')
  return JSON.stringify(value)
}

export function resolveContext(input) {
  const { sessionAt, knowledgeCutoff, observations = [], requirements = [], sourceStatus = {}, restrictions = [] } = input
  const session = Date.parse(sessionAt), cutoff = Date.parse(knowledgeCutoff)
  if (!Number.isFinite(session) || !Number.isFinite(cutoff) || !input.timeZone) throw new Error('invalid_session')
  try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }) } catch { throw new Error('invalid_timezone') }
  const facts = {}, reasons = []
  for (const requirement of [...requirements].sort((a, b) => compare(a.key, b.key))) {
    const { key, source, unit, protocol, maxAgeSeconds } = requirement
    if (sourceStatus[source] !== 'loaded') {
      facts[key] = { state: 'unavailable', refs: [] }
      if (requirement.required) reasons.push({ code: 'source_unavailable', key })
      continue
    }
    // Explain only evidence known at the cutoff; future-recorded evidence must
    // not leak into an earlier decision's reason trace.
    const known=observations.filter(row=>row.key===key && row.clientId===input.clientId && row.source===source &&
      (!requirement.side || row.side===requirement.side) && Date.parse(row.recordedAt)<=cutoff)
    const rows=known.filter(row=>Date.parse(row.effectiveAt)<=session)
    // Corrections exclude a prior revision only when the correction itself was known.
    const superseded = new Set(rows.map(row => row.supersedes).filter(Boolean))
    const current = rows.filter(row => !superseded.has(row.id))
    const confirmed = current.filter(row => row.quality === 'confirmed' && OBSERVED.has(row.state) &&
      row.value !== null && row.value !== undefined && row.confirmedBy && row.confirmedAt &&
      Date.parse(row.confirmedAt) <= cutoff && row.unit === unit && row.protocol === protocol)
    if (!confirmed.length) {
      facts[key] = { state: 'missing', refs: current.map(row => row.id).sort(compare) }
      if (requirement.required) {
        const future=known.filter(row=>Date.parse(row.effectiveAt)>session).map(row=>row.id).sort(compare)
        reasons.push({ code: future.length?'source_date_mismatch':'missing_required_source', key, ...(future.length?{refs:future}:{}) })
      }
      continue
    }
    const latestTime = Math.max(...confirmed.map(row => Date.parse(row.effectiveAt)))
    const latest = confirmed.filter(row => Date.parse(row.effectiveAt) === latestTime)
    const distinct = new Set(latest.map(row => canonical({ value: row.value, state: row.state })))
    const refs = latest.map(row => row.id).sort(compare)
    if (distinct.size !== 1) {
      facts[key] = { state: 'conflict', refs }
      if (requirement.required) reasons.push({ code: 'conflicting_source', key })
    } else if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 0) {
      facts[key] = { state: 'unsupported', refs }
      if (requirement.required) reasons.push({ code: 'freshness_policy_missing', key })
    } else if (session - latestTime > maxAgeSeconds * 1000) {
      facts[key] = { state: 'stale', refs }
      if (requirement.required) reasons.push({ code: 'stale_source', key })
    } else {
      facts[key] = { state: 'usable', value: latest[0].value, unit, protocol, refs }
    }
  }
  const activeRestrictions = restrictions.filter(row =>
    !Number.isFinite(Date.parse(row.recordedAt)) || !Number.isFinite(Date.parse(row.effectiveAt)) ||
    (Date.parse(row.recordedAt) <= cutoff && Date.parse(row.effectiveAt) <= session && !(row.state === 'resolved' && row.resolutionEvidence && row.resolvedBy &&
      Number.isFinite(Date.parse(row.resolvedAt)) && Date.parse(row.resolvedAt)<=session && Date.parse(row.resolvedAt)<=cutoff &&
      (!row.resolutionRecordedAt || Date.parse(row.resolutionRecordedAt)<=cutoff))))
    .sort((a, b) => compare(a.id, b.id))
  if (activeRestrictions.length) reasons.push({ code: 'restriction_review_required', refs: activeRestrictions.map(row => row.id) })
  if (input.healthChange !== 'no_change') reasons.push({ code: input.healthChange === 'changed' ? 'health_change_hold' : 'health_check_required' })
  if (input.adultConfirmed !== true) reasons.push({ code: 'adult_scope_unconfirmed' })
  if (input.purposePermitted !== true) reasons.push({ code: 'purpose_not_permitted' })
  if (!['adult_general_fitness'].includes(input.scope)) reasons.push({ code: 'unsupported_scope' })
  const has = code => reasons.some(reason => reason.code === code)
  const state = has('source_unavailable') ? 'unavailable' : has('health_change_hold') ? 'held' :
    has('unsupported_scope') ? 'unsupported' : activeRestrictions.length || has('conflicting_source') ? 'review_required' :
      reasons.length ? 'information_required' : 'eligible_for_coach_review'
  return { version: RESOLVER_VERSION, clientId: input.clientId, generation: input.generation,
    sessionAt, knowledgeCutoff, timeZone: input.timeZone, state, facts, reasons, restrictions: activeRestrictions }
}
