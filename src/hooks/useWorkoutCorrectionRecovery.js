import { useSyncExternalStore } from 'react'
import { useAuth } from '../store/AuthContext'
import { useData } from '../store/DataContext'
import { forgetCorrectionDraft, inspectCorrectionDraft, readCorrectionDraft, subscribeToCorrectionDrafts } from '../lib/workoutCorrectionRecovery'

export default function useWorkoutCorrectionRecovery(workout) {
  const { user } = useAuth()
  const { db } = useData()
  const scope = user?.id || 'local'
  const raw = useSyncExternalStore(subscribeToCorrectionDrafts, () => readCorrectionDraft(scope, workout), () => null)
  const recovery = inspectCorrectionDraft(scope, db, workout, raw)
  return { scope, recovery, dismiss: () => { if (recovery) forgetCorrectionDraft(scope, recovery.attempt) } }
}
