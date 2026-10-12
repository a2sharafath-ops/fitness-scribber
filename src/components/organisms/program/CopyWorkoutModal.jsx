import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { todayISO, addDays, fmtDate } from '../../../lib/dates'
import { buildClip, clipClashes, pasteClip, isPlanTargetBlocked } from '../../../lib/planner'
import { confirmedPlanWrite } from '../../../lib/confirmedPersistence'
import { toast, confirmDialog } from '../../../lib/toast'

export default function CopyWorkoutModal({ client, date, onCopied }) {
  const { db, saveTrainingPlans, tz } = useData()
  const { closeModal } = useModal()
  const today = todayISO(tz)
  const [target, setTarget] = useState(addDays(date >= today ? date : today, 1))
  const [error, setError] = useState('')
  const copy = async (event) => {
    event.preventDefault()
    const targetDate = new FormData(event.currentTarget).get('target')
    if (!targetDate || isPlanTargetBlocked(db, client.id, targetDate, today)) { setError('Choose today or a future date without an existing workout or completed appointment.'); return }
    const clip = buildClip(db, client, [date])
    if (!clip) { setError('There is no prescribed workout to copy.'); return }
    if (clipClashes(db, clip, client.id, targetDate).length && !await confirmDialog({ title: 'Replace target plan?', message: `${fmtDate(targetDate)} already has a plan. Replace it?`, confirmLabel: 'Replace' })) return
    try { await confirmedPlanWrite(saveTrainingPlans, (data) => pasteClip(data, clip, client.id, targetDate)) }
    catch (error) { setError(error.message); return }
    closeModal(); onCopied?.(targetDate); toast('Workout plan copied.')
  }
  return <ModalShell title="Copy planned workout" onClose={closeModal}>
    <form onSubmit={copy}><p className="muted training-copy-note">Copy the prescription from {fmtDate(date)}. Completed logs stay on their original date.</p>
      <Field label="Target date"><input name="target" type="date" min={today} required value={target} onChange={(event) => { setTarget(event.target.value); setError('') }} /></Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-foot"><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button type="submit">Copy workout</Button></div>
    </form>
  </ModalShell>
}
