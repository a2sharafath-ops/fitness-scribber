// OAuth redirect target: exchanges the auth code for tokens and stores them, then
// bounces the coach back to the app. Register this URL as the redirect URI in each
// vendor's developer console: {SUPABASE_URL}/functions/v1/wearable-callback
import { PROVIDERS } from '../_shared/providers.ts'
import { admin, dec } from '../_shared/supa.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = Deno.env.get('APP_URL') ?? '/'
  try {
    if (!code || !state) throw new Error('missing code/state')
    const { clientId, coachId, provider } = dec(state)
    const p = PROVIDERS[provider]
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wearable-callback`

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: Deno.env.get(p.clientIdEnv)!,
      client_secret: Deno.env.get(p.clientSecretEnv)!,
    })
    const res = await fetch(p.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const tok = await res.json()
    if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(tok)}`)

    const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null
    await admin().from('wearable_tokens').upsert({
      clientId, coachId, provider,
      accessToken: tok.access_token, refreshToken: tok.refresh_token ?? null, expiresAt,
    })
    return Response.redirect(`${appUrl}?wearable=connected`, 302)
  } catch (e) {
    return Response.redirect(`${appUrl}?wearable=error&msg=${encodeURIComponent(String(e))}`, 302)
  }
})
