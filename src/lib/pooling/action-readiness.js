// Plain-language UI prerequisites mirror existing guards, never replace them.
export function approvalBlock({row,context,decision,drafts = [],assignments = [],online,now = Date.now()}) {
  if (!online) return 'Wait for the current workspace data to load. If an error is shown, retry loading before approval.'
  if (!row?.id || !row.proposal?.selection?.length) return 'Generate an exercise selection for this draft before validating or approving it.'
  if (assignments.some(item => item.draftId === row.id)) return 'This exact draft is already assigned. Open Sessions & results to use it.'
  if (drafts.some(item => item.parent_id === row.id)) return 'A newer revision replaces this draft. Review the newest unassigned revision instead.'
  if (!context) return 'Current client context is unavailable. Retry loading the workspace.'
  if (context.held !== false) return 'Client context is on hold. Review the reported gaps or restrictions; approval cannot clear them.'
  if (!decision) return 'Click Validate exact draft first and inspect the returned decision.'
  if (decision.generation !== context.generation) return 'Sources changed after validation. Validate this draft again against the current context.'
  if (decision.manifestState !== 'published') return 'This draft has no currently published release available for assignment.'
  if (!Number.isFinite(Date.parse(decision.validUntil)) || Date.parse(decision.validUntil) <= now) return 'The validation decision expired. Click Validate exact draft again.'
  if (decision.result?.completeness !== 'ready_for_coach_review' || decision.result?.sessionState !== 'eligible_for_coach_review') return 'Validation found unresolved gaps. Review the decision below and correct them before approval.'
  return ''
}

export function sessionStartBlock({assignment,workflow,localStop,health}) {
  if (localStop) return 'Stop was requested. This session cannot be restarted from this control.'
  if (workflow.pending) return 'Reconcile the original pending operation before starting or resuming.'
  if (workflow.status !== 'ready') return 'Wait for current session checks, or use Refresh approved sessions after resolving the displayed error.'
  if (workflow.startAllowed === false) return 'New starts are unavailable for this workspace. Existing history and Stop remain available.'
  if (assignment.held) return 'This session is on review hold. Ask for a current coach review; a no-change answer does not clear it.'
  if (assignment.stale) return 'This assignment is stale. Review and explicitly approve a current revision in Exercise Pool.'
  if (health !== 'no_change') return health === 'changed' || health === 'declined' ? 'Save this report for coach review. Starting or resuming is not available for this answer.' : 'Choose an explicit current health-change response for this session.'
  return ''
}

export function workspaceCreateBlock({state,acknowledged,busy,error}) {
  if (busy) return 'Saving your workspace. Wait for confirmation before another action.'
  if (error) return 'Test availability could not be confirmed. Use Refresh test availability after checking the error.'
  if (!state) return 'Checking this signed-in coach’s test access…'
  if (!state.available) return 'This coach account is not currently eligible, or the test window has ended. Refresh availability; do not create another account to bypass this.'
  if (!acknowledged) return 'Read and tick the fictional-software acknowledgement below to enable workspace creation.'
  return ''
}
