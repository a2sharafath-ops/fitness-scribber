// Returns the vendor OAuth authorize URL for a coach to connect a client's wearable.
// POST { provider: 'oura'|'whoop'|'fitbit', clientId } with the coach's Authorization header.
import { cors, json } from '../_shared/cors.ts'
import { PROVIDERS } from '../_shared/providers.ts'
import { userFromRequest, enc } from '../_shared/supa.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { provider, clientId } = await req.json()
    const p = PROVIDERS[provider]
    if (!p) return json({ error: 'unknown provider' }, 400)

    const clientIdValue = Deno.env.get(p.clientIdEnv)
    if (!clientIdValue) return json({ error: `${p.clientIdEnv} not configured` }, 500)

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wearable-callback`
    const state = enc({ clientId, coachId: user.id, provider })
    const url = new URL(p.authorizeUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientIdValue)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', p.scope)
    url.searchParams.set('state', state)
    return json({ url: url.toString() })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
