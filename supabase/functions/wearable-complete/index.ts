import { cors, json } from '../_shared/cors.ts'
import { admin, userFromRequest } from '../_shared/supa.ts'
import { PROVIDERS } from '../_shared/providers.ts'
import { ownedClient, validProof, digest, callbackUri } from '../_shared/wearable-auth.ts'
import { exchangeToken } from '../_shared/wearable-token.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { state, verifier } = await req.json()
    if (!validProof(state) || !validProof(verifier)) return json({ error: 'invalid request' }, 400)
    const db = admin()
    // DELETE ... RETURNING is atomic: concurrent requests can consume it once.
    // Wrong users/proofs do not consume another browser's request.
    const { data: pending, error } = await db.from('wearable_oauth_requests').delete()
      .eq('id', await digest(state)).eq('userId', user.id).eq('challenge', await digest(verifier))
      .gt('expiresAt', new Date().toISOString()).not('code', 'is', null).select('*').maybeSingle()
    if (error) throw new Error('Connection lookup failed')
    if (!pending) return json({ error: 'Connection expired or already used. Start again.' }, 409)
    const client = await ownedClient(db, pending.clientId, user.id)
    if (!client || client.coachId !== pending.coachId) return json({ error: 'not found' }, 404)
    const provider = Object.hasOwn(PROVIDERS, pending.provider) ? PROVIDERS[pending.provider] : null
    if (!provider) throw new Error('Invalid provider')
    const token = await exchangeToken(provider, {
      grant_type: 'authorization_code', code: pending.code, redirect_uri: callbackUri(pending.provider),
      ...(provider.pkce ? { code_verifier: verifier } : {}),
    })
    // Recheck after the external request; never write under the athlete's ID.
    const current = await ownedClient(db, client.id, user.id)
    if (!current || current.coachId !== pending.coachId) return json({ error: 'not found' }, 404)
    const { error: saveError } = await db.from('wearable_tokens').upsert({
      clientId: client.id, coachId: client.coachId, provider: pending.provider, ...token,
    })
    if (saveError) throw new Error('Connection could not be saved')
    return json({ connected: true })
  } catch {
    return json({ error: 'Device connection failed. Please start again.' }, 500)
  }
})
