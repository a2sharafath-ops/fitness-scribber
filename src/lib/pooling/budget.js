// Explain measured arithmetic only. Never shorten rest, change dose or assign.
export function budgetGap(durationSeconds, budgetSeconds, extra = {}) {
 return {reason:'budget_exceeded',durationSeconds,budgetSeconds,
  shortfallSeconds:Math.max(0,durationSeconds-budgetSeconds),...extra}
}

export function budgetMessages(result) {
 return (result?.gaps || []).filter(gap=>gap.reason==='budget_exceeded' &&
  [gap.durationSeconds,gap.budgetSeconds,gap.shortfallSeconds].every(Number.isFinite))
  .map(gap=>`${gap.role?`Role ${gap.role}: `:''}${gap.lowerBound?'At least ':''}${gap.durationSeconds} seconds required; ${gap.budgetSeconds} seconds available; ${gap.shortfallSeconds} seconds short. Required dose, rest, setup and support have not been reduced.`)
}
