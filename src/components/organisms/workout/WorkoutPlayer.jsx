import { useEffect, useRef, useState } from 'react'
import Button from '../../atoms/Button'
import ExerciseEditorRow from '../../molecules/ExerciseEditorRow'
import SetLogRow from '../../molecules/SetLogRow'
import HeartRateTile from '../../molecules/HeartRateTile'
import { newExercise, secToClock, workoutVolume, runBlocks, ensureSetRows } from '../../../lib/workout'
import { fmtVL } from '../../../lib/units'

// The live/edit surface for a Today's Workout.
//   running=false → edit mode (adjust before starting; "Save" / "Cancel")
//   running=true  → live mode: a block-by-block stepper (warm-up → main lifts →
//                   …) where every set is logged with load, reps and RIR/RPE,
//                   plus a per-exercise note. Used by both the coach's in-app
//                   runner and the athlete portal (locked only affects editing).
export default function WorkoutPlayer({ workout, units, restingHr, age, running, locked, onSave, onComplete, onCancel }) {
  const [w, setW] = useState(workout)
  const [now, setNow] = useState(Date.now())
  const [step, setStep] = useState(0)
  const [showWarm, setShowWarm] = useState(true)
  const [showCool, setShowCool] = useState(false)
  const hr = useRef({ sum: 0, n: 0, max: 0 })

  // Reset local state when a different session loads. Live sessions are
  // normalised so every exercise has per-set logging rows (older sessions and
  // plan/manual builds get rows synthesised from their set count).
  useEffect(() => {
    if (!running) { setW(workout); return }
    const withRows = (arr) => (arr || []).map((it) => ({ ...it, note: it.note || '', setRows: ensureSetRows(it) }))
    setW({ ...workout, warmup: withRows(workout.warmup), main: withRows(workout.main), cooldown: withRows(workout.cooldown) })
    setStep(0)
    // Re-normalise only when the session identity or run state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id, running])

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [running])

  const elapsed = running && w.startedAt ? Math.max(0, Math.floor((now - new Date(w.startedAt).getTime()) / 1000)) : 0
  const onSample = (bpm) => { const h = hr.current; h.sum += bpm; h.n += 1; h.max = Math.max(h.max, bpm) }

  const complete = () => {
    const h = hr.current
    onComplete({ ...w, status: 'completed', endedAt: new Date().toISOString(), durationSec: elapsed, hrAvg: h.n ? Math.round(h.sum / h.n) : null, hrMax: h.max || null })
  }

  // ---- Live: block-by-block stepper ----------------------------------------
  if (running) {
    const blocks = runBlocks(w)
    const cur = blocks[Math.min(step, blocks.length - 1)] || null
    const last = step >= blocks.length - 1

    // Patch one set row of one exercise in whichever section it lives in.
    const patchRow = (section, itemId, rowIndex, patch) => setW((x) => ({
      ...x,
      [section]: x[section].map((it) => (it.id !== itemId ? it
        : { ...it, setRows: it.setRows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)) })),
    }))
    const setNote = (section, itemId, note) => setW((x) => ({
      ...x, [section]: x[section].map((it) => (it.id === itemId ? { ...it, note } : it)),
    }))
    // Tick every set in the block done in one tap.
    const markBlockDone = () => setW((x) => ({
      ...x,
      [cur.section]: x[cur.section].map((it) => (!cur.items.some((ci) => ci.id === it.id) ? it
        : { ...it, setRows: it.setRows.map((r) => ({ ...r, done: true, load: r.load ?? r.pLoadKg ?? null, reps: r.reps ?? (r.pReps != null && !Number.isNaN(+r.pReps) ? +r.pReps : null), effort: r.effort ?? r.pIntensityValue ?? null })) })),
    }))

    const doneSets = cur ? cur.items.reduce((t, it) => t + it.setRows.filter((r) => r.done).length, 0) : 0
    const totalSets = cur ? cur.items.reduce((t, it) => t + it.setRows.length, 0) : 0

    return (
      <div className="wp-run">
        <div className="wp-head">
          <div>
            <div className="wp-title">{w.title}</div>
            <div className="muted" style={{ fontSize: 12 }}>Block {step + 1} of {blocks.length} · est. volume {fmtVL(workoutVolume(w), units)}</div>
          </div>
          <div className="wp-timer" role="timer" aria-label="Elapsed time">⏱ {secToClock(elapsed)}</div>
        </div>

        <div style={{ margin: '10px 0' }}>
          <HeartRateTile active restingHr={restingHr} age={age} onSample={onSample} />
        </div>

        {/* Progress across blocks */}
        <div className="wp-steps" role="tablist" aria-label="Session blocks">
          {blocks.map((b, i) => (
            <button key={b.key} className={'wp-step' + (i === step ? ' cur' : '') + (i < step ? ' past' : '')}
              onClick={() => setStep(i)} role="tab" aria-selected={i === step}>{b.title}</button>
          ))}
        </div>

        {cur && (
          <div className="wp-block">
            <div className="wp-block-head">
              <div className="wp-block-title">{cur.title}</div>
              <div className="wp-block-sub">{doneSets}/{totalSets} sets logged</div>
            </div>
            {cur.items.map((it) => (
              <div className="wp-ex" key={it.id}>
                <div className="wp-ex-name">{it.name}</div>
                <div className="slog-head">
                  <span /><span>Target</span><span>Load</span><span>Reps</span><span>{it.setRows[0]?.effortType === 'RPE' ? 'RPE' : 'RIR'}</span><span>✓</span>
                </div>
                {it.setRows.map((r, i) => (
                  <SetLogRow key={i} row={r} units={units} onChange={(patch) => patchRow(cur.section, it.id, i, patch)} />
                ))}
                <label className="wp-ex-note">
                  <span>Note / reflection</span>
                  <textarea rows={1} value={it.note || ''} placeholder="How did it feel? form cues, pain, adjustments…"
                    onChange={(e) => setNote(cur.section, it.id, e.target.value)} />
                </label>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={markBlockDone}>✓ Mark all sets in this block done</Button>
          </div>
        )}

        <div className="modal-foot wp-nav">
          <Button variant="ghost" onClick={() => onSave(w)}>Save &amp; exit</Button>
          <div className="flex gap">
            {step > 0 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>← Back</Button>}
            {last
              ? <Button onClick={complete}>✓ Complete session</Button>
              : <Button onClick={() => setStep((s) => s + 1)}>Next block →</Button>}
          </div>
        </div>
      </div>
    )
  }

  // ---- Edit mode (pre-start structure editing) -----------------------------
  const setItem = (key, id, p) => setW((x) => ({ ...x, [key]: x[key].map((m) => (m.id === id ? { ...m, ...p } : m)) }))
  const addEx = (key) => setW((x) => ({ ...x, [key]: [...x[key], newExercise()] }))
  const removeEx = (key, id) => setW((x) => ({ ...x, [key]: x[key].filter((m) => m.id !== id) }))
  const vol = workoutVolume(w)

  return (
    <div>
      <div className="wp-head">
        <div>
          <div className="wp-title">{w.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>{w.main.length} exercises · est. volume {fmtVL(vol, units)}</div>
        </div>
        <span className="tag gray">Edit mode</span>
      </div>

      <Section title={`Warm-up (${w.warmup.length})`} open={showWarm} onToggle={() => setShowWarm((v) => !v)}>
        {w.warmup.map((ex) => (
          <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode="edit"
            onChange={(p) => setItem('warmup', ex.id, p)} onRemove={() => removeEx('warmup', ex.id)} />
        ))}
        {!locked && <Button variant="ghost" size="sm" style={{ marginTop: 6 }} onClick={() => addEx('warmup')}>＋ Add warm-up</Button>}
      </Section>

      <div className="wp-section-title">
        <span>Main set</span>
        {!locked && <Button variant="ghost" size="sm" onClick={() => addEx('main')}>＋ Add exercise</Button>}
      </div>
      {w.main.length ? w.main.map((ex) => (
        <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode="edit"
          onChange={(p) => setItem('main', ex.id, p)} onRemove={() => removeEx('main', ex.id)} />
      )) : <div className="muted" style={{ padding: '8px 0' }}>No exercises yet{locked ? '.' : ' — add one.'}</div>}

      <Section title={`Cool-down (${w.cooldown.length})`} open={showCool} onToggle={() => setShowCool((v) => !v)}>
        {w.cooldown.map((ex) => (
          <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode="edit"
            onChange={(p) => setItem('cooldown', ex.id, p)} onRemove={() => removeEx('cooldown', ex.id)} />
        ))}
        {!locked && <Button variant="ghost" size="sm" style={{ marginTop: 6 }} onClick={() => addEx('cooldown')}>＋ Add cool-down</Button>}
      </Section>

      <div className="modal-foot" style={{ gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(w)}>Save changes</Button>
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
