import { uid } from './format'
import { programStats } from './program'
import { bookingConflicts, minute, scheduleClock, trainingBooking } from './schedule'

export const trainingSchedule = client => client?.intake?.trainingSchedule || null
export function validateTrainingSchedule(value) {
  if (!value) return
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) || !Number.isInteger(value.duration) || value.duration < 15 || value.duration > 480 || minute(value.time) + value.duration > 1440)
    throw new Error('Choose a training time and 15–480 minutes, ending on the same day.')
}
export function programBookingConflicts(db, clientId, targets, clock) {
  const timing = trainingSchedule(db.clients.find(c => c.id === clientId))
  if (!timing) return []
  try { validateTrainingSchedule(timing) } catch (e) { return [{ date: targets[0]?.date, protected: true, reasons: [{ label: e.message, resolution: 'Update the training schedule in Profile.' }] }] }
  return targets.flatMap(t => {
    const issues = bookingConflicts(db, null, { id: 'assignment-preview', clientId, date: t.date, time: timing.time, dur: timing.duration, type: 'Personal training', status: 'Confirmed' }, clock)
    return issues.length ? [{ date: t.date, name: t.session?.name || 'Training', protected: true, reasons: issues.map(i => ({ label: i.title, resolution: i.detail + ' Adjust Profile timing, the existing booking in Schedule, or the program dates.' })) }] : []
  })
}

export const formatTrainingTime = time => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return 'Not set'
  const [h,m]=time.split(':').map(Number)
  return (h % 12 || 12) + ':' + String(m).padStart(2,'0') + (h < 12 ? ' AM' : ' PM')
}
export const timeFrom12Hour = (hour,minutes,period) => String(Number(hour)%12 + (period==='PM' ? 12 : 0)).padStart(2,'0') + ':' + String(minutes).padStart(2,'0')

const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b)
// Fill only missing appointments. A booking already edited/cancelled in Schedule
// is intentional and must never be reset by saving a workout or a Profile default.
export function reconcileTrainingBookings(db, plans, clock = scheduleClock(new Date(),db.settings?.tz)) {
  const bookings=[], issues=[], seen=new Set()
  const staged={...db,sessions:[...db.sessions]}
  for (const plan of plans) {
    const key=plan.clientId+'|'+plan.date
    if (seen.has(key)) continue
    seen.add(key)
    const timing=trainingSchedule(db.clients.find(c=>c.id===plan.clientId))
    if (!timing || programStats(plan).exercises===0 || plan.date < clock.today) continue
    validateTrainingSchedule(timing)
    if (plan.date===clock.today && timing.time<=clock.time) continue
    if (db.workouts.some(w=>w.clientId===plan.clientId && w.date===plan.date)) continue
    if (db.sessions.some(s=>s.clientId===plan.clientId && s.date===plan.date && (trainingBooking(s) || s.status==='Completed'))) continue
    const booking={id:uid(),clientId:plan.clientId,date:plan.date,time:timing.time,dur:timing.duration,type:'Personal training',status:'Confirmed',notes:''}
    const conflicts=bookingConflicts(staged,null,booking,clock)
    if (conflicts.length) issues.push(plan.date+' at '+formatTrainingTime(timing.time)+': '+conflicts.map(i=>i.title+'. '+i.detail).join(' '))
    else {bookings.push(booking);staged.sessions.push(booking)}
  }
  if (issues.length) throw new Error(issues.join('\n')+' Change the Profile time or resolve the conflicting booking in Schedule, then save again. Nothing was changed.')
  db.sessions.push(...bookings)
  return bookings
}
export function prepareTrainingPlanSave(previous, next, syncClientIds = []) {
  const plans=[]
  for (const row of next.prescriptions) {
    const original=previous.prescriptions.find(p=>p.id===row.id)||null
    if (!equal(original,row)) plans.push({original,next:row})
  }
  for(const original of previous.prescriptions) if(!next.prescriptions.some(p=>p.id===original.id)) plans.push({original,next:null})
  const clients=next.clients.filter(c=>!equal(c.intake,previous.clients.find(p=>p.id===c.id)?.intake)).map(c=>({id:c.id,expectedIntake:previous.clients.find(p=>p.id===c.id)?.intake||{},intake:c.intake||{}}))
  const selected=next.prescriptions.filter(p=>syncClientIds.includes(p.clientId) || plans.some(change=>change.next?.id===p.id))
  const bookings=reconcileTrainingBookings(next,selected)
  const ids=[...new Set([...selected.map(p=>p.clientId),...clients.map(c=>c.id)])]
  return {plans,clients,bookings,timings:ids.map(clientId=>({clientId,timing:trainingSchedule(next.clients.find(c=>c.id===clientId))}))}
}
