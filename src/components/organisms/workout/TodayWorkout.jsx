import { useState } from 'react'
import Button from '../../atoms/Button'
import Tag from '../../atoms/Tag'
import Icon from '../../atoms/Icon'
import ExerciseEditorRow from '../../molecules/ExerciseEditorRow'
import WorkoutPlayer from './WorkoutPlayer'
import WorkoutSummary from './WorkoutSummary'
import { buildFromPlan, buildFromPrescription, blankWorkout, workoutVolume, SOURCE_LABEL } from '../../../lib/workout'
import { programStats } from '../../../lib/program'
import { fmtVL } from '../../../lib/units'

const SRC_COLOR = { plan: 'blue', ai: 'purple', manual: 'gray', prescribed: 'green' }

// Controller for the "Today's Workout" card. Walks through:
//   pick (prescribed session / rest day) → overview → start/edit → completed.
// The app never invents a session: with no prescription the day is a rest day.
// Persistence is owned by the parent via onSave / onComplete / onClear so the
// same component serves both the coach folder and the athlete portal. When the
// coach prescribed a session for today (workout planner), it is offered first.
// athlete=true: coach-prescribed sessions are locked — the athlete can't edit,
// swap or delete them, only record done sets / reps / load. onStart (optional)
// intercepts the Start press so the parent can run a pre-flight (check-in popup).
// onAddSession (optional, coach only) opens the workout builder to prescribe a
// session for this date — the only action offered on an unprescribed day.
export default function TodayWorkout({ client, today, workout, prescription, plans, exercises, units, context = {}, restingHr, age, bodyMassKg, athlete, onStart, onSave, onComplete, onClear, onTemplate, onAddSession, headerExtra, bare }) {
  const [editing, setEditing] = useState(false)
  const [altId, setAltId] = useState(client.planId || (plans[0]?.id ?? ''))

  const ctx = { clientId: client.id, date: today, readiness: context.readiness, acwr: context.acwr }
  const locked = !!athlete && workout?.source === 'prescribed'

  // ---- No workout yet → prescribed session, or a rest day ------------
  if (!workout) {
    const pick = (w) => onSave(w)

    // Rest day. The coach deliberately left this day unprescribed, so we never
    // invent a session here — the planner is the source of truth. The coach can
    // prescribe one straight from this card; the athlete just sees a rest day.
    if (!prescription) {
      return (
        <Shell bare={bare} extra={headerExtra}>
          <div className="tw-rest">
            <span className="tw-rest-ic" aria-hidden="true"><Icon name="coffee" size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tw-rest-h">Rest day</div>
              <div className="muted" style={{ fontSize: 13 }}>Nothing prescribed for today.</div>
            </div>
            {onAddSession && <Button size="sm" onClick={onAddSession}>＋ Add a session</Button>}
          </div>
        </Shell>
      )
    }

    const pStats = programStats(prescription)
    return (
      <Shell bare={bare} extra={headerExtra}>
        <div className="tw-suggest">
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Prescribed for today</div>
          <div style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 2px' }}>Coach's session</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{pStats.exercises} exercises · {pStats.sets} sets{prescription.notes ? ' · ' + prescription.notes : ''}</div>
          <div className="flex gap" style={{ flexWrap: 'wrap' }}>
            <Button onClick={() => pick(buildFromPrescription(prescription, ctx))}>Use this workout</Button>
          </div>
        </div>

        {/* A coach-prescribed session is the athlete's only option — no swapping or hand-building. */}
        {!athlete && (
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
        )}
      </Shell>
    )
  }

  // ---- Editing a suggested session (never reachable when locked) ----
  if (editing && !locked && workout.status !== 'in_progress') {
    return (
      <Shell bare={bare} extra={headerExtra}>
        <WorkoutPlayer workout={workout} units={units} running={false}
          onSave={(w) => { onSave(w); setEditing(false) }} onCancel={() => setEditing(false)} />
      </Shell>
    )
  }

  // ---- Live session -------------------------------------------------
  if (workout.status === 'in_progress') {
    return (
      <Shell bare={bare} extra={headerExtra}>
        <WorkoutPlayer workout={workout} units={units} running locked={locked} restingHr={restingHr} age={age}
          onSave={onSave} onComplete={onComplete} />
      </Shell>
    )
  }

  // ---- Completed → full summary -------------------------------------
  if (workout.status === 'completed') {
    return (
      <Shell bare={bare} extra={headerExtra} action={!locked && <Button variant="ghost" size="sm" onClick={onClear}>New workout →</Button>}>
        <WorkoutSummary workout={workout} units={units} exercises={exercises} restingHr={restingHr} age={age} bodyMassKg={bodyMassKg}
          locked={locked} onEdit={() => setEditing(true)} onDelete={onClear} onTemplate={onTemplate}
          onDuration={(sec) => onSave({ ...workout, durationSec: sec })} />
      </Shell>
    )
  }

  // ---- Overview (suggested, not started) ----------------------------
  const vol = workoutVolume(workout)
  const start = () => (onStart || onSave)({ ...workout, status: 'in_progress', startedAt: new Date().toISOString() })
  return (
    <Shell bare={bare} extra={headerExtra}>
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="flex gap"><Tag color={SRC_COLOR[workout.source]}>{SOURCE_LABEL[workout.source]}</Tag>
            <strong style={{ fontSize: 16 }}>{workout.title}</strong></div>
          {workout.note && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{workout.note}</div>}
        </div>
        <div className="flex gap">
          {!locked && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
          {!locked && <Button variant="ghost" size="sm" onClick={onClear}>Change</Button>}
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

function Shell({ children, action, extra, bare }) {
  // bare: rendered inside the PlannerWidget's persistent card — no own card
  // shell, just a slim context row (label + any state action) above the body.
  if (bare) {
    return (
      <>
        <div className="flex between" style={{ marginBottom: 10 }}>
          <span className="pw-sublabel">TODAY'S WORKOUT</span>
          <div className="flex gap">{extra}{action}</div>
        </div>
        {children}
      </>
    )
  }
  return (
    <div className="card">
      <div className="flex between" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Today's Workout</div>
        <div className="flex gap">{extra}{action}</div>
      </div>
      {children}
    </div>
  )
}

function Mini({ label, value }) {
  return <div className="kpi"><div className="k-l">{label}</div><div className="k-v" style={{ fontSize: 16 }}>{value}</div></div>
}
