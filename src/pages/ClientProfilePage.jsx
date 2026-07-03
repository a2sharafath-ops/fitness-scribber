import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import AnthroCell from '../components/molecules/AnthroCell'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { EditProfileForm } from '../components/organisms/ProfilePanel'
import ScreeningReview from '../components/organisms/screening/ScreeningReview'
import ScreeningProfile from '../components/organisms/screening/ScreeningProfile'
import CoachScreeningModal from '../components/organisms/screening/CoachScreeningModal'
import { RISK_ICON } from '../lib/format'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { fmtDate, todayISO } from '../lib/dates'
import { screeningsFor, programStatus, rescreenDue, OUTCOME_META } from '../lib/screening'
import { resolveAnthro } from '../lib/assessment'

const LEVEL = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }

export default function ClientProfilePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit } = useData()
  const { openModal } = useModal()
  const { fmtWt } = useFormat()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  // Anthro merges manual entry with screening/body-comp fallbacks.
  const a = resolveAnthro(db, c)
  const ik = c.intake || {}
  const scr = screeningsFor(db.screenings, c.id)
  const saveClearance = (cl) => commit((d) => {
    const row = d.screenings.find((x) => x.id === scr.complete.id)
    row.clearance = cl
    row.programStatus = programStatus(row)
  })
  const bmi = a.heightCm && a.massKg ? (a.massKg / (a.heightCm / 100) ** 2).toFixed(1) : '—'

  return (
    <>
      <button className="back" onClick={() => nav('/clients/' + c.id)}>← Back to {c.name.split(' ')[0]}'s overview</button>
      <div className="topbar">
        <div className="flex gap"><Avatar name={c.name} size={52} /><div>
          <h1>{c.name}</h1>
          <div className="sub">{c.email} · {c.phone}</div>
          {scr.complete && (
            // §4.1 snapshot — trainer-only badges (screening outcome, program gate, expiry)
            <div className="flex gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <Tag color={(OUTCOME_META[scr.complete.outcome] || {}).color || 'gray'}>
                {RISK_ICON[(OUTCOME_META[scr.complete.outcome] || {}).color || 'gray']} {(OUTCOME_META[scr.complete.outcome] || {}).label || 'Screened'}
              </Tag>
              <Tag color={programStatus(scr.complete) === 'gated' ? 'red' : 'green'}>
                {programStatus(scr.complete) === 'gated' ? RISK_ICON.red + ' Gated – pending review' : RISK_ICON.green + ' Program ready'}
              </Tag>
              <Tag color={rescreenDue(scr.complete, todayISO()) ? 'yellow' : 'gray'}>
                {rescreenDue(scr.complete, todayISO()) ? RISK_ICON.yellow + ' Re-screen due' : 'Valid until ' + fmtDate(scr.complete.validUntil)}
              </Tag>
            </div>
          )}
        </div></div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<ClientForm client={c} />)}>Edit basics</Button>
          <Button onClick={() => openModal(<EditProfileForm client={c} />, true)}>Edit details</Button>
        </div>
      </div>

      <div className="grid cards-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Profile</div>
          <div className="field"><label>Goal</label><div>{c.goal}</div></div>
          <div className="field"><label>Level</label><div><Tag color={LEVEL[c.level]}>{c.level}</Tag></div></div>
          <div className="field"><label>Status</label><div><Tag color={c.status === 'Active' ? 'green' : 'gray'}>{c.status}</Tag></div></div>
          <div className="field"><label>Plan tier</label><div><Tag color={c.plan === 'Premium' ? 'purple' : 'gray'}>{c.plan}</Tag></div></div>
          <div className="field"><label>Member since</label><div>{fmtDate(c.joined)}</div></div>
          <div className="field" style={{ margin: 0 }}><label>Notes</label><div className="muted">{c.notes || '—'}</div></div>
        </div>
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Anthropometrics</div>
          <div className="anthro-grid" style={{ margin: 0 }}>
            <AnthroCell label="Age" value={a.age} unit=" yr" />
            <AnthroCell label="Height" value={a.heightCm} unit=" cm" />
            <AnthroCell label="Body Mass" value={a.massKg != null ? fmtWt(a.massKg) : null} />
            <AnthroCell label="Body Fat" value={a.bodyFatPct} unit="%" />
            <AnthroCell label="Lean Mass" value={a.leanMassKg != null ? fmtWt(a.leanMassKg) : null} />
            <AnthroCell label="BMI" value={bmi} />
          </div>
          {a.derived && <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Auto-filled from screening / latest body-comp assessment — “Edit details” to override.</div>}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <ScreeningReview screening={scr.complete} draft={scr.draft} onClearance={saveClearance}
          onStart={() => openModal(<CoachScreeningModal client={c} />, true)} />
      </div>

      {scr.complete && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: '0 0 12px' }}>Client Profile — from screening</div>
          <ScreeningProfile screening={scr.complete} trainerView />
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: '0 0 12px' }}>Intake &amp; History Snapshot</div>
        {[['📋', 'Initial questionnaire', ik.questionnaire], ['🩺', 'Medical history', ik.medical], ['🩹', 'Injury history', ik.injury], ['🥗', 'Dietary notes', ik.diet]].map(([icn, h, v]) => (
          <div className="intake-block" key={h}>
            <div className="i-h">{icn} {h}</div>
            <div className="i-b">{v || '—'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
