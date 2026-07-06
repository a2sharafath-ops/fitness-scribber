import { Line, Bar } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
import { readinessParts, rollingAvg } from '../../../lib/calc'

// Detailed breakdown of the readiness composite: how the wellness (Hooper) and
// HRV-deviation components combine, plus the subjective sub-scores driving it.
export default function ReadinessBreakdown({ client, range }) {
  const { db, tz } = useData()
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const parts = D.map((d) => readinessParts(db, client.id, d))
  const score = parts.map((p) => p.score)
  const wellnessPart = parts.map((p) => p.wellnessPart)
  const hrvPart = parts.map((p) => p.hrvPart)
  const trend = rollingAvg(score, 7)
  const baseline = rollingAvg(score, 28)

  // Latest day that actually has a composite, for the KPI strip + Hooper bars.
  const lastIdx = [...score.keys()].reverse().find((i) => score[i] != null)
  const latest = lastIdx != null ? parts[lastIdx] : null
  const w = latest?.wellness || null
  const logged = score.filter((v) => v != null).length

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
        <Kpi label="Readiness (latest)" value={latest?.score ?? '—'} delta="composite /100"
          deltaColor={latest ? (latest.score >= 67 ? 'var(--green)' : latest.score >= 34 ? 'var(--amber)' : 'var(--accent)') : 'var(--muted)'} />
        <Kpi label="Wellness part" value={latest?.wellnessPart ?? '—'} delta={w ? `Hooper ${w.score}/28` : 'no check-in'} />
        <Kpi label="HRV part" value={latest?.hrvPart ?? '—'} delta={latest?.hrvDev != null ? `${latest.hrvDev > 0 ? '+' : ''}${latest.hrvDev.toFixed(1)}% vs base` : 'no wearable'} />
        <Kpi label="Days logged" value={logged} delta={`of last ${range}`} />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>Readiness trend</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Daily composite with 7-day smoothing against the 28-day baseline.</div>
        <div style={{ height: 220 }}>
          <Line
            data={{
              labels,
              datasets: [
                { label: 'Readiness (daily)', data: score, borderColor: COLORS.green, backgroundColor: 'rgba(61,220,151,.10)', fill: true, tension: 0.3, spanGaps: true, pointRadius: 2 },
                { label: '7-day avg', data: trend, borderColor: COLORS.blue, borderWidth: 2, pointRadius: 0, spanGaps: true, tension: 0.3 },
                { label: 'Baseline (28d)', data: baseline, borderColor: COLORS.muted, borderDash: [5, 4], pointRadius: 0, spanGaps: true },
              ],
            }}
            options={tOpts}
          />
        </div>
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Component contribution</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>The composite is the mean of the two parts present each day.</div>
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
          the day's heart-rate variability to a rolling 30-day baseline — readings above baseline push the score up, below pull it down.
          When both signals exist the composite is their mean; with only one, that one stands alone. Roughly 67+ is green, 34–66 amber, below 34 a flag.
        </p>
      </div>
    </>
  )
}
