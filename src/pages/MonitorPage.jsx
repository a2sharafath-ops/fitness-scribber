import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Kpi from '../components/atoms/Kpi'
import InfoTip from '../components/atoms/InfoTip'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ReadinessMatrix from '../components/organisms/ReadinessMatrix'
import ClientSubnav from '../components/templates/ClientSubnav'
import { WellnessForm, SRPEForm, ResistanceForm, CardioForm, WearableForm } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { callFunction, hasBackend } from '../api/functions'
import { uid } from '../lib/format'
import { lastNDates, fmtDate } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { readinessFor, latestOf, rolling30Baseline, deviationPct } from '../lib/calc'
import { toast, confirmDialog } from '../lib/toast'
import { GLOSSARY } from '../lib/glossary'

const shortLbl = (iso) => fmtDate(iso).replace(/, \d+$/, '')

export default function MonitorPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const { fmtVL, toDisp } = useFormat()
  const [tab, setTab] = useState('readiness')
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const del = async (coll, eid) => {
    if (!await confirmDialog({ title: 'Delete entry', message: 'Delete this entry?', confirmLabel: 'Delete', danger: true })) return
    commit((d) => { d[coll] = d[coll].filter((x) => x.id !== eid) })
    toast('Entry deleted')
  }
  const r = readinessFor(db, c.id)
  const tabs = [['readiness', 'Readiness'], ['subjective', 'Subjective Log'], ['objective', 'Objective Log'], ['wearables', 'Wearables']]

  return (
    <>
      <ClientSubnav client={c} />
      <div className="topbar">
        <div className="flex gap"><Avatar name={c.name} size={46} /><div>
          <h1 style={{ fontSize: 21 }}>Athlete Monitor — {c.name}</h1>
          <div className="sub">Internal &amp; external load · readiness · dose-response</div>
        </div></div>
        <ReadinessTag readiness={r} />
      </div>

      <div className="tabs">
        {tabs.map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'readiness' && <ReadinessTabView client={c} />}
      {tab === 'subjective' && <SubjectiveTab client={c} del={del} openModal={openModal} />}
      {tab === 'objective' && <ObjectiveTab client={c} del={del} openModal={openModal} fmtVL={fmtVL} toDisp={toDisp} />}
      {tab === 'wearables' && <WearablesTab client={c} del={del} openModal={openModal} commit={commit} tz={tz} db={db} />}
    </>
  )
}

function ReadinessTabView({ client }) {
  const { db, tz } = useData()
  const pts = []
  lastNDates(28, tz).forEach((dt) => {
    const w = db.wellness.find((x) => x.clientId === client.id && x.date === dt)
    const hr = db.wearable.find((x) => x.clientId === client.id && x.date === dt)
    if (w && hr) { const base = rolling30Baseline(db, client.id, 'hrv', dt); if (base) pts.push({ x: w.score, y: +deviationPct(hr.hrv, base).toFixed(1), date: dt }) }
  })
  return (
    <div className="grid cards-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 6px' }}>Readiness Matrix</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Subjective wellness (x) vs objective HRV deviation (y). Quadrants flag at-risk athletes.</div>
        <ReadinessMatrix client={client} />
      </div>
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 10px' }}>Daily Readiness (last 10)</div>
        {[...pts].reverse().slice(0, 10).map((p) => {
          const sg = p.x >= 20, og = p.y >= -5
          const col = sg && og ? 'green' : !sg && !og ? 'red' : 'yellow'
          const lbl = col === 'green' ? 'Ready' : col === 'red' ? 'At-risk' : 'Monitor'
          return (
            <div key={p.date} className="flex between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(p.date)}</span>
              <span className="muted" style={{ fontSize: 12 }}>W {p.x}/28 · HRV {p.y > 0 ? '+' : ''}{p.y}%</span>
              <Tag color={col}>{lbl}</Tag>
            </div>
          )
        })}
        {!pts.length && <div className="muted">No paired data yet</div>}
      </div>
    </div>
  )
}

