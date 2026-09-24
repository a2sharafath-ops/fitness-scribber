import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Bar, Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import InfoTip from '../components/atoms/InfoTip'
import ConcernCard from '../components/molecules/ConcernCard'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { WellnessForm, SRPEForm, ResistanceForm, CardioForm, WearableForm } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { callFunction, hasBackend } from '../api/functions'
import { addDays, fmtDate, lastNDates, todayISO } from '../lib/dates'
import { baseOptions, COLORS, shortLabel } from '../lib/chartSetup'
import { acwrSeries, dailySum, readinessParts, rolling30Baseline, sdev, trainingMonotony, trainingStrain } from '../lib/calc'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { GLOSSARY } from '../lib/glossary'

const VIEWS = [['wellness', 'Wellness'], ['load', 'Training load'], ['concerns', 'Concerns'], ['wearables', 'Wearables']]
const LEGACY_VIEWS = { readiness: 'wellness', subjective: 'wellness', objective: 'load', wearables: 'wearables' }
const sourceOf = (row) => row?.source || 'Source not recorded'
const valueOf = (value, unit = '') => value == null || value === '' ? 'Not recorded' : `${value}${unit}`
const mine = (rows, id) => (rows || []).filter((row) => row.clientId === id).sort((a, b) => b.date.localeCompare(a.date))
const lineOptions = () => ({ ...baseOptions(), plugins: { legend: { display: false } }, spanGaps: false })

function SourceLine({ row, today }) {
  return <p className="checkins-source">{row ? `${row.date === today ? 'Recorded today' : fmtDate(row.date)} · ${sourceOf(row)}` : 'Not recorded · source unavailable'}</p>
}

function LogTable({ caption, children }) {
  return <div className="checkins-table-scroll" role="region" aria-label={`${caption} table; scroll horizontally for more columns`} tabIndex={0}>
    <table className="checkins-table"><caption className="sr-only">{caption}</caption>{children}</table>
  </div>
}

function History({ count, label, children }) {
  return <details className="checkins-history"><summary>View all {count} {label} entr{count === 1 ? 'y' : 'ies'}</summary>{children}</details>
}

