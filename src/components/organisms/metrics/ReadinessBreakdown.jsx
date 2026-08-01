import { useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
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
    combined: { series: score, color: COLORS.green, fill: 'rgba(61,220,151,.10)', label: 'Readiness', sub: 'Combined score — the red-flag-weighted blend of both parts.' },
    subjective: { series: wellnessPart, color: COLORS.purple, fill: 'rgba(167,139,250,.12)', label: 'Wellness (subjective)', sub: 'Hooper check-in mapped to 0–100 — the subjective part only.' },
    objective: { series: hrvPart, color: COLORS.amber, fill: 'rgba(245,177,76,.10)', label: 'HRV (objective)', sub: 'HRV vs the 30-day baseline mapped to 0–100 — the objective part only.' },
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
      y: { min: 0, max: 100, grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } },
    },
  }

  // Hooper sub-components — higher sleep is good; lower stress/fatigue/soreness is good.
  const sub = (field) => D.map((d) => {
    const r = db.wellness.find((x) => x.clientId === client.id && x.date === d)
    return r ? r[field] : null
  })

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Readiness (latest)" value={latest?.score ?? '—'}
          delta={tinfo?.smoothed != null ? `${TREND_ICON[tinfo.trend]} 5-day avg ${tinfo.smoothed}${tinfo.delta ? ` (${tinfo.delta > 0 ? '+' : ''}${tinfo.delta})` : ''}` : 'composite /100'}
          deltaColor={latest ? (latest.color === 'green' ? 'var(--green)' : latest.color === 'yellow' ? 'var(--amber)' : 'var(--accent)') : 'var(--muted)'} />
        <Kpi label="Wellness part" value={latest?.wellnessPart ?? '—'} delta={w ? `Hooper ${w.score}/28` : 'no check-in'} />
        <Kpi label="HRV part" value={latest?.hrvPart ?? '—'} delta={latest?.hrvDev != null ? `${latest.hrvDev > 0 ? '+' : ''}${latest.hrvDev.toFixed(1)}% vs base` : 'no wearable'} />
        <Kpi label="Confidence" value={latest ? (latest.confidence === 'high' ? 'High' : 'Low') : '—'} delta={latest ? CONF_LABEL[latest.confidence] : `${logged} of ${range} logged`} />
      </div>

      <div className="card">
        <div className="flex between" style={{ alignItems: 'center', gap: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Readiness trend</div>
          <select value={view} onChange={(e) => setView(e.target.value)} aria-label="Readiness view"
            style={{ fontSize: 12, padding: '5px 8px' }}>
            <option value="combined">Combined</option>
            <option value="subjective">Subjective (wellness)</option>
            <option value="objective">Objective (HRV)</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>{v.sub} 7-day smoothing against the 28-day baseline.</div>
        <div style={{ height: 220 }}>
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
        </div>
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Component contribution</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>The composite is a red-flag-weighted blend — the weaker signal counts ~60%, so one alarmed system isn't averaged away.</div>
          <div style={{ height: 200 }}>
            <Line
              data={{
                labels,
                datasets: [
                  { label: 'Wellness part', data: wellnessPart, borderColor: COLORS.purple, backgroundColor: 'rgba(167,139,250,.12)', fill: true, tension: 0.3, spanGaps: true, pointRadius: 0 },
                  { label: 'HRV part', data: hrvPart, borderColor: COLORS.amber, backgroundColor: 'rgba(245,177,76,.10)', fill: true, tension: 0.3, spanGaps: true, pointRadius: 0 },
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
              options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false }, scales: { x: baseOptions().scales.x, y: { min: 1, max: 7, grid: { color: '#eceae7' }, ticks: { color: COLORS.muted, stepSize: 1 } } } }}
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
              options={{ ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: baseOptions().scales.x, y: { min: 0, max: 8, grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } } } }}
            />
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How readiness is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Readiness blends a subjective and an objective signal into a 0–100 score. The <strong>wellness part</strong> maps
          the Hooper index (sleep + inverted stress, fatigue and soreness, range 4–28) onto 0–100. The <strong>HRV part</strong> compares
          the day's heart-rate variability to a rolling 30-day baseline — above baseline pushes up, below pulls down. Both parts are
          unchanged; what's new is how they <em>combine</em>: instead of a plain mean, the composite is a
          <strong> red-flag-weighted blend</strong> where the weaker signal carries ~60%, so one poor reading isn't cancelled by a good
          one in the other system. The traffic light comes from that same number, so they always agree: 67+ green, 45–66 amber, below 45
          a flag. <strong>Confidence</strong> is high only when both a check-in and HRV are present; the headline also shows a 5-day
          smoothed trend, since a single day — especially HRV — is noisy.
        </p>
      </div>
    </>
  )
}
