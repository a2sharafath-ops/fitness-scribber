import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import Icon from '../atoms/Icon'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { fmtDate } from '../../lib/dates'
import { LIFT_GROUPS, performedLiftHistory, performedLiftOptions } from '../../lib/performedLifts'

const newest = (rows) => [...rows].sort((a, b) => b.date.localeCompare(a.date))[0] || null
const sameLift = (a, b) => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b || '').trim().replace(/\s+/g, ' ').toLowerCase()

export default function StrengthDashboard({ client }) {
  const { db } = useData()
  const { fmtWt, toDisp, unitName } = useFormat()
  const options = performedLiftOptions(db, client.id)
  const history = performedLiftHistory(db, client.id)
  const records = (db.maxes || []).filter((m) => m.clientId === client.id)
  const [selected, setSelected] = useState('')
  const choice = options.find((option) => option.name === selected) || options[0]
  const lift = choice?.name

  if (!lift) return <div className="progress-strength">
    <div className="progress-section-head"><div><span className="progress-eyebrow">01 / Recorded performance</span><h2 id="progress-strength-title">Strength</h2><p>Choose from lifts this client has actually completed.</p></div></div>
    <p className="progress-empty">No performed lifts recorded yet. Complete a workout set or add a resistance log to build this list.</p>
  </div>

  const work = history.filter((row) => sameLift(row.name, lift))
  const loaded = [...work].filter((row) => row.loadKg > 0).reverse()
  const latestWork = work[0]
  const own = records.filter((m) => sameLift(m.exercise, lift))
  const estimates = own.filter((m) => m.kind === 'e1rm' && m.source === 'auto').sort((a, b) => a.date.localeCompare(b.date))
  const entered = own.filter((m) => m.kind === 'e1rm' && m.source !== 'auto')
  const tm = own.filter((m) => m.kind === 'tm')
  const firstEstimate = estimates[0]
  const lastEstimate = estimates.at(-1)
  const lastEntered = newest(entered)
  const lastTm = newest(tm)
  const hasMaxRecords = choice.group === 'Main Lift' && (lastEstimate || lastEntered || lastTm)
  const showEstimateTrend = choice.group === 'Main Lift' && estimates.length >= 2
  const showLoadTrend = !showEstimateTrend && loaded.length >= 2
  const firstTrend = showEstimateTrend ? firstEstimate : loaded[0]
  const lastTrend = showEstimateTrend ? lastEstimate : loaded.at(-1)
  const trendField = showEstimateTrend ? 'valueKg' : 'loadKg'
  const change = firstTrend && lastTrend ? +(lastTrend[trendField] - firstTrend[trendField]).toFixed(1) : null
  const opts = baseOptions()
  opts.plugins.legend.display = false
  opts.scales.y.title = { display: true, text: unitName() }

  return <div className="progress-strength">
    <div className="progress-section-head">
      <div><span className="progress-eyebrow">01 / Recorded performance</span><h2 id="progress-strength-title">Strength</h2><p>Only completed workout sets and dated resistance logs appear. Groups use the recorded workout block or exercise type.</p></div>
      <label className="progress-lift-select">Performed lift <select value={lift} onChange={(event) => setSelected(event.target.value)}>{LIFT_GROUPS.map((group) => {
        const members = options.filter((option) => option.group === group)
        return members.length ? <optgroup key={group} label={group}>{members.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}</optgroup> : null
      })}</select><span className="progress-lift-category" aria-hidden="true">{choice.group}</span></label>
    </div>
    {hasMaxRecords ? <div className="progress-metric-grid">
      <div className="progress-metric"><span>Estimated 1RM · completed set</span><strong>{lastEstimate ? fmtWt(lastEstimate.valueKg) : '—'}</strong><small>{lastEstimate ? `${fmtDate(lastEstimate.date)} · Epley estimate` : 'No completed-set estimate'}</small></div>
      <div className="progress-metric"><span>Coach-entered 1RM</span><strong>{lastEntered ? fmtWt(lastEntered.valueKg) : '—'}</strong><small>{lastEntered ? `${fmtDate(lastEntered.date)} · coach entry · test status not recorded` : 'No coach entry recorded'}</small></div>
      <div className="progress-metric"><span>Training max · programming</span><strong>{lastTm ? fmtWt(lastTm.valueKg) : '—'}</strong><small>{lastTm ? `${fmtDate(lastTm.date)} · ${lastTm.source === 'block-start' ? 'block-start checkpoint' : lastTm.source || 'recorded checkpoint'}` : 'No explicit checkpoint'}</small></div>
    </div> : <div className="progress-metric-grid">
      <div className="progress-metric"><span>Recorded entries</span><strong>{work.length}</strong><small>Completed sets or resistance logs for this lift</small></div>
      <div className="progress-metric"><span>Latest recorded load</span><strong>{latestWork.loadKg > 0 ? fmtWt(latestWork.loadKg) : 'No external load'}</strong><small>{fmtDate(latestWork.date)} · {latestWork.source}</small></div>
      <div className="progress-metric"><span>Latest recorded reps</span><strong>{latestWork.reps ?? '—'}</strong><small>{fmtDate(latestWork.date)} · {latestWork.sets ?? '—'} set{latestWork.sets === 1 ? '' : 's'}</small></div>
    </div>}
    <div className="progress-strength-detail">
      <div className="progress-inset">
        <h3>{showEstimateTrend ? 'Estimated 1RM over time' : 'Recorded set load over time'}</h3>
        {showEstimateTrend || showLoadTrend ? <>
          <div className="progress-compare-line"><Icon name="chart" size={15} /> {fmtWt(firstTrend[trendField])} on {fmtDate(firstTrend.date)} → {fmtWt(lastTrend[trendField])} on {fmtDate(lastTrend.date)} <b>({change > 0 ? '+' : ''}{toDisp(change)} {unitName()})</b></div>
          <div className="progress-chart"><Line data={{ labels: (showEstimateTrend ? estimates : loaded).map((row) => shortLabel(row.date)), datasets: [{ label: `${showEstimateTrend ? 'Estimated 1RM' : 'Recorded set load'} (${unitName()})`, data: (showEstimateTrend ? estimates : loaded).map((row) => toDisp(row[trendField])), borderColor: COLORS.blue, backgroundColor: 'rgba(11,135,201,.09)', fill: true, tension: 0.15, pointRadius: 5 }] }} options={opts} /></div>
        </> : <p className="progress-empty">{choice.group === 'Main Lift' && lastEstimate ? 'One estimate recorded. A second dated estimate will show change over time.' : loaded.length === 1 ? 'One loaded entry recorded. A second dated entry will show change over time.' : 'No comparable loaded entries yet. Recorded sets and reps remain available below.'}</p>}
        <p className="progress-footnote">{showEstimateTrend ? 'Same lift · Epley estimated 1RM · ' : 'Same lift · recorded set load; changes in reps can affect interpretation · '}{unitName()}</p>
      </div>
      <aside className="progress-inset progress-read-note" aria-label="How to read strength results">
        <h3>How to read this</h3>
        <p className="progress-explain">{showEstimateTrend ? 'A completed-set estimate is not a tested maximum. The training max is a programming reference.' : 'Recorded load shows what was logged, not power output or a tested maximum. Compare reps and source before interpreting change.'}</p>
        <dl><div><dt>Latest source</dt><dd>{showEstimateTrend ? `${fmtDate(lastEstimate.date)} · completed-set estimate` : `${fmtDate(latestWork.date)} · ${latestWork.source}`}</dd></div><div><dt>Comparison</dt><dd>{change == null ? 'A second comparable record is needed' : showEstimateTrend ? 'First and latest recorded estimates' : 'First and latest loaded entries'}</dd></div><div><dt>Next action</dt><dd>Review the source set before changing targets.</dd></div></dl>
      </aside>
    </div>
    <details className="progress-disclosure progress-strength-logs"><summary>View {work.length} recorded {lift} entr{work.length === 1 ? 'y' : 'ies'}</summary><div className="checkins-table-scroll" role="region" aria-label={`${lift} recorded work table; scroll horizontally for more columns`} tabIndex={0}><table className="checkins-table"><caption className="sr-only">Recorded {lift} work</caption><thead><tr><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Recorded load</th></tr></thead><tbody>{work.map((row, index) => <tr key={`${row.date}-${row.source}-${index}`}><th scope="row">{fmtDate(row.date)}</th><td>{row.source}</td><td>{row.sets ?? '—'}</td><td>{row.reps ?? '—'}</td><td>{row.loadKg == null ? 'Not recorded' : row.loadKg > 0 ? fmtWt(row.loadKg) : 'No external load'}</td></tr>)}</tbody></table></div></details>
  </div>
}
