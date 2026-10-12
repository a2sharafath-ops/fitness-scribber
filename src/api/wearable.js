import { callFunction } from './functions'

const KEY = 'fitness.wearable.pending'
const proof = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
export const wearableReturn = () => new URLSearchParams(window.location.hash.slice(1)).get('wearable')

export async function beginWearableConnection(provider, clientId) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  // Check storage before creating a request; the proof must survive navigation.
  sessionStorage.setItem(KEY, JSON.stringify({ verifier, returnPath: window.location.pathname + window.location.search }))
  try {
    const result = await callFunction('wearable-connect', { provider, clientId, challenge })
    const url = new URL(result.url)
    const origins = { oura: 'https://cloud.ouraring.com', whoop: 'https://api.prod.whoop.com', fitbit: 'https://www.fitbit.com' }
    if (!proof(result.state) || url.origin !== origins[provider] || url.searchParams.get('state') !== result.state) throw new Error('Invalid connection response')
    sessionStorage.setItem(KEY, JSON.stringify({ verifier, state: result.state, returnPath: window.location.pathname + window.location.search, expires: Date.now() + 600_000 }))
    window.location.assign(url.toString())
  } catch (error) { sessionStorage.removeItem(KEY); throw error }
}

export async function completeWearableConnection() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const state = params.get('state'), status = params.get('wearable')
  // Remove callback state immediately. Neither the OAuth code nor vendor tokens
  // are ever delivered to this app page.
  window.history.replaceState({}, '', window.location.pathname + window.location.search)
  const raw = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  const pending = raw ? JSON.parse(raw) : null
  if (status !== 'complete' || !proof(state) || !proof(pending?.verifier) || state !== pending?.state || !Number.isFinite(pending.expires) || pending.expires <= Date.now()) throw new Error('Connection expired or opened in another tab. Start again from the client page.')
  const result = await callFunction('wearable-complete', { state, verifier: pending.verifier })
  if (!result?.connected) throw new Error('Connection could not be completed. Please start again.')
  const target = new URL(pending.returnPath, window.location.origin)
  return target.origin === window.location.origin ? target.pathname + target.search : '/'
}
