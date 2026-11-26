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
  const loadDays = D.map((d) => intMap[d]).filter((v) => v != null)
  const avgSession = loadDays.length ? Math.round(loadDays.reduce((a, b) => a + b, 0) / loadDays.length) : null
  const latestDay = [...D].reverse().find((d) => intMap[d] != null)
  const latestLoad = latestDay ? Math.round(intMap[latestDay]) : null
  const sessions = db.srpe.filter((r) => r.clientId === client.id && D.includes(r.date)).length

  if (!latestDay) return <section className="card"><h2 className="section-title">Session load</h2>
    <p className="muted">No session RPE recorded in the past {range} days.</p>
  </section>

  return (
    <>
      <section className="card metric-lead"><h2>Latest daily load</h2>
        <strong>{latestLoad.toLocaleString()} AU</strong><time dateTime={latestDay}>{shortLabel(latestDay)}</time></section>
      <div className="kpi-strip metric-secondary">
        <Kpi label="Weekly load (7d)" value={weekLoad.toLocaleString()} delta="Σ sRPE-TL (AU)" />
        <Kpi label="Average per recorded day" value={avgSession != null ? avgSession.toLocaleString() : '—'} delta={`over ${range} days`} />
        <Kpi label="Sessions logged" value={sessions} delta={`of last ${range} days`} />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>Session load trend</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Daily session load bars with a 7-day average.</div>
        <div style={{ height: 220 }}>
          <Chart
            type="bar"
            data={{
              labels,
              datasets: [
                { type: 'bar', label: 'Daily sRPE-TL', data: tl, backgroundColor: COLORS.blue + '98', order: 2 },
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
                { type: 'bar', label: 'Duration (min)', data: dur, yAxisID: 'y', backgroundColor: COLORS.green + '98', order: 2 },
                { type: 'line', label: 'Session RPE', data: rpe, yAxisID: 'y1', borderColor: COLORS.red, tension: 0.3, pointRadius: 2, spanGaps: true, order: 1 },
              ],
            }}
            options={{
              ...baseOptions(),
              interaction: { mode: 'index', intersect: false },
              scales: {
                x: baseOptions().scales.x,
                y: { position: 'left', title: { display: true, text: 'Minutes', font: { size: 10 } }, min: 0 },
                y1: { position: 'right', title: { display: true, text: 'RPE', font: { size: 10 } }, min: 0, max: 10, grid: { drawOnChartArea: false } },
              },
            }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How session load is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Session load (sRPE-TL) is RPE (0–10) × session minutes, in arbitrary units (AU).
          Enter RPE when completing the workout. ACWR compares daily load averages, monotony describes how daily load
          varies, and strain multiplies 7-day load by monotony. A short hard session and a longer easy session can have the same load.
        </p>
      </div>
    </>
  )
}