export default function MonitorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const client = db.clients.find((row) => row.id === id)
  const requestedView = params.get('view') || LEGACY_VIEWS[params.get('tab')]
  const view = VIEWS.some(([key]) => key === requestedView) ? requestedView : 'wellness'
  const today = todayISO(tz)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>

  const del = async (collection, entryId) => {
    if (!await confirmDialog({ title: 'Delete entry', message: 'Delete this entry?', confirmLabel: 'Delete', danger: true })) return
    commit((draft) => { draft[collection] = draft[collection].filter((row) => row.id !== entryId) })
    toast('Entry deleted')
  }

  return <>
    <div className="topbar checkins-title"><div><h1>Check-ins &amp; load</h1><div className="sub">Review response, recorded training, concerns, and device observations for {client.name}</div></div></div>
    <nav className="checkins-views" aria-label="Check-ins and load views">
      {VIEWS.map(([key, label]) => <Link key={key} to={`?view=${key}`} className={'checkins-view-link' + (view === key ? ' active' : '')} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {view === 'wellness' && <WellnessView client={client} today={today} openModal={openModal} del={del} />}
    {view === 'load' && <TrainingLoadView client={client} today={today} openModal={openModal} del={del} />}
    {view === 'concerns' && <ConcernsView client={client} openModal={openModal} />}
    {view === 'wearables' && <WearablesView client={client} today={today} openModal={openModal} del={del} />}
  </>
}

function WellnessView({ client, today, openModal, del }) {
  const { db, tz } = useData()
  const wellness = mine(db.wellness, client.id)
  const wearable = mine(db.wearable, client.id)
  const latestDate = [wellness[0]?.date, wearable[0]?.date].filter(Boolean).sort().at(-1)
  const parts = latestDate ? readinessParts(db, client.id, latestDate) : null
  const dayWellness = wellness.find((row) => row.date === latestDate)
  const dayWearable = wearable.find((row) => row.date === latestDate)
  const dates = lastNDates(28, tz)
  const byDate = Object.fromEntries(wellness.map((row) => [row.date, row.score]))
  const observed = dates.filter((date) => Object.hasOwn(byDate, date)).length

  return <div className="checkins-stack">
    <section className="card checkins-summary">
      <div className="checkins-section-head"><div><h2>Training response snapshot</h2><p className="muted">{latestDate ? `Inputs recorded on ${fmtDate(latestDate)}` : 'No check-in or wearable reading recorded yet'}</p></div><InfoTip {...GLOSSARY.readiness} /></div>
      <div className="checkins-snapshot-grid">
        <div className="checkins-stat"><span>App readiness score</span><strong>{parts?.score == null ? '—' : `${parts.score}/100`}</strong><small>{latestDate ? fmtDate(latestDate) : 'Date unavailable'} · {parts?.score == null ? 'not enough comparable input' : parts.confidence === 'high' ? 'wellness and HRV baseline' : 'one usable input'}</small></div>
        <div className="checkins-stat"><span>Wellness input</span><strong>{dayWellness ? `${valueOf(dayWellness.score)}/28` : 'Missing'}</strong><small>{dayWellness ? `${fmtDate(dayWellness.date)} · ${sourceOf(dayWellness)}` : `No check-in on ${fmtDate(latestDate)}`}</small></div>
        <div className="checkins-stat"><span>Wearable input</span><strong>{dayWearable ? `${valueOf(dayWearable.hrv, ' ms')} HRV` : 'Missing'}</strong><small>{dayWearable ? `${fmtDate(dayWearable.date)} · ${sourceOf(dayWearable)}` : `No wearable reading on ${fmtDate(latestDate)}`}</small></div>
      </div>
      <p className="checkins-note">This is a dated interpretation of available inputs, not medical or exercise clearance. A missing device reading does not block a manual wellness check-in.</p>
    </section>

    <section className="card">
      <div className="checkins-section-head"><div><h2>Wellness check-ins</h2><p className="muted">Sleep quality, stress, fatigue, and soreness, each rated 1–7.</p></div><Button onClick={() => openModal(<WellnessForm clientId={client.id} />)}>＋ Record check-in</Button></div>
      <SourceLine row={wellness[0]} today={today} />
      {wellness[0] ? <div className="checkins-latest">Latest: sleep {valueOf(wellness[0].sleep)}/7 · stress {valueOf(wellness[0].stress)}/7 · fatigue {valueOf(wellness[0].fatigue)}/7 · soreness {valueOf(wellness[0].soreness)}/7</div> : <p className="checkins-empty">No wellness observations yet. Manual entry is available above.</p>}
      {observed > 1 && <div className="checkins-chart"><Line data={{ labels: dates.map(shortLabel), datasets: [{ label: 'Wellness score /28', data: dates.map((date) => byDate[date] ?? null), borderColor: COLORS.blue, backgroundColor: 'rgba(11,135,201,.08)', fill: false, pointRadius: 3, spanGaps: false }] }} options={lineOptions()} /></div>}
      <p className="checkins-window">Last 28 days · {fmtDate(dates[0])}–{fmtDate(dates.at(-1))} · {observed}/28 days recorded. Blank days are unrecorded, not zero scores.</p>
      <History count={wellness.length} label="wellness"><LogTable caption="Wellness check-in history"><thead><tr><th scope="col">Date</th><th scope="col">Sleep</th><th scope="col">Stress</th><th scope="col">Fatigue</th><th scope="col">Soreness</th><th scope="col">Score</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {wellness.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.sleep)}</td><td>{valueOf(row.stress)}</td><td>{valueOf(row.fatigue)}</td><td>{valueOf(row.soreness)}</td><td>{valueOf(row.score)}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete wellness entry from ${fmtDate(row.date)}`} onClick={() => del('wellness', row.id)}>×</button></td></tr>)}
        {!wellness.length && <tr><td colSpan={8} className="muted">No entries recorded.</td></tr>}
      </tbody></LogTable></History>
    </section>
  </div>
}

function AdvancedLoad({ rows, clientId, today }) {
  const usable = rows.filter((row) => typeof row.tl === 'number' && Number.isFinite(row.tl))
  const latest = usable.find((row) => row.date <= today)
  if (!latest) return <p className="checkins-empty">No session RPE observations yet, so derived load measures are unavailable.</p>
  const end = latest.date
  const start = addDays(end, -27)
  const dates = Array.from({ length: 28 }, (_, index) => addDays(start, index))
  const map = dailySum(usable, clientId, 'tl')
  const load7 = dates.slice(-7).map((date) => map[date] || 0)
  const logged7 = dates.slice(-7).filter((date) => Object.hasOwn(map, date)).length
  const logged28 = dates.filter((date) => Object.hasOwn(map, date)).length
  const acwr = acwrSeries(map, dates).at(-1)
  const monotony = sdev(load7) > 0 ? trainingMonotony(load7) : null
  const strain = monotony == null ? null : trainingStrain(load7)
  const weekly = load7.reduce((total, value) => total + value, 0)
  return <>
    <div className="checkins-window">Computed through {fmtDate(end)} from recorded sRPE × duration entries. 7-day window: {fmtDate(dates.at(-7))}–{fmtDate(end)}, {logged7}/7 days logged. 28-day window: {fmtDate(start)}–{fmtDate(end)}, {logged28}/28 days logged.</div>
    <div className="checkins-advanced-grid">
      <div className="checkins-stat"><span>7-day recorded load</span><strong>{weekly.toLocaleString()} AU</strong><small>Sum of sRPE-TL · {logged7} logged days</small></div>
      <div className="checkins-stat"><span>ACWR <InfoTip {...GLOSSARY.acwr} /></span><strong>{acwr == null ? '—' : acwr.toFixed(2)}</strong><small>7-day average ÷ 28-day average · {acwr == null ? 'insufficient recorded training days' : `${logged28} logged days in the 28-day window`}</small></div>
      <div className="checkins-stat"><span>Monotony <InfoTip {...GLOSSARY.monotony} /></span><strong>{monotony == null ? '—' : monotony}</strong><small>7-day mean ÷ day-to-day standard deviation · {monotony == null ? 'no load variation to divide by' : `${logged7} logged days`}</small></div>
      <div className="checkins-stat"><span>Strain <InfoTip {...GLOSSARY.strain} /></span><strong>{strain == null ? '—' : strain.toLocaleString()}</strong><small>7-day recorded load × monotony</small></div>
    </div>
    <p className="checkins-note">Unlogged days are treated as zero by these existing formulas; they may be missing entries rather than rest days. These ratios describe recorded load and do not provide a universal injury-risk or training-clearance threshold.</p>
  </>
}

function TrainingLoadView({ client, today, openModal, del }) {
  const { db, tz } = useData()
  const { fmtVL, toDisp, unitName } = useFormat()
  const srpe = mine(db.srpe, client.id)
  const resistance = mine(db.resistance, client.id)
  const cardio = mine(db.cardio, client.id)
  const dates = lastNDates(28, tz)
  const loadMap = dailySum(srpe.filter((row) => typeof row.tl === 'number' && Number.isFinite(row.tl)), client.id, 'tl')
  const observed = dates.filter((date) => Object.hasOwn(loadMap, date)).length

  return <div className="checkins-stack">
    <section className="card">
      <div className="checkins-section-head"><div><h2>Session effort</h2><p className="muted">sRPE × duration, in arbitrary units (AU). This is a record of internal training load.</p></div><Button onClick={() => openModal(<SRPEForm clientId={client.id} />)}>＋ Record session RPE</Button></div>
      <SourceLine row={srpe[0]} today={today} />
      {srpe[0] ? <div className="checkins-latest">Latest: {valueOf(srpe[0].rpe)}/10 RPE × {valueOf(srpe[0].duration, ' min')} = {valueOf(srpe[0].tl, ' AU')}</div> : <p className="checkins-empty">No session effort recorded yet.</p>}
      {observed > 0 && <div className="checkins-chart"><Bar data={{ labels: dates.map(shortLabel), datasets: [{ label: 'Recorded sRPE-TL (AU)', data: dates.map((date) => Object.hasOwn(loadMap, date) ? loadMap[date] : null), backgroundColor: COLORS.blue }] }} options={lineOptions()} /></div>}
      <p className="checkins-window">Last 28 days · {fmtDate(dates[0])}–{fmtDate(dates.at(-1))} · {observed}/28 days logged. Blank days are unlogged, not confirmed rest days.</p>
      <details className="checkins-advanced"><summary>Advanced load calculations: ACWR, monotony and strain</summary><AdvancedLoad rows={srpe} clientId={client.id} today={today} /></details>
      <History count={srpe.length} label="session RPE"><LogTable caption="Session RPE history"><thead><tr><th scope="col">Date</th><th scope="col">RPE</th><th scope="col">Duration</th><th scope="col">sRPE-TL <InfoTip {...GLOSSARY.srpeTl} /></th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {srpe.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.rpe)}</td><td>{valueOf(row.duration, ' min')}</td><td>{valueOf(row.tl, ' AU')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete session RPE from ${fmtDate(row.date)}`} onClick={() => del('srpe', row.id)}>×</button></td></tr>)}
        {!srpe.length && <tr><td colSpan={6} className="muted">No entries recorded.</td></tr>}
      </tbody></LogTable></History>
    </section>

    <div className="checkins-load-grid">
      <section className="card"><div className="checkins-section-head"><div><h2>Resistance logs</h2><p className="muted">Sets × reps × load, with the recorded movement pattern.</p></div><Button variant="ghost" onClick={() => openModal(<ResistanceForm clientId={client.id} />)}>＋ Log resistance</Button></div><SourceLine row={resistance[0]} today={today} />
        {resistance[0] ? <p className="checkins-latest">Latest: {resistance[0].exercise} · {valueOf(resistance[0].sets)} × {valueOf(resistance[0].reps)} × {resistance[0].weight == null ? 'Not recorded' : `${toDisp(resistance[0].weight)} ${unitName()}`}</p> : <p className="checkins-empty">No resistance logs recorded.</p>}
        <History count={resistance.length} label="resistance"><LogTable caption="Resistance log history"><thead><tr><th scope="col">Date</th><th scope="col">Exercise</th><th scope="col">Pattern</th><th scope="col">Sets × reps × {unitName()}</th><th scope="col">Volume load</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {resistance.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.exercise)}</td><td>{valueOf(row.pattern)}</td><td>{valueOf(row.sets)} × {valueOf(row.reps)} × {row.weight == null ? 'Not recorded' : toDisp(row.weight)}</td><td>{row.volumeLoad == null ? 'Not recorded' : fmtVL(row.volumeLoad)}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete resistance entry from ${fmtDate(row.date)}`} onClick={() => del('resistance', row.id)}>×</button></td></tr>)}
          {!resistance.length && <tr><td colSpan={7} className="muted">No resistance logs recorded.</td></tr>}
        </tbody></LogTable></History>
      </section>
      <section className="card"><div className="checkins-section-head"><div><h2>Conditioning logs</h2><p className="muted">Recorded modality and conditioning measures. Blank fields remain missing.</p></div><Button variant="ghost" onClick={() => openModal(<CardioForm clientId={client.id} />)}>＋ Log conditioning</Button></div><SourceLine row={cardio[0]} today={today} />
        {cardio[0] ? <p className="checkins-latest">Latest: {cardio[0].modality} · TRIMP {valueOf(cardio[0].trimp)} · TiZ {valueOf(cardio[0].tiz, ' min')}</p> : <p className="checkins-empty">No conditioning logs recorded.</p>}
        <History count={cardio.length} label="conditioning"><LogTable caption="Conditioning log history"><thead><tr><th scope="col">Date</th><th scope="col">Modality</th><th scope="col">TRIMP <InfoTip {...GLOSSARY.trimp} /></th><th scope="col">TiZ <InfoTip {...GLOSSARY.tiz} /></th><th scope="col">TSS <InfoTip {...GLOSSARY.tss} /></th><th scope="col">HSD <InfoTip {...GLOSSARY.hsd} /></th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {cardio.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.modality)}</td><td>{valueOf(row.trimp)}</td><td>{valueOf(row.tiz, ' min')}</td><td>{valueOf(row.tss)}</td><td>{valueOf(row.hsd, ' km')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete conditioning entry from ${fmtDate(row.date)}`} onClick={() => del('cardio', row.id)}>×</button></td></tr>)}
          {!cardio.length && <tr><td colSpan={8} className="muted">No conditioning logs recorded.</td></tr>}
        </tbody></LogTable></History>
      </section>
    </div>
  </div>
}

