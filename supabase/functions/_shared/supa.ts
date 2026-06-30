import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Service-role client (bypasses RLS) — used only inside trusted Edge Functions.
export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// Resolve the calling user from their Authorization header (coach JWT).
export async function userFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data } = await client.auth.getUser()
  return data.user
}

export const enc = (o: unknown) => btoa(JSON.stringify(o))
export const dec = (s: string) => JSON.parse(atob(s))
