import Select from '../../molecules/Select'
import { useState } from 'react'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import ModalShell from '../../molecules/ModalShell'
import { calcSRPETL } from '../../../lib/calc'

// Session-RPE popup, shown when ✓ Complete is pressed. The athlete chooses
// their own rating; the session duration is pre-filled from the
// live timer and editable. Presentational: the owner persists the completed
// workout + sRPE row. Serves both the athlete portal and the coach's client page.
//   onSubmit(rpe, minutes) — save workout + sRPE
//   onSkip(minutes) — save workout without an RPE entry · onClose() — keep running
export default function RPEModal({ busy, workout, attempt, finishError, onSubmit, onSkip, onRetry, onUseSaved, onClose }) {
  const [rpe, setRpe] = useState(attempt?.rpe ?? '')
  const [minutes, setMinutes] = useState(attempt?.minutes ?? (workout.durationSec ? Math.max(1, Math.round(workout.durationSec / 60)) : 30))
  const mins = Math.max(1, Math.round(+minutes || 0) || 1)
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <ModalShell title="How hard was that session?" onClose={onClose}
          footer={<>
            {attempt ? finishError?.conflict
              ? <Button onClick={onUseSaved}>Use saved workout</Button>
              : <Button disabled={busy} onClick={onRetry}>{busy ? 'Saving…' : 'Retry save'}</Button>
              : <><Button variant="ghost" disabled={busy} onClick={() => onSkip(mins)}>Skip</Button>
                <Button disabled={busy || !rpe} onClick={() => onSubmit(Number(rpe), mins)}>{busy ? 'Saving…' : 'Save & finish'}</Button></>}
          </>}>
          <fieldset disabled={!!attempt || busy} style={{ border: 0, minWidth: 0 }}>
          <Field label="Session RPE (Borg CR10)">
            <Select value={rpe} onChange={(e) => setRpe(e.target.value)}>
              <option value="">Choose your rating</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value} / 10</option>)}
            </Select>
          </Field>
          <Field label="Workout duration (minutes)">
            <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          </fieldset>
          {attempt && busy && <p role="status">Saving the workout and updating Progress…</p>}
          {finishError && <p role="alert">{finishError.message}</p>}
          <div className="muted" style={{ fontSize: 12 }}>
            Training load: <strong>{rpe ? `${calcSRPETL(Number(rpe), mins)} AU` : 'Select an RPE to calculate'}</strong>
          </div>
        </ModalShell>
      </div>
    </div>
  )
}
