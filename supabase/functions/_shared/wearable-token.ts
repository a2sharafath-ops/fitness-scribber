import type { Provider } from './providers.ts'

export async function exchangeToken(provider: Provider, values: Record<string, string>) {
  const clientId = Deno.env.get(provider.clientIdEnv)
  const secret = Deno.env.get(provider.clientSecretEnv)
  if (!clientId || !secret) throw new Error('Provider not configured')
  const body = new URLSearchParams({ ...values, client_id: clientId })
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (provider.id === 'fitbit') headers.Authorization = `Basic ${btoa(`${clientId}:${secret}`)}`
  else body.set('client_secret', secret)
  const response = await fetch(provider.tokenUrl, { method: 'POST', headers, body })
  if (!response.ok) throw new Error('Provider authorization failed')
  const token = await response.json()
  if (typeof token.access_token !== 'string' || !token.access_token || (token.token_type && token.token_type.toLowerCase() !== 'bearer')) throw new Error('Invalid token response')
  const seconds = Number(token.expires_in)
  if (token.expires_in != null && (!Number.isFinite(seconds) || seconds <= 0 || seconds > 315360000)) throw new Error('Invalid token lifetime')
  return {
    accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === 'string' && token.refresh_token ? token.refresh_token : null,
    expiresAt: token.expires_in == null ? null : new Date(Date.now() + seconds * 1000).toISOString(),
  }
}
