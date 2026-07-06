import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Shape from '../components/atoms/Shape'
import Kpi from '../components/atoms/Kpi'
import AnthroCell from '../components/molecules/AnthroCell'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ExportMenu from '../components/organisms/forms/ExportMenu'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { lastNDates, fmtDate, todayISO } from '../lib/dates'
import { readinessFor, dailySum, acwrSeries, trainingMonotony } from '../lib/calc'
import { forClient, baseline, latest, movementScore, compare, MOVEMENT_MAX } from '../lib/assessment'

const SEV = { High: 'red', Medium: 'yellow', Low: 'gray' }

export default function ReportPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const { fmtWt, fmtVL } = useFormat()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const r = readinessFor(db, c.id)
  const a = c.anthro || {}, ik = c.intake || {}
  const intMap = dailySum(db.srpe, c.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const wkVL = lastNDates(7, tz).reduce((s, d) => s + (dailySum(db.resistance, c.id, 'volumeLoad')[d] || 0), 0)
  const conc = db.concerns.filter((x) => x.clientId === c.id && x.status === 'Open')
  const recentRes = db.resistance.filter((x) => x.clientId === c.id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8)
  const today = todayISO(tz)

  // Assessment summary: movement (baseline→latest), body-comp deltas, goals.
  const alist = forClient(db.assessments, c.id)
  const mvB = baseline(alist, 'movement'), mvL = latest(alist, 'movement')
  const bcB = baseline(alist, 'body_comp'), bcL = latest(alist, 'body_comp')
  const bcRows = bcB && bcL && bcB.id !== bcL.id ? compare('body_comp', bcB, bcL) : []
  const goalsL = latest(alist, 'goals')

  return (
    <>
      <div className="flex between" style={{ marginBottom: 14 }}>
        <button className="back" style={{ margin: 0 }} onClick={() => nav('/command/' + c.id)}>← Back</button>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<ExportMenu clientId={c.id} />)}>⬇ CSV</Button>
          <Button onClick={() => window.print()}>🖨 Print / Save as PDF</Button>
        </div>
      </div>
      <div id="reportBody">
        <div className="flex between" style={{ borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
          <div><h1 style={{ fontSize: 22 }}>{c.name} — Athlete Report</h1>
            <div className="muted">{db.settings.businessName || 'Fitness Partner'} · {db.settings.trainerName || ''} · {fmtDate(today)}</div></div>
          <ReadinessTag readiness={r} />
        </div>
        <div className="anthro-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <AnthroCell label="Age" value={a.age} />
          <AnthroCell label="Height" value={a.heightCm} unit=" cm" />
          <AnthroCell label="Body mass" value={a.massKg != null ? fmtWt(a.massKg) : null} />
          <AnthroCell label="Body fat" value={a.bodyFatPct} unit="%" />
        </div>
        <div className="section-title">Current status (7-day)</div>
        <div className="kpi-strip">
          <Kpi label="Readiness" value={(r.wellness ?? '—') + '/28'} />
          <Kpi label="ACWR" value={acwr ? acwr.toFixed(2) : '—'} />
          <Kpi label="Monotony" value={mono} />
          <Kpi label="Weekly Volume Load" value={fmtVL(wkVL)} />
        </div>
        <div className="section-title">Intake &amp; history</div>
        <div className="intake-block"><div className="i-h">🩹 Injury history</div><div className="i-b">{ik.injury || '—'}</div></div>
        <div className="intake-block"><div className="i-h">🩺 Medical</div><div className="i-b">{ik.medical || '—'}</div></div>
        {alist.length > 0 && (
          <>
            <div className="section-title">Assessments</div>
            {mvL && (
              <div className="intake-block">
                <div className="i-h">🤸 Movement screen</div>
                <div className="i-b">
                  {mvB && mvB.id !== mvL.id
                    ? `Baseline ${movementScore(mvB.data).score}/${MOVEMENT_MAX} (${fmtDate(mvB.date)}) → Latest ${movementScore(mvL.data).score}/${MOVEMENT_MAX} (${fmtDate(mvL.date)})`
                    : `${movementScore(mvL.data).score}/${MOVEMENT_MAX} (${fmtDate(mvL.date)})`}
                </div>
              </div>
            )}
            {bcRows.length > 0 && (
              <table>
                <thead><tr><th>Body composition</th><th>{fmtDate(bcB.date)}</th><th>{fmtDate(bcL.date)}</th><th>Δ</th></tr></thead>
                <tbody>
                  {bcRows.map((r, i) => (
                    <tr key={i}><td>{r.label}</td><td>{r.from ?? '—'}{r.from != null ? r.unit : ''}</td><td>{r.to ?? '—'}{r.to != null ? r.unit : ''}</td>
                      <td>{r.delta != null && r.delta !== 0 ? `${r.delta > 0 ? '+' : ''}${r.delta}${r.unit || ''}` : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {goalsL && (goalsL.data.shortTerm?.length || goalsL.data.longTerm?.length) ? (
              <div className="intake-block">
                <div className="i-h">🎯 Goals</div>
                <div className="i-b">
                  {(goalsL.data.shortTerm || []).map((g, i) => <div key={'s' + i}>• {g.text}{g.by ? ` (by ${fmtDate(g.by)})` : ''} <span className="muted">— short-term</span></div>)}
                  {(goalsL.data.longTerm || []).map((g, i) => <div key={'l' + i}>• {g.text}{g.by ? ` (by ${fmtDate(g.by)})` : ''} <span className="muted">— long-term</span></div>)}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="section-title">Open concerns ({conc.length})</div>
        {conc.length ? conc.map((x) => (
          <div className="intake-block" key={x.id}><div className="i-b"><Tag color={SEV[x.severity]}><Shape color={SEV[x.severity]} /> {x.severity}</Tag> {x.text}</div></div>
        )) : <div className="muted">None</div>}
        <div className="section-title">Recent resistance work</div>
        <table>
          <thead><tr><th>Date</th><th>Exercise</th><th>Sets×Reps</th><th>Weight</th><th>Volume Load</th></tr></thead>
          <tbody>
            {recentRes.map((x) => (
              <tr key={x.id}><td>{fmtDate(x.date)}</td><td>{x.exercise}</td><td>{x.sets}×{x.reps}</td><td>{fmtWt(x.weight)}</td><td>{fmtVL(x.volumeLoad)}</td></tr>
            ))}
            {!recentRes.length && <tr><td colSpan={5} className="muted">No data</td></tr>}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 11, marginTop: 20 }}>Generated by Fitness Partner on {fmtDate(today)}. For coaching use.</p>
      </div>
    </>
  )
}
