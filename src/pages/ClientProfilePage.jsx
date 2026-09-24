import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
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

const LEVEL = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }
const known = (value) => value == null || value === '' ? 'Not recorded' : value
const sourceOf = (record) => record.data?.self ? 'Athlete self-report' : record.data?.source || 'Source not recorded'
const byDate = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')

function SourceText({ source, date }) {
  return <small className="profile-source">{source}{date ? ` · ${fmtDate(date)}` : ''}</small>
}

function ProfileField({ label, value, source, date }) {
  return <div className="profile-field"><span>{label}</span><strong>{known(value)}</strong>{source && <SourceText source={source} date={date} />}</div>
}

function RecordHistory({ records, label, path }) {
  if (!records.length) return null
  return <details className="profile-history">
    <summary>View {records.length} dated {label} record{records.length === 1 ? '' : 's'}</summary>
    <div className="profile-history-list">{records.map((record) => <div key={record.id} className="profile-history-row">
      <div><strong>{fmtDate(record.date)}</strong><SourceText source={sourceOf(record)} /><span>{summarize(record)}</span></div>
      <Link to={path}>Full entry →</Link>
    </div>)}</div>
  </details>
}

function GoalList({ title, goals, today }) {
  if (!goals?.length) return null
  return <div className="profile-goal-list"><strong>{title}</strong><ul>{goals.map((goal, index) =>
    <li key={`${goal.text}-${index}`}>{goal.text || 'Goal text not recorded'}{goal.target ? ` · target ${goal.target}` : ''}{goal.by ? ` · by ${fmtDate(goal.by)}` : ''}{goal.by && goal.by < today && <span className="profile-past-goal"> · Past target date; completion not recorded</span>}</li>)}</ul></div>
}

