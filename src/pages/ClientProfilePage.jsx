import TrainingScheduleForm from '../components/organisms/forms/TrainingScheduleForm'
import { trainingSchedule, formatTrainingTime } from '../lib/trainingSchedule'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import Tag from '../components/atoms/Tag'
import ModalShell from '../components/molecules/ModalShell'
import { ClientForm, UpgradePackageForm } from '../components/organisms/forms/ClientForms'
import { EditProfileForm } from '../components/organisms/ProfilePanel'
import ProfilePreferencesForm from '../components/organisms/forms/ProfilePreferencesForm'
import { assessmentForm } from '../components/organisms/forms/AssessmentForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { fmtDate, todayISO } from '../lib/dates'
import { forClient, latest, resolveAnthroDetails, summarize } from '../lib/assessment'
import { screeningsFor } from '../lib/screening'
import { PREFERENCE_FIELDS, preferenceDetails } from '../lib/profile'
import './ClientProfilePage.css'

const LEVEL = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }
const known = value => value == null || value === '' ? 'Not recorded' : value
const sourceOf = record => record.data?.self ? 'Athlete self-report' : record.data?.source || 'Source not recorded'
const byDate = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
const recordPath = (id, type, recordId) => `/clients/${id}/profile/${type}?record=${encodeURIComponent(recordId)}#assessment-record-${recordId}`

function SectionMark({ name }) {
  return <span className="cp-mark" aria-hidden="true"><Icon name={name} size={18} /></span>
}
function SourceText({ source, date }) {
  return <small>{source}{date ? ` · ${fmtDate(date)}` : ''}</small>
}
function Empty({ children }) {
  return <p className="cp-empty">{children}</p>
}
function Field({ label, value }) {
  return <div><dt>{label}</dt><dd>{known(value)}</dd></div>
}
function Sources({ children }) {
  return <details className="cp-sources"><summary>Sources &amp; dates</summary><div>{children}</div></details>
}
function RecordHistoryDialog({ clientId, type }) {
  const { db } = useData()
  const { closeModal } = useModal()
  const records = forClient(db.assessments, clientId).filter(row => row.type === type).sort(byDate)
  return <ModalShell title={type === 'goals' ? 'Goal history' : 'Lifestyle history'} onClose={closeModal}
    footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <div className="cp-history-dialog" tabIndex={0} aria-label="Dated records">
      {records.map(row => <div className="cp-history-row" key={row.id}>
        <div><strong>{fmtDate(row.date)}</strong><SourceText source={sourceOf(row)} /><p>{summarize(row)}</p></div>
        <Link to={recordPath(clientId, type, row.id)} onClick={closeModal}>Full entry →</Link>
      </div>)}
    </div>
  </ModalShell>
}
function GoalPanel({ title, goals, today }) {
  if (!goals?.length) return null
  return <div className="cp-goal-panel"><h3>{title}</h3><ul>{goals.map((goal, index) =>
    <li key={`${goal.text}-${index}`}><strong>{goal.text || 'Goal text not recorded'}</strong>
      {(goal.target || goal.by) && <small>{goal.target ? `Target ${goal.target}` : ''}{goal.target && goal.by ? ' · ' : ''}{goal.by ? `By ${fmtDate(goal.by)}` : ''}</small>}
      {goal.by && goal.by < today && <small className="cp-past-goal">Past target date; completion not recorded</small>}
    </li>)}</ul></div>
}
function SnapshotValue({ label, value, word }) {
  return <div><span>{label}</span><strong className={word || value == null || value === '' ? 'cp-word-value' : ''}>{known(value)}</strong></div>
}

