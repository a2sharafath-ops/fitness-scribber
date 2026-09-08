// Only current, unassigned leaf proposals can become a new weekly review.
// Historical drafts remain available elsewhere; this filter never deletes them.
export function currentWeeklyCandidates(drafts, assignments, generation, manifestId) {
 if (!Number.isSafeInteger(generation) || !manifestId) return []
 const parents = new Set(drafts.map(d => d.parent_id).filter(Boolean))
 const assigned = new Set((assignments || []).map(a => a.draftId))
 return drafts.filter(d => d.id && d.context_generation === generation &&
  d.proposal.selection?.length && d.proposal.manifestId === manifestId &&
  !parents.has(d.id) && !assigned.has(d.id))
}
