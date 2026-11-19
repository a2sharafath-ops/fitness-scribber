import { supabase } from '../lib/supabase'

export async function saveLiveWorkout(workout, expected, client = supabase) {
  const { error } = await client.rpc('save_live_workout', { p_workout: workout, p_expected: expected || null })
  if (error) throw new Error(error.code === 'PGRST202' ? 'Live workout saving is not installed yet. Your draft is kept on this browser.' : error.message)
}
