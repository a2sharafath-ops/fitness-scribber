const WORDS = {
  general_warmup: 'Warm-up',
  mobility_lengthening: 'Mobility',
  activation: 'Activation',
  integration: 'Movement practice',
  main_accessory: 'Main exercises',
  conditioning: 'Conditioning',
  cooldown: 'Cool-down',
  general_fitness: 'General fitness',
  no_change: 'No change reported',
  not_applicable: 'Not applicable',
}

export function coachLabel(value = '') {
  if (WORDS[value]) return WORDS[value]
  const text = String(value).replace(/^NEED-?0?/, 'Need ').replaceAll('_', ' ').replaceAll('-', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function coachSessionStatus(session, today) {
  if (!session) return { label: 'No workout prepared', tone: 'neutral', action: 'Create workout' }
  if (session.status === 'complete') return { label: 'Completed', tone: 'success', action: 'View results' }
  if (session.status === 'stop') return { label: 'Stopped', tone: 'attention', action: 'Review session' }
  if (session.held || session.stale) return { label: 'Needs review', tone: 'attention', action: 'Review workout' }
  if (['start', 'resume', 'pause'].includes(session.status)) return { label: session.status === 'pause' ? 'Paused' : 'In progress', tone: 'active', action: 'Open session' }
  if (session.date && today && session.date < today) return { label: 'Past due', tone: 'attention', action: 'Review workout' }
  return { label: 'Ready', tone: 'success', action: 'Open workout' }
}

export function coachDraftStatus({ draft, decision, assigned = false }) {
  if (assigned) return { step: 4, label: 'Assigned' }
  if (!draft) return { step: 1, label: 'Workout details' }
  if (!draft.proposal?.selection?.length) return { step: 1, label: 'More information needed' }
  if (!decision) return { step: 2, label: 'Ready to check' }
  if (decision.result?.completeness !== 'ready_for_coach_review') return { step: 1, label: 'Changes needed' }
  return { step: 3, label: 'Ready for your approval' }
}

export function coachGapText(gap = {}) {
  const value = gap.needId || gap.need || gap.role || gap.exerciseId || gap.reason || gap.code || gap.kind
  const label = coachLabel(value || 'workout requirement')
  const code = String(gap.reason || gap.code || gap.kind || '').toLowerCase()
  if (code.includes('equipment')) return `Confirm the equipment needed for ${label}.`
  if (code.includes('prerequisite') || code.includes('capability')) return `Review whether the client can safely perform ${label}.`
  if (code.includes('budget') || code.includes('duration')) return `The workout needs more time for ${label}. Increase the session time or review the workout details.`
  if (gap.role) return `The workout still needs an eligible ${coachLabel(gap.role).toLowerCase()} exercise.`
  if (gap.needId || gap.need) return `The confirmed training need “${label}” is not covered by an eligible exercise.`
  return `Review ${label.toLowerCase()} before the workout can be assigned.`
}

export function coachErrorMessage(error) {
  const code = String(error?.code || error?.message || '').toLowerCase()
  if (code.includes('equipment_missing')) return 'Some selected exercises need equipment that is not marked as available. Review the equipment for this session.'
  if (code.includes('prerequisite_missing')) return 'A required client capability has not been confirmed. Review what the client can safely do.'
  if (code.includes('stale_context') || code.includes('source_changed')) return 'Client information changed after this workout was prepared. Review the latest information and prepare it again.'
  if (code.includes('outcome_unknown')) return 'We are checking whether the last save succeeded. Do not submit it again yet.'
  if (code.includes('forbidden')) return 'This client belongs to a different coach account, or your sign-in has expired.'
  return error?.message || 'This step could not be completed. Your saved work has been kept; try again.'
}

export function currentCoachDraft(drafts = [], assignments = []) {
  const superseded = new Set(drafts.map(row => row.parent_id).filter(Boolean))
  return drafts
    .filter(row => row.id && !superseded.has(row.id) && !assignments.some(assignment => assignment.draftId === row.id))
    .sort((a, b) => b.id - a.id)[0] || null
}
