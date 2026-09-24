import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import Icon from '../atoms/Icon'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { fmtDate } from '../../lib/dates'

const newest = (rows) => [...rows].sort((a, b) => b.date.localeCompare(a.date))[0] || null

export default function StrengthDashboard({ client }) {
  const { db } = useData()
  const { fmtWt, toDisp, unitName } = useFormat()
  const records = (db.maxes || []).filter((m) => m.clientId === client.id)
  const lifts = [...new Set([...(client.trackedLifts || []), ...records.map((m) => m.exercise)])].sort()
  const [selected, setSelected] = useState('')
  const lift = lifts.includes(selected) ? selected : lifts[0]

  if (!lift) return <div className="card progress-strength"><h2>Strength</h2><p className="muted">No lift history yet. Track a lift below, then record a 1RM or complete a main-lift set.</p></div>

  const own = records.filter((m) => m.exercise.toLowerCase() === lift.toLowerCase())
  const estimates = own.filter((m) => m.kind === 'e1rm' && m.source === 'auto').sort((a, b) => a.date.localeCompare(b.date))
  const entered = own.filter((m) => m.kind === 'e1rm' && m.source !== 'auto')
  const tm = own.filter((m) => m.kind === 'tm')
  const firstEstimate = estimates[0]
  const lastEstimate = estimates.at(-1)
  const lastEntered = newest(entered)
  const lastTm = newest(tm)
  const change = firstEstimate && lastEstimate && firstEstimate.id !== lastEstimate.id
    ? +(lastEstimate.valueKg - firstEstimate.valueKg).toFixed(1) : null

  const opts = baseOptions()
  opts.plugins.legend.display = false
  opts.scales.y.title = { display: true, text: unitName() }

  return (
    <div className="card progress-strength">
      <div className="progress-section-head">
        <div><h2>Strength</h2><p className="muted">Estimated values from completed sets, coach entries, and programming maxes have separate sources.</p></div>
        <label className="progress-lift-select">Lift <select value={lift} onChange={(e) => setSelected(e.target.value)}>{lifts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      <div className="progress-metric-grid">
        <div className="progress-metric"><span>Latest estimated 1RM</span><strong>{lastEstimate ? fmtWt(lastEstimate.valueKg) : '—'}</strong><small>{lastEstimate ? `Epley from completed set · ${fmtDate(lastEstimate.date)}` : 'No completed-set estimate'}</small></div>
        <div className="progress-metric"><span>Latest coach-entered 1RM</span><strong>{lastEntered ? fmtWt(lastEntered.valueKg) : '—'}</strong><small>{lastEntered ? `Coach entry · ${fmtDate(lastEntered.date)} · test status not recorded` : 'No coach entry'}</small></div>
        <div className="progress-metric"><span>Training max checkpoint</span><strong>{lastTm ? fmtWt(lastTm.valueKg) : '—'}</strong><small>{lastTm ? `${fmtDate(lastTm.date)} · ${lastTm.source === 'block-start' ? 'block start' : lastTm.source || 'recorded'}` : 'No explicit checkpoint'}</small></div>
      </div>
      {estimates.length >= 2 ? <>
        <div className="progress-compare-line"><Icon name="chart" size={15} /> Estimated 1RM: {fmtWt(firstEstimate.valueKg)} on {fmtDate(firstEstimate.date)} → {fmtWt(lastEstimate.valueKg)} on {fmtDate(lastEstimate.date)} <b>({change > 0 ? '+' : ''}{toDisp(change)} {unitName()})</b></div>
        <div className="progress-chart"><Line data={{ labels: estimates.map((m) => shortLabel(m.date)), datasets: [{ label: `Estimated 1RM (${unitName()})`, data: estimates.map((m) => toDisp(m.valueKg)), borderColor: COLORS.blue, backgroundColor: 'rgba(11,135,201,.09)', fill: true, tension: 0.15, pointRadius: 5 }] }} options={opts} /></div>
      </> : <p className="progress-footnote">{lastEstimate ? 'One estimate recorded. A second dated estimate will show change over time.' : 'No estimated 1RM for this lift. Complete a main-lift set to create one.'}</p>}
      <p className="progress-footnote">The training max is a programming checkpoint; it is not an observed test result. The chart shows estimated 1RM only, in {unitName()}.</p>
    </div>
  )
}
