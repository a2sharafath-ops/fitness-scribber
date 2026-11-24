import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import ProgressInfo from '../atoms/ProgressInfo'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { LIFT_GROUPS, performedLiftHistory, performedLiftOptions } from '../../lib/performedLifts'
import { workoutReviewPath } from '../../lib/schedule'

const newest = (rows) => [...rows].sort((a, b) => b.date.localeCompare(a.date))[0] || null
const sameLift = (a, b) => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b || '').trim().replace(/\s+/g, ' ').toLowerCase()
const loadText = (load, fmt) => load == null ? 'Not recorded' : load > 0 ? fmt(load) : 'No external load'

export default function StrengthDashboard({ client }) {
  const { db, tz } = useData()
  const { fmtWt, toDisp, unitName } = useFormat()
  const [selected, setSelected] = useState('')
  const [chart, setChart] = useState('estimate')
  const [period, setPeriod] = useState('all')
  const theme = useOutletContext()
  const today = todayISO(tz)
  const since = period === 'all' ? null : addDays(today, 1 - Number(period))
  const options = performedLiftOptions(db, client.id)
  const choice = options.find((option) => option.name === selected) || options[0]
  const lift = choice?.name
  const work = performedLiftHistory(db, client.id, { actualOnly: true }).filter((row) => sameLift(row.name, lift))
  const bookings = new Map((db.sessions || []).filter((booking) => booking.clientId === client.id).map((booking) => [booking.id, booking]))
  // Zero external load is a recorded value; missing load stays unknown.
  const loaded = [...work].filter((row) => row.loadKg != null).reverse()
  const latestWork = work[0]
  const own = (db.maxes || []).filter((m) => m.clientId === client.id && sameLift(m.exercise, lift))
  const estimates = own.filter((m) => m.kind === 'e1rm' && m.source === 'auto').sort((a, b) => a.date.localeCompare(b.date))
  const lastEstimate = estimates.at(-1)
  const lastEntered = newest(own.filter((m) => m.kind === 'e1rm' && m.source !== 'auto'))
  const lastTm = newest(own.filter((m) => m.kind === 'tm'))
  const main = !lift || choice.group === 'Main Lift'
  const estimateChart = main && chart === 'estimate'
  const trend = (estimateChart ? estimates : loaded).filter(row => !since || (row.date >= since && row.date <= today))
  const field = estimateChart ? 'valueKg' : 'loadKg'
  const first = trend[0], last = trend.at(-1)
  const change = first && last && first.date !== last.date ? +(last[field] - first[field]).toFixed(1) : null
  const dayMillis = 86400000
  const points = trend.map(row => ({ x: Date.parse(row.date) / dayMillis, y: toDisp(row[field]) }))
  const dateAt = day => new Date(day * dayMillis).toISOString().slice(0, 10)
  const opts = baseOptions(theme === 'dark' ? '#4d414f' : '#e6dfe5', theme === 'dark' ? '#c4b8c5' : '#605762')
  opts.animation = false
  opts.plugins.legend.display = false
  opts.scales.x.type = 'linear'
  opts.scales.x.grid.display = false
  opts.scales.x.ticks.precision = 0
  opts.scales.x.ticks.callback = day => shortLabel(dateAt(day))
  if (!points.length) {
    opts.scales.x.min = Date.parse(since || addDays(today, -27)) / dayMillis
    opts.scales.x.max = Date.parse(today) / dayMillis
    opts.scales.y.ticks.display = false
  } else if (first.date === last.date) {
    opts.scales.x.min = points[0].x - 1
    opts.scales.x.max = points[0].x + 1
  }
  opts.plugins.tooltip = { callbacks: { title: items => items.length ? fmtDate(dateAt(items[0].parsed.x)) : '' } }
  opts.scales.y.title = { display: true, text: unitName(), color: opts.scales.y.ticks.color }
  const metric = (label, value, note) => <div className="progress-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>

  return <div className="progress-strength">
    <section className="card progress-performance">
      <div className="progress-section-head"><h2 id="progress-strength-title">Lift performance</h2>
        <label className="progress-lift-select">Performed lift <select value={lift || ''} disabled={!lift} onChange={(event) => { setSelected(event.target.value); setChart('estimate') }}>
          {!lift && <option value="">No performed lifts</option>}
          {LIFT_GROUPS.map((group) => { const members = options.filter((option) => option.group === group); return members.length ? <optgroup key={group} label={group}>{members.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}</optgroup> : null })}
        </select></label>
      </div>
      <div className="progress-metric-grid">
        {main ? <>
          {metric('Estimated 1RM', lastEstimate ? fmtWt(lastEstimate.valueKg) : '—', lastEstimate ? `Completed set · ${fmtDate(lastEstimate.date)}` : 'No completed-set estimate')}
          {metric('Coach-entered 1RM', lastEntered ? fmtWt(lastEntered.valueKg) : '—', lastEntered ? `Coach entry · ${fmtDate(lastEntered.date)}` : 'No coach entry')}
          {metric('Training max', lastTm ? fmtWt(lastTm.valueKg) : '—', lastTm ? `Programming · ${fmtDate(lastTm.date)}` : 'No checkpoint')}
        </> : <>
          {metric('Recorded entries', work.length, '')}
          {metric('Latest recorded load', loadText(latestWork?.loadKg, fmtWt), latestWork ? fmtDate(latestWork.date) : '')}
          {metric('Latest recorded reps', latestWork?.reps ?? '—', latestWork ? `${fmtDate(latestWork.date)} · ${latestWork.sets ?? '—'} sets` : '')}
        </>}
      </div>
      <div className="progress-chart-toolbar"><h3>{estimateChart ? 'Estimated 1RM over time' : 'Recorded set load over time'} <ProgressInfo label="strength chart context" text={estimateChart ? 'Epley estimates from completed sets. Estimates are not tested maxima; training max is a programming reference.' : 'External load recorded for the same lift. Compare reps and source before interpreting change. Zero means no external load; missing values remain blank.'} /></h3>
        <label className="progress-lift-select">Chart period <select value={period} onChange={event => setPeriod(event.target.value)}>
          <option value="all">All time</option>{[7, 30, 90].map(days => <option key={days} value={days}>{days} days</option>)}
        </select></label>
        {main && <div className="progress-chart-switch" role="group" aria-label="Strength chart"><button type="button" aria-pressed={chart === 'estimate'} onClick={() => setChart('estimate')}>Estimated 1RM</button><button type="button" aria-pressed={chart === 'load'} onClick={() => setChart('load')}>Set load</button></div>}
      </div>
      <div className="progress-chart progress-strength-canvas"><Line data={{ datasets: [{ label: `${estimateChart ? 'Estimated 1RM' : 'Recorded set load'} (${unitName()})`, data: points, borderColor: COLORS.blue, tension: 0, pointRadius: 5, spanGaps: false }] }} options={opts} role="img" aria-label={`${estimateChart ? 'Estimated 1RM' : 'Recorded set load'} chart, ${trend.length} recorded values, ${unitName()}`} />
        {!trend.length && <p className="load-response-empty-label">{!lift ? 'Complete a set to start this chart.' : estimateChart ? 'No completed-set estimates in this period.' : 'No recorded loads in this period.'}</p>}
      </div>
      <div className="progress-card-foot"><span>{trend.length === 1 ? '1 record · 1 more dated record needed to compare' : trend.length ? `${trend.length} records · ${fmtDate(first.date)}–${fmtDate(last.date)}` : 'No comparable records'}</span>{change != null && <strong>{change > 0 ? '+' : ''}{toDisp(change)} {unitName()} from first record</strong>}</div>
    </section>
    <details className="card progress-disclosure progress-strength-logs"><summary>Recorded sets <span>{work.length} entries</span></summary>
      {work.length ? <div className="checkins-table-scroll" role="region" aria-label={`${lift} recorded work table; scroll horizontally for more columns`} tabIndex={0}>
        <table className="checkins-table">
          <caption className="sr-only">Recorded {lift} work</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Recorded load</th><th scope="col">Record</th></tr></thead>
          <tbody>{work.map((row, index) => {
            const booking = bookings.get(row.bookingId)
            const date = fmtDate(row.date)
            const when = booking?.time && booking.date === row.date ? `${date} · ${booking.time}` : date
            return <tr key={`${row.workoutId ?? row.date}-${row.source}-${index}`}>
              <th scope="row">{when}</th><td>{row.source}</td><td>{row.sets ?? '—'}</td><td>{row.reps ?? '—'}</td><td>{loadText(row.loadKg, fmtWt)}</td>
              <td>{row.workoutId ? <Link to={workoutReviewPath({ id: row.workoutId, date: row.date, clientId: client.id, bookingId: row.bookingId })}
                aria-label={`View workout · ${when}`}>View workout →</Link> : '—'}</td>
            </tr>
          })}</tbody>
        </table>
      </div> : <p className="progress-empty">No recorded sets.</p>}
    </details>
  </div>
}
