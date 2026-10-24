import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import ProgressInfo from '../components/atoms/ProgressInfo'
import ModalShell from '../components/molecules/ModalShell'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { NewAssessmentMenu, assessmentForm } from '../components/organisms/forms/AssessmentForms'
import ScreeningReview from '../components/organisms/screening/ScreeningReview'
import ScreeningProfile from '../components/organisms/screening/ScreeningProfile'
import CoachScreeningModal from '../components/organisms/screening/CoachScreeningModal'
import { TYPES, ONBOARDING_TYPES, DEFAULT_REASSESS_DAYS, forClient, formalAssessments, latest, summarize, dueStatus, hasBaselineRecord, baselineProgress, movementPainFindings, movementPainReports } from '../lib/assessment'
import { fmtDate, todayISO } from '../lib/dates'
import { screeningsFor, OUTCOME_META, programStatus, isExpired, redFlags } from '../lib/screening'
import './AssessmentsPage.css'

const TEST_TYPES = TYPES.filter((type) => [...ONBOARDING_TYPES, 'pain'].includes(type.key))
const sourceOf = (rec) => rec.data?.self ? 'Athlete self-report' : rec.data?.source || 'Source not recorded'
const recordPath = (clientId, rec) => `/clients/${clientId}/assessments/${rec.type}?record=${encodeURIComponent(rec.id)}#assessment-record-${encodeURIComponent(rec.id)}`

function ScreeningRecordDialog({ screeningId, historical = false, clearanceOnly = false }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const row = (db.screenings || []).find((s) => s.id === screeningId)
  if (!row) return <ModalShell title="Screening record" onClose={closeModal}><p>Record unavailable.</p></ModalShell>
  return <ModalShell title={clearanceOnly ? 'Review clearance' : historical ? 'Previous screening' : 'Screening record'} onClose={closeModal}
    footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <div className="assessment-screen-dialog">
      <ScreeningReview screening={row} historical={historical} clearanceOnly={clearanceOnly} today={todayISO(tz)}
        onClearance={(clearance) => commit((draft) => {
          const record = draft.screenings.find((s) => s.id === screeningId)
          if (record) { record.clearance = clearance; record.programStatus = programStatus(record) }
        })} />
      {!clearanceOnly && <details className="assess-disclosure"><summary>Recorded intake answers</summary><ScreeningProfile screening={row} trainerView /></details>}
    </div>
  </ModalShell>
}

function ScreeningHistoryDialog({ records }) {
  const { closeModal } = useModal()
  return <ModalShell title="Previous screenings" onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <div className="assessment-screen-dialog">{records.map((row) => <details className="assess-disclosure" key={row.id}>
      <summary>{fmtDate(row.completedOn)} · {OUTCOME_META[row.outcome]?.label || 'Outcome not recorded'}</summary>
      <ScreeningReview screening={row} historical />
      <details className="assess-disclosure"><summary>Recorded intake answers</summary><ScreeningProfile screening={row} trainerView /></details>
    </details>)}</div>
  </ModalShell>
}

function AssessmentCard({ type, records, intervalDays, today, clientId, onAdd, onEdit }) {
  const current = latest(records, type.key)
  const hasBaseline = hasBaselineRecord(records, type.key)
  const due = current ? dueStatus(records, type.key, intervalDays, today) : null
  const summary = current && summarize(current)
  return <article className="card assessment-category">
    <div className="assessment-category-top">
      <span className="assessment-type-icon"><Icon name={type.icon} size={19} /></span>
      <h3>{type.label}</h3>
      <span className={'assessment-badge' + (due?.overdue ? ' amber' : '')}>{!hasBaseline ? 'Baseline needed' : due?.overdue ? 'Review due' : 'Recorded'}</span>
    </div>
    <div className="assessment-category-body">
      {current ? <>
        <p className="assessment-result" title={summary}>{summary === '—' ? 'No result recorded' : summary}</p>
        <p className="assessment-source">{sourceOf(current)}</p>
        <p className={'assessment-review-date' + (due?.overdue ? ' overdue' : '')}>Latest {fmtDate(current.date)}<br />
          {due?.dueDate ? `${due.kind === 'suggested' ? 'Suggested review' : 'Next reassessment'} ${fmtDate(due.dueDate)}` : 'Next reassessment not scheduled'}
        </p>
        <button type="button" className="assessment-link" onClick={() => onEdit(current)}>{due?.kind === 'scheduled' ? 'Edit reassessment date' : 'Set reassessment date'}</button>
      </> : <p className="assessment-empty">No assessment recorded.</p>}
    </div>
    <div className="assessment-category-actions">
      <Button variant="ghost" onClick={() => onAdd(type.key, hasBaseline ? 'reassessment' : 'baseline')}>{hasBaseline ? 'Record reassessment' : 'Add baseline'}</Button>
      {current ? <Link className="assessment-link" to={`/clients/${clientId}/assessments/${type.key}`}>History · {records.length} →</Link> : <span className="assessment-history-space" aria-hidden="true" />}
    </div>
  </article>
}