export default function ClientProfilePage() {
  const { id } = useParams()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const { toDisp, unitName } = useFormat()
  const client = db.clients.find(item => item.id === id)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>

  const screening = screeningsFor(db.screenings, id).complete
  const preferences = preferenceDetails(client, screening)
  const measurements = resolveAnthroDetails(db, client)
  const records = forClient(db.assessments, id)
  const goals = records.filter(row => row.type === 'goals').sort(byDate)
  const lifestyle = records.filter(row => row.type === 'lifestyle').sort(byDate)
  const currentGoals = latest(goals, 'goals')
  const currentLifestyle = latest(lifestyle, 'lifestyle')
  const today = todayISO(tz)
  const concerns = (db.concerns || []).filter(row => row.clientId === id && row.status === 'Open').sort(byDate)
  const record = (type, hasEntries) => openModal(assessmentForm(type, id, undefined, hasEntries ? 'reassessment' : 'baseline'))
  const history = type => openModal(<RecordHistoryDialog clientId={id} type={type} />)
  const screeningPath = `/clients/${id}/assessments#health-screening`
  const measurementFields = [
    ['massKg', 'Body mass', ''], ['bodyFatPct', 'Body fat', '%'], ['leanMassKg', 'Lean mass', ''],
    ['heightCm', 'Height', ' cm'], ['age', 'Recorded age', ' yr'],
  ].filter(([field]) => measurements[field].value != null)
  const displayMeasurement = (field, value, unit) => ['massKg', 'leanMassKg'].includes(field)
    ? <>{toDisp(value).toLocaleString()}<small>{unitName()}</small></>
    : <>{value}<small>{unit.trim()}</small></>
  const trainingPreferences = PREFERENCE_FIELDS.slice(0, 3).filter(([field]) => preferences[field].value !== '')
  const schedulePreferences = PREFERENCE_FIELDS.slice(3).filter(([field]) => preferences[field].value !== '')
  const hardNo = screening?.goals?.prefs?.hardNo
  const preferenceSources = fields => fields.map(([field, label]) => <p key={field}><strong>{label}</strong><SourceText source={preferences[field].source} date={preferences[field].date} /></p>)
  const pref = ([field, label]) => <Field key={field} label={label} value={preferences[field].value} />
  const l = currentLifestyle?.data || {}
  const unitValue = (value, unit) => value == null || value === '' ? null : <>{value}<small>{unit}</small></>

  return <div className="client-profile">
    <div className="cp-title"><h1>Profile</h1><Tag color={client.status === 'Active' ? 'green' : 'gray'}>{known(client.status)}</Tag></div>

    <section className="card cp-card cp-goals" aria-labelledby="cp-goals-title">
      <div className="cp-head"><h2 id="cp-goals-title"><SectionMark name="target" />Goals</h2>
        <Button onClick={() => record('goals', goals.length)}>{currentGoals ? 'Record goal update' : 'Record goals'}</Button></div>
      {currentGoals ? <>
        <p className="cp-meta cp-goal-meta"><SourceText source={sourceOf(currentGoals)} date={currentGoals.date} /></p>
        {currentGoals.data?.shortTerm?.length || currentGoals.data?.longTerm?.length ? <div className="cp-goal-scroll" tabIndex={0} aria-label="Current goals">
          <GoalPanel title="Short-term" goals={currentGoals.data?.shortTerm} today={today} />
          <GoalPanel title="Long-term" goals={currentGoals.data?.longTerm} today={today} />
        </div> : <Empty>No goals recorded in this entry.</Empty>}
        {currentGoals.data?.why && <div className="cp-why" tabIndex={0}><strong>Why it matters</strong><p>{currentGoals.data.why}</p></div>}
        <div className="cp-foot"><small>Latest goal record</small><button className="cp-link" onClick={() => history('goals')}>Goal history · {goals.length} →</button></div>
      </> : <Empty>No goals recorded.</Empty>}
    </section>

    <section className="card cp-card" aria-labelledby="cp-training-time-title" id="training-time">
      <div className="cp-head"><h2 id="cp-training-time-title"><SectionMark name="calendar" />Usual training time</h2><Button variant="ghost" size="sm" onClick={() => openModal(<TrainingScheduleForm client={client} />)}>Edit training time</Button></div>
      {trainingSchedule(client) ? <dl className="cp-fields"><Field label="Start time" value={formatTrainingTime(trainingSchedule(client).time)} /><Field label="Duration" value={trainingSchedule(client).duration + ' min'} /><Field label="Time zone" value={tz || 'UTC'} /></dl> : <Empty>No automatic booking time set.</Empty>}
      <p className="muted">Applies to planned workouts. Save to add missing future bookings; adjust individual times in Schedule.</p>
    </section>
    <section aria-labelledby="cp-preferences-title">
      <div className="cp-caption"><h2 id="cp-preferences-title">Preferences &amp; availability</h2>
        <Button variant="ghost" size="sm" onClick={() => openModal(<ProfilePreferencesForm client={client} screening={screening} />)}>Edit preferences</Button></div>
      <div className="cp-grid">
        <div className="card cp-card"><h3 className="cp-subhead"><SectionMark name="dumbbell" />Training preferences</h3>
          {trainingPreferences.length || hardNo ? <>
            <dl className="cp-fields" tabIndex={0} aria-label="Training preferences">{trainingPreferences.map(pref)}{hardNo && <Field label="Hard no at intake" value={hardNo} />}</dl>
            <Sources>{preferenceSources(trainingPreferences)}{hardNo && <p><strong>Hard no at intake</strong><SourceText source="Health screening" date={screening.completedOn} /></p>}
              {screening && <Link className="cp-link" to={screeningPath}>View signed intake →</Link>}</Sources>
          </> : <Empty>No preferences recorded.</Empty>}
        </div>
        <div className="card cp-card"><h3 className="cp-subhead"><SectionMark name="calendar" />Schedule &amp; environment</h3>
          {schedulePreferences.length ? <><dl className="cp-fields" tabIndex={0} aria-label="Schedule and environment">{schedulePreferences.map(pref)}</dl>
            <Sources>{preferenceSources(schedulePreferences)}{screening && <Link className="cp-link" to={screeningPath}>View signed intake →</Link>}</Sources>
          </> : <Empty>No availability recorded.</Empty>}
        </div>
      </div>
    </section>

    <div className="cp-grid">
      <section className="card cp-card" aria-labelledby="cp-lifestyle-title">
        <div className="cp-head"><h2 id="cp-lifestyle-title"><SectionMark name="activity" />Lifestyle</h2>
          <Button variant="ghost" size="sm" aria-label="Record lifestyle update" onClick={() => record('lifestyle', lifestyle.length)}>Record update</Button></div>
        {currentLifestyle ? <>
          <p className="cp-meta"><SourceText source={sourceOf(currentLifestyle)} date={currentLifestyle.date} /></p>
          <div className="cp-snapshot cp-grow">
            <SnapshotValue label="Sleep" value={unitValue(l.sleepHrs, 'h/night')} />
            <SnapshotValue label="Sleep quality" value={unitValue(l.sleepQuality, '/7')} />
            <SnapshotValue label="Stress" value={unitValue(l.stress, '/7')} />
            <SnapshotValue label="Hydration" value={unitValue(l.hydrationL, 'L/day')} />
            <SnapshotValue label="Steps" value={unitValue(l.steps == null || l.steps === '' ? null : Number(l.steps).toLocaleString(), '/day')} />
            <SnapshotValue label="Activity" value={l.activityLevel} word />
          </div>
          <div className="cp-foot"><small>Latest record</small><button className="cp-link" onClick={() => history('lifestyle')}>History · {lifestyle.length} →</button></div>
        </> : <Empty>No lifestyle records.</Empty>}
      </section>
      <section className="card cp-card" aria-labelledby="cp-measurements-title">
        <div className="cp-head"><h2 id="cp-measurements-title"><SectionMark name="scale" />Measurements</h2>
          <Button variant="ghost" size="sm" aria-label="Edit measurements" onClick={() => openModal(<EditProfileForm client={client} />, true)}>Edit</Button></div>
        {measurementFields.length ? <>
          <div className="cp-snapshot cp-grow">{measurementFields.map(([field, label, unit]) => <SnapshotValue key={field} label={label} value={displayMeasurement(field, measurements[field].value, unit)} />)}</div>
          <Sources>{measurementFields.map(([field, label]) => {
            const item = measurements[field]
            const path = item.kind === 'body_comp' ? `/clients/${id}/assessments/body_comp` : item.kind === 'screening' ? screeningPath : null
            return <p key={field}><strong>{label}</strong><SourceText source={item.label} date={item.date} />{path && <Link className="cp-link" to={path}>View source →</Link>}</p>
          })}</Sources>
          <div className="cp-foot"><Link className="cp-link" to={`/clients/${id}/progress#outcomes`}>View progress →</Link></div>
        </> : <Empty>No measurements recorded.</Empty>}
      </section>
    </div>

    <details className="card cp-admin" id="profile-administration">
      <summary><span>Contact &amp; administration<small>{known(client.level)} · {known(client.plan)}</small></span><span className="cp-expand" aria-hidden="true" /></summary>
      <div className="cp-admin-body"><div className="cp-admin-grid">
        <section aria-labelledby="cp-contact-title"><div className="cp-head"><h3 id="cp-contact-title">Contact</h3>
          <Button variant="ghost" size="sm" onClick={() => openModal(<ClientForm client={client} />)}>Edit contact &amp; admin</Button></div>
          <dl className="cp-fields"><Field label="Email" value={client.email} /><Field label="Phone" value={client.phone} />
            <Field label="Member since" value={client.joined ? fmtDate(client.joined) : null} /><Field label="Status" value={<Tag color={client.status === 'Active' ? 'green' : 'gray'}>{known(client.status)}</Tag>} /></dl>
        </section>
        <section aria-labelledby="cp-coaching-title"><div className="cp-head"><h3 id="cp-coaching-title">Coaching &amp; package</h3>
          <Button variant="ghost" size="sm" onClick={() => openModal(<UpgradePackageForm client={client} />)}>Change package</Button></div>
          <dl className="cp-fields"><Field label="Level" value={<Tag color={LEVEL[client.level] || 'gray'}>{known(client.level)}</Tag>} /><Field label="Package" value={client.plan} /></dl>
          <h4 className="cp-note-label">Coach notes</h4><div className="cp-notes" tabIndex={0} aria-label="Coach notes">{client.notes || 'No notes recorded.'}</div>
        </section>
      </div></div>
    </details>

    <section className="card cp-health" aria-label="Health and concerns"><div><h2>Health screening &amp; concerns</h2>
      {concerns.length > 0 && <p>{concerns.length} open concern{concerns.length === 1 ? '' : 's'}{concerns[0].date ? ` · ${fmtDate(concerns[0].date)}` : ''}</p>}</div>
      <div><Link className="cp-link" to={screeningPath}>Health screening →</Link><Link className="cp-link" to={`/clients/${id}/check-ins?view=concerns`}>Concerns →</Link></div>
    </section>
  </div>
}
