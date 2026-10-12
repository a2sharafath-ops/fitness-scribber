import { useState } from 'react'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import ModalShell from '../../molecules/ModalShell'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { trainingSchedule, validateTrainingSchedule, formatTrainingTime, timeFrom12Hour } from '../../../lib/trainingSchedule'

export default function TrainingScheduleForm({ client }) {
  const { saveTrainingPlans, tz } = useData(), { closeModal } = useModal()
  const current = trainingSchedule(client)
  const [enabled, setEnabled] = useState(!!current), [time, setTime] = useState(current?.time || '10:00')
  const [duration, setDuration] = useState(current?.duration ?? 60), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const save = async () => {
    setError(''); setBusy(true)
    try {
      const timing = enabled ? { time, duration: Number(duration) } : null
      validateTrainingSchedule(timing)
      const result = await saveTrainingPlans(d => {
        const row = d.clients.find(c => c.id === client.id)
        if (!row) throw new Error('Client no longer available.')
        row.intake ||= {}; row.intake.trainingSchedule = timing
      }, [client.id])
      if (!result.saved) throw new Error('Could not save the training time. Try again before assigning a program.')
      closeModal()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <ModalShell title="Usual training time" onClose={busy ? undefined : closeModal} footer={<><Button variant="ghost" disabled={busy} onClick={closeModal}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save training time'}</Button></>}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={busy} />Use this time for training plans</label>
    {enabled && <div className="row2"><div><label>Start time (12-hour)</label><div style={{display:'flex',gap:8}}><select aria-label="Hour" value={Number(time.slice(0,2))%12 || 12} onChange={e=>setTime(timeFrom12Hour(e.target.value,time.slice(3),Number(time.slice(0,2))<12?'AM':'PM'))} disabled={busy}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select><select aria-label="Minute" value={time.slice(3)} onChange={e=>setTime(timeFrom12Hour(Number(time.slice(0,2))%12 || 12,e.target.value,Number(time.slice(0,2))<12?'AM':'PM'))} disabled={busy}>{Array.from({length:60},(_,i)=><option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}</option>)}</select><select aria-label="AM or PM" value={Number(time.slice(0,2))<12?'AM':'PM'} onChange={e=>setTime(timeFrom12Hour(Number(time.slice(0,2))%12 || 12,time.slice(3),e.target.value))} disabled={busy}><option>AM</option><option>PM</option></select></div></div><Field label="Duration (minutes)"><input type="number" min="15" max="480" value={duration} onChange={e => setDuration(e.target.value)} disabled={busy} /></Field></div>}
    <p className="muted">{enabled ? formatTrainingTime(time) + ' · ' : ''}{tz || 'UTC'}. Applies to future planned workouts, including existing programs. Bookings already set in Schedule keep their times.</p>
    {error && <div role="alert" className="error" style={{whiteSpace:"pre-line"}}>{error}<p><a href="/schedule" target="_blank" rel="noreferrer">Review Schedule →</a></p></div>}
  </ModalShell>
}
