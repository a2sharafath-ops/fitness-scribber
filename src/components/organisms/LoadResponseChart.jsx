import { useState } from 'react'
import { Chart, Scatter } from 'react-chartjs-2'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { fmtDate } from '../../lib/dates'
import { LOAD_RESPONSE_METRICS, loadResponseRows, pairedResponsePoints, responseSeries } from '../../lib/loadResponse'

const byId = Object.fromEntries(LOAD_RESPONSE_METRICS.map((metric) => [metric.id, metric]))
const groups = [...new Set(LOAD_RESPONSE_METRICS.map((metric) => metric.group))]
const modeChoices = [['raw', 'Raw values'], ['7', '7-day rolling mean'], ['28', '28-day rolling mean']]
const displayLabel = { dot: 'Dots', line: 'Line', column: 'Columns' }
const formatValue = (value) => value == null ? '—' : Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(2)).toLocaleString()

function MetricOptions({ includeDate = false, includeNone = false }) {
  return <>
    {includeDate && <option value="date">Date</option>}
    {includeNone && <option value="">None</option>}
    {groups.map((group) => <optgroup key={group} label={group}>{LOAD_RESPONSE_METRICS.filter((metric) => metric.group === group).map((metric) => <option key={metric.id} value={metric.id}>{metric.label} ({metric.unit})</option>)}</optgroup>)}
  </>
}

function axis(metric, side, color) {
  return { ...baseOptions().scales.y, position: side, title: { display: true, text: `${metric.label} (${metric.unit})`, color }, grid: side === 'right' ? { drawOnChartArea: false } : baseOptions().scales.y.grid }
}

