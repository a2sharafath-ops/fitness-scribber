import { useEffect, useState, useRef, useCallback } from 'react'
import TodayWorkout from './workout/TodayWorkout'
import CheckInModal from './workout/CheckInModal'
import RPEModal from './workout/RPEModal'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { toast } from '../../lib/toast'
import { readinessScore, dailySum, acwrSeries } from '../../lib/calc'
import { correctClassicWorkout, logWorkoutCheckin } from '../../lib/classicWorkflow'
import { removeWorkoutStrength, resolveTrainingMax } from '../../lib/program'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { clearWorkoutDraft } from '../../lib/workoutDraft'
import { buildFromPrescription } from '../../lib/workout'
import { prepareLiveSession } from '../../lib/liveSession'
import { trainingDay } from '../../lib/trainingDay'
import { bookingWorkout } from '../../lib/schedule'
import { useAuth } from '../../store/AuthContext'
import { forgetWorkoutCompletion, prepareWorkoutCompletion, readWorkoutCompletion, rememberWorkoutCompletion } from '../../lib/workoutCompletion'

// Training owns the Classic session writes. The date is
// explicit so a completed workout can be reopened from Training history.
export default function ClientWorkoutFlow({ client, date, booking, starter, pendingFinish, onRunStateChange, onSessionComplete, startOnOpen = false }) {
  const { db, commit, finishWorkout, tz, units } = useData()
  const { user } = useAuth()
  const scope = user?.id || 'local'
  const { openModal } = useModal()
  const [checkinW, setCheckinW] = useState(null)
  const [rpeW, setRpeW] = useState(pendingFinish?.workout ?? null)
  const [completionBusy, setCompletionBusy] = useState(false)
  const [completion, setCompletion] = useState(pendingFinish || null)
  const [finishError, setFinishError] = useState(null)
  const savingFinish = useRef(false)
  const restoredFinish = useRef(false)
  const mounted = useRef(false)
  const [runOpen, setRunOpen] = useState(false)
  const startAttempted = useRef(false)
  useEffect(() => { onRunStateChange?.(runOpen) }, [runOpen, onRunStateChange])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
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
  const needsCheckin = !checkedIn && booking?.status !== 'Completed'
  const startWorkout = useCallback((item) => {
    if (!needsCheckin) { saveWorkout(item); setRunOpen(true) }
    else setCheckinW(item)
  }, [needsCheckin, saveWorkout])
  const canStart = booking ? Boolean(starter || workout && !['completed', 'discarded'].includes(workout.status)) : day.canRun
  useEffect(() => {
    if (!startOnOpen || pendingFinish || startAttempted.current || !canStart) return
    startAttempted.current = true
    if (workout?.status === 'in_progress') { setRunOpen(true); return }
    const candidate = workout || starter || buildFromPrescription(prescription, { clientId: client.id, date: sessionDate,
      resolveTm: (name) => resolveTrainingMax(db, client.id, name, sessionDate).kg })
    startWorkout({ ...prepareLiveSession(candidate, (name) => resolveTrainingMax(db, client.id, name, sessionDate).kg), status: 'in_progress', startedAt: new Date().toISOString() })
  }, [startOnOpen, pendingFinish, canStart, db, client.id, sessionDate, workout, starter, prescription, startWorkout])
  const submitCheckin = (values) => {
    const item = checkinW
    setCheckinW(null)
    commit((data) => logWorkoutCheckin(data, client.id, values, item))
    setRunOpen(true)
  }
  const skipCheckin = () => { const item = checkinW; setCheckinW(null); if (item) { saveWorkout(item); setRunOpen(true) } }
  const requestComplete = (item) => { setFinishError(null); setRpeW(item) }
  const saveCompletion = useCallback(async (attempt) => {
    if (savingFinish.current) return
    savingFinish.current = true
    setCompletion(attempt)
    setCompletionBusy(true)
    setFinishError(null)
    try {
      await finishWorkout(attempt)
      forgetWorkoutCompletion(scope, attempt)
      clearWorkoutDraft(attempt.workout, 'run')
    } catch (error) {
      if (mounted.current) setFinishError({ conflict: error.conflict, message: error.conflict
        ? `${error.message} Open the saved workout to continue.`
        : `Couldn’t finish saving. Your duration and effort are saved in this browser. ${error.message}` })
      return
    } finally {
      savingFinish.current = false
      if (mounted.current) setCompletionBusy(false)
    }
    if (!mounted.current) return
    setCompletion(null)
    setRpeW(null)
    setRunOpen(false)
    onSessionComplete?.()
    attempt.peaks.forEach((entry, index) => setTimeout(() => toast(
      `New estimated 1RM — ${entry.exercise}: ${entry.valueKg} kg${entry.tracked ? ' (assessment updated)' : ''}`,
      'info', 6000), index * 350))
  }, [finishWorkout, onSessionComplete, scope])
  useEffect(() => {
    if (!pendingFinish || restoredFinish.current) return
    restoredFinish.current = true
    void saveCompletion(pendingFinish)
  }, [pendingFinish, saveCompletion])
  const submitFinish = (rpe, minutes) => {
    if (savingFinish.current) return
    const pending = readWorkoutCompletion(scope, workout)
    if (pending) { void saveCompletion(pending); return }
    try {
      const attempt = prepareWorkoutCompletion(db, workout, rpeW, rpe, minutes)
      rememberWorkoutCompletion(scope, attempt)
      void saveCompletion(attempt)
    } catch (error) {
      setFinishError({ message: error.name === 'QuotaExceededError' || error.name === 'SecurityError'
        ? 'Finish details couldn’t be saved here. Enable browser storage and retry.' : error.message })
    }
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
      {!checkinW && !completion && <TodayWorkout {...workoutProps} focusedRunner={startOnOpen} isToday={sessionDate === todayISO(tz)}
          headerLabel={sessionDate === todayISO(tz) ? "Today's Workout" : `Workout · ${fmtDate(sessionDate)}`} />}
      {checkinW && <CheckInModal today={sessionDate} onSubmit={submitCheckin} onSkip={skipCheckin}
        onClose={() => { setCheckinW(null); setRunOpen(false); onSessionComplete?.() }} />}
      {rpeW && <RPEModal workout={rpeW} busy={completionBusy} attempt={completion} finishError={finishError}
        onSubmit={submitFinish} onSkip={(minutes) => submitFinish(null, minutes)}
        onRetry={() => saveCompletion(completion)}
        onUseSaved={() => { forgetWorkoutCompletion(scope, completion); window.location.reload() }}
        onClose={completionBusy ? undefined : completion ? onSessionComplete : () => setRpeW(null)} />}
    </>
  )
}