function ConcernsView({ client, openModal }) {
  const { db, commit } = useData()
  const concerns = mine(db.concerns, client.id)
  const open = concerns.filter((row) => row.status === 'Open')
  const resolved = concerns.filter((row) => row.status === 'Resolved')
  const resolve = async (id) => {
    const note = await promptDialog({ title: 'Resolve concern', message: 'Resolution note (optional):', multiline: true, confirmLabel: 'Resolve' })
    if (note === null) return
    commit((draft) => { const row = draft.concerns.find((item) => item.id === id); row.status = 'Resolved'; row.resolution = note.trim() })
    toast('Concern resolved')
  }
  const reopen = (id) => { commit((draft) => { const row = draft.concerns.find((item) => item.id === id); row.status = 'Open'; row.resolution = '' }); toast('Concern reopened', 'info') }
  const remove = async (id) => {
    if (!await confirmDialog({ title: 'Delete concern', message: 'Delete this concern? This cannot be undone.', confirmLabel: 'Delete', danger: true })) return
    commit((draft) => { draft.concerns = draft.concerns.filter((row) => row.id !== id) })
    toast('Concern deleted')
  }
  const cards = (rows) => rows.map((row) => <ConcernCard key={row.id} concern={row} clientName={client.name} session={row.sessionId ? db.sessions.find((session) => session.id === row.sessionId && session.clientId === client.id) : null}
    onResolve={() => resolve(row.id)} onReopen={() => reopen(row.id)} onEdit={() => openModal(<ConcernForm concern={row} />)} onDelete={() => remove(row.id)} />)
  return <div className="checkins-stack">
    <section className="card"><div className="checkins-section-head"><div><h2>Open concerns</h2><p className="muted">{open.length} open · review the report, date, and source before the next session.</p></div><Button onClick={() => openModal(<ConcernForm clientId={client.id} />)}>＋ Flag a concern</Button></div>{open.length ? cards(open) : <p className="checkins-empty">No open concerns recorded.</p>}</section>
    <section className="card"><h2>Resolved concerns</h2>{resolved.length ? cards(resolved) : <p className="checkins-empty">No resolved concerns recorded.</p>}</section>
  </div>
}

