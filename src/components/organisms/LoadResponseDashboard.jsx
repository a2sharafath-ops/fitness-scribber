import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart, Scatter } from 'react-chartjs-2'
import Kpi from '../atoms/Kpi'
import SegToggle from '../molecules/SegToggle'
import InfoTip from '../atoms/InfoTip'
import { useData } from '../../store/DataContext'
import { GLOSSARY } from '../../lib/glossary'
import { baseOptions } from '../../lib/chartSetup'
import { METRICS } from '../../lib/metrics'
import { lastNDates, fmtDate } from '../../lib/dates'
import { dailySum, acwrSeries, trainingMonotony, trainingStrain, rollingAvg, readinessScore, readinessParts, binPoints } from '../../lib/calc'

const shortLabel = (iso) => fmtDate(iso).replace(/, \d+$/, '')

// Per-chart filter options (rolling window + date span).
const ROLL = [[1, 'Raw'], [7, '7d'], [28, '28d']]
const SPAN = [[28, '4wk'], [56, '8wk'], [90, '12wk']]
// Per-series render type. 'auto' keeps the metric's own natural kind from the
// registry (e.g. Volume Load as columns), so the default view is unchanged.
const TYPE = [['auto', 'Auto'], ['line', 'Line'], ['bar', 'Column']]
const resolveKind = (choice, metric) => (choice === 'auto' ? metric.kind : choice)
// Correlation mode (X = a metric): how to draw the relationship. Columns bin the
// continuous x into bands and average y within each.
const XTYPE = [['scatter', 'Scatter'], ['line', 'Line'], ['bar', 'Column']]

