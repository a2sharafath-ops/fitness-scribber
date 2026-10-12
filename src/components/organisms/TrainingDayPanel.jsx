import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../atoms/Button'
import SegToggle from '../molecules/SegToggle'
import DayBlockReview from './program/DayBlockReview'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import CopyWorkoutModal from './program/CopyWorkoutModal'
import WorkoutInsights from './workout/WorkoutInsights'
import ModalShell from '../molecules/ModalShell'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { trainingDay } from '../../lib/trainingDay'
import { programStats } from '../../lib/program'
import { deleteSpan } from '../../lib/planner'
import { runBlocks } from '../../lib/workout'
import { fmtDate, fmtDay } from '../../lib/dates'
import { confirmDialog, toast } from '../../lib/toast'

function SessionInsightsModal({ workout, client, units, exercises }) {
  const { closeModal } = useModal()
  return <ModalShell title="Session insights" onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <WorkoutInsights workout={workout} units={units} exercises={exercises} restingHr={null} age={client.anthro?.age ?? null} bodyMassKg={client.anthro?.massKg ?? null} />
  </ModalShell>
}

export default function TrainingDayPanel({ client, date, today, onSelectDate, selectedWorkoutId }) {
  const { db, commit, units } = useData()
  const { openModal } = useModal()
  const day = trainingDay(db, client.id, date, today)
  const [logId, setLogId] = useState(selectedWorkoutId || day.completed[0]?.id)
  const [recordView, setRecordView] = useState('actual')
  const log = day.completed.find((row) => row.id === logId) || day.completed[0]
  const actual = Boolean(log) && (recordView === 'actual' || !day.prescription)
  const openBuilder = () => openModal(<WorkoutBuilderModal clientId={client.id} date={date} />, 'xl')
  const remove = async () => {
    if (!day.canDeletePlan || !await confirmDialog({ title: 'Delete planned workout?', message: `Remove ${day.prescription.name || 'this plan'} from ${fmtDate(date)}? Workout logs are kept.`, confirmLabel: 'Delete plan', danger: true })) return
    commit((data) => deleteSpan(data, client.id, [date])); toast('Plan deleted.')
  }
  const stats = programStats(day.prescription)
  const doneSets = log ? runBlocks(log).flatMap((block) => block.items).reduce((count, item) => count + (item.setRows ? item.setRows.filter((row) => row.done).length : Number(item.doneSets) || 0), 0) : 0
  const label = log ? 'Completed workout log' : day.pending ? day.label : day.appointment ? 'Completed appointment' : day.prescription ? 'Planned workout' : 'No workout data'
  const notice = log ? actual ? `${doneSets} recorded set${doneSets === 1 ? '' : 's'}${log.durationSec > 0 ? ` · ${Math.round(log.durationSec / 60)} min` : ''}` : 'Prescription only · The logged workout is a separate record.'
    : day.pending ? 'Saved workout details' : `${stats.exercises} exercise${stats.exercises === 1 ? '' : 's'} · ${stats.sets} prescribed set${stats.sets === 1 ? '' : 's'}${date < today ? ' · Past plan; no completed log' : ''}`
  return <section className="training-selected-day" aria-labelledby="selected-day-title">
    <div className="training-selected-head"><div><div className="overview-eyebrow">{date === today ? 'Today' : fmtDay(date).split(',')[0]} · {fmtDate(date)}</div><h3 id="selected-day-title" tabIndex={-1} title={log?.title || day.title}>{log?.title || day.title}</h3></div>
      <div className="training-selected-actions">
        {day.canRun && <Link className="btn" to={`/clients/${client.id}/training?date=${date}&run=1#workout-log`}>{day.pending?.status === 'in_progress' ? 'Resume workout' : 'Start workout'}</Link>}
        {day.canEditPlan && <Button variant={day.canRun ? 'ghost' : 'primary'} onClick={openBuilder}>Edit session</Button>}
        {day.canPlan && <Button onClick={openBuilder}>Plan workout</Button>}
        {log && <Button variant="ghost" onClick={() => openModal(<WorkoutBuilderModal clientId={client.id} date={date} review selectedWorkoutId={log.id} initialMode="edit-log" />, 'xl')}>Edit logged details</Button>}
      </div>
    </div>
    <div className="training-selected-body">
      {log && day.completed.length > 1 && <label className="training-log-picker">Workout log<select value={log.id} onChange={(event) => { setLogId(event.target.value); setRecordView('actual') }}>{day.completed.map((row) => <option key={row.id} value={row.id}>{row.title || 'Workout'}</option>)}</select></label>}
      {log && day.prescription && <SegToggle options={[[ 'actual', 'Logged workout' ], [ 'plan', 'Original plan' ]]} value={recordView} onChange={setRecordView} ariaLabel="Completed day view" />}
      {log || day.pending || day.prescription && !day.appointment ? <><p className="training-selected-notice">{notice}</p><div className="training-selected-scroll" role="region" aria-label={actual ? 'Recorded sets' : day.pending ? 'Saved workout details' : 'Planned exercises'} tabIndex={0}>
        <DayBlockReview compact workout={actual ? log : day.pending || null} prescription={day.prescription} units={units} />
        {(log?.note || day.pending?.note || !actual && day.prescription?.notes) && <p className="training-selected-notes">{actual ? log.note : day.pending?.note || day.prescription.notes}</p>}
      </div></> : <div className="training-selected-empty"><strong>{day.appointment ? 'Appointment complete · No workout log' : date < today ? 'No workout was prescribed or logged.' : 'Choose this date when you’re ready to plan.'}</strong>
        <p>{day.appointment ? 'The booking status does not count as a completed workout.' : date < today ? 'Past dates are closed to new planning.' : 'An unplanned day is not marked as missed or as a completed rest day.'}</p>
        {day.appointment && <Link className="btn ghost sm" to="/schedule">View appointment →</Link>}
      </div>}
    </div>
    <div className="training-selected-foot"><span>{label}</span>{(day.prescription || log) && <details className="training-more" key={`${date}:${log?.id || ''}`}><summary>More actions</summary><div className="training-more-menu">
      {day.prescription && <Button variant="ghost" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; openModal(<CopyWorkoutModal client={client} date={date} onCopied={onSelectDate} />) }}>Copy workout…</Button>}
      {day.canDeletePlan && <Button variant="danger" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; remove() }}>Delete plan</Button>}
      {log && <Button variant="ghost" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; openModal(<SessionInsightsModal workout={log} client={client} units={units} exercises={db.exercises} />, true) }}>Session insights</Button>}
    </div></details>}</div>
  </section>
}
