import { addDays, daysBetween, fmtDate } from './dates'

const programPath = (clientId, assignmentId) => `/workouts?assignment=${encodeURIComponent(assignmentId)}&clientId=${encodeURIComponent(clientId)}`

export function clientPrograms(db, client, today) {
  const assignments = (db.programAssignments || []).filter(a => a.clientId === client.id).flatMap(a => {
    const dates = (a.data?.schedule || []).map(s => s.date).filter(Boolean).sort()
    if (!dates.length) return []
    const start = [a.data.start || dates[0], dates[0]].sort()[0]
    const weeks = Number(a.data.weeks)
    const nominalEnd = Number.isInteger(weeks) && weeks > 0 ? addDays(a.data.start || start, weeks * 7 - 1) : dates.at(-1)
    const end = [nominalEnd, dates.at(-1)].sort().at(-1)
    if (end < today) return []
    const upcoming = start > today
    const week = upcoming ? null : Math.floor(daysBetween(start, today) / 7) + 1
    return [{ id: a.id, name: a.name, start, end, upcoming, path: programPath(client.id, a.id), note: upcoming ? `Starts ${fmtDate(start)}${weeks > 0 ? ` · ${weeks} weeks` : ''}` : weeks > 0 ? `Week ${Math.min(week, weeks)} of ${weeks}` : `Through ${fmtDate(end)}` }]
  }).sort((a, b) => Number(a.upcoming) - Number(b.upcoming) || (a.upcoming ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)) || a.name.localeCompare(b.name))
  if (assignments.length) return assignments
  const legacy = (db.plans || []).find(p => p.id === client.planId)
  return legacy ? [{ id: legacy.id, name: legacy.name, path: `/clients/${encodeURIComponent(client.id)}/training`, note: 'Individual workout plan', upcoming: false }] : []
}