export default function ClientProfilePage() {
  const { id } = useParams()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const { fmtWt } = useFormat()
  const client = db.clients.find((item) => item.id === id)
  if (!client) return <Link className="btn ghost" to="/clients">← Clients</Link>

  const screening = screeningsFor(db.screenings, id).complete
  const preferences = preferenceDetails(client, screening)
  const measurements = resolveAnthroDetails(db, client)
  const records = forClient(db.assessments, id)
  const goals = records.filter((record) => record.type === 'goals').sort(byDate)
  const lifestyle = records.filter((record) => record.type === 'lifestyle').sort(byDate)
  const currentGoals = latest(goals, 'goals')
  const currentLifestyle = latest(lifestyle, 'lifestyle')
  const today = todayISO(tz)
  const concerns = (db.concerns || []).filter((item) => item.clientId === id && item.status === 'Open')
  const record = (type, hasEntries) => openModal(assessmentForm(type, id, undefined, hasEntries ? 'reassessment' : 'baseline'))
  const screeningPath = `/clients/${id}/assessments#health-screening`
  const measurementFields = [
    ['age', 'Recorded age', ' yr'], ['heightCm', 'Height', ' cm'],
    ['massKg', 'Body mass', ''], ['bodyFatPct', 'Body fat', '%'], ['leanMassKg', 'Lean mass', ''],
  ]
  const displayMeasurement = (field, value, unit) => value == null ? 'Not recorded'
    : ['massKg', 'leanMassKg'].includes(field) ? fmtWt(value) : `${value}${unit}`
  const pref = (field, label) => <ProfileField key={field} label={label} value={preferences[field].value}
    source={preferences[field].source} date={preferences[field].date} />

  return <>
    <div className="topbar profile-title">
      <div><h1>Profile</h1><div className="sub">Goals, preferences, contact and client administration for {client.name}</div></div>
      <Button onClick={() => openModal(<ClientForm client={client} />)}>Edit contact &amp; admin</Button>
    </div>

    <section className="profile-section" aria-labelledby="profile-goals-title">
      <div className="profile-section-head"><div><h2 id="profile-goals-title">Goals</h2><p>Current direction with its dated goal-setting history.</p></div>
        <Button onClick={() => record('goals', goals.length)}>＋ Record goal update</Button></div>
      <div className="card profile-card">
        <ProfileField label="Profile headline" value={client.goal} source="Client record · origin not recorded" />
        {currentGoals ? <>
          <div className="profile-record-meta">Latest goal record · {fmtDate(currentGoals.date)} · {sourceOf(currentGoals)}</div>
          <GoalList title="Short-term" goals={currentGoals.data?.shortTerm} today={today} />
          <GoalList title="Long-term" goals={currentGoals.data?.longTerm} today={today} />
          {currentGoals.data?.why && <ProfileField label="Why it matters" value={currentGoals.data.why} />}
          {!currentGoals.data?.shortTerm?.length && !currentGoals.data?.longTerm?.length && <p className="muted">No goals recorded in this entry.</p>}
        </> : <p className="muted">No dated goal-setting record yet.{screening?.goals?.primary ? ` Intake goal: ${screening.goals.primary} (${fmtDate(screening.completedOn)}).` : ''}</p>}
        <RecordHistory records={goals} label="goal" path={`/clients/${id}/profile/goals`} />
      </div>
    </section>

    <section className="profile-section" aria-labelledby="profile-preferences-title">
      <div className="profile-section-head"><div><h2 id="profile-preferences-title">Preferences &amp; availability</h2><p>Profile updates and answers from the latest completed intake are labelled by source.</p></div>
        <Button variant="ghost" onClick={() => openModal(<ProfilePreferencesForm client={client} screening={screening} />)}>Edit preferences</Button></div>
      <div className="profile-preference-grid">
        <div className="card profile-card"><h3>Training preferences</h3>
          {PREFERENCE_FIELDS.slice(0, 3).map(([field, label]) => pref(field, label))}
          {screening?.goals?.prefs?.hardNo && <ProfileField label="Stated hard no at intake" value={screening.goals.prefs.hardNo} source="Health screening" date={screening.completedOn} />}
        </div>
        <div className="card profile-card"><h3>Schedule &amp; environment</h3>
          {PREFERENCE_FIELDS.slice(3).map(([field, label]) => pref(field, label))}
        </div>
      </div>
      <Link className="profile-source-link" to={screeningPath}>Review the signed intake and health details →</Link>
    </section>

    <section className="profile-section" aria-labelledby="profile-lifestyle-title">
      <div className="profile-section-head"><div><h2 id="profile-lifestyle-title">Lifestyle history</h2><p>Dated observations stay separate from today's wellness check-in.</p></div>
        <Button variant="ghost" onClick={() => record('lifestyle', lifestyle.length)}>＋ Record lifestyle update</Button></div>
      <div className="card profile-card">
        {currentLifestyle ? <>
          <div className="profile-record-meta">Latest lifestyle record · {fmtDate(currentLifestyle.date)} · {sourceOf(currentLifestyle)}</div>
          <div className="profile-data-grid">
            <ProfileField label="Sleep" value={currentLifestyle.data?.sleepHrs == null ? null : `${currentLifestyle.data.sleepHrs} h/night`} />
            <ProfileField label="Sleep quality" value={currentLifestyle.data?.sleepQuality == null ? null : `${currentLifestyle.data.sleepQuality}/7`} />
            <ProfileField label="Stress" value={currentLifestyle.data?.stress == null ? null : `${currentLifestyle.data.stress}/7`} />
            <ProfileField label="Hydration" value={currentLifestyle.data?.hydrationL == null ? null : `${currentLifestyle.data.hydrationL} L/day`} />
            <ProfileField label="Activity" value={currentLifestyle.data?.activityLevel} />
            <ProfileField label="Average steps" value={currentLifestyle.data?.steps} />
          </div>
        </> : <p className="muted">No dated lifestyle assessment yet.{screening?.completedOn ? ` Intake answers were recorded ${fmtDate(screening.completedOn)}.` : ''}</p>}
        <RecordHistory records={lifestyle} label="lifestyle" path={`/clients/${id}/profile/lifestyle`} />
      </div>
    </section>

    <section className="profile-section" aria-labelledby="profile-measurements-title">
      <div className="profile-section-head"><div><h2 id="profile-measurements-title">Measurement snapshot</h2><p>Each displayed value identifies its source. Historical changes belong in Progress.</p></div>
        <Button variant="ghost" onClick={() => openModal(<EditProfileForm client={client} />, true)}>Edit measurements</Button></div>
      <div className="card profile-card">
        <div className="profile-measure-grid">{measurementFields.map(([field, label, unit]) => {
          const item = measurements[field]
          const path = item.kind === 'body_comp' ? `/clients/${id}/assessments/body_comp` : item.kind === 'screening' ? screeningPath : null
          return <div className="profile-measure" key={field}><span>{label}</span><strong>{displayMeasurement(field, item.value, unit)}</strong>
            <SourceText source={item.label} date={item.date} />{path && <Link to={path}>View source →</Link>}
          </div>
        })}</div>
        <div className="profile-measure-links"><Link to={`/clients/${id}/progress`}>View measurement progress →</Link><Link to={`/clients/${id}/assessments/body_comp`}>Body composition records →</Link></div>
      </div>
    </section>

    <section className="profile-section" aria-labelledby="profile-admin-title">
      <div className="profile-section-head"><div><h2 id="profile-admin-title">Contact &amp; administration</h2><p>Stable details and coach notes.</p></div></div>
      <div className="profile-admin-grid">
        <div className="card profile-card"><h3>Contact</h3>
          <ProfileField label="Email" value={client.email} /><ProfileField label="Phone" value={client.phone} />
          <ProfileField label="Member since" value={fmtDate(client.joined)} />
          <ProfileField label="Status" value={<Tag color={client.status === 'Active' ? 'green' : 'gray'}>{known(client.status)}</Tag>} />
        </div>
        <div className="card profile-card"><h3>Coaching &amp; package</h3>
          <ProfileField label="Level" value={<Tag color={LEVEL[client.level] || 'gray'}>{known(client.level)}</Tag>} />
          <ProfileField label="Package" value={known(client.plan)} />
          <ProfileField label="Coach notes" value={client.notes} />
          <Button variant="ghost" onClick={() => openModal(<UpgradePackageForm client={client} />)}>Change package</Button>
        </div>
      </div>
    </section>

    <section className="card profile-health-link" aria-label="Health and concerns">
      <div><h2>Health screening &amp; concerns</h2><p>Formal screening and clearance stay in Assessments. New symptoms stay in Check-ins &amp; load until reviewed.</p>
        {concerns.length > 0 && <p className="profile-concern-count">{concerns.length} open concern{concerns.length === 1 ? '' : 's'} · last recorded {fmtDate([...concerns].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date)}</p>}
      </div>
      <div className="profile-health-actions"><Link className="btn ghost" to={screeningPath}>Health screening →</Link>
        <Link className="btn ghost" to={concerns.length ? `/clients/${id}#open-concerns` : `/clients/${id}/check-ins?view=concerns`}>Concerns →</Link></div>
    </section>
  </>
}
