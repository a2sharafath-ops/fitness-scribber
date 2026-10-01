import { useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import InfoTip from '../components/atoms/InfoTip'
import ConcernCard from '../components/molecules/ConcernCard'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { WellnessForm, WearableForm } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { callFunction, hasBackend } from '../api/functions'
import { addDays, fmtDate, lastNDates, todayISO } from '../lib/dates'
import { baseOptions, COLORS, shortLabel } from '../lib/chartSetup'
import { readinessParts, rolling30Baseline } from '../lib/calc'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { GLOSSARY } from '../lib/glossary'
import { loadProgressPath } from '../lib/clientRoutes'

const VIEWS = [['wellness', 'Wellness'], ['concerns', 'Concerns'], ['wearables', 'Wearables']]
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
  const { search, hash } = useLocation()
  const [params] = useSearchParams()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const client = db.clients.find((row) => row.id === id)
  const requestedView = params.get('view') || LEGACY_VIEWS[params.get('tab')]
  const view = VIEWS.some(([key]) => key === requestedView) ? requestedView : 'wellness'
  const today = todayISO(tz)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>
  if (requestedView === 'load') return <Navigate to={loadProgressPath(id, search, hash)} replace />

  const del = async (collection, entryId) => {
    if (!await confirmDialog({ title: 'Delete entry', message: 'Delete this entry?', confirmLabel: 'Delete', danger: true })) return
    commit((draft) => { draft[collection] = draft[collection].filter((row) => row.id !== entryId) })
    toast('Entry deleted')
  }

  return <>
    <div className="topbar checkins-title"><h1>Check-ins</h1></div>
    <nav className="checkins-views" aria-label="Check-ins views">
      {VIEWS.map(([key, label]) => <Link key={key} to={`?view=${key}`} className={'checkins-view-link' + (view === key ? ' active' : '')} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {view === 'wellness' && <WellnessView client={client} today={today} openModal={openModal} del={del} />}
    {view === 'concerns' && <ConcernsView client={client} openModal={openModal} />}
    {view === 'wearables' && <WearablesView client={client} openModal={openModal} del={del} />}
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
  const missingScoreInput = '1 complete wellness check-in needed for this date'

  return <div className="checkins-stack">
    <section className="card checkins-summary">
      <div className="checkins-section-head"><h2>Training response snapshot</h2><InfoTip {...GLOSSARY.readiness} /></div>
      {latestDate ? <div className="checkins-snapshot-grid">
        <div className="checkins-stat"><span>App readiness score</span><strong>{parts?.score == null ? '—' : `${parts.score}/100`}</strong><small>{fmtDate(latestDate)} · {parts?.score == null ? missingScoreInput : parts.confidence === 'high' ? 'wellness and HRV baseline' : 'one usable input'}</small></div>
        {dayWellness && <div className="checkins-stat"><span>Wellness input</span><strong>{valueOf(dayWellness.score)}/28</strong><small>{fmtDate(dayWellness.date)} · {sourceOf(dayWellness)}</small></div>}
        {dayWearable && <div className="checkins-stat"><span>Wearable input</span><strong>{valueOf(dayWearable.hrv, ' ms')} HRV</strong><small>{fmtDate(dayWearable.date)} · {sourceOf(dayWearable)}</small></div>}
      </div> : <p className="checkins-empty">No check-in or wearable data yet.</p>}
    </section>

    <section className="card">
      <div className="checkins-section-head"><h2>Wellness check-ins</h2><Button onClick={() => openModal(<WellnessForm clientId={client.id} />)}>＋ Record check-in</Button></div>
      {wellness[0] && <SourceLine row={wellness[0]} today={today} />}
      {wellness[0] ? <div className="checkins-latest">Latest: sleep {valueOf(wellness[0].sleep)}/7 · stress {valueOf(wellness[0].stress)}/7 · fatigue {valueOf(wellness[0].fatigue)}/7 · soreness {valueOf(wellness[0].soreness)}/7</div> : <p className="checkins-empty">No wellness check-ins yet.</p>}
      {observed > 1 && <div className="checkins-chart"><Line data={{ labels: dates.map(shortLabel), datasets: [{ label: 'Wellness score /28', data: dates.map((date) => byDate[date] ?? null), borderColor: COLORS.blue, backgroundColor: 'rgba(11,135,201,.08)', fill: false, pointRadius: 3, spanGaps: false }] }} options={lineOptions()} /></div>}
      {wellness.length > 0 && <History count={wellness.length} label="wellness"><LogTable caption="Wellness check-in history"><thead><tr><th scope="col">Date</th><th scope="col">Sleep</th><th scope="col">Stress</th><th scope="col">Fatigue</th><th scope="col">Soreness</th><th scope="col">Score</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {wellness.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.sleep)}</td><td>{valueOf(row.stress)}</td><td>{valueOf(row.fatigue)}</td><td>{valueOf(row.soreness)}</td><td>{valueOf(row.score)}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete wellness entry from ${fmtDate(row.date)}`} onClick={() => del('wellness', row.id)}>×</button></td></tr>)}
      </tbody></LogTable></History>}
    </section>
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

function WearablesView({ client, openModal, del }) {
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
    <section className="card"><div className="checkins-section-head"><h2>Wearable observations</h2><Button onClick={() => openModal(<WearableForm clientId={client.id} />)}>＋ Manual entry</Button></div>
      {latest ? <><div className="checkins-snapshot-grid"><div className="checkins-stat"><span>HRV (RMSSD)</span><strong>{valueOf(latest.hrv, ' ms')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div><div className="checkins-stat"><span>Resting heart rate</span><strong>{valueOf(latest.rhr, ' bpm')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div><div className="checkins-stat"><span>Sleep</span><strong>{valueOf(latest.sleepHrs, ' h')}</strong><small>{fmtDate(latest.date)} · {sourceOf(latest)}</small></div></div>{latest.hrv != null && <p className="checkins-window">30-day HRV baseline: {baseline ? `${baseline.toFixed(1)} ms (${baselineCount} reading${baselineCount === 1 ? '' : 's'})` : '1 earlier usable reading needed'}</p>}</> : <p className="checkins-empty">No wearable data yet.</p>}
      {observed > 1 && <div className="checkins-chart"><Line data={{ labels: dates.map(shortLabel), datasets: [{ label: 'HRV (ms)', data: dates.map((date) => byDate[date] ?? null), borderColor: COLORS.purple, pointRadius: 3, spanGaps: false }] }} options={lineOptions()} /></div>}
      {observed > 1 && <p className="checkins-window">Last 28 days · {observed}/28 days recorded</p>}
      {records.length > 0 && <History count={records.length} label="wearable"><LogTable caption="Wearable reading history"><thead><tr><th scope="col">Date</th><th scope="col">HRV</th><th scope="col">Resting HR</th><th scope="col">Sleep</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {records.map((row) => <tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{valueOf(row.hrv, ' ms')}</td><td>{valueOf(row.rhr, ' bpm')}</td><td>{valueOf(row.sleepHrs, ' h')}</td><td>{sourceOf(row)}</td><td><button className="x" aria-label={`Delete wearable reading from ${fmtDate(row.date)}`} onClick={() => del('wearable', row.id)}>×</button></td></tr>)}
      </tbody></LogTable></History>}
    </section>
    <section className="card"><div className="checkins-section-head"><h2>Device connection <InfoTip term="Device sync" text="Live sync requires backend functions and vendor credentials. Manual entry works without a device." /></h2>{client.monitorOptIn ? <Button variant="ghost" onClick={pauseSync}>Pause sync</Button> : <Button variant="ghost" onClick={enableSync}>Enable sync with consent</Button>}</div>{client.monitorOptIn && hasBackend && <ConnectDevices clientId={client.id} />}</section>
  </div>
}
