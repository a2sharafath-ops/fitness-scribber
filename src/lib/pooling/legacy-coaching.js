// Display boundary only; never a readiness decision or exercise clearance.
export function legacyCoachingNotice({ poolingEnabled = false, readinessScore = null }) {
  if (poolingEnabled) return { t: 'info', h: 'Coach-reviewed recommendations', m: 'Use the exercise pool and its exact review workflow. Legacy metric prompts and live AI do not supply pooling approval or reviewed adjustment parameters.' }
  if (!Number.isFinite(readinessScore)) return { t: 'info', h: 'Readiness not established', m: 'Readiness data is missing or unavailable. No progression recommendation is made; review the client’s current context first.' }
  return null
}
