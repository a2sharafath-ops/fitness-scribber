import Select from '../../molecules/Select'
import { useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { fmtDate, lastNDates } from '../../../lib/dates'
import { readinessParts, readinessTrend, rollingAvg } from '../../../lib/calc'

const TREND_ICON = { up: '▲', down: '▼', flat: '→' }
const CONF_LABEL = { high: 'High confidence · check-in + HRV', low: 'Low confidence · one signal only', none: '' }

// Detailed breakdown of the readiness composite: how the wellness (Hooper) and
// HRV-deviation components combine, plus the subjective sub-scores driving it.
export default function ReadinessBreakdown({ client, range }) {
  const { db, tz } = useData()
  const [view, setView] = useState('combined')
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const parts = D.map((d) => readinessParts(db, client.id, d))
  const score = parts.map((p) => p.score)
  const wellnessPart = parts.map((p) => p.wellnessPart)
  const hrvPart = parts.map((p) => p.hrvPart)

  // The trend chart can show the combined score or either component on its own.
  const VIEW = {
    combined: { series: score, color: COLORS.green, fill: COLORS.green + '1a', label: 'Readiness', sub: 'Combined wellness and HRV score' },
    subjective: { series: wellnessPart, color: COLORS.purple, fill: COLORS.purple + '1f', label: 'Wellness (subjective)', sub: 'Wellness check-in scaled to 0–100' },
    objective: { series: hrvPart, color: COLORS.amber, fill: COLORS.amber + '1a', label: 'HRV (objective)', sub: 'HRV against its prior 30-day baseline, scaled to 0–100' },
  }
  const v = VIEW[view]
  const vTrend = rollingAvg(v.series, 7)
  const vBase = rollingAvg(v.series, 28)

  // Latest day that actually has a composite, for the KPI strip + Hooper bars.
  const lastIdx = [...score.keys()].reverse().find((i) => score[i] != null)
  const latest = lastIdx != null ? parts[lastIdx] : null
  const w = latest?.wellness || null
  const logged = score.filter((v) => v != null).length
  // 5-day smoothed trend ending on the latest logged day.
  const tinfo = lastIdx != null ? readinessTrend(db, client.id, D[lastIdx], 5) : null

  const tOpts = {
    ...baseOptions(),
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: baseOptions().scales.x,
      y: { min: 0, max: 100 },
    },
  }

  // Hooper sub-components — higher sleep is good; lower stress/fatigue/soreness is good.
  const sub = (field) => D.map((d) => {
    const r = db.wellness.find((x) => x.clientId === client.id && x.date === d)
    return r ? r[field] : null
  })

  if (!latest) return <section className="card"><h2 className="section-title">Readiness</h2>
    <p className="muted">No readiness score recorded in the past {range} days.</p>
  </section>

  return (
    <>
      <section className="card readiness-score-lead" aria-label="Latest recorded readiness">
        <div className="readiness-score-ring" style={{ '--score': latest.score + '%' }}><strong>{latest.score}<small>/100</small></strong></div>
        <div><h2>{D[lastIdx] === D.at(-1) ? 'Today’s readiness' : 'Last recorded readiness'}</h2>
          <time dateTime={D[lastIdx]}>{fmtDate(D[lastIdx])}</time>
          <p>{CONF_LABEL[latest.confidence]} · {logged} of {range} days recorded</p>
          {tinfo?.smoothed != null && <small>{TREND_ICON[tinfo.trend]} 5-day average {tinfo.smoothed}{tinfo.delta ? ` (${tinfo.delta > 0 ? '+' : ''}${tinfo.delta})` : ''}</small>}
        </div>
      </section>
      <div className="kpi-strip metric-secondary">
        <Kpi label="Wellness part" value={latest?.wellnessPart ?? '—'} delta={w ? `Hooper ${w.score}/28` : 'no check-in'} />
        <Kpi label="HRV part" value={latest?.hrvPart ?? '—'} delta={latest?.hrvDev != null ? `${latest.hrvDev > 0 ? '+' : ''}${latest.hrvDev.toFixed(1)}% vs base` : 'no wearable'} />
      </div>

      <div className="card">
        <div className="flex between" style={{ alignItems: 'center', gap: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Readiness trend</div>
          <Select value={view} onChange={(e) => setView(e.target.value)} aria-label="Readiness view"
            style={{ fontSize: 12, padding: '5px 8px' }}>
            <option value="combined">Combined</option>
            <option value="subjective">Subjective (wellness)</option>
            <option value="objective">Objective (HRV)</option>
          </Select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>{v.sub} 7-day smoothing against the 28-day baseline.</div>
        {v.series.some(value => value != null) ? <div style={{ height: 220 }}>
          <Line
            data={{
              labels,
              datasets: [
                { label: `${v.label} (daily)`, data: v.series, borderColor: v.color, backgroundColor: v.fill, fill: true, tension: 0.3, spanGaps: true, pointRadius: 2 },
                { label: '7-day avg', data: vTrend, borderColor: COLORS.blue, borderWidth: 2, pointRadius: 0, spanGaps: true, tension: 0.3 },
                { label: 'Baseline (28d)', data: vBase, borderColor: COLORS.muted, borderDash: [5, 4], pointRadius: 0, spanGaps: true },
              ],
            }}
            options={tOpts}
          />
        </div> : <p className="progress-empty">No {v.label.toLowerCase()} readings in this period.</p>}
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Component contribution</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>With both inputs available, the lower score contributes 80% and the higher score 20%.</div>
          <div style={{ height: 200 }}>
            <Line
              data={{
                labels,
                datasets: [
                  { label: 'Wellness part', data: wellnessPart, borderColor: COLORS.purple, backgroundColor: COLORS.purple + '1f', fill: true, tension: 0.3, spanGaps: true, pointRadius: 0 },
                  { label: 'HRV part', data: hrvPart, borderColor: COLORS.amber, backgroundColor: COLORS.amber + '1a', fill: true, tension: 0.3, spanGaps: true, pointRadius: 0 },
                ],
              }}
              options={tOpts}
            />
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Hooper sub-scores</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Raw 1–7 ratings. Higher sleep is good; lower stress, fatigue, soreness is good.</div>
          <div style={{ height: 200 }}>
            <Line
              data={{
                labels,
                datasets: [
                  { label: 'Sleep', data: sub('sleep'), borderColor: COLORS.green, tension: 0.3, spanGaps: true, pointRadius: 0 },
                  { label: 'Stress', data: sub('stress'), borderColor: COLORS.red, tension: 0.3, spanGaps: true, pointRadius: 0 },
                  { label: 'Fatigue', data: sub('fatigue'), borderColor: COLORS.amber, tension: 0.3, spanGaps: true, pointRadius: 0 },
                  { label: 'Soreness', data: sub('soreness'), borderColor: COLORS.purple, tension: 0.3, spanGaps: true, pointRadius: 0 },
                ],
              }}
              options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false }, scales: { x: baseOptions().scales.x, y: { min: 1, max: 7, ticks: { stepSize: 1 } } } }}
            />
          </div>
        </div>
      </div>

      {w && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: 0 }}>Latest check-in breakdown</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Points each item contributes to the {w.score}/28 Hooper score.</div>
          <div style={{ height: 160 }}>
            <Bar
              data={{
                labels: ['Sleep', 'Stress (8−)', 'Fatigue (8−)', 'Soreness (8−)'],
                datasets: [{ label: 'Contribution', data: [w.sleep, 8 - w.stress, 8 - w.fatigue, 8 - w.soreness], backgroundColor: [COLORS.green, COLORS.red, COLORS.amber, COLORS.purple] }],
              }}
              options={{ ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: baseOptions().scales.x, y: { min: 0, max: 8 } } }}
            />
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How readiness is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Readiness uses a wellness check-in and HRV compared with its prior 30-day baseline.
          With both inputs, the lower score contributes 80% and the higher score 20%.
          With one usable input, the app shows that score with low confidence.
          Scores of 67 or more display green, 45–66 amber, and below 45 red.
          The headline trend uses a 5-day average. These bands do not provide exercise or medical clearance.
        </p>
      </div>
    </>
  )
}
