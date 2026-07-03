import { createClient } from '@supabase/supabase-js'

// When env vars are present the app runs in "backend mode" (Supabase: auth + Postgres).
// When absent it falls back to local mode (localStorage) so the app still works standalone.
const env = import.meta.env || {}
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const hasBackend = !!supabase

// Collection arrays in the store that map 1:1 to Postgres tables (table name === key).
export const TABLES = [
  'clients', 'exercises', 'plans', 'sessions', 'logs', 'wellness',
  'srpe', 'resistance', 'cardio', 'wearable', 'concerns', 'prescriptions', 'templates', 'workouts', 'assessments',
  'screenings', 'maxes', 'synonyms',
]
