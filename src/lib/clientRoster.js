import { daysBetween } from './dates'
import { clientPrograms } from './clientPrograms'
import { isTrainingDerivedAssessment } from './assessment'
export { clientPrograms as rosterPrograms } from './clientPrograms'
import { bookedCompletion, clientReviewItems, dashboardClientPath } from './dashboard'

export const ROSTER_PAGE_SIZE = 8
const byName = (a, b) => a.client.name.localeCompare(b.client.name)
function latestRecord(db, clientId, today) {
  const records = []
  const add = (row, source, path, date = row.date) => {
    if (date && date <= today) records.push({ date, source, path, createdAt: row.createdAt || '' })
  }
  const mine = key => (db[key] || []).filter(r => r.clientId === clientId)
  // Same-day ties prefer completed workout evidence before its derived entries.
  mine('workouts').filter(w => w.status === 'completed').forEach(w => add(w, 'Workout log', dashboardClientPath(clientId, `/training?date=${w.date}&workout=${encodeURIComponent(w.id)}`)))
  mine('wellness').forEach(w => add(w, 'Wellness check-in', dashboardClientPath(clientId, '/check-ins?view=wellness')))
  mine('assessments').forEach(a => {
    if (isTrainingDerivedAssessment(a)) {
      if (a.data?.sourceWorkoutId && mine('workouts').some(w => w.id === a.data.sourceWorkoutId && w.status === 'completed')) return
      add(a, 'Strength estimate', dashboardClientPath(clientId, '/progress#strength'))
      return
    }
    const section = ['goals', 'lifestyle'].includes(a.type) ? 'profile' : 'assessments'
    add(a, section === 'profile' ? a.type === 'goals' ? 'Goal update' : 'Lifestyle record' : 'Assessment', dashboardClientPath(clientId, `/${section}/${a.type}?record=${encodeURIComponent(a.id)}#assessment-record-${encodeURIComponent(a.id)}`))
  })
  mine('screenings').filter(s => s.status === 'complete').forEach(s => add(s, 'Health screening', dashboardClientPath(clientId, '/assessments#health-screening'), s.completedOn))
  mine('sessions').filter(s => s.status === 'Completed').forEach(s => add(s, 'Completed appointment', dashboardClientPath(clientId, `/training?date=${s.date}`)))
  for (const [key, source] of [['srpe','Session RPE'], ['resistance','Resistance log'], ['cardio','Conditioning log']]) mine(key).forEach(r => add(r, source, dashboardClientPath(clientId, '/progress#training-load')))
  mine('concerns').forEach(r => add(r, 'Concern record', dashboardClientPath(clientId, '/check-ins?view=concerns')))
  mine('wearable').forEach(r => add(r, 'Wearable observation', dashboardClientPath(clientId, '/check-ins?view=wearables')))
  // The legacy global Progress view has no client-scoped deep link. Keep provenance
  // visible without navigating to another client's default selection.
  mine('logs').forEach(r => add(r, 'Legacy progress record', null))
  return records.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0] || null
}

export function clientRoster(db, today) {
  const reviews = clientReviewItems(db, today)
  return db.clients.map(client => {
    const programs = clientPrograms(db, client, today)
    const items = reviews.filter(r => r.client.id === client.id)
    return { client, programs, program: programs[0] || null, reviews: items, latest: latestRecord(db, client.id, today), completion: bookedCompletion(db.sessions, today, new Set([client.id])), isNew: client.status === 'Active' && client.joined <= today && daysBetween(client.joined, today) <= 21 }
  })
}

export function rosterResults(rows, { filter = 'active', query = '', unassigned = false, sort = 'name', page = 1 } = {}) {
  const counts = { active: rows.filter(r => r.client.status === 'Active').length, all: rows.length, review: rows.filter(r => r.client.status === 'Active' && r.reviews.length).length, inactive: rows.filter(r => r.client.status !== 'Active').length }
  const term = query.trim().toLocaleLowerCase()
  const filtered = rows.filter(r => (filter === 'all' || filter === 'active' && r.client.status === 'Active' || filter === 'inactive' && r.client.status !== 'Active' || filter === 'review' && r.client.status === 'Active' && r.reviews.length) && (!unassigned || !r.program) && (!term || [r.client.name, r.client.email, r.client.goal, ...r.programs.map(p => p.name)].some(v => String(v || '').toLocaleLowerCase().includes(term))))
  const rank = r => r.client.status !== 'Active' ? 5 : r.reviews[0]?.priority ?? 4
  filtered.sort((a, b) => sort === 'recent' ? (b.latest?.date || '').localeCompare(a.latest?.date || '') || byName(a, b) : sort === 'review' ? rank(a) - rank(b) || byName(a, b) : byName(a, b))
  const pages = Math.max(1, Math.ceil(filtered.length / ROSTER_PAGE_SIZE))
  const currentPage = Math.max(1, Math.min(pages, page)), start = (currentPage - 1) * ROSTER_PAGE_SIZE
  return { counts, filtered, visible: filtered.slice(start, start + ROSTER_PAGE_SIZE), page: currentPage, pages, start }
}
