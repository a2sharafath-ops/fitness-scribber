// Admin user management — create/invite coaches, deactivate, delete, set roles.
// Every action verifies the caller is an admin (profiles.role = 'admin') before
// touching the service-role client. Deploy: `supabase functions deploy admin-users`.
import { admin, userFromRequest, cors, json } from '../_shared/supa.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const caller = await userFromRequest(req)
  if (!caller) return json({ error: 'Not signed in' }, 401)

  const supa = admin()
  const { data: prof } = await supa.from('profiles').select('role').eq('id', caller.id).maybeSingle()
  if (prof?.role !== 'admin') return json({ error: 'Admins only' }, 403)

  const body = await req.json().catch(() => ({}))
  const { action } = body

  try {
    switch (action) {
      // Every auth user merged with their profile role + ban state.
      case 'list': {
        const users: unknown[] = []
        let page = 1
        for (;;) {
          const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 })
          if (error) throw error
          users.push(...data.users)
          if (data.users.length < 200) break
          page++
        }
        const { data: profiles } = await supa.from('profiles').select('*')
        const roles = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))
        return json({
          users: users.map((u: any) => ({
            id: u.id,
            email: u.email,
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at,
            bannedUntil: u.banned_until ?? null,
            role: roles.get(u.id)?.role ?? null,
            displayName: roles.get(u.id)?.displayName ?? null,
          })),
        })
      }

      // Create a ready-to-use coach account with a password.
      case 'create': {
        const { email, password, displayName } = body
        if (!email || !password) return json({ error: 'email and password required' }, 400)
        const { data, error } = await supa.auth.admin.createUser({
          email, password, email_confirm: true,
        })
        if (error) throw error
        await supa.from('profiles').upsert({ id: data.user.id, role: 'coach', displayName: displayName || null })
        return json({ ok: true, id: data.user.id })
      }

      // Email an invite link; profile is created as coach up front so the
      // invitee lands straight in the coach app after setting a password.
      case 'invite': {
        const { email } = body
        if (!email) return json({ error: 'email required' }, 400)
        const { data, error } = await supa.auth.admin.inviteUserByEmail(email, {
          redirectTo: Deno.env.get('APP_URL') ?? undefined,
        })
        if (error) throw error
        await supa.from('profiles').upsert({ id: data.user.id, role: 'coach' })
        await supa.from('coach_invites').upsert({ email, invitedBy: caller.id, redeemedAt: new Date().toISOString() }, { onConflict: 'email' })
        return json({ ok: true, id: data.user.id })
      }

      // Ban (deactivate) / unban. Supabase has no permanent ban flag, so use 100y.
      case 'deactivate':
      case 'reactivate': {
        const { id } = body
        if (!id) return json({ error: 'id required' }, 400)
        if (id === caller.id) return json({ error: 'You cannot deactivate yourself' }, 400)
        const { error } = await supa.auth.admin.updateUserById(id, {
          ban_duration: action === 'deactivate' ? '876000h' : 'none',
        })
        if (error) throw error
        return json({ ok: true })
      }

      // Permanently delete the auth user; profiles + coach data cascade.
      case 'delete': {
        const { id } = body
        if (!id) return json({ error: 'id required' }, 400)
        if (id === caller.id) return json({ error: 'You cannot delete yourself' }, 400)
        const { error } = await supa.auth.admin.deleteUser(id)
        if (error) throw error
        return json({ ok: true })
      }

      // Change a user's role: 'coach' | 'athlete' | 'admin' | 'pending'.
      case 'setRole': {
        const { id, role } = body
        if (!id || !['coach', 'athlete', 'admin', 'pending'].includes(role)) {
          return json({ error: 'id and a valid role required' }, 400)
        }
        if (id === caller.id && role !== 'admin') return json({ error: 'You cannot demote yourself' }, 400)
        const { error } = await supa.from('profiles').upsert({ id, role })
        if (error) throw error
        return json({ ok: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 500)
  }
})
