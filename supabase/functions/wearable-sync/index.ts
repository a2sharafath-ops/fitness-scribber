// Pulls today's reading for a client's connected wearables and writes a row into `wearable`.
// POST { clientId } with the coach's Authorization header. Run on a schedule (cron) or on demand.
import { cors, json } from '../_shared/cors.ts'
import { PROVIDERS } from '../_shared/providers.ts'
import { admin, userFromRequest } from '../_shared/supa.ts'

async function freshToken(db: ReturnType<typeof admin>, row: Record<string, unknown>) {
  const p = PROVIDERS[row.provider as string]
  const exp = row.expiresAt ? new Date(row.expiresAt as string).getTime() : 0
  if (exp && exp > Date.now() + 60_000) return row.accessToken as string
  if (!row.refreshToken) return row.accessToken as string
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: row.refreshToken as string,
    client_id: Deno.env.get(p.clientIdEnv)!,
    client_secret: Deno.env.get(p.clientSecretEnv)!,
  })
  const res = await fetch(p.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const tok = await res.json()
  if (!res.ok) return row.accessToken as string
  const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null
  await db.from('wearable_tokens').update({ accessToken: tok.access_token, refreshToken: tok.refresh_token ?? row.refreshToken, expiresAt })
    .eq('clientId', row.clientId).eq('provider', row.provider)
  return tok.access_token as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { clientId } = await req.json()
    const db = admin()
    const { data: tokens } = await db.from('wearable_tokens').select('*').eq('clientId', clientId)
    if (!tokens?.length) return json({ synced: 0, note: 'no connected wearables' })

    const date = new Date().toISOString().slice(0, 10)
    let synced = 0
    const merged: Record<string, number> = {}
    for (const row of tokens) {
      const p = PROVIDERS[row.provider]
      if (!p) continue
      const token = await freshToken(db, row)
      const reading = await p.fetchReading(token, date).catch(() => ({}))
      for (const k of ['hrv', 'rhr', 'sleepHrs'] as const) if (reading[k] != null) merged[k] = reading[k] as number
      if (Object.keys(reading).length) synced++
    }
    if (synced) {
      const id = crypto.randomUUID().slice(0, 8)
      await db.from('wearable').upsert({
        id, clientId, coachId: user.id, date,
        hrv: merged.hrv ?? null, rhr: merged.rhr ?? null, sleepHrs: merged.sleepHrs ?? null,
        source: tokens.map((t: Record<string, unknown>) => t.provider).join('+'),
      })
    }
    return json({ synced, reading: merged })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
