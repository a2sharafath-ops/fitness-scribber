import { Doughnut, Bar } from 'react-chartjs-2'
import { baseOptions, COLORS } from '../../../lib/chartSetup'
import { fmtVL } from '../../../lib/units'
import { summarize, secToClock } from '../../../lib/workout'
import Kpi from '../../atoms/Kpi'

const MUSCLE_COLORS = [COLORS.blue, COLORS.purple, COLORS.amber, COLORS.green, COLORS.red, '#5ac8fa', '#f59ec4']

// Recorded workout facts. Missing HR and mood stay missing rather than
// becoming estimated observations.
export default function WorkoutInsights({ workout, units, exercises = [], restingHr, age, bodyMassKg, mood }) {
  const s = summarize(workout, { exercises, restingHr, age, bodyMassKg })
  const kpis = [
    ['Strain', s.strain || '—', s.strain ? '/21 · est' : 'No measured HR'],
    ['Duration', s.durationSec ? secToClock(s.durationSec) : '—', 'start → finish'],
    ['Energy', s.energy ? s.energy + ' kcal' : '—', s.energy ? 'est' : 'No measured HR'],
    ['Avg HR', s.avg ? s.avg + ' bpm' : '—', s.avg ? 'measured' : 'No measured HR'],
    ['Peak HR', s.peak ? s.peak + ' bpm' : '—', s.peak ? 'measured' : 'No measured HR'],
    ['Weight moved', fmtVL(s.volume, units), 'total tonnage'],
    ['Reps', s.reps || '—', `${s.sets} sets`],
    ['Cardio load', s.trimp || '—', s.trimp ? 'TRIMP · est' : 'No measured HR'],
    ['Mood', mood || '—', mood ? 'reported' : 'Not recorded'],
  ]
  return (
    <div className="workout-insights">
      <div className="kpi-strip" style={{ marginTop: 14 }}>
        {kpis.map(([label, value, detail]) => (
          <Kpi key={label} label={label} value={value} delta={detail} deltaColor="inherit" valueSize={18} />
        ))}
      </div>
      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card" style={{ background: 'var(--surface2)' }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>Muscular vs cardio</div>
          {s.muscularPct + s.cardioPct > 0 ? (
            <div style={{ height: 180 }}><Doughnut
              data={{ labels: ['Muscular', 'Cardio'], datasets: [{ data: [s.muscularPct, s.cardioPct], backgroundColor: [COLORS.blue, COLORS.red], borderWidth: 0 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: COLORS.muted, boxWidth: 12 } }, tooltip: { callbacks: { label: (item) => `${item.label}: ${item.raw}%` } } } }}
            /></div>
          ) : <div className="muted" style={{ fontSize: 13 }}>No load recorded.</div>}
        </div>
        <div className="card" style={{ background: 'var(--surface2)' }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>Logged work by group</div>
          {s.muscleStrain.length ? (
            <div style={{ height: 180 }}><Bar
              data={{ labels: s.muscleStrain.map((item) => item.muscle), datasets: [{ data: s.muscleStrain.map((item) => item.val), backgroundColor: s.muscleStrain.map((_, index) => MUSCLE_COLORS[index % MUSCLE_COLORS.length]) }] }}
              options={{ ...baseOptions(), indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } }, y: { grid: { display: false }, ticks: { color: COLORS.muted } } } }}
            /></div>
          ) : <div className="muted" style={{ fontSize: 13 }}>No weighted work to attribute.</div>}
        </div>
      </div>
    </div>
  )
}
