import { defineConfig, loadEnv } from 'vite'
import { Buffer } from 'node:buffer'
import react from '@vitejs/plugin-react'

const PUBLIC_ENV = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_LOCAL_BUILDER_QA'])

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  for (const name of Object.keys(env)) {
    if (!PUBLIC_ENV.has(name)) throw new Error('Unreviewed browser environment variable: ' + name)
  }
  // Configuration guard, not JWT signature verification or authorization.
  const key = env.VITE_SUPABASE_ANON_KEY
  if (key) {
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
    try {
      const parts = key.split('.')
      publicKey ||= parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'anon'
    } catch { /* Reject malformed or privileged credentials without logging values. */ }
    if (!publicKey) throw new Error('Browser Supabase key must be publishable or legacy anon. Never use a service-role or secret key.')
  }
  return { plugins: [react()] }
})
