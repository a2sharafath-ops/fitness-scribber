import { Doughnut, Bar } from 'react-chartjs-2'
import Button from '../../atoms/Button'
import Tag from '../../atoms/Tag'
import { baseOptions, COLORS } from '../../../lib/chartSetup'
import { fmtDate } from '../../../lib/dates'
import { toDisp, unitName, fmtVL } from '../../../lib/units'
import { summarize, workoutToPlan, secToClock } from '../../../lib/workout'
import { toast, confirmDialog, promptDialog } from '../../../lib/toast'

const MUSCLE_COLORS = [COLORS.blue, COLORS.purple, COLORS.amber, COLORS.green, COLORS.red, '#5ac8fa', '#f59ec4']

// Post-completion summary: session vitals, muscular/cardio breakdown, per-muscle
// strain, the completed exercise list, and Edit / Share / Delete / Save-as-template.
// locked = coach-prescribed session viewed by the athlete: no Edit / Delete —
// only the duration stays adjustable (via onDuration).
export default function WorkoutSummary({ workout, units, exercises = [], restingHr, age, bodyMassKg, locked, onEdit, onDelete, onTemplate, onDuration }) {
  const s = summarize(workout, { exercises, restingHr, age, bodyMassKg })
  const main = workout.main || []

  const editDuration = async () => {
    const cur = Math.max(1, Math.round((workout.durationSec || 0) / 60)) || 30
    const v = await promptDialog({ title: 'Edit duration', message: 'Workout duration (minutes):', defaultValue: String(cur), confirmLabel: 'Save' })
    if (v == null) return
    const min = Math.max(1, Math.round(+v))
    if (!isNaN(min)) { onDuration?.(min * 60); toast('Duration updated') }
  }

  const kpis = [
    ['Strain', s.strain || '—', '/21 · est'],
    ['Duration', s.durationSec ? secToClock(s.durationSec) : '—', 'start → finish'],
    ['Energy', s.energy ? s.energy + ' kcal' : '—', 'est'],
    ['Avg HR', s.avg ? s.avg + ' bpm' : '—', 'session'],
    ['Peak HR', s.peak ? s.peak + ' bpm' : '—', `${s.maxHr} max`],
    ['HR recovery', s.hrr != null ? s.hrr + ' bpm' : '—', '1-min · est'],
    ['Weight moved', fmtVL(s.volume, units), 'total tonnage'],
    ['Reps', s.reps || '—', `${s.sets} sets`],
    ['Cardio load', s.trimp || '—', 'TRIMP · est'],
    ['Perceived effort', s.rpe ? s.rpe + '/10' : '—', 'from peak HR'],
  ]

  const shareText = () => [
    `${workout.title} — ${fmtDate(workout.date)}`,
    `Duration ${secToClock(s.durationSec)} · Strain ${s.strain} · ${s.energy} kcal`,
    `Avg HR ${s.avg ?? '—'} · Peak ${s.peak ?? '—'} · Effort ${s.rpe ?? '—'}/10`,
    `Weight moved ${fmtVL(s.volume, units)} · ${s.reps} reps`,
    '',
    ...main.map((m) => `• ${m.name}: ${m.sets}×${m.duration || m.reps}${m.weight != null ? ` @ ${toDisp(m.weight, units)} ${unitName(units)}` : ''} · rest ${secToClock(m.rest)}`),
  ].join('\n')

  const share = async () => {
    const text = shareText()
    try { if (navigator.share) { await navigator.share({ title: workout.title, text }); return } } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(text); toast('Summary copied to clipboard.') } catch { toast('Could not copy to clipboard.', 'error') }
  }
  const del = async () => { if (await confirmDialog({ title: 'Delete workout', message: 'Delete this workout? This cannot be undone.', confirmLabel: 'Delete', danger: true })) onDelete() }
  const template = async () => {
    const name = await promptDialog({ title: 'Save as template', message: 'Name this plan template:', defaultValue: workout.title.replace(' · auto', ''), confirmLabel: 'Save' })
    if (name == null) return
    onTemplate(workoutToPlan(workout, name))
    toast('Saved to your plan library.')
  }

  return (
    <div>
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="flex gap"><Tag color="green">✓ Completed</Tag>
          <div><strong style={{ fontSize: 16 }}>{workout.title}</strong>
            <div className="muted" style={{ fontSize: 12 }}>{fmtDate(workout.date)} · {s.doneMain}/{s.totalMain} exercises ticked</div></div>
        </div>
        <div className="flex gap" style={{ flexWrap: 'wrap' }}>
          {!locked && <Button variant="ghost" size="sm" onClick={onEdit}>✎ Edit</Button>}
          {onDuration && <Button variant="ghost" size="sm" onClick={editDuration}>⏱ Edit duration</Button>}
          <Button variant="ghost" size="sm" onClick={share}>↗ Share</Button>
          {!locked && onTemplate && <Button variant="ghost" size="sm" onClick={template}>＋ Save as template</Button>}
          {!locked && <Button variant="danger" size="sm" onClick={del}>🗑 Delete</Button>}
        </div>
      </div>

      <div className="kpi-strip" style={{ marginTop: 14 }}>
        {kpis.map(([l, v, d]) => (
          <div className="kpi" key={l}><div className="k-l">{l}</div><div className="k-v" style={{ fontSize: 18 }}>{v}</div><div className="k-d">{d}</div></div>
        ))}
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card" style={{ background: 'var(--surface2)' }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>Muscular vs cardio</div>
          {s.muscularPct + s.cardioPct > 0 ? (
            <div style={{ height: 180 }}>
              <Doughnut
                data={{ labels: ['Muscular', 'Cardio'], datasets: [{ data: [s.muscularPct, s.cardioPct], backgroundColor: [COLORS.blue, COLORS.red], borderWidth: 0 }] }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: COLORS.muted, boxWidth: 12 } }, tooltip: { callbacks: { label: (o) => `${o.label}: ${o.raw}%` } } } }}
              />
            </div>
          ) : <div className="muted" style={{ fontSize: 13 }}>No load recorded.</div>}
        </div>
        <div className="card" style={{ background: 'var(--surface2)' }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>Muscular strain by group</div>
          {s.muscleStrain.length ? (
            <div style={{ height: 180 }}>
              <Bar
                data={{ labels: s.muscleStrain.map((m) => m.muscle), datasets: [{ data: s.muscleStrain.map((m) => m.val), backgroundColor: s.muscleStrain.map((_, i) => MUSCLE_COLORS[i % MUSCLE_COLORS.length]) }] }}
                options={{ ...baseOptions(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } }, y: { grid: { display: false }, ticks: { color: COLORS.muted } } } }}
              />
            </div>
          ) : <div className="muted" style={{ fontSize: 13 }}>No weighted work to attribute.</div>}
        </div>
      </div>

      <div className="section-title">Logged sets</div>
      {main.map((m) => {
        const rows = Array.isArray(m.setRows) && m.setRows.length ? m.setRows : null
        const anyDone = rows ? rows.some((r) => r.done) : !!m.done
        if (rows) {
          return (
            <div key={m.id} className="sumex">
              <div className="sumex-head">
                <span style={{ color: anyDone ? 'var(--green)' : 'var(--accent2)', width: 16 }} aria-hidden="true">{anyDone ? '✓' : '⚠'}</span>
                <strong>{m.name}</strong>
                {!anyDone && <Tag color="orange">Not logged</Tag>}
              </div>
              <div className="sumex-sets">
                {rows.map((r, i) => (
                  <div key={i} className={'sumex-set' + (r.done ? '' : ' skip')}>
                    <span className="sumex-n">{r.n}</span>
                    {r.done
                      ? <span>{r.reps ?? r.pReps ?? '—'} reps{(r.load ?? r.pLoadKg) != null ? ` · ${toDisp(r.load ?? r.pLoadKg, units)} ${unitName(units)}` : ''}{r.effort != null ? ` · ${r.effort} ${r.effortType}` : ''}</span>
                      : <span className="muted">skipped · target {r.pReps ?? '—'}{r.pLoadKg != null ? ` @ ${toDisp(r.pLoadKg, units)} ${unitName(units)}` : ''}</span>}
                  </div>
                ))}
              </div>
              {m.note && <div className="sumex-note"><span>Note</span>{m.note}</div>}
            </div>
          )
        }
        // Legacy per-exercise fallback (older sessions without per-set rows).
        const logged = m.doneSets != null || m.doneReps != null || m.doneWeight != null
        return (
          <div key={m.id} className="ex-row" style={m.done ? undefined : { opacity: .75 }}>
            <span style={{ color: m.done ? 'var(--green)' : 'var(--accent2)', flex: 'none', width: 18 }} aria-hidden="true">{m.done ? '✓' : '⚠'}</span>
            <div style={{ flex: 1 }}>
              <div className="flex gap" style={{ alignItems: 'center' }}>
                <strong>{m.name}</strong>
                {!m.done && <Tag color="orange">Not completed</Tag>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Prescribed: {m.sets} × {m.duration || m.reps}{m.weight != null ? ` · ${toDisp(m.weight, units)} ${unitName(units)}` : ''} · rest {secToClock(m.rest)}
              </div>
              {m.done && (
                <div style={{ fontSize: 12, color: 'var(--green)' }}>
                  Done: {(m.doneSets ?? m.sets)} × {(m.doneReps ?? (m.duration || m.reps))}
                  {(m.doneWeight ?? m.weight) != null ? ` · ${toDisp(m.doneWeight ?? m.weight, units)} ${unitName(units)}` : ''}
                  {!logged && <span className="muted"> (as prescribed)</span>}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
