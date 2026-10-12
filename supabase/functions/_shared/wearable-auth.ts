import { admin } from './supa.ts'

export const validProof = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
export const randomProof = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
export async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
export async function ownedClient(db: ReturnType<typeof admin>, clientId: unknown, userId: string) {
  if (typeof clientId !== 'string' || !clientId.trim()) return null
  const { data, error } = await db.from('clients').select('id,coachId,userId').eq('id', clientId).maybeSingle()
  if (error) throw new Error('Client lookup failed')
  return data && (data.coachId === userId || data.userId === userId) ? data : null
}
export function callbackUri(provider: string) {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/wearable-callback/${provider}`
}
export function appRedirect(status: string, state?: string) {
  const url = new URL(Deno.env.get('APP_URL') || '')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid app URL')
  if (url.username || url.password) throw new Error('Invalid app URL')
  // A fragment is not sent to the app server or in Referer headers.
  url.search = ''; url.hash = new URLSearchParams({ wearable: status, ...(state ? { state } : {}) }).toString()
  return new Response(null, { status: 303, headers: { Location: url.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}
