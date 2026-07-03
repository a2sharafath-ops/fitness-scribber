// Scheduled communication automation. Scans every coach's sessions, wellness,
// sRPE and workouts and posts automated "system" chat messages: upcoming
// session reminders + follow-up nudges (missed session, low activity,
// incomplete workout). Idempotent — each message has a stable broadcastId and
// existing ones are skipped, so it is safe to run on any cadence (see the
// pg_cron snippet in schema_comms.sql).
//
// Mirrors src/lib/nudges.js. Runs with the service role (bypasses RLS).
import { admin } from '../_shared/supa.ts'
import { cors, json } from '../_shared/cors.ts'

type Row = Record<string, unknown>
const def = <T,>(v: T | null | undefined, d: T): T => (v === undefined || v === null ? d : v)

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const db = admin()
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const [settingsR, clientsR, sessionsR, wellnessR, srpeR, workoutsR, assessmentsR, existingR] = await Promise.all([
      db.from('settings').select('*'),
      db.from('clients').select('id, name'),
      db.from('sessions').select('id, clientId, date, time, type, status'),
      db.from('wellness').select('clientId, date'),
      db.from('srpe').select('clientId, date'),
      db.from('workouts').select('id, clientId, date, status'),
      db.from('assessments').select('id, clientId, type, date'),
      db.from('messages').select('broadcastId').eq('kind', 'system'),
    ])

    const settingsByCoach: Record<string, Row> = {}
    for (const s of settingsR.data ?? []) settingsByCoach[(s as Row).coachId as string] = s as Row

    // clientId -> coachId, so per-coach preferences apply to that client's rows.
    const coachOf: Record<string, string> = {}
    const known = new Set<string>()
    for (const c of clientsR.data ?? []) {
      known.add((c as Row).id as string)
      coachOf[(c as Row).id as string] = (c as Row).coachId as string
    }
    const cfg = (clientId: string) => settingsByCoach[coachOf[clientId]] ?? {}

    const have = new Set((existingR.data ?? []).map((m) => (m as Row).broadcastId).filter(Boolean) as string[])
    const pending: { clientId: string; broadcastId: string; body: string }[] = []

    for (const sRow of sessionsR.data ?? []) {
      const s = sRow as Row
      const clientId = s.clientId as string
      if (!known.has(clientId)) continue
      const c = cfg(clientId)
      const status = (s.status as string) || ''
      if (def(c.remindersEnabled as boolean, true) && (status === 'Confirmed' || status === 'Pending')) {
        const dt = new Date(`${s.date}T${(s.time as string) || '00:00'}:00Z`)
        const lead = def(c.reminderLeadHours as number, 24) * 3600e3
        if (!Number.isNaN(dt.getTime()) && dt >= now && dt.getTime() - now.getTime() <= lead) {
          pending.push({ clientId, broadcastId: `remind:${s.id}`,
            body: `⏰ Reminder: your ${(s.type as string) || 'session'} is ${fmtDay(s.date as string)}${s.time ? ` at ${s.time}` : ''}.` })
        }
      }
      if (def(c.nudgeMissed as boolean, true) && (s.date as string) < today && status !== 'Completed' && status !== 'Cancelled') {
        pending.push({ clientId, broadcastId: `nudge:missed:${s.id}`,
          body: `📌 Looks like the ${fmtDay(s.date as string)} session was missed. Want to reschedule?` })
      }
    }

    // Low activity: latest wellness/sRPE per client vs each coach's window.
    const lastByClient: Record<string, string> = {}
    for (const w of wellnessR.data ?? []) {
      const r = w as Row
      if ((r.date as string) > (lastByClient[r.clientId as string] || '')) lastByClient[r.clientId as string] = r.date as string
    }
    for (const rr of srpeR.data ?? []) {
      const r = rr as Row
      if ((r.date as string) > (lastByClient[r.clientId as string] || '')) lastByClient[r.clientId as string] = r.date as string
    }
    for (const cRow of clientsR.data ?? []) {
      const c = cRow as Row
      const clientId = c.id as string
      const conf = cfg(clientId)
      if (!def(conf.nudgeLowActivity as boolean, true)) continue
      const cutoff = addDays(today, -(def(conf.lowActivityDays as number, 4) - 1))
      const last = lastByClient[clientId]
      if (!last || last < cutoff) {
        pending.push({ clientId, broadcastId: `nudge:lowact:${clientId}:${today}`,
          body: `👋 We haven't seen a check-in or training log in a while. How are you feeling? A quick update helps me adjust your plan.` })
      }
    }

    for (const wRow of workoutsR.data ?? []) {
      const w = wRow as Row
      const clientId = w.clientId as string
      if (!known.has(clientId)) continue
      if (!def(cfg(clientId).nudgeIncomplete as boolean, true)) continue
      if ((w.date as string) < today && (w.status === 'in_progress' || w.status === 'started')) {
        pending.push({ clientId, broadcastId: `nudge:incomplete:${w.id}`,
          body: `🏋️ Your ${fmtDay(w.date as string)} workout was left in progress. Mark it complete or tell me what happened.` })
      }
    }

    // Reassessment reminders for objective assessments past their interval.
    const REASSESS: Record<string, string> = { fitness: 'fitness', movement: 'movement screen', body_comp: 'body composition' }
    const latestAssess: Record<string, Row> = {}
    for (const aRow of assessmentsR.data ?? []) {
      const a = aRow as Row
      if (!((a.type as string) in REASSESS) || !known.has(a.clientId as string)) continue
      const k = `${a.clientId}|${a.type}`
      if (!latestAssess[k] || (a.date as string) > (latestAssess[k].date as string)) latestAssess[k] = a
    }
    for (const k of Object.keys(latestAssess)) {
      const a = latestAssess[k]
      const conf = cfg(a.clientId as string)
      if (!def(conf.nudgeReassess as boolean, true)) continue
      const interval = def(conf.reassessIntervalDays as number, 84)
      if (addDays(a.date as string, interval) <= today) {
        pending.push({ clientId: a.clientId as string, broadcastId: `nudge:reassess:${a.id}`,
          body: `📊 Time to reassess ${REASSESS[a.type as string]} — last done ${fmtDay(a.date as string)}. Book a reassessment to track progress.` })
      }
    }

    const rows = pending
      .filter((p) => !have.has(p.broadcastId))
      .map((p) => ({
        id: crypto.randomUUID(), clientId: p.clientId, senderRole: 'coach',
        kind: 'system', body: p.body, broadcastId: p.broadcastId, createdAt: new Date().toISOString(),
      }))

    if (rows.length) {
      const { error } = await db.from('messages').insert(rows)
      if (error) return json({ error: error.message }, 500)
    }
    return json({ scanned: (sessionsR.data ?? []).length, inserted: rows.length })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
