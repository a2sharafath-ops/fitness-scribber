import { Line } from 'react-chartjs-2'
import { baseOptions, COLORS, shortLabel, TEXT } from '../../lib/chartSetup'
import { movementScore, MOVEMENT_MAX } from '../../lib/assessment'

// Progress-over-time charts built from assessment history. Renders a chart
// only when a type has at least two dated records. `list` = client assessments.
export default function AssessmentTrends({ list }) {
  const mv = list.filter((a) => a.type === 'movement').sort((a, b) => a.date.localeCompare(b.date))
  const bc = list.filter((a) => a.type === 'body_comp').sort((a, b) => a.date.localeCompare(b.date))
  const hasMv = mv.length >= 2
  const hasBc = bc.length >= 2
  if (!hasMv && !hasBc) return null

  const line = (label, data, color, yAxisID = 'y') => ({
    label, data, borderColor: color, backgroundColor: 'transparent', tension: 0.3, pointRadius: 4, spanGaps: true, yAxisID,
  })

  const mvData = {
    labels: mv.map((a) => shortLabel(a.date)),
    datasets: [line(`Score /${MOVEMENT_MAX}`, mv.map((a) => movementScore(a.data).score), COLORS.purple)],
  }
  const mvOpts = baseOptions()
  mvOpts.scales = { ...mvOpts.scales, y: { ...mvOpts.scales.y, min: 0, max: MOVEMENT_MAX } }

  const val = (a, k) => (a.data?.[k] == null ? null : a.data[k])
  const bcData = {
    labels: bc.map((a) => shortLabel(a.date)),
    datasets: [
      line('Body mass (kg)', bc.map((a) => val(a, 'massKg')), COLORS.blue, 'y'),
      line('Lean mass (kg)', bc.map((a) => val(a, 'leanMassKg')), COLORS.green, 'y'),
      line('Body fat (%)', bc.map((a) => val(a, 'bodyFatPct')), COLORS.amber, 'y1'),
    ],
  }
  const bcOpts = baseOptions()
  bcOpts.scales = {
    x: bcOpts.scales.x,
    y: { ...bcOpts.scales.y, position: 'left', title: { display: true, text: 'kg', color: TEXT } },
    y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: TEXT }, title: { display: true, text: '%', color: TEXT } },
  }

  return (
    <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
      {hasMv && (
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 8px' }}>🤸 Movement score trend</div>
          <div style={{ height: 220 }}><Line data={mvData} options={mvOpts} /></div>
        </div>
      )}
      {hasBc && (
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 8px' }}>⚖️ Body composition trend</div>
          <div style={{ height: 220 }}><Line data={bcData} options={bcOpts} /></div>
        </div>
      )}
    </div>
  )
}
