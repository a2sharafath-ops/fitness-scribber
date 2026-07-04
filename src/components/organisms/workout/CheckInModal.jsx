import { useState } from 'react'
import Button from '../../atoms/Button'
import RangeSlider from '../../atoms/RangeSlider'
import ModalShell from '../../molecules/ModalShell'
import { calcWellness } from '../../../lib/calc'

// Morning check-in (Hooper) popup, shown right after ▶ Start when today's
// check-in is missing. Presentational: the owner persists via onSubmit and
// starts the pending workout. Serves both the athlete portal and the coach's
// client page (coach records on the athlete's behalf during 1-on-1 sessions).
//   onSubmit({ date, sleep, stress, fatigue, soreness, score }) — log + start
//   onSkip() — start without logging · onClose() — cancel the start
export default function CheckInModal({ busy, today, onSubmit, onSkip, onClose }) {
  const [f, setF] = useState({ sleep: 5, stress: 3, fatigue: 3, soreness: 3 })
  const score = calcWellness(f.sleep, f.stress, f.fatigue, f.soreness)
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true">
        <ModalShell title="Morning check-in (Hooper)" onClose={onClose}
          footer={<>
            <Button variant="ghost" disabled={busy} onClick={onSkip}>Skip — start anyway</Button>
            <Button disabled={busy} onClick={() => onSubmit({ date: today, ...f, score })}>{busy ? 'Saving…' : 'Submit & start workout'}</Button>
          </>}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Quick check-in before the session starts — it feeds readiness and helps match training to how the athlete feels.</p>
          <RangeSlider label="Sleep Quality" value={f.sleep} min={1} max={7} lo="Terrible" hi="Excellent" onChange={(v) => setF({ ...f, sleep: v })} />
          <RangeSlider label="Stress" value={f.stress} min={1} max={7} lo="None" hi="Extreme" onChange={(v) => setF({ ...f, stress: v })} />
          <RangeSlider label="Fatigue" value={f.fatigue} min={1} max={7} lo="Fresh" hi="Exhausted" onChange={(v) => setF({ ...f, fatigue: v })} />
          <RangeSlider label="Muscle Soreness" value={f.soreness} min={1} max={7} lo="None" hi="Severe" onChange={(v) => setF({ ...f, soreness: v })} />
          <div className="muted" style={{ fontSize: 12 }}>Wellness score: <strong>{score}/28</strong></div>
        </ModalShell>
      </div>
    </div>
  )
}