function SubjectiveTab({ client, del, openModal }) {
  const { db } = useData()
  const well = db.wellness.filter((x) => x.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const srpe = db.srpe.filter((x) => x.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const wAsc = [...well].reverse()
  const sAsc = [...srpe].reverse()
  return (
    <div className="grid cards-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Hooper Index — Wellness</div>
          <Button size="sm" onClick={() => openModal(<WellnessForm clientId={client.id} />)}>＋ Log</Button></div>
        {well.length > 1 && <div style={{ height: 150, marginTop: 12 }}><Line data={{ labels: wAsc.map((x) => shortLbl(x.date)), datasets: [{ label: 'Wellness /28', data: wAsc.map((x) => x.score), borderColor: '#34c759', backgroundColor: 'rgba(61,220,151,.12)', fill: true, tension: 0.3 }] }} options={{ ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 6, font: { size: 9 } } }, y: { min: 4, max: 28, grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } } } }} /></div>}
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Date</th><th>Slp</th><th>Str</th><th>Fat</th><th>Sor</th><th>Score</th><th /></tr></thead>
          <tbody>
            {well.slice(0, 8).map((w) => (
              <tr key={w.id}><td>{fmtDate(w.date)}</td><td>{w.sleep}</td><td>{w.stress}</td><td>{w.fatigue}</td><td>{w.soreness}</td><td><strong>{w.score}</strong></td>
                <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete" onClick={() => del('wellness', w.id)}>×</button></td></tr>
            ))}
            {!well.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 16 }}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Session RPE — Internal Load</div>
          <Button size="sm" onClick={() => openModal(<SRPEForm clientId={client.id} />)}>＋ Log</Button></div>
        {srpe.length > 1 && <div style={{ height: 150, marginTop: 12 }}><Bar data={{ labels: sAsc.map((x) => shortLbl(x.date)), datasets: [{ label: 'sRPE-TL', data: sAsc.map((x) => x.tl), backgroundColor: '#fb404a' }] }} options={{ ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 6, font: { size: 9 } } }, y: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } } } }} /></div>}
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Date</th><th>sRPE</th><th>Duration</th><th>sRPE-TL <InfoTip {...GLOSSARY.srpeTl} /></th><th /></tr></thead>
          <tbody>
            {srpe.slice(0, 8).map((s) => (
              <tr key={s.id}><td>{fmtDate(s.date)}</td><td>{s.rpe}</td><td>{s.duration} min</td><td><strong>{s.tl}</strong> AU</td>
                <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete" onClick={() => del('srpe', s.id)}>×</button></td></tr>
            ))}
            {!srpe.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 16 }}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ObjectiveTab({ client, del, openModal, fmtVL, toDisp }) {
  const { db } = useData()
  const res = db.resistance.filter((x) => x.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const card = db.cardio.filter((x) => x.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const patterns = ['Squat', 'Hinge', 'Push', 'Pull', 'Carry', 'Other']
  const byPat = patterns.map((p) => res.filter((rr) => rr.pattern === p).reduce((a, rr) => a + rr.volumeLoad, 0))
  return (
    <div className="grid cards-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Resistance — Volume Load</div>
          <Button size="sm" onClick={() => openModal(<ResistanceForm clientId={client.id} />)}>＋ Log</Button></div>
        {byPat.some((v) => v) && <div style={{ height: 150, marginTop: 12 }}><Doughnut data={{ labels: patterns, datasets: [{ data: byPat, backgroundColor: ['#fb404a', '#0b87c9', '#34c759', '#af52de', '#ffcc00', '#6e6f76'] }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#6e6f76', boxWidth: 12, font: { size: 11 } } }, title: { display: true, text: 'Volume Load by movement pattern', color: '#6e6f76' } } }} /></div>}
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Date</th><th>Exercise</th><th>Pattern</th><th>S×R×W</th><th>VL</th><th /></tr></thead>
          <tbody>
            {res.slice(0, 10).map((rr) => (
              <tr key={rr.id}><td>{fmtDate(rr.date)}</td><td>{rr.exercise}</td><td><Tag color="gray">{rr.pattern}</Tag></td>
                <td className="muted">{rr.sets}×{rr.reps}×{toDisp(rr.weight)}</td><td><strong>{fmtVL(rr.volumeLoad)}</strong></td>
                <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete" onClick={() => del('resistance', rr.id)}>×</button></td></tr>
            ))}
            {!res.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 16 }}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Conditioning Load</div>
          <Button size="sm" onClick={() => openModal(<CardioForm clientId={client.id} />)}>＋ Log</Button></div>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Date</th><th>Modality</th><th>TRIMP <InfoTip {...GLOSSARY.trimp} /></th><th>TiZ <InfoTip {...GLOSSARY.tiz} /></th><th>TSS <InfoTip {...GLOSSARY.tss} /></th><th>HSD <InfoTip {...GLOSSARY.hsd} /></th><th /></tr></thead>
          <tbody>
            {card.slice(0, 10).map((x) => (
              <tr key={x.id}><td>{fmtDate(x.date)}</td><td>{x.modality}</td><td>{x.trimp}</td><td>{x.tiz}m</td><td>{x.tss}</td><td>{x.hsd}km</td>
                <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete" onClick={() => del('cardio', x.id)}>×</button></td></tr>
            ))}
            {!card.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 16 }}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConnectDevices({ clientId }) {
  const { refresh } = useData()
  const [busy, setBusy] = useState(false)
  const connect = async (provider) => {
    setBusy(true)
    try { const { url } = await callFunction('wearable-connect', { provider, clientId }); if (url) window.location.href = url }
    catch (e) { toast('Connect failed: ' + (e.message || 'function not deployed'), 'error') } finally { setBusy(false) }
  }
  const sync = async () => {
    setBusy(true)
    try { const r = await callFunction('wearable-sync', { clientId }); await refresh(); toast(`Synced ${r.synced ?? 0} device(s).`) }
    catch (e) { toast('Sync failed: ' + (e.message || 'function not deployed'), 'error') } finally { setBusy(false) }
  }
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title" style={{ margin: '0 0 4px' }}>Connect a real device (OAuth)</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Pulls morning HRV / RHR / sleep automatically. Requires the wearable Edge Functions deployed with your vendor API keys.</p>
      <div className="flex gap" style={{ flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('oura')}>Connect Oura</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('whoop')}>Connect Whoop</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => connect('fitbit')}>Connect Fitbit</Button>
        <Button size="sm" disabled={busy} onClick={sync}>⟳ Sync now</Button>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>Apple Health has no web API — use the manual entry above, or a companion iOS app.</p>
    </div>
  )
}

function WearablesTab({ client, del, openModal, commit, tz, db }) {
  if (!client.monitorOptIn) {
    const enable = async () => {
      if (!await confirmDialog({ title: 'Confirm consent', message: 'Confirm the athlete has consented to share wearable data?', confirmLabel: 'Confirm' })) return
      commit((d) => { d.clients.find((c) => c.id === client.id).monitorOptIn = true })
      toast('Wearable sync enabled')
    }
    return (
      <div className="card"><div className="empty">
        <div className="big">⌚</div><strong>Wearable sync is opt-in</strong>
        <p className="muted" style={{ maxWidth: 460, margin: '10px auto' }}>Connecting a wearable pulls Morning HRV (RMSSD), Resting Heart Rate and Total Sleep against a rolling 30-day baseline to gauge objective readiness.</p>
        <Button style={{ marginTop: 8 }} onClick={enable}>Enable wearable sync (with athlete consent)</Button>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Supported integrations: Apple HealthKit · Google Health Connect · Oura · Whoop.<br /><em>Live OAuth requires a backend service — manual &amp; simulated entry available now.</em></p>
      </div></div>
    )
  }
  const data = db.wearable.filter((x) => x.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const latest = data[0]
  const bl = (f) => (latest ? rolling30Baseline(db, client.id, f, latest.date) : 0)
  const disconnect = () => commit((d) => { d.clients.find((c) => c.id === client.id).monitorOptIn = false })
  const simulate = () => {
    const base = latestOf(db.wearable, client.id)
    const today = lastNDates(1, tz)[0]
    commit((d) => {
      const o = { clientId: client.id, date: today, hrv: Math.round((base ? base.hrv : 60) + (Math.random() - 0.5) * 8), rhr: Math.round((base ? base.rhr : 58) + (Math.random() - 0.5) * 5), sleepHrs: +((base ? base.sleepHrs : 7.5) + (Math.random() - 0.5)).toFixed(1), source: 'Oura (simulated)' }
      const ex = d.wearable.find((w) => w.clientId === client.id && w.date === today)
      if (ex) Object.assign(ex, o); else d.wearable.push({ id: uid(), ...o })
    })
  }
  const card = (label, val, unit, f, goodHigh) => {
    const b = bl(f); const dev = b ? deviationPct(val, b) : 0; const good = goodHigh ? dev >= -5 : dev <= 5
    return <Kpi label={label} value={<>{val}<span style={{ fontSize: 13, color: 'var(--muted)' }}>{unit}</span></>} delta={b ? `${dev > 0 ? '+' : ''}${dev.toFixed(1)}% vs baseline ${b.toFixed(0)}` : 'building baseline'} deltaColor={b ? (good ? 'var(--green)' : 'var(--accent)') : 'var(--muted)'} />
  }
  const dts = lastNDates(28, tz)
  const hrvByDate = {}; data.forEach((x) => (hrvByDate[x.date] = x.hrv))
  const series = dts.map((d) => hrvByDate[d] ?? null)
  const base = dts.map((d) => { const b = rolling30Baseline(db, client.id, 'hrv', d); return b ? +b.toFixed(0) : null })

  return (
    <>
      <div className="flex between" style={{ marginBottom: 14 }}>
        <Tag color="green">⌚ Wearable connected · {latest ? latest.source : '—'}</Tag>
        <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={simulate}>⟳ Simulate morning pull</Button>
          <Button size="sm" onClick={() => openModal(<WearableForm clientId={client.id} />)}>＋ Manual entry</Button>
          <Button variant="ghost" size="sm" onClick={disconnect}>Disconnect</Button>
        </div>
      </div>
      {latest && (
        <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {card(<>Morning HRV (RMSSD) <InfoTip {...GLOSSARY.rmssd} /></>, latest.hrv, ' ms', 'hrv', true)}
          {card('Resting HR', latest.rhr, ' bpm', 'rhr', false)}
          {card('Total Sleep', latest.sleepHrs, ' h', 'sleepHrs', true)}
        </div>
      )}
      {hasBackend && <ConnectDevices clientId={client.id} />}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: '0 0 10px' }}>HRV vs 30-day baseline</div>
        {data.length > 1 ? (
          <div style={{ height: 160 }}><Line data={{ labels: dts.map(shortLbl), datasets: [
            { label: 'HRV (ms)', data: series, borderColor: '#af52de', backgroundColor: 'rgba(167,139,250,.12)', tension: 0.3, spanGaps: true, fill: true },
            { label: '30-day baseline', data: base, borderColor: '#6e6f76', borderDash: [5, 4], pointRadius: 0, spanGaps: true },
          ] }} options={{ ...baseOptions(), scales: { x: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76', maxTicksLimit: 8, font: { size: 9 } } }, y: { grid: { color: '#eceae7' }, ticks: { color: '#6e6f76' } } } }} /></div>
        ) : <div className="muted">Need more readings</div>}
      </div>
      <div className="card" style={{ marginTop: 16, padding: 0 }}>
        <table>
          <thead><tr><th>Date</th><th>HRV</th><th>RHR</th><th>Sleep</th><th>Source</th><th /></tr></thead>
          <tbody>
            {data.slice(0, 12).map((x) => (
              <tr key={x.id}><td>{fmtDate(x.date)}</td><td>{x.hrv} ms</td><td>{x.rhr} bpm</td><td>{x.sleepHrs} h</td><td className="muted">{x.source}</td>
                <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete" onClick={() => del('wearable', x.id)}>×</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
