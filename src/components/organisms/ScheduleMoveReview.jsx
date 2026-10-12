import { useState } from 'react'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import ModalShell from '../molecules/ModalShell'
import Button from '../atoms/Button'
import { bookingConflicts, freeScheduleSlots, scheduleClock, scheduleRequest, sessionEnd } from '../../lib/schedule'
import { fmtDay } from '../../lib/dates'
import { toast } from '../../lib/toast'

export function ScheduleConflicts({ issues, alternatives = [], onChoose }) {
  return <div className="schedule-conflicts" role="alert"><h3>Booking cannot be changed</h3>
    {issues.map((issue, i) => <div key={i}><strong>{issue.title}</strong><p>{issue.detail}</p>{issue.path && <a href={issue.path}>Open existing day →</a>}</div>)}
    <p>Nothing has changed.</p>
    {!!alternatives.length && <div className="schedule-alternatives"><strong>Available options</strong>{alternatives.map(s => <Button key={s.date + s.time} variant="ghost" onClick={() => onChoose(s)}>{fmtDay(s.date)} · {s.time}–{sessionEnd(s)}</Button>)}</div>}
  </div>
}

export default function ScheduleMoveReview({ request: initialRequest, onEdit, onSaved }) {
  const { db, tz, saveSchedule } = useData(), { closeModal, setCloseGuard } = useModal()
  const [request, setRequest] = useState(initialRequest), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const { original, next, plan } = request, clock = scheduleClock(new Date(), tz)
  const issues = bookingConflicts(db, original, next, clock)
  const alternatives = issues.length ? freeScheduleSlots(db, original, next, clock) : []
  const save = async () => {
    setBusy(true); setError(''); const clear = setCloseGuard(() => false)
    try { await saveSchedule(request); clear(); await closeModal(); onSaved?.(next); toast('Schedule updated') }
    catch (e) { setError(e.message) }
    finally { clear(); setBusy(false) }
  }
  return <div className="schedule-dialog"><ModalShell title={issues.length ? 'Resolve booking conflict' : 'Review schedule change'} onClose={closeModal}
    footer={<><Button variant="ghost" disabled={busy} onClick={closeModal}>Cancel</Button><Button variant="ghost" disabled={busy} onClick={() => onEdit(next)}>Choose date & time</Button>{!issues.length && <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Confirm change'}</Button>}</>}>
    <p className="schedule-client-name">{db.clients.find(c => c.id === original.clientId)?.name} · {original.type}</p>
    <div className="schedule-change"><div><small>From</small><strong>{fmtDay(original.date)}</strong><span>{original.time}–{sessionEnd(original)} · {original.dur} min</span></div><span aria-hidden="true">→</span><div><small>To</small><strong>{fmtDay(next.date)}</strong><span>{next.time}–{sessionEnd(next)} · {next.dur} min</span></div></div>
    {plan && <p className="schedule-preserved"><strong>{plan.name || 'Prescribed workout'}</strong> moves with this booking. Exercises, sets, reps, load and RIR stay the same.</p>}
    {!plan && original.dur !== next.dur && <p className="schedule-preserved">Only the appointment duration changes. Exercise prescriptions stay the same.</p>}
    {!!issues.length && <ScheduleConflicts issues={issues} alternatives={alternatives} onChoose={s => { setError(''); setRequest(scheduleRequest(db, original, s)) }} />}
    {error && <p className="schedule-error" role="alert">{error}</p>}
  </ModalShell></div>
}
