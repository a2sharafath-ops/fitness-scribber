import { trainingSchedule, programBookingConflicts } from './trainingSchedule'
import { bookingConflicts, scheduleClock } from './schedule'
import { uid } from './format'
import { addDays } from './dates'
import { newBlock, newProgExercise, newSet, cloneBlocksFresh, blocksToItems } from './program'
import { validatePrescription } from './prescription'
import { isPlanTargetBlocked, writePrescription } from './planner'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const programWeekStart = date => {
  const d = new Date(`${date}T12:00:00Z`)
  return addDays(date, -((d.getUTCDay() + 6) % 7))
}
export function ensureLibrary(db) {
  db.programs ||= []
  db.programAssignments ||= []
  return db
}
export const freshProgramWeek = week => week.map(s => ({ ...structuredClone(s), id: uid(), blocks: cloneBlocksFresh(s.blocks) }))
export function createProgram(name, weeks = 4, days = 3) {
  const map = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] }[days]
  if (!map || !Number.isInteger(weeks) || weeks < 1 || weeks > 52) throw new Error('Choose 1–52 weeks and 1–7 training days.')
  return { id: uid(), name, data: { version: 1, goal: 'Hypertrophy', equipment: 'Full gym', level: 'All levels', description: '', progression: 'Build reps within the target range at the prescribed effort, then increase load.', weeks: Array.from({ length: weeks }, () => map.map((day, i) => ({ id: uid(), name: `Session ${i + 1}`, day, blocks: [newBlock()] }))) } }
}
export function validateProgram(p) {
  if (!p.name?.trim()) throw new Error('Add a program name.')
  const weeks = p.data?.weeks
  if (!weeks?.length || weeks.length > 52) throw new Error('Use 1–52 weeks.')
  for (const [wi, week] of weeks.entries()) {
    if (!week.length || week.length > 7) throw new Error(`Week ${wi + 1}: use 1–7 sessions.`)
    if (new Set(week.map(s => s.day)).size !== week.length || week.some(s => !Number.isInteger(s.day) || s.day < 0 || s.day > 6)) throw new Error(`Week ${wi + 1}: select a different weekday for each session.`)
    for (const s of week) {
      try { validatePrescription(s.name, s.blocks) }
      catch (error) { throw new Error(`Week ${wi + 1}, ${s.name || 'unnamed session'}: ${error.message}`) }
    }
  }
}
export function saveProgram(db, program) {
  validateProgram(program)
  ensureLibrary(db)
  const current = db.programs.find(p => p.id === program.id)
  const saved = structuredClone(program)
  // Source templates and built-ins are copied into the coach's own library on save.
  if (current && JSON.stringify({ ...current, data: { ...current.data, version: 0 } }) === JSON.stringify({ ...saved, data: { ...saved.data, version: 0 } })) return structuredClone(current)
  saved.data.version = (current?.data.version || 0) + 1
  if (current) Object.assign(current, saved)
  else db.programs.push(saved)
  return structuredClone(saved)
}
export function assignmentTargets(program, options) {
  validateProgram(program)
  const { start, from = 1, through = program.data.weeks.length, mapping } = options
  const parsed = new Date(`${start}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== start || programWeekStart(start) !== start) throw new Error('Choose a Monday for the first week.')
  if (!Number.isInteger(from) || !Number.isInteger(through) || from < 1 || through > program.data.weeks.length || through < from) throw new Error('Select a valid range of template weeks.')
  return program.data.weeks.slice(from - 1, through).flatMap((week, wi) => {
    const offsets = week.map((s, i) => mapping?.[i] ?? s.day)
    if (new Set(offsets).size !== offsets.length || offsets.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('Choose a different weekday for every session.')
    return week.map((session, si) => ({ session, sourceWeek: from + wi, week: wi, day: offsets[si], date: addDays(start, wi * 7 + offsets[si]) }))
  }).sort((a, b) => a.date.localeCompare(b.date))
}
export function programConflicts(db, clientId, targets, today) {
  return targets.map(t => {
    const existing = db.prescriptions.find(p => p.clientId === clientId && p.date === t.date)
    const owned = (db.programAssignments || []).find(a => a.clientId === clientId && a.data.schedule.some(s => s.date === t.date))
    const workout = (db.workouts || []).find(w => w.clientId === clientId && w.date === t.date)
    const completed = (db.sessions || []).some(s => s.clientId === clientId && s.date === t.date && String(s.status).toLowerCase() === 'completed')
    const reasons = []
    if (t.date < today) reasons.push({ code: 'past', label: 'Past date', resolution: 'Choose a future start week.' })
    if (owned) reasons.push({ code: 'program', label: `Already assigned: ${owned.name}`, resolution: 'Choose dates outside this program, or edit its client copy in Training.' })
    if (workout) reasons.push({ code: 'workout', label: 'Workout record exists', resolution: 'Keep this record and choose another training day or start week.' })
    if (completed) reasons.push({ code: 'completed', label: 'Appointment completed', resolution: 'Choose another training day or start week.' })
    const protectedDay = isPlanTargetBlocked(db, clientId, t.date, today) || owned
    if (!protectedDay && existing) reasons.push({ code: 'plan', label: 'Unstarted individual plan', resolution: 'Change the schedule, or confirm replacement below.' })
    return protectedDay || existing ? { date: t.date, name: existing?.name || owned?.name || workout?.name || 'Training date', protected: !!protectedDay, reasons } : null
  }).filter(Boolean)
}
// Build an idempotent transaction before commit. Retry uses the same assignment and row IDs.
export function prepareAssignment(db, program, options, today) {
  if (!db.clients.some(c => c.id === options.clientId)) throw new Error('Select a client.')
  const targets = assignmentTargets(program, options)
  const conflicts = programConflicts(db, options.clientId, targets, today)
  if (conflicts.some(c => c.protected)) throw new Error('This schedule overlaps a protected workout, past date, or existing program. Change the schedule.')
  if (conflicts.length && !options.replace) throw new Error('Confirm replacement of the listed unstarted plans.')
  const timing = structuredClone(trainingSchedule(db.clients.find(c => c.id === options.clientId)))
  const timeConflicts = programBookingConflicts(db, options.clientId, targets)
  if (timeConflicts.length) throw new Error(timeConflicts.map(c => c.date + ': ' + c.reasons.map(r => r.label + '. ' + r.resolution).join(' ')).join('\n'))
  const bookings = timing ? targets.map(t => ({ id: uid(), clientId: options.clientId, date: t.date, time: timing.time, dur: timing.duration, type: 'Personal training', status: 'Confirmed', notes: '' })) : []
  const assignmentId = uid()
  const prescriptions = targets.map(t => {
    const old = db.prescriptions.find(p => p.clientId === options.clientId && p.date === t.date)
    const blocks = cloneBlocksFresh(t.session.blocks)
    return { id: old?.id || uid(), clientId: options.clientId, date: t.date, name: t.session.name, notes: t.session.notes || '', blocks, items: blocksToItems(blocks) }
  })
  const assignment = { id: assignmentId, clientId: options.clientId, name: program.name, data: {
    sourceId: program.id, sourceVersion: program.data.version, start: options.start,
    weeks: (options.through ?? program.data.weeks.length) - (options.from ?? 1) + 1, goal: program.data.goal, equipment: program.data.equipment,
    trainingTiming: timing, initialBookings: bookings,
    progression: program.data.progression, createdAt: new Date().toISOString(),
    schedule: targets.map((t, i) => ({ prescriptionId: prescriptions[i].id, date: t.date, week: t.week, sourceWeek: t.sourceWeek, name: t.session.name })),
  } }
  return { assignment, prescriptions, expected: targets.map(t => structuredClone(db.prescriptions.find(p => p.clientId === options.clientId && p.date === t.date) || null)) }
}
export function applyAssignment(db, prepared, today) {
  ensureLibrary(db)
  const { assignment, prescriptions, expected } = prepared
  if (db.programAssignments.some(a => a.id === assignment.id)) return // unchanged save retry
  if (!db.clients.some(c => c.id === assignment.clientId)) throw new Error('The client is no longer available.')
  const timing = trainingSchedule(db.clients.find(c => c.id === assignment.clientId))
  if (JSON.stringify(timing) !== JSON.stringify(assignment.data.trainingTiming ?? null)) throw new Error('Profile training time changed. Review the assignment again.')
  const bookings = assignment.data.initialBookings || []
  const clock = scheduleClock(new Date(), db.settings?.tz)
  for (const booking of bookings) {
    if (db.sessions.some(s => s.id === booking.id)) throw new Error('Booking identity already exists. Review the assignment again.')
    const issues = bookingConflicts(db, null, booking, clock)
    if (issues.length) throw new Error(booking.date + ': ' + issues.map(i => i.title + '. ' + i.detail).join(' '))
  }
  prescriptions.forEach((p, i) => {
    if (isPlanTargetBlocked(db, p.clientId, p.date, today)) throw new Error(`${p.date}: this workout is now protected.`)
    const current = db.prescriptions.find(r => r.clientId === p.clientId && r.date === p.date) || null
    if (JSON.stringify(current) !== JSON.stringify(expected[i])) throw new Error('The calendar changed. Review the assignment again.')
    if (db.programAssignments.some(a => a.clientId === p.clientId && a.data.schedule.some(s => s.date === p.date))) throw new Error('Another program now occupies these dates.')
    validatePrescription(p.name, p.blocks)
  })
  prescriptions.forEach(p => {
    writePrescription(db, p.clientId, p.date, structuredClone(p.blocks), p.notes, p.name)
    db.prescriptions.find(r => r.clientId === p.clientId && r.date === p.date).id = p.id
  })
  db.sessions.push(...structuredClone(bookings))
  db.programAssignments.push(structuredClone(assignment))
}
export function legacyProgram(plan, exercises) {
  const p = createProgram(plan.name, 1, 1)
  p.id = `legacy-${plan.id}`
  p.data.legacyId = plan.id
  p.data.originalPlan = structuredClone(plan)
  p.data.description = 'Converted from a single exercise list. Review the session before assigning.'
  p.data.weeks[0][0].name = plan.name
  p.data.weeks[0][0].blocks[0].exercises = (plan.items || []).map((it, i) => {
    const exercise = exercises.find(e => e.id === it.exId)
    const timed = /s|sec|min/i.test(String(it.reps))
    const reps = parseInt(it.reps, 10) || 10
    return newProgExercise(exercise?.name || 'Exercise needs review', { order: i + 1, dbRef: exercise?.id, unmapped: !exercise, intensityType: timed ? 'Seconds' : 'Load', sets: Array.from({ length: Math.max(1, parseInt(it.sets, 10) || 1) }, (_, j) => newSet(j + 1, { reps: timed ? 1 : reps, repsMax: !timed && /[–-]/.test(String(it.reps)) ? +String(it.reps).split(/[–-]/)[1] || null : null, intensity: timed ? reps * (/min/i.test(it.reps) ? 60 : 1) : null, rest: (parseInt(it.rest, 10) || 60) * (/m/i.test(it.rest) ? 60 : 1) })) })
  })
  return p
}