function ConnectDevices({ clientId }) {
  const { refresh } = useData()
  const [busy, setBusy] = useState(false)
  const connect = async (provider) => {
    setBusy(true)
    try { const { url } = await callFunction('wearable-connect', { provider, clientId }); if (url) window.location.href = url }
    catch (error) { toast('Connect failed: ' + (error.message || 'function not deployed'), 'error') } finally { setBusy(false) }
  }
  const sync = async () => {
    setBusy(true)
    try {
      const result = await callFunction('wearable-sync', { clientId })
      try { await refresh(); toast(`Synced ${result.synced ?? 0} device(s).`) }
      catch (error) { toast(`Device sync finished, but data could not reload: ${error.message || 'refresh failed'}`, 'error') }
    }
    catch (error) { toast('Sync failed: ' + (error.message || 'function not deployed'), 'error') } finally { setBusy(false) }
  }
  return <div className="checkins-device-actions"><Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('oura')}>Connect Oura</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('whoop')}>Connect Whoop</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('fitbit')}>Connect Fitbit</Button><Button size="sm" disabled={busy} onClick={sync}>Sync now</Button></div>
}

function WearablesView({ client, today, openModal, del }) {
  const { db, commit, tz } = useData()
  const records = mine(db.wearable, client.id)
  const latest = records[0]
  const dates = lastNDates(28, tz)
  const byDate = Object.fromEntries(records.map((row) => [row.date, row.hrv]))
  const observed = dates.filter((date) => byDate[date] != null).length
  const baseline = latest ? rolling30Baseline(db, client.id, 'hrv', latest.date) : null
  const baselineCount = latest ? records.filter((row) => row.date < latest.date && row.date >= addDays(latest.date, -30) && row.hrv != null).length : 0
  const enableSync = async () => {
    if (!await confirmDialog({ title: 'Confirm consent', message: 'Confirm this client has consented to share wearable data before enabling sync.', confirmLabel: 'Enable sync' })) return
    commit((draft) => { draft.clients.find((row) => row.id === client.id).monitorOptIn = true })
    toast('Wearable sync enabled')
  }
  const pauseSync = () => { commit((draft) => { draft.clients.find((row) => row.id === client.id).monitorOptIn = false }); toast('Wearable sync paused') }
  return <div className="checkins-stack">
    <section className="card"><div className="checkins-section-head"><div><h2>Wearable observations</h2><p className="muted">Sync is {client.monitorOptIn ? 'enabled' : 'off'} for this client. Manual entry and existing records remain available.</p></div><Button onClick={() => openModal(<WearableForm clientId={client.id} />)}>＋ Manual entry</Button></div>
      <SourceLine row={latest} today={today} />
      {latest ? <><div className="checkins-snapshot-grid"><div className="checkins-stat"><span>HRV (RMSSD)</span><strong>{valueOf(latest.hrv, ' ms')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div><div className="checkins-stat"><span>Resting heart rate</span><strong>{valueOf(latest.rhr, ' bpm')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div><div className="checkins-stat"><span>Sleep</span><strong>{valueOf(latest.sleepHrs, ' h')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div></div><p className="checkins-window">Prior 30-day HRV average: {baselineCount ? `${baseline.toFixed(1)} ms from ${baselineCount} reading${baselineCount === 1 ? '' : 's'}` : 'not available'}. This is personal context, not a clearance or risk threshold.</p></> : <p className="checkins-empty">No wearable reading recorded. Wellness check-ins can still be entered manually.</p>}
      {observed > 1 && <div className="checkins-chart"><Line data={{ labels: dates.map(shortLabel), datasets: [{ label: 'HRV (ms)', data: dates.map((date) => byDate[date] ?? null), borderColor: COLORS.purple, pointRadius: 3, spanGaps: false }] }} options={lineOptions()} /></div>}
      <p className="checkins-window">Last 28 days · {fmtDate(dates[0])}–{fmtDate(dates.at(-1))} · {observed}/28 days with HRV recorded. Gaps are missing readings.</p>
      <History count={records.length} label="wearable"><LogTable caption="Wearable reading history"><thead><tr><th scope="col">Date</th><th scope="col">HRV</th><th scope="col">Resting HR</th><th scope="col">Sleep</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {records.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.hrv, ' ms')}</td><td>{valueOf(row.rhr, ' bpm')}</td><td>{valueOf(row.sleepHrs, ' h')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete wearable reading from ${fmtDate(row.date)}`} onClick={() => del('wearable', row.id)}>×</button></td></tr>)}
        {!records.length && <tr><td colSpan={6} className="muted">No wearable observations recorded.</td></tr>}
      </tbody></LogTable></History>
    </section>
    <section className="card"><div className="checkins-section-head"><div><h2>Device connection</h2><p className="muted">A device is optional. Live OAuth and sync require deployed backend functions and vendor keys.</p></div>{client.monitorOptIn ? <Button variant="ghost" onClick={pauseSync}>Pause sync</Button> : <Button variant="ghost" onClick={enableSync}>Enable sync with consent</Button>}</div>{client.monitorOptIn && hasBackend && <ConnectDevices clientId={client.id} />}</section>
  </div>
}
