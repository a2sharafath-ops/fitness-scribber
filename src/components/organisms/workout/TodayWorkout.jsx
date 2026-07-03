import { useState } from 'react'
import Button from '../../atoms/Button'
import Tag from '../../atoms/Tag'
import ExerciseEditorRow from '../../molecules/ExerciseEditorRow'
import WorkoutPlayer from './WorkoutPlayer'
import WorkoutSummary from './WorkoutSummary'
import { buildFromPlan, adaptFromPlan, blankWorkout, workoutVolume, SOURCE_LABEL } from '../../../lib/workout'
import { fmtVL } from '../../../lib/units'

const SRC_COLOR = { plan: 'blue', ai: 'purple', manual: 'gray' }

// Controller for the "Today's Workout" card. Walks through:
//   pick (suggested / alternate plan / adaptive / manual) → overview → start/edit → completed.
// Persistence is owned by the parent via onSave / onComplete / onClear so the
// same component serves both the coach folder and the athlete portal.
export default function TodayWorkout({ client, today, workout, plans, exercises, units, context = {}, restingHr, age, bodyMassKg, onSave, onComplete, onClear, onTemplate }) {
  const [editing, setEditing] = useState(false)
  const [altId, setAltId] = useState(client.planId || (plans[0]?.id ?? ''))

  const defaultPlan = client.planId ? plans.find((p) => p.id === client.planId) : null
  const ctx = { clientId: client.id, date: today, readiness: context.readiness, acwr: context.acwr }

  // ---- No workout yet → picker --------------------------------------
  if (!workout) {
    const suggested = defaultPlan || plans[0] || null
    const pick = (w) => onSave(w)
    return (
      <Shell>
        {suggested ? (
          <div className="tw-suggest">
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Suggested for today</div>
            <div style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 2px' }}>{suggested.name}</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{suggested.desc} · {suggested.items?.length || 0} exercises</div>
            <div className="flex gap" style={{ flexWrap: 'wrap' }}>
              <Button onClick={() => pick(buildFromPlan(suggested, exercises, ctx))}>Use this workout</Button>
              <Button variant="ghost" onClick={() => pick(adaptFromPlan(suggested, exercises, ctx))}>✨ Adaptive (auto)</Button>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>No plan assigned yet — build one for today.</div>
        )}

        <div className="tw-alt">
          {plans.length > 0 && (
            <div className="flex gap" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>Choose another plan
                <select value={altId} onChange={(e) => setAltId(e.target.value)} style={{ display: 'block', marginTop: 4 }}>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <Button variant="ghost" size="sm" disabled={!altId} onClick={() => pick(buildFromPlan(plans.find((p) => p.id === altId), exercises, ctx))}>Use selected</Button>
            </div>
          )}
          <Button variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => pick(blankWorkout(ctx))}>＋ Build manually</Button>
        </div>
      </Shell>
    )
  }

  // ---- Editing a suggested session ----------------------------------
  if (editing && workout.status !== 'in_progress') {
    return (
      <Shell>
        <WorkoutPlayer workout={workout} units={units} running={false}
          onSave={(w) => { onSave(w); setEditing(false) }} onCancel={() => setEditing(false)} />
      </Shell>
    )
  }

  // ---- Live session -------------------------------------------------
  if (workout.status === 'in_progress') {
    return (
      <Shell>
        <WorkoutPlayer workout={workout} units={units} running restingHr={restingHr} age={age}
          onSave={onSave} onComplete={onComplete} />
      </Shell>
    )
  }

  // ---- Completed → full summary -------------------------------------
  if (workout.status === 'completed') {
    return (
      <Shell action={<Button variant="ghost" size="sm" onClick={onClear}>New workout →</Button>}>
        <WorkoutSummary workout={workout} units={units} exercises={exercises} restingHr={restingHr} age={age} bodyMassKg={bodyMassKg}
          onEdit={() => setEditing(true)} onDelete={onClear} onTemplate={onTemplate} />
      </Shell>
    )
  }

  // ---- Overview (suggested, not started) ----------------------------
  const vol = workoutVolume(workout)
  const start = () => onSave({ ...workout, status: 'in_progress', startedAt: new Date().toISOString() })
  return (
    <Shell>
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="flex gap"><Tag color={SRC_COLOR[workout.source]}>{SOURCE_LABEL[workout.source]}</Tag>
            <strong style={{ fontSize: 16 }}>{workout.title}</strong></div>
          {workout.note && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{workout.note}</div>}
        </div>
        <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={onClear}>Change</Button>
          <Button size="sm" onClick={start}>▶ Start</Button>
        </div>
      </div>
      <div className="kpi-strip" style={{ marginTop: 12 }}>
        <Mini label="Warm-up" value={workout.warmup.length + ' items'} />
        <Mini label="Exercises" value={workout.main.length} />
        <Mini label="Est. volume" value={fmtVL(vol, units)} />
        <Mini label="Cool-down" value={workout.cooldown.length + ' items'} />
      </div>
      <div style={{ marginTop: 10 }}>
        {workout.main.map((ex) => <ExerciseEditorRow key={ex.id} ex={ex} units={units} mode="view" />)}
      </div>
    </Shell>
  )
}

function Shell({ children, action }) {
  return (
    <div className="card">
      <div className="flex between" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Today's Workout</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Mini({ label, value }) {
  return <div className="kpi"><div className="k-l">{label}</div><div className="k-v" style={{ fontSize: 16 }}>{value}</div></div>
}
