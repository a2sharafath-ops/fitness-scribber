import { useEffect, useRef, useState } from 'react'
import Button from '../../atoms/Button'
import ExerciseEditorRow from '../../molecules/ExerciseEditorRow'
import HeartRateTile from '../../molecules/HeartRateTile'
import { newExercise, secToClock, workoutVolume } from '../../../lib/workout'
import { fmtVL } from '../../../lib/units'

// The live/edit surface for a Today's Workout.
//   running=false → edit mode (adjust before starting; "Save" / "Cancel")
//   running=true  → live mode (timer + HR + done toggles; "Complete")
export default function WorkoutPlayer({ workout, units, restingHr, age, running, onSave, onComplete, onCancel }) {
  const [w, setW] = useState(workout)
  const [now, setNow] = useState(Date.now())
  const [showWarm, setShowWarm] = useState(true)
  const [showCool, setShowCool] = useState(false)
  const hr = useRef({ sum: 0, n: 0, max: 0 })

  // Reset local state only when a different session loads (not on every prop tick).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setW(workout) }, [workout.id])

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [running])

  const elapsed = running && w.startedAt ? Math.max(0, Math.floor((now - new Date(w.startedAt).getTime()) / 1000)) : 0
  const setItem = (key, id, p) => setW((x) => ({ ...x, [key]: x[key].map((m) => (m.id === id ? { ...m, ...p } : m)) }))
  const addEx = (key) => setW((x) => ({ ...x, [key]: [...x[key], newExercise()] }))
  const removeEx = (key, id) => setW((x) => ({ ...x, [key]: x[key].filter((m) => m.id !== id) }))
  const doneCount = (key) => w[key].filter((m) => m.done).length

  const onSample = (bpm) => { const h = hr.current; h.sum += bpm; h.n += 1; h.max = Math.max(h.max, bpm) }

  const done = w.main.filter((m) => m.done).length
  const vol = workoutVolume(w)

  const complete = () => {
    const h = hr.current
    onComplete({
      ...w,
      status: 'completed',
      endedAt: new Date().toISOString(),
      durationSec: elapsed,
      hrAvg: h.n ? Math.round(h.sum / h.n) : null,
      hrMax: h.max || null,
    })
  }

  return (
    <div>
      <div className="wp-head">
        <div>
          <div className="wp-title">{w.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>{w.main.length} exercises · est. volume {fmtVL(vol, units)}</div>
        </div>
        {running ? (
          <div className="wp-timer" role="timer" aria-label="Elapsed time">⏱ {secToClock(elapsed)}</div>
        ) : (
          <span className="tag gray">Edit mode</span>
        )}
      </div>

      {running && (
        <div style={{ margin: '12px 0' }}>
          <HeartRateTile active restingHr={restingHr} age={age} onSample={onSample} />
        </div>
      )}

      <Section title={`Warm-up (${running ? doneCount('warmup') + '/' : ''}${w.warmup.length})`} open={showWarm} onToggle={() => setShowWarm((v) => !v)}>
        {w.warmup.map((ex) => (
          <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode={running ? 'run' : 'edit'}
            onChange={(p) => setItem('warmup', ex.id, p)} onRemove={() => removeEx('warmup', ex.id)} />
        ))}
        <Button variant="ghost" size="sm" style={{ marginTop: 6 }} onClick={() => addEx('warmup')}>＋ Add warm-up</Button>
      </Section>

      <div className="wp-section-title">
        <span>Main set {running && <span className="muted" style={{ fontWeight: 400 }}>· {done}/{w.main.length} done</span>}</span>
        <Button variant="ghost" size="sm" onClick={() => addEx('main')}>＋ Add exercise</Button>
      </div>
      {w.main.length ? w.main.map((ex) => (
        <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode={running ? 'run' : 'edit'}
          onChange={(p) => setItem('main', ex.id, p)} onRemove={() => removeEx('main', ex.id)} />
      )) : <div className="muted" style={{ padding: '8px 0' }}>No exercises yet — add one.</div>}

      <Section title={`Cool-down (${running ? doneCount('cooldown') + '/' : ''}${w.cooldown.length})`} open={showCool} onToggle={() => setShowCool((v) => !v)}>
        {w.cooldown.map((ex) => (
          <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode={running ? 'run' : 'edit'}
            onChange={(p) => setItem('cooldown', ex.id, p)} onRemove={() => removeEx('cooldown', ex.id)} />
        ))}
        <Button variant="ghost" size="sm" style={{ marginTop: 6 }} onClick={() => addEx('cooldown')}>＋ Add cool-down</Button>
      </Section>

      <div className="modal-foot" style={{ gap: 8 }}>
        {running ? (
          <>
            <Button variant="ghost" onClick={() => onSave(w)}>Save progress</Button>
            <Button onClick={complete}>✓ Complete workout</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(w)}>Save changes</Button>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="wp-collapse">
      <button className="wp-collapse-h" onClick={onToggle} aria-expanded={open}>
        <span>{open ? '▾' : '▸'} {title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}
