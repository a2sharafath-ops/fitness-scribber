import { useState } from 'react'
import Button from '../../atoms/Button'
import RangeSlider from '../../atoms/RangeSlider'
import Field from '../../atoms/Field'
import ModalShell from '../../molecules/ModalShell'
import { calcSRPETL } from '../../../lib/calc'

// Session-RPE popup, shown when ✓ Complete is pressed. Shows RPE (pre-suggested
// from peak HR when available) plus the session duration, pre-filled from the
// live timer and editable. Presentational: the owner persists the completed
// workout + sRPE row. Serves both the athlete portal and the coach's client page.
//   onSubmit(rpe, minutes) — save workout + sRPE
//   onSkip(minutes) — save workout without an RPE entry · onClose() — keep running
export default function RPEModal({ busy, workout, age, onSubmit, onSkip, onClose }) {
  const maxHr = 220 - (age || 30)
  const suggested = workout.hrMax ? Math.max(1, Math.min(10, Math.round((workout.hrMax / maxHr) * 10))) : 6
  const [rpe, setRpe] = useState(suggested)
  const [minutes, setMinutes] = useState(workout.durationSec ? Math.max(1, Math.round(workout.durationSec / 60)) : 30)
  const mins = Math.max(1, Math.round(+minutes || 0) || 1)
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true">
        <ModalShell title="How hard was that session?" onClose={onClose}
          footer={<>
            <Button variant="ghost" disabled={busy} onClick={() => onSkip(mins)}>Skip</Button>
            <Button disabled={busy} onClick={() => onSubmit(rpe, mins)}>{busy ? 'Saving…' : 'Save & finish'}</Button>
          </>}>
          <RangeSlider label="Session RPE (Borg CR10)" value={rpe} min={1} max={10} lo="Rest" hi="Max effort" onChange={setRpe} />
          <Field label="Workout duration (minutes)">
            <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          <div className="muted" style={{ fontSize: 12 }}>
            Training load: <strong>{calcSRPETL(rpe, mins)} AU</strong>
            {workout.hrMax ? <span> · suggested {suggested}/10 from peak HR</span> : null}
          </div>
        </ModalShell>
      </div>
    </div>
  )
}
