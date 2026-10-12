// Returns the vendor OAuth URL for an authorized coach or linked athlete.
// POST { provider: 'oura'|'whoop'|'fitbit', clientId, challenge } with Authorization.
import { cors, json } from '../_shared/cors.ts'
import { PROVIDERS } from '../_shared/providers.ts'
import { userFromRequest, admin } from '../_shared/supa.ts'
import { ownedClient, validProof, randomProof, digest, callbackUri } from '../_shared/wearable-auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { provider, clientId, challenge } = await req.json()
    const p = Object.hasOwn(PROVIDERS, provider) ? PROVIDERS[provider] : null
    if (!p || !validProof(challenge)) return json({ error: 'invalid request' }, 400)
    const db = admin()
    const client = await ownedClient(db, clientId, user.id)
    if (!client) return json({ error: 'not found' }, 404)

    const clientIdValue = Deno.env.get(p.clientIdEnv)
    if (!clientIdValue || !Deno.env.get(p.clientSecretEnv)) return json({ error: 'Device connection is not configured.' }, 503)

    const redirectUri = callbackUri(provider)
    const state = randomProof()
    const { error } = await db.from('wearable_oauth_requests').insert({
      id: await digest(state), clientId: client.id, coachId: client.coachId,
      userId: user.id, provider, challenge, expiresAt: new Date(Date.now() + 600_000).toISOString(),
    })
    if (error) throw new Error('Connection could not be started')
    const url = new URL(p.authorizeUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientIdValue)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', p.scope)
    url.searchParams.set('state', state)
    if (p.pkce) {
      url.searchParams.set('code_challenge', challenge)
      url.searchParams.set('code_challenge_method', 'S256')
    }
    return json({ url: url.toString(), state })
  } catch {
    return json({ error: 'Device connection could not be started. Please try again.' }, 500)
  }
})
