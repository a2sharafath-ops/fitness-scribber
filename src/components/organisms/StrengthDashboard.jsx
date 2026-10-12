import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import ProgressInfo from '../atoms/ProgressInfo'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { LIFT_GROUPS, performedLiftHistory, performedLiftOptions } from '../../lib/performedLifts'

const newest = (rows) => [...rows].sort((a, b) => b.date.localeCompare(a.date))[0] || null
const sameLift = (a, b) => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b || '').trim().replace(/\s+/g, ' ').toLowerCase()
const loadText = (load, fmt) => load == null ? 'Not recorded' : load > 0 ? fmt(load) : 'No external load'

export default function StrengthDashboard({ client }) {
  const { db, tz } = useData()
  const { fmtWt, toDisp, unitName } = useFormat()
  const [selected, setSelected] = useState('')
  const [chart, setChart] = useState('estimate')
  const options = performedLiftOptions(db, client.id)
  const choice = options.find((option) => option.name === selected) || options[0]
  const lift = choice?.name
  const work = performedLiftHistory(db, client.id).filter((row) => sameLift(row.name, lift))
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
  const trend = estimateChart ? estimates : loaded
  const field = estimateChart ? 'valueKg' : 'loadKg'
  const first = trend[0], last = trend.at(-1)
  const change = trend.length >= 2 ? +(last[field] - first[field]).toFixed(1) : null
  const today = todayISO(tz)
  const dates = trend.length ? trend.map((row) => row.date) : Array.from({ length: 28 }, (_, i) => addDays(today, i - 27))
  const opts = baseOptions()
  opts.plugins.legend.display = false
  opts.scales.y.title = { display: true, text: unitName() }
  if (!trend.length) opts.scales.y.ticks = { ...opts.scales.y.ticks, display: false }
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
        {main && <div className="progress-chart-switch" role="group" aria-label="Strength chart"><button type="button" aria-pressed={chart === 'estimate'} onClick={() => setChart('estimate')}>Estimated 1RM</button><button type="button" aria-pressed={chart === 'load'} onClick={() => setChart('load')}>Set load</button></div>}
      </div>
      <div className="progress-chart progress-strength-canvas"><Line data={{ labels: dates.map(shortLabel), datasets: [{ label: `${estimateChart ? 'Estimated 1RM' : 'Recorded set load'} (${unitName()})`, data: trend.length ? trend.map((row) => toDisp(row[field])) : dates.map(() => null), borderColor: COLORS.blue, tension: 0.15, pointRadius: 5, spanGaps: false }] }} options={opts} role="img" aria-label={`${estimateChart ? 'Estimated 1RM' : 'Recorded set load'} chart, ${trend.length} recorded values, ${unitName()}`} />
        {!trend.length && <p className="load-response-empty-label">{!lift ? 'Complete a set to start this chart.' : estimateChart ? 'No completed-set estimates yet.' : 'No recorded loads yet.'}</p>}
      </div>
      <div className="progress-card-foot"><span>{trend.length === 1 ? '1 record · 1 more dated record needed to compare' : trend.length ? `${trend.length} records · ${fmtDate(first.date)}–${fmtDate(last.date)}` : 'No comparable records'}</span>{change != null && <strong>{change > 0 ? '+' : ''}{toDisp(change)} {unitName()} from first record</strong>}</div>
    </section>
    <details className="card progress-disclosure progress-strength-logs"><summary>Recorded sets <span>{work.length} entries</span></summary>
      {work.length ? <div className="checkins-table-scroll" role="region" aria-label={`${lift} recorded work table; scroll horizontally for more columns`} tabIndex={0}><table className="checkins-table"><caption className="sr-only">Recorded {lift} work</caption><thead><tr><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Recorded load</th><th scope="col">Record</th></tr></thead><tbody>{work.map((row, index) => <tr key={`${row.date}-${row.source}-${index}`}><th scope="row">{fmtDate(row.date)}</th><td>{row.source}</td><td>{row.sets ?? '—'}</td><td>{row.reps ?? '—'}</td><td>{loadText(row.loadKg, fmtWt)}</td><td>{row.source === 'Completed workout' ? <Link to={`/clients/${client.id}/training?date=${row.date}`}>View day →</Link> : '—'}</td></tr>)}</tbody></table></div> : <p className="progress-empty">No recorded sets.</p>}
    </details>
  </div>
}
