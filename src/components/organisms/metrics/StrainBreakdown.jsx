import { Line, Chart } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
import { dailySum, trainingMonotony, trainingStrain } from '../../../lib/calc'

// Training strain — weekly load amplified by monotony. Captures the combined
// cost of doing a lot AND doing it the same way every day.
export default function StrainBreakdown({ client, range }) {
  const { db, tz } = useData()
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const loads = D.map((d) => intMap[d] || 0)

  const win = (i) => loads.slice(Math.max(0, i - 6), i + 1)
  const strain = D.map((_, i) => trainingStrain(win(i)))
  const wkLoad = D.map((_, i) => Math.round(win(i).reduce((a, b) => a + b, 0)))
  const mono = D.map((_, i) => trainingMonotony(win(i)))

  const D7 = lastNDates(7, tz)
  const w7 = D7.map((d) => intMap[d] || 0)
  const curStrain = trainingStrain(w7)
  const curLoad = Math.round(w7.reduce((a, b) => a + b, 0))
  const curMono = trainingMonotony(w7)
  const prevStrain = strain.length > 7 ? strain[strain.length - 8] : null
  const wow = prevStrain ? Math.round(((curStrain - prevStrain) / prevStrain) * 100) : null

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Strain (7d)" value={curStrain.toLocaleString()} delta="weekly load × monotony" />
        <Kpi label="Weekly load" value={curLoad.toLocaleString()} delta="Σ sRPE-TL (7d)" />
        <Kpi label="Monotony" value={curMono} delta={curMono > 2 ? 'amplifier high' : 'amplifier normal'} deltaColor={curMono > 2 ? 'var(--accent)' : 'var(--green)'} />
        <Kpi label="Week-over-week" value={wow != null ? `${wow > 0 ? '+' : ''}${wow}%` : '—'} delta="vs 7 days ago" deltaColor={wow != null ? (wow > 0 ? 'var(--accent)' : 'var(--green)') : 'var(--muted)'} />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>Strain trend</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Rolling 7-day strain. Sharp climbs mean load and monotony are rising together.</div>
        <div style={{ height: 220 }}>
          <Line
            data={{ labels, datasets: [{ label: 'Training strain', data: strain, borderColor: COLORS.red, backgroundColor: 'rgba(255,90,60,.12)', fill: true, tension: 0.3, pointRadius: 0 }] }}
            options={{ ...baseOptions(), plugins: { legend: { display: false } } }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Decomposition: load × monotony</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Strain is weekly load (bars, left) multiplied by monotony (line, right). Either rising drives strain up.</div>
        <div style={{ height: 220 }}>
          <Chart
            type="bar"
            data={{
              labels,
              datasets: [
                { type: 'bar', label: 'Weekly load (Σ 7d)', data: wkLoad, yAxisID: 'y', backgroundColor: 'rgba(74,168,255,.40)', order: 2 },
                { type: 'line', label: 'Monotony', data: mono, yAxisID: 'y1', borderColor: COLORS.purple, tension: 0.3, pointRadius: 0, order: 1 },
              ],
            }}
            options={{
              ...baseOptions(),
              interaction: { mode: 'index', intersect: false },
              scales: {
                x: baseOptions().scales.x,
                y: { position: 'left', title: { display: true, text: 'Weekly load', color: COLORS.blue, font: { size: 10 } }, grid: { color: '#2a3039' }, ticks: { color: COLORS.muted } },
                y1: { position: 'right', title: { display: true, text: 'Monotony', color: COLORS.purple, font: { size: 10 } }, min: 0, grid: { drawOnChartArea: false }, ticks: { color: COLORS.muted } },
              },
            }}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How strain is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Training strain multiplies the <strong>total weekly load</strong> (sum of daily sRPE-TL over 7 days) by the week's
          <strong> monotony</strong>. Two athletes can share the same weekly load, but the one who spread it as identical daily doses
          carries far more strain. Because monotony is the multiplier, strain spikes hardest when a heavy week is also a flat one —
          the combination Foster associated with elevated illness and overtraining risk. Watch for sharp week-over-week jumps rather than any single absolute number.
        </p>
      </div>
    </>
  )
}
