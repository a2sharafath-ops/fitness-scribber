import { useState } from 'react'
import Button from '../../atoms/Button'
import CompletedWorkoutEditor from './CompletedWorkoutEditor'
import useWorkoutCorrectionRecovery from '../../../hooks/useWorkoutCorrectionRecovery'
import { useData } from '../../../store/DataContext'
import { workoutEffort } from '../../../lib/workoutCorrection'
import { confirmDialog } from '../../../lib/toast'

export default function CoachWorkoutCorrection({ workout, units, onDone, onCancel, onBusy }) {
  const { db, refresh, saveWorkoutCorrection } = useData()
  const { scope, recovery, dismiss } = useWorkoutCorrectionRecovery(workout)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')
  const pending = recovery && recovery.kind !== 'saved' ? recovery : null

  const submit = async (values, retryId) => {
    setSaving(true)
    onBusy?.(true)
    setFailure('')
    try {
      if (retryId) await refresh()
      await saveWorkoutCorrection(scope, values, retryId)
      onDone()
    } catch (error) { setFailure(error.message) }
    finally {
      onBusy?.(false)
      setSaving(false)
    }
  }

  const discard = async () => {
    if (!await confirmDialog({
      title: 'Discard this recovery draft?',
      message: 'The saved workout and its training load stay intact.',
      confirmLabel: 'Discard draft', danger: true,
    })) return
    dismiss()
    setFailure('')
  }

  const savedNotice = recovery?.kind === 'saved' && <p className="workout-correction-notice" role="status">Workout corrections were saved.</p>
  if (!pending) return <>{savedNotice}<CompletedWorkoutEditor workout={workout} units={units}
    sessionEffort={workoutEffort(db, workout)} errorMessage={failure}
    onSave={(updated, expected, effort) => submit({ workout: updated, expected, effort })}
    onCancel={onCancel} /></>

  const { attempt, kind } = pending
  const notice = kind === 'retry'
    ? 'Correction draft recovered. Retry to save these details.'
    : 'The saved workout changed. Your draft is shown below. Discard it to edit the latest saved workout.'
  return <>
    <p className="workout-correction-notice" role="status">{saving ? 'Saving corrections…' : notice}</p>
    <CompletedWorkoutEditor key={attempt.id} workout={attempt.workout} units={units}
      sessionEffort={{ row: attempt.effort?.row, editable: Boolean(attempt.effort) }}
      errorMessage={failure} readOnly
      reviewActions={<>
        <Button variant="ghost" disabled={saving} onClick={onCancel}>Close editor</Button>
        <Button variant="ghost" disabled={saving} onClick={discard}>Discard draft</Button>
        {kind === 'retry' && <Button disabled={saving} onClick={() => submit(attempt, attempt.id)}>Retry save</Button>}
      </>} />
  </>
}
