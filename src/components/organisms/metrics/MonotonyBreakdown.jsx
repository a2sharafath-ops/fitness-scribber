import { Chart, Line } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
import { dailySum, mean, sdev, trainingMonotony } from '../../../lib/calc'

// Training monotony — the day-to-day sameness of load (mean ÷ SD over a week).
// High monotony with high load is the classic over-strain warning.
export default function MonotonyBreakdown({ client, range }) {
  const { db, tz } = useData()
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const loads = D.map((d) => intMap[d] || 0)

  // Last 7 days, the canonical monotony window.
  const D7 = lastNDates(7, tz)
  const w7 = D7.map((d) => intMap[d] || 0)
  const m7 = mean(w7)
  const sd7 = sdev(w7)
  const mono = trainingMonotony(w7)

  const rolling = D.map((_, i) => trainingMonotony(loads.slice(Math.max(0, i - 6), i + 1)))

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Monotony (7d)" value={mono} delta={mono > 2 ? 'high — vary load' : 'healthy'} deltaColor={mono > 2 ? 'var(--accent)' : 'var(--green)'} />
        <Kpi label="Mean daily load" value={Math.round(m7).toLocaleString()} delta="7-day sRPE-TL" />
        <Kpi label="Std deviation" value={Math.round(sd7).toLocaleString()} delta="day-to-day spread" />
        <Kpi label="Risk threshold" value="2.0" delta="vary load above this" />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>This week's loads vs the mean</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Monotony falls when daily loads vary around the mean and rises when every day looks alike.</div>
        <div style={{ height: 220 }}>
          <Chart
            type="bar"
            data={{
              labels: D7.map(shortLabel),
              datasets: [
                { type: 'bar', label: 'sRPE-TL', data: w7, backgroundColor: 'rgba(74,168,255,.45)', order: 2 },
                { type: 'line', label: '7-day mean', data: D7.map(() => Math.round(m7)), borderColor: COLORS.amber, borderDash: [5, 4], pointRadius: 0, order: 1 },
              ],
            }}
            options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false } }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Rolling 7-day monotony</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Above the 2.0 line, load is too uniform — schedule lighter/harder contrast days.</div>
        <div style={{ height: 200 }}>
          <Line
            data={{
              labels,
              datasets: [
                { label: 'Monotony', data: rolling, borderColor: COLORS.purple, backgroundColor: 'rgba(167,139,250,.12)', fill: true, tension: 0.3, pointRadius: 0 },
                { label: 'Threshold (2.0)', data: D.map(() => 2), borderColor: COLORS.red, borderDash: [5, 4], pointRadius: 0 },
              ],
            }}
            options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false }, scales: { x: baseOptions().scales.x, y: { min: 0, suggestedMax: 3, grid: { color: '#eceae7' }, ticks: { color: COLORS.muted } } } }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How monotony is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Monotony is the <strong>mean daily load divided by its standard deviation</strong> across a 7-day window. A program where
          every session carries the same load has a tiny standard deviation, so monotony climbs. Foster's guidance treats values
          above ~2.0 as a concern: combined with high total load it inflates training strain and is linked to staleness, illness and overuse.
          The fix is contrast — pair hard days with genuinely easy ones so the week has range.
        </p>
      </div>
    </>
  )
}
