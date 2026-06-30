import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Kpi from '../components/atoms/Kpi'
import { BodyMetricForm } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { fmtDate } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'

export default function ProgressPage() {
  const { db, commit } = useData()
  const { openModal } = useModal()
  const { toDisp, fmtWt, unitName } = useFormat()
  const [clientId, setClientId] = useState(db.clients[0]?.id)
  const c = db.clients.find((x) => x.id === clientId)
  const logs = db.logs.filter((l) => l.clientId === clientId).sort((a, b) => a.date.localeCompare(b.date))

  const delLog = (lid) => commit((d) => { d.logs = d.logs.filter((l) => l.id !== lid) })
  const delta = (key) => {
    if (logs.length < 2) return 'No trend yet'
    const dd = (toDisp(logs[logs.length - 1][key]) - toDisp(logs[0][key])).toFixed(1)
    return (key === 'weightKg' ? (dd <= 0 ? '▼ ' : '▲ ') + Math.abs(dd) : '▲ +' + dd) + ' ' + unitName() + ' since start'
  }
  const opts = { ...baseOptions(), plugins: { legend: { display: false } } }

  return (
    <>
      <div className="topbar">
        <div><h1>Progress Tracking</h1><div className="sub">Body metrics &amp; strength over time</div></div>
        <div className="flex gap">
          <select style={{ width: 'auto' }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {db.clients.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
          </select>
          <Button onClick={() => openModal(<BodyMetricForm clientId={clientId} />)}>＋ Log Entry</Button>
        </div>
      </div>
      {!c ? <div className="empty"><div className="big">👥</div>Add a client to start tracking</div> : (
        <>
          <div className="grid cards-3">
            <Kpi label="Latest weight" value={logs.length ? fmtWt(logs[logs.length - 1].weightKg) : '—'} delta={delta('weightKg')} deltaColor="var(--green)" />
            <Kpi label="Squat 1RM est." value={logs.length ? fmtWt(logs[logs.length - 1].squat) : '—'} delta={delta('squat')} deltaColor="var(--green)" />
            <Kpi label="Entries logged" value={logs.length} delta={c.goal} />
          </div>
          <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
            <div className="card"><div className="section-title" style={{ margin: '0 0 12px' }}>Body Weight Trend</div>
              {logs.length > 1 ? <div style={{ height: 200 }}><Line data={{ labels: logs.map((l) => fmtDate(l.date)), datasets: [{ label: unitName(), data: logs.map((l) => toDisp(l.weightKg)), borderColor: '#4aa8ff', backgroundColor: 'rgba(74,168,255,.12)', fill: true, tension: 0.3 }] }} options={opts} /></div> : <div className="empty"><div className="big">📈</div>Need 2+ entries to chart</div>}
            </div>
            <div className="card"><div className="section-title" style={{ margin: '0 0 12px' }}>Strength Trend (Squat)</div>
              {logs.length > 1 ? <div style={{ height: 200 }}><Line data={{ labels: logs.map((l) => fmtDate(l.date)), datasets: [{ label: unitName(), data: logs.map((l) => toDisp(l.squat)), borderColor: '#ff5a3c', backgroundColor: 'rgba(255,90,60,.12)', fill: true, tension: 0.3 }] }} options={opts} /></div> : <div className="empty"><div className="big">🏋️</div>Need 2+ entries to chart</div>}
            </div>
          </div>
          <div className="card" style={{ marginTop: 16, padding: 0 }}>
            <table>
              <thead><tr><th>Date</th><th>Body weight</th><th>Squat ({unitName()})</th><th /></tr></thead>
              <tbody>
                {[...logs].reverse().map((l) => (
                  <tr key={l.id}><td>{fmtDate(l.date)}</td><td>{fmtWt(l.weightKg)}</td><td>{fmtWt(l.squat)}</td>
                    <td style={{ textAlign: 'right' }}><button className="x" aria-label="Delete entry" onClick={() => delLog(l.id)}>×</button></td></tr>
                ))}
                {!logs.length && <tr><td colSpan={4} className="muted" style={{ padding: 20, textAlign: 'center' }}>No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