export default function AssessmentsPage() {
  const { id } = useParams()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const [historyType, setHistoryType] = useState('')
  const client = db.clients.find((item) => item.id === id)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>
  const records = formalAssessments(forClient(db.assessments, id)).filter((row) => TEST_TYPES.some((type) => type.key === row.type))
  const screening = screeningsFor(db.screenings, id)
  const row = screening.complete
  const prior = (db.screenings || []).filter((s) => s.clientId === id && s.status === 'complete' && s.id !== row?.id)
    .sort((a, b) => (b.completedOn || '').localeCompare(a.completedOn || ''))
  const intervalDays = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const progress = baselineProgress(records)
  const pain = records.filter((r) => r.type === 'pain')
  const latestPain = latest(pain, 'pain')
  const latestMovement = latest(records, 'movement')
  const movementPain = movementPainFindings(latestMovement?.data)
  const painHistoryCount = pain.length + movementPainReports(records).length
  const gated = row && programStatus(row) === 'gated'
  const expired = row && isExpired(row, todayISO(tz))
  const flags = row && redFlags(row)
  const addType = (type, phase) => openModal(assessmentForm(type, id, undefined, phase))
  const showScreen = (clearanceOnly = false) => openModal(<ScreeningRecordDialog screeningId={row.id} clearanceOnly={clearanceOnly} />, true)
  const history = records.filter((r) => !historyType || r.type === historyType)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  const screeningSettled = row?.validUntil && !expired && !gated && !screening.draft
  const screeningCard = <section className="card assessment-screen-summary" id="health-screening" aria-labelledby="assess-screen-title">
      <div className="assessment-screen-head"><div><p className="assessment-eyebrow">Trainer-only</p><h2 id="assess-screen-title">Health screening</h2></div>
        <Button variant={row ? 'ghost' : 'primary'} onClick={() => openModal(<CoachScreeningModal client={client} />, true)}>{screening.draft ? 'Continue screening' : row ? 'Re-screen' : 'Record screening'}</Button>
      </div>
      <div className="assessment-screen-status">
        <span className={'assessment-badge' + (gated ? ' red' : expired ? ' amber' : row ? ' green' : '')}>{gated ? 'Review required · Program gated' : expired ? 'Screening expired' : row ? 'Program ready' : screening.draft ? 'Draft saved' : 'No screening on file'}</span>
        {row && <span className="assessment-badge">PAR-Q+ {row.outcome || '—'} · {OUTCOME_META[row.outcome]?.label || 'Outcome not recorded'}</span>}
        {row && screening.draft && <span className="assessment-badge">New draft saved</span>}
        {gated && expired && <span className="assessment-badge amber">Screening expired</span>}
      </div>
      {row && <p className="assessment-screen-date">Completed {fmtDate(row.completedOn)} · {expired ? 'Expired' : 'Valid until'} {fmtDate(row.validUntil)}</p>}
      {gated ? <div className="assessment-review-strip"><span>Clearance {row.clearance?.status === 'requested' ? 'requested' : 'not started'}{flags.major.length > 0 ? ` · ${flags.major.length} major review flag${flags.major.length === 1 ? '' : 's'}` : ''}</span><Button variant="ghost" onClick={() => showScreen(true)}>Review clearance →</Button></div>
        : expired ? <p className="assessment-review-strip">Re-screen before relying on this record.</p> : null}
      {row && <div className="assessment-screen-foot">
        <button className="assessment-link" onClick={() => showScreen()}>View screening record →</button>
        {prior.length > 0 && <button className="assessment-link" onClick={() => openModal(<ScreeningHistoryDialog records={prior} />, true)}>Previous screenings · {prior.length}</button>}
        {row.clearance?.status === 'received' && (row.outcome === 'C' || flags.major.length > 0) && <button className="assessment-link" onClick={() => showScreen(true)}>Clearance received →</button>}
        <Link className="assessment-link assessment-concern" to={`/clients/${id}/check-ins?view=concerns`}>New concern →</Link>
      </div>}
    </section>

  return <div className="client-assessments">
    <div className="topbar assess-title"><h1>Assessments</h1><Button onClick={() => openModal(<NewAssessmentMenu clientId={id} types={TEST_TYPES.map((type) => type.key)} />)}>＋ New assessment</Button></div>
    {!screeningSettled && screeningCard}
    <section className="assessment-section" id="formal-assessments" aria-labelledby="assess-tests-title">
      <div className="assessment-section-head"><div className="assessment-title-group"><h2 id="assess-tests-title">Baseline &amp; reassessment</h2><ProgressInfo term="Review dates" text={`Next reassessment uses the date saved on the latest record. Blank means not scheduled. Older records without a saved date show a suggested review using the ${intervalDays}-day Settings default. These are scheduling prompts, not clinical thresholds.`} /></div>
        <div className="assessment-baseline-count"><span>{progress.done}/{progress.total} baselines</span><span className="assessment-mini-track" aria-hidden="true"><span style={{ width: `${progress.done / progress.total * 100}%` }} /></span></div>
      </div>
      <div className="assessment-category-grid">{TEST_TYPES.filter((type) => ONBOARDING_TYPES.includes(type.key)).map((type) => <AssessmentCard key={type.key} type={type} records={records.filter((rec) => rec.type === type.key)} intervalDays={intervalDays} today={todayISO(tz)} clientId={id} onAdd={addType} onEdit={(record) => openModal(assessmentForm(record.type, id, record))} />)}</div>
      <article className="card assessment-pain"><div className="assessment-pain-summary"><h3>Pain assessment</h3>
        {latestPain && <p>{`${summarize(latestPain)} · ${fmtDate(latestPain.date)} · ${sourceOf(latestPain)}`}</p>}
        {movementPain.length > 0 ? <details className="assessment-movement-pain">
          <summary>{movementPain.length} pain flag{movementPain.length === 1 ? '' : 's'} · Movement screen · {fmtDate(latestMovement.date)}</summary>
          <ul>{movementPain.map(finding => <li key={finding.id}>{finding.label}{finding.side ? ` · ${finding.side}` : ''}{finding.note ? ` — ${finding.note}` : ''}</li>)}</ul>
          <Link className="assessment-link" to={recordPath(id, latestMovement)}>View movement record →</Link>
        </details> : <>
          {!latestPain && <p>No standalone pain assessment recorded.</p>}
          {painHistoryCount > pain.length && <p>Latest movement screen: no pain flags · {fmtDate(latestMovement.date)}</p>}
        </>}
      </div>
        <div className="assessment-pain-actions">{painHistoryCount > 0 && <Link className="assessment-link" to={`/clients/${id}/assessments/pain`}>History · {painHistoryCount} →</Link>}<Button variant="ghost" onClick={() => addType('pain', latestPain ? 'reassessment' : 'baseline')}>Record pain</Button></div>
      </article>
    </section>
    {screeningSettled && screeningCard}
    {records.length > 0 && <details className="card assessment-history"><summary>Assessment history <span className="assessment-badge">{records.length} records</span></summary>
      <div className="assessment-history-body"><label className="assessment-filter">Assessment type<select value={historyType} onChange={(e) => setHistoryType(e.target.value)}><option value="">All types</option>{TEST_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select></label>
        <div className="assessment-history-scroll" tabIndex={0} role="region" aria-label="Assessment history records">{history.length ? history.map((rec) => <div className="assessment-history-row" key={rec.id}><div><strong>{TEST_TYPES.find((t) => t.key === rec.type)?.label} · {fmtDate(rec.date)}</strong><small>{rec.phase === 'reassessment' ? 'Reassessment' : 'Baseline'} · {summarize(rec)}</small></div><Link className="assessment-link" to={recordPath(id, rec)} aria-label={`View ${rec.type} assessment from ${fmtDate(rec.date)}`}>View →</Link></div>) : <p className="assessment-empty">No records for this type.</p>}</div>
      </div>
    </details>}
    <div className="assessment-bottom-links"><Link className="assessment-link" to={`/clients/${id}/progress#outcomes`}>Compare outcomes in Progress →</Link><Link className="assessment-link" to={`/clients/${id}/profile`}>Goals &amp; lifestyle in Profile →</Link></div>
  </div>
}
