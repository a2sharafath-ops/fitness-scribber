import { Chart } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
import { dailySum, rollingAvg } from '../../../lib/calc'

// Session load (sRPE-TL) — the internal training load that feeds ACWR, monotony
// and strain. Each session's load is its RPE (0–10) × duration (minutes) in AU;
// this view shows the daily load, its two ingredients, and the weekly total.
export default function SrpeTlBreakdown({ client, range }) {
  const { db, tz } = useData()
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const tl = D.map((d) => (intMap[d] != null ? intMap[d] : null))
  const roll7 = rollingAvg(tl, 7)

  // Decompose each day into its RPE (duration-weighted) and total minutes.
  const recsOn = (d) => db.srpe.filter((r) => r.clientId === client.id && r.date === d)
  const dur = D.map((d) => { const rs = recsOn(d); return rs.length ? rs.reduce((a, r) => a + (+r.duration || 0), 0) : null })
  const rpe = D.map((d) => {
    const rs = recsOn(d)
    if (!rs.length) return null
    const td = rs.reduce((a, r) => a + (+r.duration || 0), 0)
    return td ? +(rs.reduce((a, r) => a + (+r.rpe || 0) * (+r.duration || 0), 0) / td).toFixed(1) : +(rs.reduce((a, r) => a + (+r.rpe || 0), 0) / rs.length).toFixed(1)
  })

  // Headline figures.
  const w7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const weekLoad = Math.round(w7.reduce((a, b) => a + b, 0))
  const loadDays = D.map((d) => intMap[d]).filter((v) => v)
  const avgSession = loadDays.length ? Math.round(loadDays.reduce((a, b) => a + b, 0) / loadDays.length) : null
  const latestDay = [...D].reverse().find((d) => intMap[d])
  const latestLoad = latestDay ? Math.round(intMap[latestDay]) : null
  const sessions = db.srpe.filter((r) => r.clientId === client.id && D.includes(r.date)).length

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Last session load" value={latestLoad != null ? latestLoad.toLocaleString() : '—'} delta={latestDay ? `AU · ${shortLabel(latestDay)}` : 'no sessions'} />
        <Kpi label="Weekly load (7d)" value={weekLoad.toLocaleString()} delta="Σ sRPE-TL (AU)" />
        <Kpi label="Avg session load" value={avgSession != null ? avgSession.toLocaleString() : '—'} delta={`over ${range} days`} />
        <Kpi label="Sessions logged" value={sessions} delta={`of last ${range} days`} />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>Session load trend</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Daily sRPE-TL (bars) with a 7-day rolling average. Each bar is that day's RPE × minutes.</div>
        <div style={{ height: 220 }}>
          <Chart
            type="bar"
            data={{
              labels,
              datasets: [
                { type: 'bar', label: 'Daily sRPE-TL', data: tl, backgroundColor: 'rgba(74,168,255,.45)', order: 2 },
                { type: 'line', label: '7-day avg', data: roll7, borderColor: COLORS.blue, borderWidth: 2, tension: 0.3, pointRadius: 0, spanGaps: true, order: 1 },
              ],
            }}
            options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false } }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Decomposition: RPE × duration</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Session load is effort (RPE, right) multiplied by time (minutes, left). A long easy session and a short hard one can carry the same load.</div>
        <div style={{ height: 220 }}>
          <Chart
            type="bar"
            data={{
              labels,
              datasets: [
                { type: 'bar', label: 'Duration (min)', data: dur, yAxisID: 'y', backgroundColor: 'rgba(52,199,89,.35)', order: 2 },
                { type: 'line', label: 'Session RPE', data: rpe, yAxisID: 'y1', borderColor: COLORS.red, tension: 0.3, pointRadius: 2, spanGaps: true, order: 1 },
              ],
            }}
            options={{
              ...baseOptions(),
              interaction: { mode: 'index', intersect: false },
              scales: {
                x: baseOptions().scales.x,
                y: { position: 'left', title: { display: true, text: 'Minutes', color: COLORS.green, font: { size: 10 } }, min: 0, grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } },
                y1: { position: 'right', title: { display: true, text: 'RPE', color: COLORS.red, font: { size: 10 } }, min: 0, max: 10, grid: { drawOnChartArea: false }, ticks: { color: COLORS.muted } },
              },
            }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How session load is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <strong>sRPE-TL</strong> (session-RPE training load) is the athlete's <strong>session RPE (0–10)</strong> multiplied by the
          <strong> session duration in minutes</strong>, in arbitrary units (AU). It is logged at the end of each session in the
          Start → Complete → RPE flow. This single number is the app's core measure of <em>internal</em> load — how much stress a
          session imposed — and it is what every other load metric is built from: the 7-day sum is the acute load in
          <strong> ACWR</strong>, its day-to-day spread drives <strong>monotony</strong>, and load × monotony gives <strong>strain</strong>.
          A long easy session and a short intense one can produce the same load, which is exactly what makes it comparable across very
          different session types.
        </p>
      </div>
    </>
  )
}
