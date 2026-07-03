// Pure rules that turn a coach's data into automated "system" chat messages:
// upcoming-session reminders and follow-up nudges (missed session, low
// activity, incomplete workout). Each result carries a stable `broadcastId`
// so it is inserted at most once. The backend Edge Function (comms-cron)
// mirrors this logic for scheduled delivery; the frontend uses it in local
// (no-backend) mode. No React, no I/O — data in, messages out.
import { addDays, fmtDay } from './dates'

const def = (v, d) => (v === undefined || v === null ? d : v)
const localDate = (now) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export function computeNudges(data, settings = {}, now = new Date()) {
  const clients = data.clients || []
  const sessions = data.sessions || []
  const wellness = data.wellness || []
  const srpe = data.srpe || []
  const workouts = data.workouts || []
  const assessments = data.assessments || []

  const known = new Set(clients.map((c) => c.id))
  const today = localDate(now)
  const out = []

  const remindersOn = def(settings.remindersEnabled, true)
  const leadHours = def(settings.reminderLeadHours, 24)
  const missedOn = def(settings.nudgeMissed, true)
  const lowActOn = def(settings.nudgeLowActivity, true)
  const lowDays = def(settings.lowActivityDays, 4)
  const incompleteOn = def(settings.nudgeIncomplete, true)
  const reassessOn = def(settings.nudgeReassess, true)
  const reassessDays = def(settings.reassessIntervalDays, 84)

  // Session reminders + missed-session nudges.
  for (const s of sessions) {
    if (!known.has(s.clientId)) continue
    const status = s.status || ''
    if (remindersOn && (status === 'Confirmed' || status === 'Pending')) {
      const dt = new Date(`${s.date}T${s.time || '00:00'}`)
      const lead = leadHours * 3600e3
      if (!Number.isNaN(dt.getTime()) && dt >= now && dt - now <= lead) {
        out.push({ clientId: s.clientId, broadcastId: `remind:${s.id}`,
          body: `⏰ Reminder: your ${s.type || 'session'} is ${fmtDay(s.date)}${s.time ? ` at ${s.time}` : ''}.` })
      }
    }
    if (missedOn && s.date < today && status !== 'Completed' && status !== 'Cancelled') {
      out.push({ clientId: s.clientId, broadcastId: `nudge:missed:${s.id}`,
        body: `📌 Looks like the ${fmtDay(s.date)} session was missed. Want to reschedule?` })
    }
  }

  // Low-activity nudge: no wellness check-in or sRPE log within the window.
  if (lowActOn) {
    const cutoff = addDays(today, -(lowDays - 1))
    const lastByClient = {}
    for (const w of wellness) if (w.date > (lastByClient[w.clientId] || '')) lastByClient[w.clientId] = w.date
    for (const r of srpe) if (r.date > (lastByClient[r.clientId] || '')) lastByClient[r.clientId] = r.date
    for (const c of clients) {
      const last = lastByClient[c.id]
      if (!last || last < cutoff) {
        out.push({ clientId: c.id, broadcastId: `nudge:lowact:${c.id}:${today}`,
          body: `👋 We haven't seen a check-in or training log in a while. How are you feeling? A quick update helps me adjust your plan.` })
      }
    }
  }

  // Incomplete-workout nudge: a past workout left mid-session.
  if (incompleteOn) {
    for (const w of workouts) {
      if (!known.has(w.clientId)) continue
      if (w.date < today && (w.status === 'in_progress' || w.status === 'started')) {
        out.push({ clientId: w.clientId, broadcastId: `nudge:incomplete:${w.id}`,
          body: `🏋️ Your ${fmtDay(w.date)} workout was left in progress. Mark it complete or tell me what happened.` })
      }
    }
  }

  // Reassessment reminders: objective assessment (fitness/movement/body-comp)
  // older than the interval. Keyed by the latest record id so it fires once per
  // overdue cycle and resets after a new assessment is recorded.
  if (reassessOn && assessments.length) {
    const REASSESS = { fitness: 'fitness', movement: 'movement screen', body_comp: 'body composition' }
    const latestOf = {}
    for (const a of assessments) {
      if (!(a.type in REASSESS) || !known.has(a.clientId)) continue
      const k = `${a.clientId}|${a.type}`
      if (!latestOf[k] || a.date > latestOf[k].date) latestOf[k] = a
    }
    for (const k of Object.keys(latestOf)) {
      const a = latestOf[k]
      if (addDays(a.date, reassessDays) <= today) {
        out.push({ clientId: a.clientId, broadcastId: `nudge:reassess:${a.id}`,
          body: `📊 Time to reassess ${REASSESS[a.type]} — last done ${fmtDay(a.date)}. Book a reassessment to track progress.` })
      }
    }
  }

  return out
}
