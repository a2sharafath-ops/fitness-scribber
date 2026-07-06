import { useState } from 'react'
import { Chart, Scatter } from 'react-chartjs-2'
import Kpi from '../atoms/Kpi'
import { useData } from '../../store/DataContext'
import { baseOptions } from '../../lib/chartSetup'
import { METRICS } from '../../lib/metrics'
import { lastNDates, fmtDate } from '../../lib/dates'
import { dailySum, acwrSeries, trainingMonotony, trainingStrain, rollingAvg, readinessScore } from '../../lib/calc'

const shortLabel = (iso) => fmtDate(iso).replace(/, \d+$/, '')

export default function LoadResponseDashboard({ client, win, range }) {
  const { db, tz, units } = useData()
  const [x, setX] = useState('time')
  const [y1, setY1] = useState('vl')
  const [y2, setY2] = useState('srpetl')

  const D = lastNDates(range, tz)
  const intMap = dailySum(db.srpe, client.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const strain = trainingStrain(last7)
  const acwrNow = acwrSeries(intMap, D).filter((v) => v != null).slice(-1)[0]
  const rNow = readinessScore(db, client.id, [...D].reverse().find((d) => readinessScore(db, client.id, d) != null) || D[D.length - 1])

  const apply = (arr) => (win > 1 ? rollingAvg(arr, win) : arr)
  const labels = D.map(shortLabel)
  const opts = Object.entries(METRICS).map(([v, m]) => (
    <option key={v} value={v}>{m.label(units)}</option>
  ))

  let chart1
  if (x === 'time') {
    const m1 = METRICS[y1], m2 = METRICS[y2]
    const d1 = apply(m1.series(db, client.id, D, units))
    const d2 = apply(m2.series(db, client.id, D, units))
    chart1 = (
      <Chart
        type="bar"
        height={120}
        data={{
          labels,
          datasets: [
            { type: m1.kind, label: m1.label(units), data: d1, yAxisID: 'y', order: 2, borderColor: '#0b87c9', backgroundColor: m1.kind === 'bar' ? 'rgba(74,168,255,.45)' : 'rgba(74,168,255,.12)', tension: 0.3, spanGaps: true },
            { type: m2.kind === 'bar' ? 'line' : m2.kind, label: m2.label(units), data: d2, yAxisID: 'y1', order: 1, borderColor: '#fb404a', backgroundColor: 'rgba(251,64,74,.1)', tension: 0.3, spanGaps: true, pointRadius: 2 },
          ],
        }}
        options={{
          ...baseOptions(),
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 8, font: { size: 9 } } },
            y: { position: 'left', title: { display: true, text: m1.label(units), color: '#0b87c9', font: { size: 10 } }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } },
            y1: { position: 'right', title: { display: true, text: m2.label(units), color: '#fb404a', font: { size: 10 } }, grid: { drawOnChartArea: false }, ticks: { color: '#6e6f76' } },
          },
        }}
      />
    )
  } else {
    const xs = METRICS[x].series(db, client.id, D, units)
    const ys = METRICS[y1].series(db, client.id, D, units)
    const pts = D.map((d, i) => ({ x: xs[i], y: ys[i], date: d })).filter((p) => p.x != null && p.y != null && !(p.x === 0 && p.y === 0))
    chart1 = (
      <Scatter
        height={120}
        data={{ datasets: [{ label: `${METRICS[y1].label(units)} vs ${METRICS[x].label(units)}`, data: pts, pointBackgroundColor: '#af52de', pointRadius: 5 }] }}
        options={{
          ...baseOptions(),
          plugins: { legend: { labels: { color: '#6e6f76', boxWidth: 12 } }, tooltip: { callbacks: { label: (o) => `${fmtDate(o.raw.date)}: (${o.raw.x}, ${o.raw.y})` } } },
          scales: {
            x: { title: { display: true, text: METRICS[x].label(units), color: '#6e6f76' }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } },
            y: { title: { display: true, text: METRICS[y1].label(units), color: '#6e6f76' }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } },
          },
        }}
      />
    )
  }

  const rRaw = D.map((d) => readinessScore(db, client.id, d))
  const rTrend = rollingAvg(rRaw, Math.min(7, win > 1 ? win : 7))
  const rBase = rollingAvg(rRaw, 28)

  return (
    <div className="card">
      <div className="section-title" style={{ margin: 0 }}>Load-Response Dashboard</div>
      <div className="kpi-strip" style={{ marginTop: 12 }}>
        <Kpi label="Readiness" value={rNow ?? '—'} delta="composite /100" />
        <Kpi label="ACWR" value={acwrNow ? acwrNow.toFixed(2) : '—'} delta={acwrNow ? (acwrNow >= 0.8 && acwrNow <= 1.3 ? 'sweet spot' : acwrNow > 1.3 ? 'elevated' : 'low') : ''} deltaColor={acwrNow ? (acwrNow >= 0.8 && acwrNow <= 1.3 ? 'var(--green)' : 'var(--accent)') : 'var(--muted)'} />
        <Kpi label="Monotony (7d)" value={mono} delta={mono > 2 ? 'high — vary load' : 'healthy'} deltaColor={mono > 2 ? 'var(--accent)' : 'var(--green)'} />
        <Kpi label="Strain (7d)" value={strain.toLocaleString()} delta="load × monotony" />
      </div>
      <div className="toggle-bar">
        <div className="tg"><label>X axis</label>
          <select value={x} onChange={(e) => setX(e.target.value)}><option value="time">Time (trend)</option>{opts}</select>
        </div>
        <div className="tg"><label>Y — primary</label><select value={y1} onChange={(e) => setY1(e.target.value)}>{opts}</select></div>
        <div className="tg"><label>{x === 'time' ? 'Y — secondary' : 'Y axis'}</label><select value={y2} onChange={(e) => setY2(e.target.value)}>{opts}</select></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
        Chart 1 — Load-Response {x === 'time' ? `(${win > 1 ? win + '-day rolling avg' : 'raw daily'})` : '(correlation)'}
      </div>
      <div style={{ height: 200 }}>{chart1}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '18px 0 6px' }}>Chart 2 — Baseline-adjusted readiness trend</div>
      <div style={{ height: 160 }}>
        <Chart
          type="line"
          data={{
            labels,
            datasets: [
              { type: 'line', label: 'Readiness (rolling)', data: rTrend, borderColor: '#34c759', backgroundColor: 'rgba(61,220,151,.12)', fill: true, tension: 0.3, spanGaps: true, pointRadius: 0 },
              { type: 'line', label: 'Baseline (28d)', data: rBase, borderColor: '#6e6f76', borderDash: [5, 4], pointRadius: 0, spanGaps: true },
            ],
          }}
          options={{ ...baseOptions(), scales: { x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 8, font: { size: 9 } } }, y: { min: 0, max: 100, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } } } }}
        />
      </div>
    </div>
  )
}