export default function LoadResponseChart({ db, clientId, today }) {
  const [days, setDays] = useState(28)
  const [xMetric, setXMetric] = useState('date')
  const [primary, setPrimary] = useState('load')
  const [secondary, setSecondary] = useState('')
  const [primaryStyle, setPrimaryStyle] = useState('column')
  const [secondaryStyle, setSecondaryStyle] = useState('line')
  const [mode, setMode] = useState('raw')
  const window = mode === 'raw' ? 0 : Number(mode)
  // Include earlier dates so a 28-day mean is calculated consistently at the
  // start of a short display period. Only the chosen period is shown.
  const allRows = loadResponseRows(db, clientId, today, days + 27)
  const rows = allRows.slice(-days)
  const xValues = xMetric === 'date' ? null : responseSeries(allRows, xMetric, window).slice(-days)
  const yValues = responseSeries(allRows, primary, window).slice(-days)
  const y2Values = secondary ? responseSeries(allRows, secondary, window).slice(-days) : null
  const scatter = xMetric !== 'date'
  const points = scatter ? pairedResponsePoints(rows, xValues, yValues) : []
  const secondPoints = scatter && secondary ? pairedResponsePoints(rows, xValues, y2Values) : []
  const hasData = scatter ? points.length || secondPoints.length : yValues.some((item) => item.value != null) || y2Values?.some((item) => item.value != null)
  const logged = rows.filter((row) => row.values.load != null).length
  const plotted = scatter ? `${points.length} same-date pairs${secondary ? ` · ${secondPoints.length} second-axis pairs` : ''}`
    : `${yValues.filter((item) => item.value != null).length} plotted days${secondary ? ` · ${y2Values.filter((item) => item.value != null).length} second-axis days` : ''}`
  const styleFor = (style, color, metric, values, side) => ({
    type: style === 'column' ? 'bar' : 'line',
    label: `${metric.label} (${metric.unit})`,
    data: values.map((item) => item.value),
    yAxisID: side,
    borderColor: color,
    backgroundColor: style === 'column' ? `${color}88` : color,
    borderWidth: 2,
    pointRadius: style === 'dot' ? 4 : style === 'line' ? 3 : 0,
    pointHoverRadius: 6,
    showLine: style === 'line',
    spanGaps: false,
  })
  const chartData = scatter ? { datasets: [
    { label: `${byId[primary].label} (${byId[primary].unit})`, data: points, yAxisID: 'y', backgroundColor: COLORS.blue, pointRadius: 5 },
    ...(secondary ? [{ label: `${byId[secondary].label} (${byId[secondary].unit})`, data: secondPoints, yAxisID: 'y2', backgroundColor: COLORS.amber, pointRadius: 5 }] : []),
  ] } : {
    labels: rows.map((row) => shortLabel(row.date)),
    datasets: [styleFor(primaryStyle, COLORS.blue, byId[primary], yValues, 'y'),
      ...(secondary ? [styleFor(secondaryStyle, COLORS.amber, byId[secondary], y2Values, 'y2')] : [])],
  }
  const emptyScale = (scale) => hasData ? scale : { ...scale, ticks: { ...scale.ticks, display: false }, grid: { ...scale.grid, display: false } }
  const emptyLabel = scatter
    ? `${byId[primary].label} vs ${byId[xMetric].label} will appear here`
    : `${byId[primary].label}${secondary ? ` and ${byId[secondary].label}` : ` (${byId[primary].unit})`} will appear here`
  const options = {
    ...baseOptions(),
    interaction: { mode: scatter ? 'nearest' : 'index', intersect: false },
    plugins: {
      ...baseOptions().plugins,
      legend: { ...baseOptions().plugins.legend, display: Boolean(hasData) },
      tooltip: { callbacks: {
        title: (items) => scatter ? fmtDate(items[0]?.raw?.date) : fmtDate(rows[items[0]?.dataIndex]?.date),
        label: (item) => `${item.dataset.label}: ${formatValue(item.parsed.y)}`,
      } },
    },
    scales: {
      x: scatter ? emptyScale({ ...baseOptions().scales.x, type: 'linear', title: { display: true, text: `${byId[xMetric].label} (${byId[xMetric].unit})` } }) : { ...baseOptions().scales.x, title: { display: true, text: 'Recorded date' } },
      y: emptyScale(axis(byId[primary], 'left', COLORS.blue)),
      ...(secondary ? { y2: emptyScale(axis(byId[secondary], 'right', COLORS.amber)) } : {}),
    },
  }
  const tableRows = rows.filter((row, index) => scatter
    ? (xValues[index].value != null && (yValues[index].value != null || y2Values?.[index].value != null))
    : (yValues[index].value != null || y2Values?.[index].value != null))
  const display = (value) => value.value == null ? '—' : `${formatValue(value.value)}${window ? ` (${value.count}/${window} observed days)` : ''}`

  return <section className="progress-inset load-response" aria-labelledby="load-response-title">
    <div className="load-response-heading"><h3 id="load-response-title">Load response</h3><span className="load-response-period">{fmtDate(rows[0].date)}–{fmtDate(today)}</span></div>
    <details className="load-response-settings">
      <summary><span className="load-response-settings-title">Customize chart</span><span className="load-response-settings-current">X: {scatter ? byId[xMetric].label : 'Date'} · Y: {byId[primary].label}{secondary ? ` + ${byId[secondary].label}` : ''} · {mode === 'raw' ? 'Raw' : `${mode}-day mean`} · {days} days</span></summary>
      <div className="load-response-controls">
        <label>X-axis<select value={xMetric} onChange={(event) => setXMetric(event.target.value)}><MetricOptions includeDate /></select></label>
        <label>Y-axis<select value={primary} onChange={(event) => setPrimary(event.target.value)}><MetricOptions /></select></label>
        <label>Second Y-axis<select value={secondary} onChange={(event) => setSecondary(event.target.value)}><MetricOptions includeNone /></select></label>
        <label>Y display<select value={scatter ? 'dot' : primaryStyle} disabled={scatter} onChange={(event) => setPrimaryStyle(event.target.value)}>{Object.entries(displayLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Second Y display<select value={scatter ? 'dot' : secondaryStyle} disabled={scatter || !secondary} onChange={(event) => setSecondaryStyle(event.target.value)}>{Object.entries(displayLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Values<select value={mode} onChange={(event) => setMode(event.target.value)}>{modeChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={28}>28 days</option><option value={56}>56 days</option><option value={84}>84 days</option><option value={180}>180 days</option></select></label>
      </div>
      {scatter && <p className="load-response-hint">Metric X-axis uses same-date pairs as dots. Line and column styles apply to the date view only.</p>}
    </details>
    <div className="load-response-canvas">{scatter
      ? <Scatter data={chartData} options={options} role="img" aria-label={`Load response scatter chart, ${plotted}. X-axis ${byId[xMetric].label}; Y-axis ${byId[primary].label}${secondary ? `; second Y-axis ${byId[secondary].label}` : ''}.`} />
      : <Chart type="bar" data={chartData} options={options} role="img" aria-label={`Load response date chart, ${plotted}. Y-axis ${byId[primary].label}${secondary ? `; second Y-axis ${byId[secondary].label}` : ''}.`} />}{!hasData && <p className="load-response-empty-label">{emptyLabel}</p>}</div>
    {hasData && <div className="load-response-status">{(scatter || primary !== 'load' || secondary) && <span>{plotted}</span>}<span>Session RPE: {logged}/{days} days</span><span>Unlogged days are unknown</span></div>}
    {secondary && <p className="load-response-hint">Separate Y scales: compare values, not line crossings.</p>}
    {tableRows.length > 0 && <details className="progress-derived-table"><summary>Show dated values and sources</summary><div className="progress-derived-detail"><div className="checkins-table-scroll" role="region" aria-label="Load response table; scroll horizontally for more columns" tabIndex={0}><table className="checkins-table"><caption className="sr-only">Load response recorded dates, selected values, and sources</caption><thead><tr><th scope="col">Date</th>{scatter && <th scope="col">{byId[xMetric].label} ({byId[xMetric].unit})</th>}<th scope="col">{byId[primary].label} ({byId[primary].unit})</th>{secondary && <th scope="col">{byId[secondary].label} ({byId[secondary].unit})</th>}<th scope="col">Sources on date</th></tr></thead><tbody>
      {tableRows.map((row) => { const index = rows.indexOf(row); return <tr key={row.date}><th scope="row">{fmtDate(row.date)}</th>{scatter && <td>{display(xValues[index])}</td>}<td>{display(yValues[index])}</td>{secondary && <td>{display(y2Values[index])}</td>}<td>{[...new Set([xMetric, primary, secondary].filter(Boolean).map((metric) => row.sources[metric]).filter(Boolean))].join(', ') || 'Source not recorded'}</td></tr> })}
    </tbody></table></div><p className="checkins-note">Missing days stay blank. {window ? `${window}-day means use recorded days only; counts show coverage. ` : 'Daily loads are summed; ratings and readings are averaged when multiple entries share a date. '}Pairing and separate Y scales do not show causation. Display choices do not change ACWR, monotony, or strain calculations.</p></div></details>}
  </section>
}