export default function LoadResponseDashboard({ client }) {
  const { db, tz, units } = useData()
  const nav = useNavigate()
  const openMetric = (key) => nav(`/clients/${client.id}/metric/${key}`)
  const [x, setX] = useState('time')
  const [y1, setY1] = useState('vl')
  const [y2, setY2] = useState('srpetl')
  const [rView, setRView] = useState('combined') // Readiness card: combined | subjective | objective
  const [t1, setT1] = useState('auto')  // primary series render type
  const [t2, setT2] = useState('auto')  // secondary series render type
  const [xt, setXt] = useState('scatter') // correlation-mode render type
  // Each chart carries its own rolling window + date range, filtered independently.
  const [win1, setWin1] = useState(7)
  const [range1, setRange1] = useState(28)
  const [win2, setWin2] = useState(7)
  const [range2, setRange2] = useState(28)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const strain = trainingStrain(last7)
  const weekLoad = Math.round(last7.reduce((a, b) => a + b, 0)) // 7-day training load (Σ sRPE-TL)
  // The KPI snapshot uses a fixed 28-day window, independent of the chart filters.
  const D28 = lastNDates(28, tz)
  const acwrNow = acwrSeries(intMap, D28).filter((v) => v != null).slice(-1)[0]
  const rDate = [...D28].reverse().find((d) => readinessScore(db, client.id, d) != null) || D28[D28.length - 1]
  const rParts = readinessParts(db, client.id, rDate)
  const rVal = { combined: rParts.score, subjective: rParts.wellnessPart, objective: rParts.hrvPart }[rView]
  const rDelta = { combined: 'composite /100', subjective: 'wellness /100', objective: 'HRV /100' }[rView]

  // Chart 1 (Load-Response) window/range.
  const D1 = lastNDates(range1, tz)
  const apply = (arr) => (win1 > 1 ? rollingAvg(arr, win1) : arr)
  const labels = D1.map(shortLabel)
  const opts = Object.entries(METRICS).map(([v, m]) => (
    <option key={v} value={v}>{m.label(units)}</option>
  ))

  let chart1
  if (x === 'time') {
    const m1 = METRICS[y1], m2 = METRICS[y2]
    const d1 = apply(m1.series(db, client.id, D1, units))
    const d2 = apply(m2.series(db, client.id, D1, units))
    const k1 = resolveKind(t1, m1)
    const k2 = resolveKind(t2, m2)
    // Two column series sit on different axes, so overlaying them would invite a
    // false height comparison — draw them side by side instead.
    const bothBars = k1 === 'bar' && k2 === 'bar'
    const barCfg = bothBars ? { barPercentage: 0.9, categoryPercentage: 0.45 } : {}
    chart1 = (
      <Chart
        type="bar"
        height={120}
        data={{
          labels,
          datasets: [
            { type: k1, label: m1.label(units), data: d1, yAxisID: 'y', order: 2, borderColor: '#0b87c9', backgroundColor: k1 === 'bar' ? 'rgba(74,168,255,.45)' : 'rgba(74,168,255,.12)', tension: 0.3, spanGaps: true, pointRadius: k1 === 'line' ? 0 : undefined, ...(k1 === 'bar' ? barCfg : {}) },
            { type: k2, label: m2.label(units), data: d2, yAxisID: 'y1', order: 1, borderColor: '#fb404a', backgroundColor: k2 === 'bar' ? 'rgba(251,64,74,.40)' : 'rgba(251,64,74,.1)', tension: 0.3, spanGaps: true, pointRadius: k2 === 'line' ? 2 : undefined, ...(k2 === 'bar' ? barCfg : {}) },
          ],
        }}
        options={{
          ...baseOptions(),
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 8, font: { size: 9 } }, ...(bothBars ? {} : { stacked: false }) },
            y: { position: 'left', title: { display: true, text: m1.label(units), color: '#0b87c9', font: { size: 10 } }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } },
            y1: { position: 'right', title: { display: true, text: m2.label(units), color: '#fb404a', font: { size: 10 } }, grid: { drawOnChartArea: false }, ticks: { color: '#6e6f76' } },
          },
        }}
      />
    )
  } else {
    const xs = METRICS[x].series(db, client.id, D1, units)
    const ys = METRICS[y1].series(db, client.id, D1, units)
    const pts = D1.map((d, i) => ({ x: xs[i], y: ys[i], date: d })).filter((p) => p.x != null && p.y != null && !(p.x === 0 && p.y === 0))
    const relLabel = `${METRICS[y1].label(units)} vs ${METRICS[x].label(units)}`
    const sorted = xt === 'line' ? [...pts].sort((a, b) => a.x - b.x) : pts
    if (xt === 'bar') {
      // Columns need categories, so bin the continuous x and average y per band.
      const bins = binPoints(pts, 8)
      chart1 = (
        <Chart
          type="bar"
          height={120}
          data={{ labels: bins.map((b) => b.label), datasets: [{ type: 'bar', label: `Mean ${METRICS[y1].label(units)}`, data: bins.map((b) => b.y), backgroundColor: 'rgba(175,82,222,.45)' }] }}
          options={{
            ...baseOptions(),
            plugins: {
              legend: { labels: { color: '#6e6f76', boxWidth: 12 } },
              tooltip: { callbacks: { afterLabel: (o) => `${bins[o.dataIndex]?.n ?? 0} day(s) in band` } },
            },
            scales: {
              x: { title: { display: true, text: `${METRICS[x].label(units)} (banded)`, color: '#6e6f76' }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', font: { size: 9 } } },
              y: { title: { display: true, text: METRICS[y1].label(units), color: '#6e6f76' }, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } },
            },
          }}
        />
      )
    } else {
    chart1 = (
      <Scatter
        height={120}
        data={{ datasets: [{ label: relLabel, data: sorted, pointBackgroundColor: '#af52de', borderColor: '#af52de', pointRadius: xt === 'line' ? 3 : 5, showLine: xt === 'line', tension: 0 }] }}
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
  }

  // Chart 2 (Readiness trend) window/range.
  const D2 = lastNDates(range2, tz)
  const labels2 = D2.map(shortLabel)
  const rRaw = D2.map((d) => readinessScore(db, client.id, d))
  const rTrend = rollingAvg(rRaw, win2 > 1 ? win2 : 7)
  const rBase = rollingAvg(rRaw, 28)

  return (
    <div className="card">
      <div className="section-title" style={{ margin: 0 }}>Load-Response Dashboard</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Tap any card for its full component breakdown.</div>
      <div className="kpi-strip five" style={{ marginTop: 12 }}>
        <Kpi onClick={() => openMetric('readiness')}
          label={<>Readiness
            <select className="lr-rview" value={rView} aria-label="Readiness view"
              onChange={(e) => setRView(e.target.value)}
              onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <option value="combined">Combined</option>
              <option value="subjective">Subjective</option>
              <option value="objective">Objective</option>
            </select>
            <InfoTip {...GLOSSARY.readiness} /></>}
          value={rVal ?? '—'} delta={rDelta} />
        <Kpi onClick={() => openMetric('srpetl')} label={<>sRPE-TL (7d) <InfoTip {...GLOSSARY.srpeTl} /></>} value={weekLoad.toLocaleString()} delta="Σ session load · AU" />
        <Kpi onClick={() => openMetric('acwr')} label={<>ACWR <InfoTip {...GLOSSARY.acwr} /></>} value={acwrNow ? acwrNow.toFixed(2) : '—'} delta={acwrNow ? (acwrNow >= 0.8 && acwrNow <= 1.3 ? 'sweet spot' : acwrNow > 1.3 ? 'elevated' : 'low') : ''} deltaColor={acwrNow ? (acwrNow >= 0.8 && acwrNow <= 1.3 ? 'var(--green)' : 'var(--accent)') : 'var(--muted)'} />
        <Kpi onClick={() => openMetric('monotony')} label={<>Monotony (7d) <InfoTip {...GLOSSARY.monotony} /></>} value={mono} delta={mono > 2 ? 'high — vary load' : 'healthy'} deltaColor={mono > 2 ? 'var(--accent)' : 'var(--green)'} />
        <Kpi onClick={() => openMetric('strain')} label={<>Strain (7d) <InfoTip {...GLOSSARY.strain} /></>} value={strain.toLocaleString()} delta="load × monotony" />
      </div>
      <div className="toggle-bar">
        <div className="tg"><label>X axis</label>
          <select value={x} onChange={(e) => setX(e.target.value)}><option value="time">Time (trend)</option>{opts}</select>
        </div>
        {x !== 'time' && <div className="tg"><label>— as</label><SegToggle options={XTYPE} value={xt} onChange={setXt} ariaLabel="Correlation chart type" /></div>}
        <div className="tg"><label>Y — primary</label><select value={y1} onChange={(e) => setY1(e.target.value)}>{opts}</select></div>
        {x === 'time' && <div className="tg"><label>— as</label><SegToggle options={TYPE} value={t1} onChange={setT1} ariaLabel="Primary series chart type" /></div>}
        <div className="tg"><label>{x === 'time' ? 'Y — secondary' : 'Y axis'}</label><select value={y2} onChange={(e) => setY2(e.target.value)}>{opts}</select></div>
        {x === 'time' && <div className="tg"><label>— as</label><SegToggle options={TYPE} value={t2} onChange={setT2} ariaLabel="Secondary series chart type" /></div>}
        <div className="tg"><label>Rolling</label><SegToggle options={ROLL} value={win1} onChange={setWin1} ariaLabel="Chart 1 rolling window" /></div>
        <div className="tg"><label>Range</label><SegToggle options={SPAN} value={range1} onChange={setRange1} ariaLabel="Chart 1 date range" /></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
        Chart 1 — Load-Response {x === 'time' ? `(${win1 > 1 ? win1 + '-day rolling avg' : 'raw daily'})` : '(correlation)'}
      </div>
      <div style={{ height: 200 }}>{chart1}</div>
      <div className="flex between" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '18px 0 6px' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Chart 2 — Baseline-adjusted readiness trend</span>
        <div className="lr-chart-filter">
          <SegToggle options={ROLL} value={win2} onChange={setWin2} ariaLabel="Chart 2 rolling window" />
          <SegToggle options={SPAN} value={range2} onChange={setRange2} ariaLabel="Chart 2 date range" />
        </div>
      </div>
      <div style={{ height: 160 }}>
        <Chart
          type="line"
          data={{
            labels: labels2,
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
