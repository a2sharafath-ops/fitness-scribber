// Pulls today's reading for a client's connected wearables and writes a row into `wearable`.
// POST { clientId } with an authorized coach or linked athlete's Authorization header.
import { cors, json } from '../_shared/cors.ts'
import { PROVIDERS } from '../_shared/providers.ts'
import { admin, userFromRequest } from '../_shared/supa.ts'
import { ownedClient } from '../_shared/wearable-auth.ts'
import { exchangeToken } from '../_shared/wearable-token.ts'

async function freshToken(db: ReturnType<typeof admin>, row: Record<string, unknown>) {
  const p = PROVIDERS[row.provider as string]
  const exp = row.expiresAt ? new Date(row.expiresAt as string).getTime() : 0
  if (exp && exp > Date.now() + 60_000) return row.accessToken as string
  if (!row.refreshToken) return row.accessToken as string
  const token = await exchangeToken(p, { grant_type: 'refresh_token', refresh_token: row.refreshToken as string })
  const { error } = await db.from('wearable_tokens').update({ ...token, refreshToken: token.refreshToken ?? row.refreshToken })
    .eq('clientId', row.clientId).eq('coachId', row.coachId).eq('provider', row.provider)
  if (error) throw new Error('Token refresh could not be saved')
  return token.accessToken
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { clientId } = await req.json()
    const db = admin()
    const client = await ownedClient(db, clientId, user.id)
    if (!client) return json({ error: 'not found' }, 404)
    const { data: tokens, error } = await db.from('wearable_tokens').select('*').eq('clientId', client.id).eq('coachId', client.coachId)
    if (error) throw new Error('Device lookup failed')
    if (!tokens?.length) return json({ synced: 0, note: 'no connected wearables' })

    const date = new Date().toISOString().slice(0, 10)
    let synced = 0
    const merged: Record<string, number> = {}
    for (const row of tokens) {
      const p = Object.hasOwn(PROVIDERS, row.provider) ? PROVIDERS[row.provider] : null
      if (!p) continue
      const token = await freshToken(db, row)
      const reading = await p.fetchReading(token, date)
      for (const k of ['hrv', 'rhr', 'sleepHrs'] as const) if (reading[k] != null) merged[k] = reading[k] as number
      if (Object.keys(reading).length) synced++
    }
    if (synced) {
      const current = await ownedClient(db, client.id, user.id)
      if (!current || current.coachId !== client.coachId) return json({ error: 'not found' }, 404)
      const id = crypto.randomUUID()
      const { error: saveError } = await db.from('wearable').upsert({
        id, clientId: client.id, coachId: client.coachId, date,
        hrv: merged.hrv ?? null, rhr: merged.rhr ?? null, sleepHrs: merged.sleepHrs ?? null,
        source: tokens.map((t: Record<string, unknown>) => t.provider).join('+'),
      })
      if (saveError) throw new Error('Reading could not be saved')
    }
    return json({ synced, reading: merged })
  } catch {
    return json({ error: 'Device sync failed. Please try again or reconnect the device.' }, 500)
  }
})
