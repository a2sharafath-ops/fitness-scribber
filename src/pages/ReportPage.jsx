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
import { forClient, baseline, latest, movementScore, compare, MOVEMENT_MAX, resolveAnthro } from '../lib/assessment'
import { RISK_ICON } from '../lib/format'
import { screeningsFor, redFlags, OUTCOME_META, HHQ_CONDITIONS, HHQ_SYMPTOMS } from '../lib/screening'
import { questionText, generalYesIds, followupYesIds, DELAY_FLAGS } from '../lib/parq'

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
  const a = resolveAnthro(db, c)
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

  // Health history + PAR-Q, drawn from the completed pre-participation screening
  // (replaces the old free-text intake snapshot — that data now lives in the HHQ).
  const scr = screeningsFor(db.screenings, c.id).complete
  const h = scr?.hhq || {}
  const scrMeta = scr ? OUTCOME_META[scr.outcome] || { label: '—', color: 'gray' } : null
  const gYes = scr ? generalYesIds(scr.parq?.general) : []
  const fYes = scr ? followupYesIds(scr.parq?.followup) : []
  const delays = scr ? DELAY_FLAGS.filter((d) => scr.parq?.delay?.[d.id]) : []
  const flags = scr ? redFlags(scr) : { major: [], minor: [] }
  const conditions = HHQ_CONDITIONS.filter((x) => ['past', 'current'].includes(h.conditions?.[x.id]?.status))
    .map((x) => `${x.label} (${h.conditions[x.id].status})`)
  const symptoms = HHQ_SYMPTOMS.filter((x) => h.symptoms?.[x.id] === true).map((x) => x.label)
  const meds = [h.meds?.prescriptions && `Rx: ${h.meds.prescriptions}`, h.meds?.otc && `OTC: ${h.meds.otc}`,
    h.meds?.supplements && `Supplements: ${h.meds.supplements}`, h.meds?.allergies && `Allergies: ${h.meds.allergies}`].filter(Boolean)
  const injuries = [h.msk?.currentPain && `Current pain: ${h.msk.currentPain}`, h.msk?.pastInjuries && `Past injuries: ${h.msk.pastInjuries}`,
    h.msk?.surgeries && `Surgeries: ${h.msk.surgeries}`, h.msk?.romLimits && `ROM limits: ${h.msk.romLimits}`,
    h.msk?.avoidMovements && `Avoid: ${h.msk.avoidMovements}`].filter(Boolean)

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
        <div className="section-title">Health history &amp; PAR-Q</div>
        {!scr ? (
          <div className="muted">No pre-participation screening on file.</div>
        ) : (
          <>
            <div className="intake-block">
              <div className="i-h">📋 PAR-Q+ outcome</div>
              <div className="i-b">
                <Tag color={scrMeta.color}>{RISK_ICON[scrMeta.color]} {scr.outcome} — {scrMeta.label}</Tag>
                <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>Completed {fmtDate(scr.completedOn)} · valid until {fmtDate(scr.validUntil)}</span>
                {gYes.length || fYes.length || delays.length ? (
                  <div style={{ marginTop: 6 }}>
                    {gYes.map((qid) => <div key={qid}>YES — {questionText(qid)}</div>)}
                    {fYes.map((qid) => <div key={'f' + qid}>YES — {questionText(qid)}</div>)}
                    {delays.map((d) => <div key={d.id}>{RISK_ICON.yellow} {d.text}</div>)}
                  </div>
                ) : <div className="muted" style={{ marginTop: 4 }}>No questions triggered review.</div>}
              </div>
            </div>
            {(flags.major.length > 0 || flags.minor.length > 0) && (
              <div className="intake-block">
                <div className="i-h">🚩 Red flags</div>
                <div className="i-b">
                  {flags.major.map((x) => <div key={x}>{RISK_ICON.red} {x}</div>)}
                  {flags.minor.map((x) => <div key={x}>{RISK_ICON.yellow} {x}</div>)}
                </div>
              </div>
            )}
            <div className="intake-block">
              <div className="i-h">🩺 Medical &amp; health history</div>
              <div className="i-b">
                <div><strong>Conditions:</strong> {conditions.length ? conditions.join(' · ') : '—'}</div>
                <div><strong>Current symptoms:</strong> {symptoms.length ? symptoms.join(' · ') : '—'}</div>
                <div><strong>Medications / allergies:</strong> {meds.length ? meds.join(' · ') : '—'}</div>
              </div>
            </div>
            <div className="intake-block">
              <div className="i-h">🩹 Injuries, pain &amp; movement</div>
              <div className="i-b">{injuries.length ? injuries.map((t, i) => <div key={i}>{t}</div>) : '—'}</div>
            </div>
          </>
        )}
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
