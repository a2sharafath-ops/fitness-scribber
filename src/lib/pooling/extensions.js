import { admission, selectPool } from './selection.js'
import { canonical } from './context.js'

// Numerical policies are supplied explicitly; this module has no clinical defaults.
export function reconcileEffects({ context, baseline, signals, policy, manifest, completedOccurrences = [] }) {
  if (context.state !== 'eligible_for_coach_review') return { state: 'hold', effects: [], reasons: context.reasons || [] }
  if (!admission(policy || {}, manifest)) return { state: 'unsupported_policy', effects: [], reasons: ['policy_not_admitted'] }
  const effects = [], conflicts = [], seenLineage = new Map()
  for (const signal of [...signals].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const key = `${signal.occurrenceId}:${signal.field}`
    if (completedOccurrences.includes(signal.occurrenceId)) continue
    if (signal.quality !== 'confirmed' || !signal.lineageId) { conflicts.push({ key, reason: 'unconfirmed_evidence' }); continue }
    const original = baseline.find(row => row.occurrenceId === signal.occurrenceId)
    const bounds = policy.fields?.[signal.field]
    const from = original?.[signal.field]
    if (!bounds || !Number.isFinite(from) || ![bounds.min, bounds.max, bounds.increment, signal.delta].every(Number.isFinite) || bounds.increment <= 0 || bounds.min > bounds.max) {
      conflicts.push({ key, reason: 'missing_parameter' }); continue
    }
    // Same source lineage cannot apply the same effect twice or hide contradictions.
    const lineageKey = `${key}:${signal.lineageId}`
    const previous = seenLineage.get(lineageKey)
    if (previous !== undefined) {
      if (previous !== signal.delta) conflicts.push({ key, reason: 'lineage_conflict' })
      continue
    }
    seenLineage.set(lineageKey, signal.delta)
    const proposed = from + signal.delta
    const to = Math.round(proposed / bounds.increment) * bounds.increment
    if (!Number.isFinite(to) || to < bounds.min || to > bounds.max ||
        (bounds.maxChange !== undefined && (!Number.isFinite(bounds.maxChange) || Math.abs(to - from) > bounds.maxChange))) {
      conflicts.push({ key, reason: 'outside_reviewed_bounds' }); continue
    }
    const existing = effects.find(effect => effect.key === key)
    if (existing) {
      if (existing.to !== to) conflicts.push({ key, reason: 'effect_conflict' })
      else existing.evidence.push(signal.id)
      continue
    }
    effects.push({ key, occurrenceId: signal.occurrenceId, field: signal.field, from, to,
      baselineRevision: original.revision, policyId: policy.id, policyRevision: policy.revision, evidence: [signal.id] })
  }
  return { state: conflicts.length ? 'review_required' : effects.some(effect => effect.from !== effect.to) ? 'proposal' : 'no_change', effects, conflicts, assignment: null }
}

export function comparePerformances({ reference, performances, knowledgeCutoff, sessionAt, policy, manifest }) {
  if (!Number.isFinite(Date.parse(knowledgeCutoff)) || !Number.isFinite(Date.parse(sessionAt))) throw new Error('invalid_session')
  if (!admission(policy || {}, manifest) || !Number.isFinite(policy.windowSeconds) || policy.windowSeconds < 0 ||
      !Number.isInteger(policy.minimumPerformances) || policy.minimumPerformances < 1) return { state: 'unsupported_policy', included: [], excluded: [] }
  const compatibleFields = ['variantId', 'side', 'range', 'equipment', 'unit', 'method', 'assistance']
  const included = [], excluded = [], lineage = new Set()
  for (const performance of [...performances].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const reasons = []
    if (performance.quality !== 'confirmed' || performance.complete !== true || performance.effortConfirmed !== true || !Number.isFinite(performance.actual)) reasons.push('incomplete_evidence')
    const effective = Date.parse(performance.effectiveAt), recorded = Date.parse(performance.recordedAt)
    if (!Number.isFinite(effective) || !Number.isFinite(recorded) || effective > Date.parse(sessionAt) || recorded > Date.parse(knowledgeCutoff)) reasons.push('outside_knowledge_scope')
    if (Date.parse(sessionAt) - effective > policy.windowSeconds * 1000) reasons.push('outside_evidence_window')
    for (const key of compatibleFields) if (reference[key] === undefined || performance[key] === undefined || canonical(reference[key]) !== canonical(performance[key])) reasons.push(`incompatible_${key}`)
    if (!performance.lineageId) reasons.push('unknown_lineage')
    else if (lineage.has(performance.lineageId)) reasons.push('duplicate_lineage')
    if (reasons.length) excluded.push({ id: performance.id, reasons })
    else { included.push({ id: performance.id, actual: performance.actual, lineageId: performance.lineageId }); lineage.add(performance.lineageId) }
  }
  return { state: included.length >= policy.minimumPerformances ? 'sufficient_evidence' : 'insufficient_evidence', included, excluded }
}

export function composeWeek({ slots, requiredPatterns, catalogue, doses, manifest }) {
  if (!Array.isArray(slots) || !slots.length) return { state: 'information_required', sessions: [], gaps: ['explicit_slots_required'], assignment: null }
  if (new Set(slots.map(slot => slot.id)).size !== slots.length) throw new Error('duplicate_slot')
  const sessions = slots.map(slot => ({ slotId: slot.id, sessionAt: slot.context.sessionAt,
    draft: selectPool({ context: slot.context, request: slot.request, catalogue, doses, manifest }) }))
  const covered = new Set(sessions.flatMap(session => session.draft.blocks.map(block => catalogue.find(row => row.id === block.exerciseId)?.pattern)))
  const gaps = (requiredPatterns || []).filter(pattern => !covered.has(pattern))
  return { state: gaps.length || sessions.some(session => session.draft.completeness !== 'ready_for_coach_review') ? 'blocked' : 'ready_for_coach_review', sessions, gaps, assignment: null }
}
