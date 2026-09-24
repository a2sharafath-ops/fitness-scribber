import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { NewAssessmentMenu, assessmentForm } from '../components/organisms/forms/AssessmentForms'
import AssessmentChecklist from '../components/organisms/AssessmentChecklist'
import ScreeningReview from '../components/organisms/screening/ScreeningReview'
import ScreeningProfile from '../components/organisms/screening/ScreeningProfile'
import CoachScreeningModal from '../components/organisms/screening/CoachScreeningModal'
import { TYPES, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, forClient, formalAssessments, latest, summarize, dueStatus } from '../lib/assessment'
import { fmtDate } from '../lib/dates'
import { screeningsFor, OUTCOME_META, programStatus } from '../lib/screening'

const TEST_TYPES = TYPES.filter((type) => ['fitness', 'movement', 'body_comp', 'pain'].includes(type.key))
const sourceOf = (rec) => rec.data?.self ? 'Athlete self-report' : rec.data?.source || 'Source not recorded'

function AssessmentCard({ type, records, intervalDays, clientId, onAdd }) {
  const current = latest(records, type.key)
  const due = REASSESS_TYPES.includes(type.key) ? dueStatus(records, type.key, intervalDays) : null
  const path = `/clients/${clientId}/assessments/${type.key}`

  return <article className="card assess-task-card">
    <div className="assess-task-head">
      <div className="section-title"><Icon name={type.icon} size={17} /> {type.label}</div>
      <span className="muted">{records.length} record{records.length === 1 ? '' : 's'}</span>
    </div>
    {current ? <>
      <p className="assess-task-meta">Latest assessment · {fmtDate(current.date)} · {sourceOf(current)}</p>
      <p className="assess-task-summary">{summarize(current)}</p>
      {due?.overdue && <p className="assess-task-review">Coach review date {fmtDate(due.dueDate)} has passed.</p>}
      {due && !due.overdue && <p className="assess-task-meta">Coach review date · {fmtDate(due.dueDate)}</p>}
    </> : <p className="assess-task-meta">No {type.label.toLowerCase()} recorded.</p>}
    <div className="assess-task-actions">
      <Link className="btn ghost" to={path}>{current ? 'View history' : 'Open history'} →</Link>
      <Button size="sm" onClick={() => onAdd(type.key, current ? 'reassessment' : 'baseline')}>＋ {current ? 'Record again' : 'Add baseline'}</Button>
    </div>
  </article>
}

export default function AssessmentsPage() {
  const { id } = useParams()
  const { db, commit } = useData()
  const { openModal } = useModal()
  const client = db.clients.find((item) => item.id === id)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>

  const allRecords = forClient(db.assessments, id)
  const records = formalAssessments(allRecords)
  const screening = screeningsFor(db.screenings, id)
  const complete = (db.screenings || []).filter((row) => row.clientId === id && row.status === 'complete')
    .sort((a, b) => (b.completedOn || '').localeCompare(a.completedOn || ''))
  const prior = complete.filter((row) => row.id !== screening.complete?.id)
  const intervalDays = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const addType = (type, phase) => openModal(assessmentForm(type, id, undefined, phase))
  const saveClearance = (screeningId, clearance) => commit((draft) => {
    const row = draft.screenings.find((entry) => entry.id === screeningId)
    if (row) { row.clearance = clearance; row.programStatus = programStatus(row) }
  })
  const startScreening = () => openModal(<CoachScreeningModal client={client} />, true)

  return <>
    <div className="topbar assess-title">
      <div><h1>Assessments</h1><div className="sub">Screening and dated tests for {client.name}</div></div>
      <Button onClick={() => openModal(<NewAssessmentMenu clientId={id} types={TEST_TYPES.map((type) => type.key)} />)}>＋ New assessment</Button>
    </div>
    <nav className="assess-jump" aria-label="Assessment groups">
      <a href="#health-screening">Health screening</a>
      <a href="#formal-assessments">Formal assessments</a>
      <Link to={`/clients/${id}/profile`}>Goals &amp; lifestyle → Profile</Link>
    </nav>

    <section className="assess-section" id="health-screening" aria-labelledby="assess-screen-title">
      <div className="assess-section-head">
        <div><h2 id="assess-screen-title">Health screening</h2><p>Review the completed intake, clearance record, and previous screenings. A new symptom belongs in <Link to={`/clients/${id}/check-ins?view=concerns`}>Concerns</Link> until it is formally reassessed.</p></div>
      </div>
      <ScreeningReview screening={screening.complete} draft={screening.draft}
        onClearance={(clearance) => screening.complete && saveClearance(screening.complete.id, clearance)} onStart={startScreening} />
      {screening.complete && <details className="assess-disclosure"><summary>View recorded intake answers · {fmtDate(screening.complete.completedOn)}</summary>
        <div className="card"><ScreeningProfile screening={screening.complete} trainerView /></div>
      </details>}
      {prior.length > 0 && <details className="assess-disclosure"><summary>Previous screenings ({prior.length})</summary>
        <div className="assess-screen-history">{prior.map((row) => <details className="card assess-screen-entry" key={row.id}>
          <summary><strong>{fmtDate(row.completedOn)}</strong> · {OUTCOME_META[row.outcome]?.label || 'Outcome not recorded'} · valid until {fmtDate(row.validUntil)}</summary>
          <ScreeningReview screening={row} historical />
          <details className="assess-disclosure"><summary>View recorded intake answers</summary><ScreeningProfile screening={row} trainerView /></details>
        </details>)}</div>
      </details>}
    </section>

    <section className="assess-section" id="formal-assessments" aria-labelledby="assess-tests-title">
      <div className="assess-section-head"><div><h2 id="assess-tests-title">Baseline and reassessment</h2><p>Fitness, movement, and body measurements are recorded here. Compare outcomes in <Link to={`/clients/${id}/progress`}>Progress</Link>; training-derived lift estimates stay there.</p></div></div>
      <AssessmentChecklist list={records} intervalDays={intervalDays} onAdd={(type) => addType(type, 'baseline')} />
      <p className="assess-review-rule">Review dates use the existing {db.settings?.reassessIntervalDays ? 'coach-configured' : 'app-default'} {intervalDays}-day reminder cadence (<Link to="/settings">Settings</Link>). They are scheduling prompts, not clinical thresholds.</p>
      <div className="assess-task-grid">{TEST_TYPES.map((type) => <AssessmentCard key={type.key} type={type} records={records.filter((row) => row.type === type.key)} intervalDays={intervalDays} clientId={id} onAdd={addType} />)}</div>
    </section>

  </>
}
