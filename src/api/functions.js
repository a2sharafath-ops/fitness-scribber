// Thin wrapper over Supabase Edge Functions (wearable OAuth, LLM insights).
import { supabase, hasBackend } from '../lib/supabase'

export async function callFunction(name, body) {
  if (!hasBackend) throw new Error('Backend not configured')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw error
  return data
}

export { hasBackend }
