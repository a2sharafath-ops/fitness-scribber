import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { toast, confirmDialog } from '../../../lib/toast'
import { bookingConflicts, clockTime, freeScheduleSlots, minute, scheduleClock, scheduleLock, scheduleRequest } from '../../../lib/schedule'
import ScheduleMoveReview, { ScheduleConflicts } from '../ScheduleMoveReview'
import '../../../pages/SchedulePage.css'

const TYPES = ['1-on-1 Training', 'Assessment', 'Consultation', 'Group Session', 'Check-in']
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Missed']

export default function SessionForm({ session, date, time, clientId, proposed, onSaved }) {
  const { db, saveSchedule, tz } = useData(), { closeModal, setCloseGuard } = useModal()
  const [f, setF] = useState(() => {
    if (proposed || session) return proposed || session
    const now = scheduleClock(new Date(), tz), bookingDate = date || todayISO(tz)
    const defaultTime = bookingDate === now.today ? clockTime(Math.min(1425, Math.ceil((minute(now.time) + 1) / 15) * 15)) : '09:00'
    const bookingTime = time || defaultTime
    return { id: uid(), clientId: clientId || db.clients[0]?.id, date: bookingDate, time: bookingTime, type: '1-on-1 Training', dur: Math.min(60, 1440 - minute(bookingTime)), status: 'Pending' }
  })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempted, setAttempted] = useState(false), [review, setReview] = useState(null)
  const clock = scheduleClock(new Date(), tz), lock = session ? scheduleLock(db, session, clock) : ''
  const issues = attempted ? bookingConflicts(db, session, f, clock) : []
  const set = (k, num) => e => { setError(''); setF({ ...f, [k]: num ? +e.target.value : e.target.value }) }
  const persist = async next => {
    setBusy(true); setError(''); const clear = setCloseGuard(() => false)
    try { await saveSchedule(scheduleRequest(db, session, next)); clear(); await closeModal(); onSaved?.(next); toast(next ? session ? 'Session updated' : 'Session booked' : 'Booking deleted; workout preserved') }
    catch (e) { setError(e.message) }
    finally { clear(); setBusy(false) }
  }
  const save = () => {
    setAttempted(true)
    if (bookingConflicts(db, session, f, clock).length) return
    if (session && ['date', 'time', 'dur'].some(k => session[k] !== f[k])) setReview(scheduleRequest(db, session, f))
    else persist(f)
  }
  const del = async () => {
    if (await confirmDialog({ title: 'Delete booking', message: 'Remove this calendar booking? The prescribed workout will stay in Training.', confirmLabel: 'Delete booking', danger: true })) await persist(null)
  }
  if (review) return <ScheduleMoveReview request={review} onSaved={onSaved} onEdit={next => { setF(next); setReview(null) }} />
  return <div className="schedule-dialog"><ModalShell title={session ? 'Booking details' : 'Book session'} onClose={closeModal}
    footer={<>{session && !lock && <Button variant="danger" disabled={busy} onClick={del}>Delete booking</Button>}<Button variant="ghost" disabled={busy} onClick={closeModal}>Cancel</Button><Button disabled={busy || !db.clients.length} onClick={save}>{busy ? 'Saving…' : session && ['date', 'time', 'dur'].some(k => session[k] !== f[k]) ? 'Review change' : 'Save booking'}</Button></>}>
    <Field label="Client"><select disabled={!!session || busy} value={f.clientId || ''} onChange={set('clientId')}><option value="" disabled>Choose a client</option>{db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    {lock && <p className="schedule-preserved">{lock}</p>}
    <div className="row2"><Field label="Date"><input disabled={!!lock || busy} type="date" value={f.date} onChange={set('date')} /></Field><Field label="Time"><input disabled={!!lock || busy} type="time" value={f.time} onChange={set('time')} /></Field></div>
    <div className="row3"><Field label="Type"><select disabled={!!lock || busy} value={f.type} onChange={set('type')}>{[...new Set([...TYPES, f.type])].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Duration (min)"><input disabled={!!lock || busy} type="number" min="15" max="480" step="15" value={f.dur} onChange={set('dur', true)} /></Field><Field label="Status"><select disabled={busy} value={f.status} onChange={set('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field></div>
    {!!issues.length && <ScheduleConflicts issues={issues} alternatives={freeScheduleSlots(db, session, f, clock)} onChoose={setF} />}
    {error && <p className="schedule-error" role="alert">{error}</p>}
  </ModalShell></div>
}
