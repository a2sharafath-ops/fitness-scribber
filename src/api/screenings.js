import { supabase } from '../lib/supabase'
import { sameSavedRecord } from '../lib/confirmedPersistence'

export async function loadAthleteScreenings(clientId, client = supabase) {
  const { data, error } = await client.rpc('athlete_screenings', { p_client_id: clientId })
  if (error || !Array.isArray(data)) throw new Error('Your screening could not be loaded. Try again.')
  return data
}

export async function saveAthleteScreening(row, submit, client = supabase) {
  const { id, clientId, step, consent, parq, hhq, goals, acknowledgements, updatedAt } = row
  const { data, error } = await client.rpc('save_athlete_screening', {
    p_client_id: clientId,
    p_answers: { id, step, consent, parq, hhq, goals, acknowledgements, updatedAt },
    p_submit: submit,
  })
  if (error || !data) {
    if (error?.code === '40001') throw new Error('This screening changed in another session. Reopen the saved record before continuing.')
    if (error?.code === '22023') throw new Error(error.message)
    throw new Error('Couldn’t save your screening. Your answers are still here. Try again.')
  }
  return data
}

export async function saveCoachScreening(row, expected, client = supabase) {
  const { id, clientId, updatedAt: _updatedAt, coachId: _coachId, ...fields } = row
  const table = client.from('screenings')
  const write = expected
    ? table.update(fields)
      .eq('id', id).eq('clientId', clientId).eq('status', 'draft').eq('updatedAt', expected)
    : table.insert({ id, clientId, ...fields })
  const { data, error } = await write.select('*').maybeSingle()
  if (data && !error) return stripCoach(data)
  if (!error || error.code === '23505') {
    const { data: current, error: loadError } = await client.from('screenings').select('*')
      .eq('id', id).eq('clientId', clientId).maybeSingle()
    if (!loadError && current && Object.keys(fields).every(key => sameSavedRecord(fields[key], current[key]))) {
      return stripCoach(current)
    }
    if (!loadError) throw new Error('This screening changed in another session. Reopen the saved record before continuing.')
  }
  throw new Error('Couldn’t save the screening. Your answers are still here. Try again.')
}

function stripCoach({ coachId: _coachId, ...row }) {
  return row
}
