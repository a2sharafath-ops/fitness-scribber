import { supabase } from '../lib/supabase'

export async function saveLiveWorkout(workout, expected, client = supabase) {
  const { error } = await client.rpc('save_live_workout', { p_workout: workout, p_expected: expected || null })
  if (error) throw new Error(error.code === 'PGRST202' ? 'Live workout saving is not installed yet. Your draft is kept on this browser.' : error.message)
}

export async function saveLiveWorkoutCompletion(attempt, client = supabase) {
  const { data, error } = await client.rpc('finish_live_workout', {
    p_workout: attempt.workout, p_expected: attempt.expected, p_progress: attempt.progress,
  })
  if (error) {
    const failure = new Error(error.code === 'PGRST202'
      ? 'Workout finish is temporarily unavailable. Your finish details are kept in this browser.'
      : error.message)
    failure.conflict = error.code === '40001'
    throw failure
  }
  return data
}

export async function saveCompletedWorkoutCorrection(workout, expected, correction) {
  const { error } = await supabase.rpc('correct_completed_workout', {
    p_workout: workout, p_expected: expected, p_effort: correction.effort, p_strength: correction.strength,
  }).abortSignal(AbortSignal.timeout(20_000))
  if (error) throw new Error(error.code === 'PGRST202'
    ? 'Workout corrections are temporarily unavailable. Your edits are still open.'
    : error.message)
}
