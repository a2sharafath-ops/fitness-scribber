import { useEffect, useState, useRef, useCallback } from 'react'
import TodayWorkout from './workout/TodayWorkout'
import CheckInModal from './workout/CheckInModal'
import RPEModal from './workout/RPEModal'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { toast } from '../../lib/toast'
import { readinessScore, dailySum, acwrSeries } from '../../lib/calc'
import { completeClassicWorkout, correctClassicWorkout, logWorkoutCheckin } from '../../lib/classicWorkflow'
import { removeWorkoutStrength, resolveTrainingMax } from '../../lib/program'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { clearWorkoutDraft } from '../../lib/workoutDraft'
import { buildFromPrescription } from '../../lib/workout'
import { prepareLiveSession } from '../../lib/liveSession'
import { trainingDay } from '../../lib/trainingDay'
import { bookingWorkout } from '../../lib/schedule'

// Training owns the Classic session writes. The date is
// explicit so a completed workout can be reopened from Training history.
export default function ClientWorkoutFlow({ client, date, booking, starter, onRunStateChange, onSessionComplete, startOnOpen = false }) {
  const { db, commit, tz, units } = useData()
  const { openModal } = useModal()
  const [checkinW, setCheckinW] = useState(null)
  const [rpeW, setRpeW] = useState(null)
  const [completionBusy, setCompletionBusy] = useState(false)
  const completionAttempt = useRef(null)
  const [runOpen, setRunOpen] = useState(false)
  const startAttempted = useRef(false)
  useEffect(() => { onRunStateChange?.(runOpen) }, [runOpen, onRunStateChange])
  const sessionDate = date || todayISO(tz)
  const day = trainingDay(db, client.id, sessionDate, todayISO(tz), { unlinkedOnly: true })
  const workout = booking ? bookingWorkout(db, booking) : day.completed[0] || day.pending || (runOpen ? day.discarded?.at(-1) : null) || null
  const prescription = day.prescription
  const dayClosed = day.closed
  const completedAppointment = Boolean(day.appointment)
  const wearable = db.wearable.filter((item) => item.clientId === client.id && item.date <= sessionDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null
  const range = Array.from({ length: 28 }, (_, index) => addDays(sessionDate, index - 27))
  const acwr = acwrSeries(dailySum(db.srpe, client.id, 'tl'), range).filter((value) => value != null).slice(-1)[0]
  const readiness = readinessScore(db, client.id, sessionDate)
  const age = client.anthro?.age ?? null

  const saveWorkout = useCallback((item) => commit((data) => {
    const previous = (data.workouts || []).find((existing) => existing.id === item.id)
    if (previous?.status === 'completed') correctClassicWorkout(data, client.id, item)
    else data.workouts = [...(data.workouts || []).filter((existing) => existing.id !== item.id), item]
  }), [commit, client.id])
  const saveTemplate = (plan) => commit((data) => { data.plans = [...data.plans, plan] })
  const clearWorkout = () => {
    if (!workout) return
    commit((data) => {
      data.workouts = (data.workouts || []).filter((item) => item.id !== workout.id)
      removeWorkoutStrength(data, workout.id)
    })
    clearWorkoutDraft(workout)
  }
  const checkedIn = db.wellness.some((entry) => entry.clientId === client.id && entry.date === sessionDate)
  const startWorkout = useCallback((item) => {
    if (checkedIn) { saveWorkout(item); setRunOpen(true) }
    else setCheckinW(item)
  }, [checkedIn, saveWorkout])
  const canStart = booking ? Boolean(starter || workout && !['completed', 'discarded'].includes(workout.status)) : day.canRun
  useEffect(() => {
    if (!startOnOpen || startAttempted.current || !canStart) return
    startAttempted.current = true
    if (workout?.status === 'in_progress') { setRunOpen(true); return }
    const candidate = workout || starter || buildFromPrescription(prescription, { clientId: client.id, date: sessionDate,
      resolveTm: (name) => resolveTrainingMax(db, client.id, name, sessionDate).kg })
    startWorkout({ ...prepareLiveSession(candidate, (name) => resolveTrainingMax(db, client.id, name, sessionDate).kg), status: 'in_progress', startedAt: new Date().toISOString() })
  }, [startOnOpen, canStart, db, client.id, sessionDate, workout, starter, prescription, startWorkout])
  const submitCheckin = (values) => {
    const item = checkinW
    setCheckinW(null)
    commit((data) => logWorkoutCheckin(data, client.id, values, item))
    setRunOpen(true)
  }
  const skipCheckin = () => { const item = checkinW; setCheckinW(null); if (item) { saveWorkout(item); setRunOpen(true) } }
  const requestComplete = (item) => { completionAttempt.current = null; setRpeW(item) }
  const finishWorkout = async (item, rpe, minutes) => {
    setCompletionBusy(true)
    let result
    if (completionAttempt.current) result = await commit(() => {})
    else result = await commit((data) => { completionAttempt.current = { peaks: completeClassicWorkout(data, client.id, item, rpe, minutes) } })
    setCompletionBusy(false)
    if (!result?.saved) { toast('The session could not finish saving. Retry to save the same recorded effort and sets.', 'error'); return }
    const peaks = completionAttempt.current?.peaks || []
    completionAttempt.current = null
    clearWorkoutDraft(item, 'run')
    setRpeW(null)
    setRunOpen(false)
    onSessionComplete?.()
    peaks.forEach((entry, index) => setTimeout(() => toast(
      `New estimated 1RM — ${entry.exercise}: ${entry.valueKg} kg${entry.tracked ? ' (assessment updated)' : ''}`,
      'info', 6000), index * 350))
  }

  const workoutProps = {
    client, today: sessionDate, workout, bookingTime: booking?.time, prescription: booking ? null : prescription, plans: db.plans, exercises: db.exercises, preserveDraft: true, history: db.workouts || [], dayClosed, completedAppointment,
    units, context: { readiness, acwr }, restingHr: wearable?.rhr ?? null,
    age, bodyMassKg: client.anthro?.massKg ?? null,
    resolveTm: (name) => resolveTrainingMax(db, client.id, name, sessionDate).kg,
    onStart: startWorkout, onSave: saveWorkout, onComplete: requestComplete, onClear: booking ? undefined : clearWorkout,
    runOpen, onResume: () => setRunOpen(true), onExit: () => { setRunOpen(false); onSessionComplete?.() },
    onTemplate: saveTemplate,
    onAddSession: dayClosed || booking ? null : () => openModal(<WorkoutBuilderModal clientId={client.id} date={sessionDate} />, 'xl'),
  }

  return (
    <>
      {!checkinW && <TodayWorkout {...workoutProps} focusedRunner={startOnOpen} isToday={sessionDate === todayISO(tz)}
          headerLabel={sessionDate === todayISO(tz) ? "Today's Workout" : `Workout · ${fmtDate(sessionDate)}`} />}
      {checkinW && <CheckInModal today={sessionDate} onSubmit={submitCheckin} onSkip={skipCheckin}
        onClose={() => { setCheckinW(null); setRunOpen(false); onSessionComplete?.() }} />}
      {rpeW && <RPEModal workout={rpeW} busy={completionBusy} locked={!!completionAttempt.current}
        onSubmit={(rpe, minutes) => finishWorkout(rpeW, rpe, minutes)}
        onSkip={(minutes) => finishWorkout(rpeW, null, minutes)} onClose={() => setRpeW(null)} />}
    </>
  )
}
