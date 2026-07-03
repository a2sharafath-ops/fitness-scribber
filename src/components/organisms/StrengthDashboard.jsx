// Dual-Axis Context Chart (spec 6.1): rolling 30-day Absolute 1RM as a
// locked step line + fluctuating Training Max dashed line (left, load axis),
// against ACWR with health-zone background banding and daily strain bars
// hugging the basement (right, workload axis). Data: maxes ledger + sRPE.
import { useState } from 'react'
import { Chart } from 'react-chartjs-2'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { baseOptions, COLORS, GRID, TEXT, shortLabel } from '../../lib/chartSetup'
import { lastNDates } from '../../lib/dates'
import { dailySum, acwrSeries, trainingStrain, trainingMonotony } from '../../lib/calc'
import { absolute1RM, trainingMaxKg } from '../../lib/program'

// Background banding on the ACWR axis: soft green sweet spot (0.8–1.3),
// warning wash above 1.5 (spec: elevated injury-risk zone).
const acwrBands = {
  id: 'acwrBands',
  beforeDraw(chart) {
    const y1 = chart.scales.y1
    if (!y1) return
    const { ctx, chartArea: a } = chart
    const px = (v) => Math.max(a.top, Math.min(a.bottom, y1.getPixelForValue(v)))
    ctx.save()
    ctx.fillStyle = 'rgba(61, 220, 151, 0.07)'
    ctx.fillRect(a.left, px(1.3), a.right - a.left, px(0.8) - px(1.3))
    ctx.fillStyle = 'rgba(255, 90, 60, 0.09)'
    ctx.fillRect(a.left, a.top, a.right - a.left, px(1.5) - a.top)
    ctx.restore()
  },
}

export default function StrengthDashboard({ client, range = 90 }) {
  const { db, tz } = useData()
  const { toDisp, unitName } = useFormat()
  const lifts = [...new Set(db.maxes.filter((m) => m.clientId === client.id).map((m) => m.exercise))].sort()
  const [lift, setLift] = useState(lifts[0] || '')

  if (!lifts.length) {
    return (
      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>Strength — Absolute 1RM vs Training Max</div>
        <div className="empty" style={{ padding: 24 }}><div className="big">🏋️</div>
          No 1RM history yet. Complete sets in a Main Lifts block (auto-1RM on) and peaks will appear here automatically.</div>
      </div>
    )
  }

  const D = lastNDates(range, tz)
  const abs = D.map((d) => { const v = absolute1RM(db.maxes, client.id, lift, d); return v != null ? toDisp(v) : null })
  const tm = D.map((d) => { const v = trainingMaxKg(db.maxes, client.id, lift, d); return v != null ? toDisp(v) : null })
  const intMap = dailySum(db.srpe, client.id, 'tl')
  const acwr = acwrSeries(intMap, D)
  const loads = D.map((d) => intMap[d] || 0)
  const strain = D.map((_, i) => trainingStrain(loads.slice(Math.max(0, i - 6), i + 1)))
  const mono = D.map((_, i) => trainingMonotony(loads.slice(Math.max(0, i - 6), i + 1)))
  const strainMax = Math.max(...strain, 1)
  // Normalised into the ACWR axis so the bars sit along the basement floor.
  const strainBars = strain.map((s) => +(s / strainMax * 0.5).toFixed(3))

  const latestAbs = [...abs].reverse().find((v) => v != null)
  const latestTm = [...tm].reverse().find((v) => v != null)

  return (
    <div className="card">
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Strength — Absolute 1RM vs Training Max</div>
        <select value={lift} aria-label="Lift" onChange={(e) => setLift(e.target.value)} style={{ width: 'auto' }}>
          {lifts.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="muted" style={{ fontSize: 12, margin: '6px 0' }}>
        Absolute 1RM {latestAbs != null ? `${latestAbs} ${unitName()}` : '—'} · Training Max {latestTm != null ? `${latestTm} ${unitName()}` : '—'} ·
        green band = ACWR sweet spot (0.8–1.3), red wash = &gt;1.5 injury-risk zone · floor bars = weekly strain
      </div>
      <div style={{ height: 240 }}>
        <Chart
          type="bar"
          plugins={[acwrBands]}
          data={{
            labels: D.map(shortLabel),
            datasets: [
              { type: 'line', label: `Absolute 1RM (${unitName()})`, data: abs, yAxisID: 'y', stepped: 'before', borderColor: COLORS.green, backgroundColor: 'rgba(61,220,151,.1)', pointRadius: 0, spanGaps: true, borderWidth: 2.5, order: 1 },
              { type: 'line', label: `Training Max (${unitName()})`, data: tm, yAxisID: 'y', borderColor: COLORS.blue, borderDash: [6, 4], pointRadius: 0, spanGaps: true, borderWidth: 1.5, order: 2 },
              { type: 'line', label: 'ACWR', data: acwr, yAxisID: 'y1', borderColor: COLORS.amber, pointRadius: 0, spanGaps: true, borderWidth: 1.2, order: 3 },
              { type: 'bar', label: 'Strain (scaled)', data: strainBars, yAxisID: 'y1', backgroundColor: 'rgba(139,149,165,.4)', barPercentage: 0.6, order: 4 },
            ],
          }}
          options={{
            ...baseOptions(),
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { labels: { color: TEXT, boxWidth: 12, font: { size: 11 } } },
              tooltip: { callbacks: { afterBody: (items) => { const i = items[0]?.dataIndex; return i != null ? `Strain ${strain[i].toLocaleString()} · Monotony ${mono[i]}` : '' } } },
            },
            scales: {
              x: { grid: { color: GRID }, ticks: { color: TEXT, maxTicksLimit: 8, font: { size: 9 } } },
              y: { position: 'left', title: { display: true, text: `Load (${unitName()})`, color: COLORS.green, font: { size: 10 } }, grid: { color: GRID }, ticks: { color: TEXT } },
              y1: { position: 'right', min: 0, max: 2, title: { display: true, text: 'Workload (ACWR)', color: COLORS.amber, font: { size: 10 } }, grid: { drawOnChartArea: false }, ticks: { color: TEXT } },
            },
          }}
        />
      </div>
    </div>
  )
}
