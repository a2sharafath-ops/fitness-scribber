import { addDays, daysBetween, fmtDate } from './dates'

const programPath = (clientId, assignmentId) => `/workouts?assignment=${encodeURIComponent(assignmentId)}&clientId=${encodeURIComponent(clientId)}`

export function programPeriod(assignment) {
  const dates = (assignment.data?.schedule || []).map(s => s.date).filter(Boolean).sort()
  if (!dates.length) return null
  const start = [assignment.data.start || dates[0], dates[0]].sort()[0]
  const weeks = Number(assignment.data.weeks)
  const nominalEnd = Number.isInteger(weeks) && weeks > 0 ? addDays(assignment.data.start || start, weeks * 7 - 1) : dates.at(-1)
  return { start, end: [nominalEnd, dates.at(-1)].sort().at(-1), weeks }
}

export function clientPrograms(db, client, today) {
  const assignments = (db.programAssignments || []).filter(a => a.clientId === client.id).flatMap(a => {
    const period = programPeriod(a)
    if (!period) return []
    const { start, end, weeks } = period
    if (end < today) return []
    const upcoming = start > today
    const totalWeeks = Number.isInteger(weeks) && weeks > 0 ? weeks : null
    const week = !upcoming && totalWeeks ? Math.min(Math.floor(daysBetween(start, today) / 7) + 1, totalWeeks) : null
    const note = upcoming ? `Starts ${fmtDate(start)}${totalWeeks ? ` · ${totalWeeks} weeks` : ''}`
      : week ? `Week ${week} of ${totalWeeks}` : `Through ${fmtDate(end)}`
    return [{ id: a.id, name: a.name, start, end, upcoming, week, totalWeeks, path: programPath(client.id, a.id), note }]
  }).sort((a, b) => Number(a.upcoming) - Number(b.upcoming) || (a.upcoming ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)) || a.name.localeCompare(b.name))
  if (assignments.length) return assignments
  const legacy = (db.plans || []).find(p => p.id === client.planId)
  return legacy ? [{ id: legacy.id, name: legacy.name, path: `/clients/${encodeURIComponent(client.id)}/training`, note: 'Individual workout plan', upcoming: false }] : []
}
