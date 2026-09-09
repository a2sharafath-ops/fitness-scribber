import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import AnthroCell from '../components/molecules/AnthroCell'
import { ClientForm, UpgradePackageForm } from '../components/organisms/forms/ClientForms'
import { EditProfileForm } from '../components/organisms/ProfilePanel'
import ScreeningReview from '../components/organisms/screening/ScreeningReview'
import ScreeningProfile from '../components/organisms/screening/ScreeningProfile'
import CoachScreeningModal from '../components/organisms/screening/CoachScreeningModal'
import ClientSubnav from '../components/templates/ClientSubnav'
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
  const scr = screeningsFor(db.screenings, c.id)
  const saveClearance = (cl) => commit((d) => {
    const row = d.screenings.find((x) => x.id === scr.complete.id)
    row.clearance = cl
    row.programStatus = programStatus(row)
  })
  const bmi = a.heightCm && a.massKg ? (a.massKg / (a.heightCm / 100) ** 2).toFixed(1) : '—'

  return (
    <div className="coach-page">
      <ClientSubnav client={c} />
      <div className="topbar">
        <div className="flex gap"><Avatar name={c.name} size={52} /><div>
          <p className="coach-eyebrow">Client details</p><h1>{c.name}</h1>
          <div className="sub">{c.email} · {c.phone}</div>
          {scr.complete && (
            // §4.1 snapshot — trainer-only badges (screening outcome, program gate, expiry)
            <div className="flex gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <Tag color={(OUTCOME_META[scr.complete.outcome] || {}).color || 'gray'}>
                {RISK_ICON[(OUTCOME_META[scr.complete.outcome] || {}).color || 'gray']} {(OUTCOME_META[scr.complete.outcome] || {}).label || 'Screened'}
              </Tag>
              <Tag color={programStatus(scr.complete) === 'gated' ? 'red' : 'green'}>
                {programStatus(scr.complete) === 'gated' ? RISK_ICON.red + ' Needs review before training' : RISK_ICON.green + ' Ready for programming'}
              </Tag>
              <Tag color={rescreenDue(scr.complete, todayISO()) ? 'yellow' : 'gray'}>
                {rescreenDue(scr.complete, todayISO()) ? RISK_ICON.yellow + ' Re-screen due' : 'Valid until ' + fmtDate(scr.complete.validUntil)}
              </Tag>
            </div>
          )}
        </div></div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<ClientForm client={c} />)}>Edit contact details</Button>
          <Button onClick={() => openModal(<EditProfileForm client={c} />, true)}>Edit client details</Button>
        </div>
      </div>

      <div className="grid cards-2" style={{ alignItems: 'start' }}>
        <div className="coach-card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Basic information</div>
          <div className="field"><label>Goal</label><div>{c.goal}</div></div>
          <div className="field"><label>Level</label><div><Tag color={LEVEL[c.level]}>{c.level}</Tag></div></div>
          <div className="field"><label>Status</label><div><Tag color={c.status === 'Active' ? 'green' : 'gray'}>{c.status}</Tag></div></div>
          <div className="field"><label>Plan tier</label>
            <div className="flex gap" style={{ alignItems: 'center' }}>
              <Tag color={c.plan === 'Premium' ? 'purple' : 'gray'}>{c.plan}</Tag>
              <button className="link-btn" onClick={() => openModal(<UpgradePackageForm client={c} />)}>
                {c.plan === 'Premium' ? 'Change package' : 'Upgrade package'}
              </button>
            </div>
          </div>
          <div className="field"><label>Member since</label><div>{fmtDate(c.joined)}</div></div>
          <div className="field" style={{ margin: 0 }}><label>Notes</label><div className="muted">{c.notes || '—'}</div></div>
        </div>
        <div className="coach-card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Body information</div>
          <div className="anthro-grid" style={{ margin: 0 }}>
            <AnthroCell label="Age" value={a.age} unit=" yr" />
            <AnthroCell label="Height" value={a.heightCm} unit=" cm" />
            <AnthroCell label="Body Mass" value={a.massKg != null ? fmtWt(a.massKg) : null} />
            <AnthroCell label="Body Fat" value={a.bodyFatPct} unit="%" />
            <AnthroCell label="Lean Mass" value={a.leanMassKg != null ? fmtWt(a.leanMassKg) : null} />
            <AnthroCell label="BMI" value={bmi} />
          </div>
          {a.derived && <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Filled from the latest screening or body assessment. Use “Edit client details” to change it.</div>}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <section className="coach-card">
          <div className="coach-card-head">
            <div><p className="coach-eyebrow">Before training</p><h2>Health screening</h2></div>
            {scr.complete && <Tag color={programStatus(scr.complete) === 'gated' ? 'red' : 'green'}>{programStatus(scr.complete) === 'gated' ? 'Needs review' : 'Ready'}</Tag>}
          </div>
          <p>{scr.complete
            ? programStatus(scr.complete) === 'gated'
              ? 'Review the recorded health information and required clearance before starting a program.'
              : `Screening completed ${fmtDate(scr.complete.completedOn)}. Re-screen sooner if the client’s health changes.`
            : scr.draft ? 'A health screening is in progress.' : 'No health screening has been recorded yet.'}</p>
          <Button onClick={() => openModal(<CoachScreeningModal client={c} />, true)}>{scr.draft ? 'Continue screening' : scr.complete ? 'Re-screen client' : 'Record screening'}</Button>
          {scr.complete && <details className="coach-disclosure" style={{ marginTop: 12 }}><summary>Screening review and clearance <span>{programStatus(scr.complete) === 'gated' ? 'Action required' : 'View recommendation'}</span></summary><ScreeningReview screening={scr.complete} draft={scr.draft} onClearance={saveClearance} /></details>}
        </section>
      </div>

      {scr.complete && (
        <details className="coach-card coach-disclosure" style={{ marginTop: 16 }}><summary>Health screening details <span>View answers</span></summary><p>These are the client’s recorded screening answers and review status.</p><ScreeningProfile screening={scr.complete} trainerView /></details>
      )}
    </div>
  )
}
