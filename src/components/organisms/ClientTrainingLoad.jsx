import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import Button from '../atoms/Button'
import InfoTip from '../atoms/InfoTip'
import ModalShell from '../molecules/ModalShell'
import LoadResponseChart from './LoadResponseChart'
import { SRPEForm, ResistanceForm, CardioForm } from './forms/LogForms'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { baseOptions, COLORS, shortLabel } from '../../lib/chartSetup'
import { acwrSeries, dailySum, MIN_ACWR_DAYS, sdev, trainingMonotony, trainingStrain } from '../../lib/calc'
import { toast, confirmDialog } from '../../lib/toast'
import { GLOSSARY } from '../../lib/glossary'
import { compareToObservedBand, trailingObservedBands } from '../../lib/progress'

const sourceOf = (row) => row?.source || 'Source not recorded'
const valueOf = (value, unit = '') => value == null || value === '' ? 'Not recorded' : `${value}${unit}`
const mine = (rows, id) => (rows || []).filter((row) => row.clientId === id).sort((a, b) => b.date.localeCompare(a.date))
const measureValue = (measure, row) => row?.[measure] == null ? 'Not calculable' : measure === 'strain' ? Math.round(row[measure]).toLocaleString() : row[measure].toFixed(2)
const unavailableReason = (measure, row) => {
  if (!row) return 'No session RPE entries in this period.'
  if (measure === 'acwr') return row.positive28 < MIN_ACWR_DAYS
    ? `${row.positive28}/${MIN_ACWR_DAYS} positive-load days needed by the existing 28-day calculation.`
    : 'The 28-day average load is zero, so the ratio is undefined.'
  if (measure === 'monotony') return 'No variation in the 7-day daily loads, so mean ÷ standard deviation is undefined.'
  return '7-day monotony is unavailable, so strain cannot be calculated.'
}

