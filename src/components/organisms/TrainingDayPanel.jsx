import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../atoms/Button'
import SegToggle from '../molecules/SegToggle'
import DayBlockReview from './program/DayBlockReview'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import CopyWorkoutModal from './program/CopyWorkoutModal'
import LiveSessionReview from './workout/live/LiveSessionReview'
import './workout/LiveTrainingSession.css'
import WorkoutInsights from './workout/WorkoutInsights'
import ModalShell from '../molecules/ModalShell'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { trainingDay } from '../../lib/trainingDay'
import { bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus } from '../../lib/schedule'
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

export default function TrainingDayPanel({ client, date, today, onSelectDate, bookings = [], selectedBooking, selectedWorkoutId }) {
  const { db, commit, units } = useData()
  const { openModal } = useModal()
  const day = trainingDay(db, client.id, date, today)
  const legacyDay = trainingDay(db, client.id, date, today, { unlinkedOnly: true })
  const [logId, setLogId] = useState(selectedWorkoutId)
  const [recordView, setRecordView] = useState('actual')
  const records = [...day.completed, ...day.discarded].filter(row => !selectedBooking || row.bookingId === selectedBooking.id)
  const log = logId ? records.find((row) => row.id === logId) : records[0]
  const missingLog = Boolean(logId && !log)
  const pending = selectedBooking ? (log ? null : bookingWorkout(db, selectedBooking)) : day.pending
  const selectedAction = selectedBooking && bookingWorkoutAction(db, selectedBooking, today)
  const appointment = selectedBooking ? selectedBooking.status === 'Completed' : !day.scheduled && day.appointment
  const legacyAction = !selectedBooking && legacyDay.canRun
  const title = missingLog ? 'Workout log unavailable' : log?.title || pending?.title || (selectedBooking ? `Booking at ${selectedBooking.time}` : day.title)
  const actual = Boolean(log) && (recordView === 'actual' || !day.prescription)
  const hasDetails = !missingLog && Boolean(log || pending || day.prescription && !appointment)
  const openBuilder = () => openModal(<WorkoutBuilderModal clientId={client.id} date={date} />, 'xl')
  const remove = async () => {
    if (!day.canDeletePlan || !await confirmDialog({ title: 'Delete planned workout?', message: `Remove ${day.prescription.name || 'this plan'} from ${fmtDate(date)}? Workout logs are kept.`, confirmLabel: 'Delete plan', danger: true })) return
    commit((data) => deleteSpan(data, client.id, [date])); toast('Plan deleted.')
  }
  const stats = programStats(day.prescription)
  const doneSets = log ? runBlocks(log).flatMap((block) => block.items).reduce((count, item) => count + (item.setRows ? item.setRows.filter((row) => row.done).length : Number(item.doneSets) || 0), 0) : 0
  const label = log ? log.status === 'discarded' ? 'Discarded workout · recorded sets retained' : 'Completed workout log'
    : pending ? (pending.status === 'in_progress' ? 'In progress' : 'Ready') : appointment ? 'Completed booking' : day.prescription ? 'Planned workout' : 'No workout data'
  const notice = log ? actual ? `${doneSets} recorded set${doneSets === 1 ? '' : 's'}${log.durationSec > 0 ? ` · ${Math.round(log.durationSec / 60)} min` : ''}` : 'Prescription only · The logged workout is a separate record.'
    : pending ? 'Saved workout details' : `${stats.exercises} exercise${stats.exercises === 1 ? '' : 's'} · ${stats.sets} prescribed set${stats.sets === 1 ? '' : 's'}`
  return <section className="training-selected-day" aria-labelledby="selected-day-title">
    {bookings.length > 0 && <section id="training-bookings" className="training-bookings" aria-labelledby="training-bookings-title">
      <h3 id="training-bookings-title">Training bookings</h3>
      <ul>{bookings.map((booking) => {
        const workout = bookingWorkout(db, booking)
        const action = bookingWorkoutAction(db, booking, today)
        return <li key={booking.id} data-selected={booking.id === selectedBooking?.id || undefined}>
          <div><strong>{booking.time} · {workout?.title || booking.type}</strong>
            <small>{bookingWorkoutStatus(booking, workout)}</small>
          </div>
          {action && (action.label !== 'Log workout' || booking.id !== selectedBooking?.id) && <Link className="btn ghost sm" to={action.path} aria-label={`${action.label} for ${booking.time} booking`}>{action.label}</Link>}
        </li>
      })}</ul>
    </section>}
    <div id="selected-workout" className="training-selected-head"><div><div className="overview-eyebrow">{date === today ? 'Today' : fmtDay(date).split(',')[0]} · {fmtDate(date)}{selectedBooking && ` · ${selectedBooking.time}`}</div><h3 id="selected-day-title" tabIndex={-1} title={title}>{title}</h3></div>
      <div className="training-selected-actions">
        {selectedAction?.label === 'Log workout' && <Link className="btn" to={selectedAction.path} aria-label={`Log workout for ${selectedBooking.time} booking`}>Log workout</Link>}
        {legacyAction && <Link className="btn" to={`/clients/${client.id}/training?date=${date}&run=1#workout-log`}>{legacyDay.pending?.status === 'in_progress' ? bookings.length ? 'Resume unlinked workout' : 'Resume workout' : 'Start workout'}</Link>}
        {day.canEditPlan && <Button variant={legacyAction ? 'ghost' : 'primary'} onClick={openBuilder}>{bookings.length ? 'Edit day’s plan' : 'Edit session'}</Button>}
        {day.canPlan && <Button onClick={openBuilder}>Plan workout</Button>}
        {log && log.status === 'completed' && <Button variant="ghost" onClick={() => openModal(<WorkoutBuilderModal clientId={client.id} date={date} review selectedWorkoutId={log.id} initialMode="edit-log" />, 'xl')}>Edit logged details</Button>}
      </div>
    </div>
    <div className="training-selected-body" data-empty={!hasDetails || undefined} data-logged-workout={actual || undefined}>
      {log && records.length > 1 && <label className="training-log-picker">Workout log<select value={log.id} onChange={(event) => { setLogId(event.target.value); setRecordView('actual') }}>{records.map((row) => <option key={row.id} value={row.id}>{row.title || 'Workout'} · {bookings.find(booking => booking.id === row.bookingId)?.time || 'Unlinked'}</option>)}</select></label>}
      {log && day.prescription && <SegToggle options={[[ 'actual', 'Logged workout' ], [ 'plan', bookings.length ? 'Day’s plan' : 'Original plan' ]]} value={recordView} onChange={setRecordView} ariaLabel="Completed day view" />}
      {hasDetails ? <><p className="training-selected-notice">{notice}</p><div className="training-selected-scroll" role="region" aria-label={actual ? 'Recorded sets' : pending ? 'Saved workout details' : 'Planned exercises'} tabIndex={0}>
        <DayBlockReview compact workout={actual ? log : log ? null : pending} prescription={day.prescription} units={units} />
        {actual && log?.liveState && <div className="ls-session"><LiveSessionReview key={log.id} session={log} units={units} /></div>}
        {(actual ? log.note : pending?.note || day.prescription?.notes) && <p className="training-selected-notes">{actual ? log.note : pending?.note || day.prescription?.notes}</p>}
      </div></> : <div className="training-selected-empty"><strong>{missingLog ? 'This workout log is no longer available for the selected day.' : appointment ? 'Booking completed · No workout log' : date < today ? 'No workout was prescribed or logged.' : 'No workout planned for this date'}</strong>
        {!missingLog && appointment && !selectedAction && <Link className="btn ghost sm" to="/schedule">View schedule →</Link>}
      </div>}
    </div>
    {!missingLog && <div className="training-selected-foot"><span>{label}</span>{(day.prescription || log) && <details className="training-more" key={`${date}:${log?.id || ''}`}><summary>More actions</summary><div className="training-more-menu">
      {day.prescription && <Button variant="ghost" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; openModal(<CopyWorkoutModal client={client} date={date} onCopied={onSelectDate} />) }}>Copy workout…</Button>}
      {day.canDeletePlan && <Button variant="danger" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; remove() }}>Delete plan</Button>}
      {log && log.status === 'completed' && <Button variant="ghost" size="sm" onClick={(event) => { event.currentTarget.closest('details').open = false; openModal(<SessionInsightsModal workout={log} client={client} units={units} exercises={db.exercises} />, true) }}>Session insights</Button>}
    </div></details>}</div>}
  </section>
}
