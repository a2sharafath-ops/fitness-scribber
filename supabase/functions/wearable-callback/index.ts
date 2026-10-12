// Public vendor callback. Stores the code once; it never exchanges it or links
// an account until the initiating browser authenticates to wearable-complete.
import { PROVIDERS } from '../_shared/providers.ts'
import { admin } from '../_shared/supa.ts'
import { validProof, digest, appRedirect } from '../_shared/wearable-auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('method not allowed', { status: 405 })
  try {
    const url = new URL(req.url)
    const provider = url.pathname.split('/').at(-1) || ''
    const state = url.searchParams.get('state'), code = url.searchParams.get('code')
    if (!Object.hasOwn(PROVIDERS, provider) || !validProof(state) || !code || code.length > 4096 || url.searchParams.has('error')) throw new Error('Invalid callback')
    // Conditional UPDATE prevents duplicate callbacks from replacing a code.
    const { data, error } = await admin().from('wearable_oauth_requests').update({ code })
      .eq('id', await digest(state)).eq('provider', provider)
      .gt('expiresAt', new Date().toISOString()).is('code', null).select('id').maybeSingle()
    if (error || !data) throw new Error('Invalid or expired connection')
    return appRedirect('complete', state)
  } catch {
    try { return appRedirect('error') }
    catch { return new Response('Device connection failed.', { status: 400 }) }
  }
})