function LoadMetricGraphModal({ measure, history, clientName, today }) {
  const { closeModal } = useModal()
  const [displayDays, setDisplayDays] = useState(28)
  const [showBand, setShowBand] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const end = today
  const start = end && addDays(end, -(displayDays - 1))
  const dates = end ? Array.from({ length: displayDays }, (_, index) => addDays(start, index)) : []
  const chronological = history.filter((row) => row.date >= start).reverse()
  const byDate = Object.fromEntries(chronological.map((row) => [row.date, row]))
  const plotted = chronological.filter((row) => row[measure.id] != null)
  const selected = chronological.find((row) => row.date === selectedDate) || chronological.at(-1)
  const bands = showBand ? trailingObservedBands(history, measure.id, dates) : []
  const selectedBand = selected && bands[dates.indexOf(selected.date)]
  const inObservedSpan = (date) => chronological.length && date >= chronological[0].date && date <= chronological.at(-1).date
  const hasBand = dates.some((date, index) => inObservedSpan(date) && bands[index])
  const datasets = hasBand ? [
    { label: 'Lower quartile', data: dates.map((date, index) => inObservedSpan(date) ? bands[index]?.lower ?? null : null), borderColor: 'transparent', pointRadius: 0, fill: false },
    { label: 'Upper quartile', data: dates.map((date, index) => inObservedSpan(date) ? bands[index]?.upper ?? null : null), borderColor: 'transparent', pointRadius: 0, backgroundColor: 'rgba(11,135,201,.18)', fill: '-1' },
  ] : []
  datasets.push({ label: measure.title, data: dates.map((date) => byDate[date]?.[measure.id] ?? null), borderColor: COLORS.blue, backgroundColor: COLORS.blue, pointRadius: dates.map((date) => byDate[date]?.[measure.id] == null ? 0 : date === selected?.date ? 6 : 4), pointHoverRadius: 7, showLine: false, spanGaps: false })
  const axisLabel = measure.id === 'strain' ? 'Strain (AU)' : `${measure.title} (ratio)`
  const options = { ...baseOptions(), scales: { ...baseOptions().scales, y: { ...baseOptions().scales.y, title: { display: true, text: axisLabel } } }, plugins: { legend: { display: false }, tooltip: { filter: (item) => item.datasetIndex === datasets.length - 1, callbacks: { title: (items) => fmtDate(dates[items[0].dataIndex]), label: (item) => `${measure.title}: ${measureValue(measure.id, { [measure.id]: item.parsed.y })}` } } }, onClick: (_event, elements) => { if (elements.length && elements[0].datasetIndex === datasets.length - 1) setSelectedDate(dates[elements[0].index]) } }
  const bandText = selectedBand ? `${measureValue(measure.id, { [measure.id]: selectedBand.lower })}–${measureValue(measure.id, { [measure.id]: selectedBand.upper })}` : null
  const sources = selected && (measure.id === 'acwr' ? selected.sources28 : selected.sources7)
  const componentRows = selected && (measure.id === 'acwr' ? [
    ['7-day daily mean', `${(selected.load7 / 7).toFixed(1)} AU/day`],
    ['28-day daily mean', `${(selected.load28 / 28).toFixed(1)} AU/day`],
  ] : measure.id === 'monotony' ? [
    ['7-day daily mean', `${(selected.load7 / 7).toFixed(1)} AU/day`],
    ['7-day daily standard deviation', `${selected.sd7.toFixed(1)} AU/day`],
  ] : [
    ['7-day recorded load', `${selected.load7.toLocaleString()} AU`],
    ['7-day monotony', selected.monotony == null ? 'Unavailable' : selected.monotony.toFixed(2)],
  ])
  return <ModalShell title={`${measure.title} history`} onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <div className="progress-load-graph">
      <p className="progress-load-graph-intro">{clientName} · {GLOSSARY[measure.id].text}</p>
      <div className="progress-load-graph-controls"><label>Display period <select value={displayDays} onChange={(event) => setDisplayDays(Number(event.target.value))}><option value={28}>28 days</option><option value={56}>56 days</option><option value={84}>84 days</option></select></label><label className="progress-load-band-toggle"><input type="checkbox" checked={showBand} onChange={(event) => setShowBand(event.target.checked)} /> Show personal baseline band</label></div>
      {plotted.length ? <>
        <div className="progress-load-graph-canvas"><Line data={{ labels: dates.map(shortLabel), datasets }} options={options} role="img" aria-label={`${measure.title} on ${plotted.length} logged dates between ${fmtDate(start)} and ${fmtDate(end)}. Calendar days without a session RPE entry have no point.${selectedBand ? ` Trailing personal baseline band for ${fmtDate(selected.date)}: ${bandText}.` : ''}`} /></div>
        <div className="progress-load-graph-legend"><span><i className="progress-load-graph-point" /> Dated {measure.title} values</span>{hasBand && <span><i className="progress-load-graph-band" /> Trailing personal baseline band</span>}</div>
      </> : <p className="checkins-empty">No calculable {measure.title} values in this {displayDays}-day view. {unavailableReason(measure.id, chronological.at(-1))} Use “Record session RPE” on this page to add dated session effort and duration.</p>}
      <p className="checkins-window">{chronological.length}/{displayDays} calendar days have session RPE entries; {plotted.length} have a calculable {measure.title} value in {fmtDate(start)}–{fmtDate(end)}. Unlogged days have no point. {showBand ? selectedBand ? `On ${fmtDate(selected.date)}, the band is the middle 50% of ${selectedBand.count} earlier calculable values in the preceding 28 days (${bandText}).` : selected ? 'No band for the inspected date: fewer than four earlier calculable values in the preceding 28 days.' : 'No personal baseline band without calculable values.' : 'Personal baseline band hidden.'}</p>
      <details className="progress-derived-table"><summary>Show dated {measure.title} table</summary><div className="progress-derived-detail"><p className="checkins-window">Recorded session RPE dates in {fmtDate(start)}–{fmtDate(end)}. Each row uses calculation windows ending on its date. Source: this client’s session RPE × duration entries. Scroll the table sideways for all columns on narrow screens.</p>
        {chronological.length ? <LogTable caption={`${measure.title} history`}><thead><tr><th scope="col">Date</th><th scope="col">{measure.title}</th><th scope="col">7-day load</th><th scope="col">7-day coverage</th>{measure.id === 'acwr' && <th scope="col">28-day coverage</th>}<th scope="col">Sources in window</th></tr></thead><tbody>
          {[...chronological].reverse().map((row) => <tr key={row.date}><th scope="row">{fmtDate(row.date)}</th><td>{measureValue(measure.id, row)}</td><td>{row.load7.toLocaleString()} AU</td><td>{row.logged7}/7 days logged</td>{measure.id === 'acwr' && <td>{row.logged28}/28 days logged</td>}<td>{measure.id === 'acwr' ? row.sources28 : row.sources7}</td></tr>)}
        </tbody></LogTable> : <p className="checkins-empty">No session RPE observations yet, so this calculation and its history are unavailable.</p>}
        <p className="checkins-note">Unlogged days are treated as zero by these existing formulas; they may be missing entries rather than rest days. {measure.id === 'acwr' && `ACWR requires at least ${MIN_ACWR_DAYS} positive-load days in the 28-day window. `}These measures describe recorded load and do not provide a universal injury-risk or training-clearance threshold.</p>
      </div></details>
      {selected && <div className="progress-load-graph-breakdown"><label>Inspect recorded date <select value={selected.date} onChange={(event) => setSelectedDate(event.target.value)}>{[...chronological].reverse().map((row) => <option key={row.date} value={row.date}>{fmtDate(row.date)}</option>)}</select></label><div className="progress-load-graph-summary"><strong>{measure.title}: {measureValue(measure.id, selected)}</strong><span>{fmtDate(selected.date)} · {selected.logged7}/7 days logged{measure.id === 'acwr' ? ` · ${selected.logged28}/28 days logged` : ''}</span></div><dl>{componentRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Sources in calculation window: {sources}.</p></div>}
      <p className="checkins-note">The shaded band uses only earlier recorded values for each date; it is a descriptive comparison, not a target or injury-risk threshold. ACWR uses the existing coupled 7-day/28-day arithmetic averages; monotony uses the 7-day mean divided by its daily standard deviation; strain is 7-day load × monotony. Unlogged days enter those formulas as zero but may be missing records rather than rest days. No metric provides training clearance.</p>
    </div>
  </ModalShell>
}

function SourceLine({ row, today }) {
  return row ? <p className="checkins-source">{row.date === today ? 'Recorded today' : fmtDate(row.date)} · {sourceOf(row)}</p> : null
}

function LogTable({ caption, children }) {
  return <div className="checkins-table-scroll" role="region" aria-label={`${caption} table; scroll horizontally for more columns`} tabIndex={0}>
    <table className="checkins-table"><caption className="sr-only">{caption}</caption>{children}</table>
  </div>
}

function History({ count, label, children }) {
  return <details className="checkins-history"><summary>View {label} history ({count})</summary>{children}</details>
}
function AdvancedLoad({ rows, clientId, clientName, today }) {
  const { openModal } = useModal()
  const usable = rows.filter((row) => row.date <= today && typeof row.tl === 'number' && Number.isFinite(row.tl))
  const latest = usable.find((row) => row.date <= today)
  const map = dailySum(usable, clientId, 'tl')
  const derivedFor = (date) => {
    const dates = Array.from({ length: 28 }, (_, index) => addDays(date, index - 27))
    const load7 = dates.slice(-7).map((day) => map[day] || 0)
    const load28 = dates.map((day) => map[day] || 0)
    const logged7 = dates.slice(-7).filter((day) => Object.hasOwn(map, day)).length
    const logged28 = dates.filter((day) => Object.hasOwn(map, day)).length
    const monotony = sdev(load7) > 0 ? trainingMonotony(load7) : null
    return {
      date,
      acwr: acwrSeries(map, dates).at(-1),
      monotony,
      strain: monotony == null ? null : trainingStrain(load7),
      load7: load7.reduce((total, value) => total + value, 0),
      load28: load28.reduce((total, value) => total + value, 0),
      sd7: sdev(load7),
      logged7,
      logged28,
      positive28: load28.filter((value) => value > 0).length,
      sources7: [...new Set(usable.filter((row) => row.date >= dates.at(-7) && row.date <= date).map(sourceOf))].join(', '),
      sources28: [...new Set(usable.filter((row) => row.date >= dates[0] && row.date <= date).map(sourceOf))].join(', '),
    }
  }
  const history = [...new Set(usable.filter((row) => row.date >= addDays(today, -111)).map((row) => row.date))].map(derivedFor)
  const current = history[0]
  const recent = current && current.date >= addDays(today, -27)
  const measures = [
    { id: 'acwr', title: 'ACWR' },
    { id: 'monotony', title: 'Monotony' },
    { id: 'strain', title: 'Strain' },
  ]
  return <section className="progress-derived" aria-labelledby="progress-derived-title">
    <div className="progress-section-head"><h3 id="progress-derived-title">Load calculations</h3></div>
    <div className="progress-derived-cards">
      {measures.map((measure) => {
        const available = Boolean(recent && current[measure.id] != null)
        const band = available ? trailingObservedBands(history, measure.id, [current.date])[0] : null
        const position = compareToObservedBand(available ? current[measure.id] : null, band)
        const indicator = !available ? '— No comparison' : position === 'unavailable' ? '— Baseline unavailable' : {
          above: '↑ Above baseline', below: '↓ Below baseline', within: '≈ Within baseline',
        }[position]
        const detail = !recent ? `No session RPE in the past 28 days${latest ? `; last entry ${fmtDate(latest.date)}` : ''}.` : current[measure.id] == null
          ? `${fmtDate(current.date)}. ${unavailableReason(measure.id, current)}`
          : `${fmtDate(current.date)}. ${measure.id === 'acwr' ? `${current.logged28}/28` : `${current.logged7}/7`} days logged; other days unconfirmed.`
        return <button key={measure.id} type="button" className="progress-derived-card" aria-label={`Open ${measure.title} graph and table. ${indicator}. ${detail}`} onClick={() => openModal(<LoadMetricGraphModal measure={measure} history={history} clientName={clientName} today={today} />, true)}>
          <span className="progress-derived-card-heading"><span>{measure.title}</span>{recent && <time dateTime={current.date}>{shortLabel(current.date)}</time>}</span>
          <strong>{available ? measureValue(measure.id, current) : 'Not available'}</strong>
          <small className="progress-derived-trend">{indicator}</small>
          <span className="progress-derived-action">View history <span aria-hidden="true">↗</span></span>
        </button>
      })}
    </div>
  </section>
}

export default function ClientTrainingLoad({ client }) {
  const { db, tz, commit } = useData()
  const { openModal } = useModal()
  const { fmtVL, toDisp, unitName } = useFormat()
  const today = todayISO(tz)
  const del = async (collection, entryId) => {
    if (!await confirmDialog({ title: 'Delete entry', message: 'Delete this entry?', confirmLabel: 'Delete', danger: true })) return
    commit((draft) => { draft[collection] = draft[collection].filter((row) => row.id !== entryId) })
    toast('Entry deleted')
  }
  const srpe = mine(db.srpe, client.id)
  const resistance = mine(db.resistance, client.id)
  const cardio = mine(db.cardio, client.id)
  return <div className="progress-load-content">
    <div className="progress-section-head"><h2 id="progress-load-title">Training load</h2><Button onClick={() => openModal(<SRPEForm clientId={client.id} />)}>＋ Record session RPE</Button></div>
    <AdvancedLoad rows={srpe} clientId={client.id} clientName={client.name} today={today} />
    <LoadResponseChart db={db} clientId={client.id} today={today} />
    <div className="progress-load-logs">
      <section className="progress-log-card"><h3>Session RPE</h3><SourceLine row={srpe[0]} today={today} />
        {srpe[0] ? <p className="checkins-latest">{valueOf(srpe[0].rpe)}/10 RPE × {valueOf(srpe[0].duration, ' min')} = {valueOf(srpe[0].tl, ' AU')}</p> : <p className="checkins-empty">No session RPE observations yet.</p>}
        <History count={srpe.length} label="session RPE"><LogTable caption="Session RPE history"><thead><tr><th scope="col">Date</th><th scope="col">RPE</th><th scope="col">Duration</th><th scope="col">sRPE-TL <InfoTip {...GLOSSARY.srpeTl} /></th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {srpe.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.rpe)}</td><td>{valueOf(row.duration, ' min')}</td><td>{valueOf(row.tl, ' AU')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete session RPE from ${fmtDate(row.date)}`} onClick={() => del('srpe', row.id)}>×</button></td></tr>)}
          {!srpe.length && <tr><td colSpan={6} className="muted">No entries recorded.</td></tr>}
        </tbody></LogTable></History>
      </section>
      <section className="progress-log-card"><h3>Resistance</h3><SourceLine row={resistance[0]} today={today} />
        {resistance[0] ? <p className="checkins-latest">{resistance[0].exercise} · {valueOf(resistance[0].sets)} × {valueOf(resistance[0].reps)} × {resistance[0].weight == null ? 'Not recorded' : `${toDisp(resistance[0].weight)} ${unitName()}`}</p> : <p className="checkins-empty">No resistance logs recorded.</p>}
        <Button variant="ghost" onClick={() => openModal(<ResistanceForm clientId={client.id} />)}>＋ Log resistance</Button>
        <History count={resistance.length} label="resistance"><LogTable caption="Resistance log history"><thead><tr><th scope="col">Date</th><th scope="col">Exercise</th><th scope="col">Pattern</th><th scope="col">Sets × reps × {unitName()}</th><th scope="col">Volume load</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {resistance.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.exercise)}</td><td>{valueOf(row.pattern)}</td><td>{valueOf(row.sets)} × {valueOf(row.reps)} × {row.weight == null ? 'Not recorded' : toDisp(row.weight)}</td><td>{row.volumeLoad == null ? 'Not recorded' : fmtVL(row.volumeLoad)}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete resistance entry from ${fmtDate(row.date)}`} onClick={() => del('resistance', row.id)}>×</button></td></tr>)}
          {!resistance.length && <tr><td colSpan={7} className="muted">No resistance logs recorded.</td></tr>}
        </tbody></LogTable></History>
      </section>
      <section className="progress-log-card"><h3>Conditioning</h3><SourceLine row={cardio[0]} today={today} />
        {cardio[0] ? <p className="checkins-latest">{cardio[0].modality} · TRIMP {valueOf(cardio[0].trimp)} · TiZ {valueOf(cardio[0].tiz, ' min')}</p> : <p className="checkins-empty">No conditioning logs recorded.</p>}
        <Button variant="ghost" onClick={() => openModal(<CardioForm clientId={client.id} />)}>＋ Log conditioning</Button>
        <History count={cardio.length} label="conditioning"><LogTable caption="Conditioning log history"><thead><tr><th scope="col">Date</th><th scope="col">Modality</th><th scope="col">TRIMP <InfoTip {...GLOSSARY.trimp} /></th><th scope="col">TiZ <InfoTip {...GLOSSARY.tiz} /></th><th scope="col">TSS <InfoTip {...GLOSSARY.tss} /></th><th scope="col">HSD <InfoTip {...GLOSSARY.hsd} /></th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {cardio.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.modality)}</td><td>{valueOf(row.trimp)}</td><td>{valueOf(row.tiz, ' min')}</td><td>{valueOf(row.tss)}</td><td>{valueOf(row.hsd, ' km')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete conditioning entry from ${fmtDate(row.date)}`} onClick={() => del('cardio', row.id)}>×</button></td></tr>)}
          {!cardio.length && <tr><td colSpan={8} className="muted">No conditioning logs recorded.</td></tr>}
        </tbody></LogTable></History>
      </section>
    </div>
  </div>
}
