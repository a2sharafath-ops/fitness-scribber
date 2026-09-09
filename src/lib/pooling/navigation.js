// Navigation only: destinations never create drafts or authorize a workflow.
const SECTIONS = [
  ['sources', 'Sources', 'pool-source-title'],
  ['generate', 'Generate & swap', 'pool-suggestions-title'],
  ['approve', 'Validate & approve', 'pool-exact-title'],
  ['daily', 'Daily adjustment', 'daily-review-title', 'r2'],
  ['sessions', 'Sessions & results', 'governed-workouts'],
  ['progression', 'Progression', 'progression-review-title', 'r3'],
  ['weekly', 'Weekly planning', 'weekly-review-title', 'r3'],
]
const REVIEWS = [
  ['drafts', 'Review drafts', 'review-drafts'],
  ['health', 'Health change', 'health-review'],
  ['reassessment', 'Reassessment', 'pool-reassessment-title', 'r3'],
  ['catalogue', 'Candidate catalogue', 'candidate-review'],
]
const IDS = new Set(['pooling-navigation', 'test-setup', 'test-prepare', 'test-walkthrough', ...SECTIONS.map(row => row[2]), ...REVIEWS.map(row => row[2])])

export function poolingSectionId(hash) {
  const id = typeof hash === 'string' && hash.startsWith('#') ? hash.slice(1) : ''
  return IDS.has(id) ? id : null
}

export function poolingNavigation({clientId, testOnly = true, r1 = false, r2 = false, r3 = false, reviewReady = true, extensionsReady = true} = {}) {
  const clientPath = clientId ? `/clients/${encodeURIComponent(clientId)}` : null
  const flags = {r2, r3}
  function destination([key, label, section, flag]) {
    if (flag && !flags[flag]) return []
    const reason = !clientPath ? 'Create your fictional workspace first.'
      : key === 'sessions' ? ''
      : !r1 ? 'Pooling is inactive; existing sessions and history remain available.'
      : !reviewReady || (['daily', 'progression'].includes(key) && !extensionsReady) ? 'Review data is loading or unavailable.' : ''
    return [{key, label, to: reason ? null : `${clientPath}${key === 'sessions' ? '' : '/pool'}#${section}`, reason}]
  }
  const setup = testOnly ? [
    {key: 'setup', label: 'Test setup', to: '/pooling-test#test-setup'},
    {key: 'prepare', label: 'Prepare scenario', to: clientPath ? '/pooling-test#test-prepare' : null, reason: 'Create your fictional workspace first.'},
  ] : []
  return {
    workflow: [...setup, ...SECTIONS.flatMap(destination)],
    reviews: [...REVIEWS.flatMap(destination), ...(testOnly ? [{key: 'walkthrough', label: 'Testing guide', to: '/pooling-test#test-walkthrough'}] : [])],
  }
}
