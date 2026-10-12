// Browser API: connection metadata only. OAuth credentials stay server-side.
import { cors, json } from '../_shared/cors.ts'
import { admin, userFromRequest } from '../_shared/supa.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { clientId, action, provider } = await req.json()
    if (typeof clientId !== 'string' || !['list', 'disconnect'].includes(action)) return json({ error: 'invalid request' }, 400)
    const db = admin()
    const { data: client, error: clientError } = await db.from('clients')
      .select('id,coachId,userId').eq('id', clientId).maybeSingle()
    if (clientError) throw new Error('client lookup failed')
    if (!client || (client.coachId !== user.id && client.userId !== user.id)) return json({ error: 'not found' }, 404)
    if (action === 'disconnect') {
      if (!['oura', 'whoop', 'fitbit'].includes(provider)) return json({ error: 'invalid provider' }, 400)
      const { error } = await db.from('wearable_tokens').delete()
        .eq('clientId', client.id).eq('coachId', client.coachId).eq('provider', provider)
      if (error) throw new Error('disconnect failed')
      return json({ ok: true })
    }
    const { data, error } = await db.from('wearable_tokens').select('provider,expiresAt')
      .eq('clientId', client.id).eq('coachId', client.coachId)
    if (error) throw new Error('connection lookup failed')
    return json({ connections: (data || []).map(({ provider, expiresAt }) => ({ provider, expiresAt })) })
  } catch {
    return json({ error: 'Device connection request failed. Please try again.' }, 500)
  }
})
