# Production features — athlete logins, wearables, LLM coaching

These build on the base backend in `SETUP_BACKEND.md`. Do that first.

## A. Run the additional SQL
In the Supabase **SQL Editor**, run these (after `schema.sql`):
1. `supabase/schema_athlete.sql` — roles, invite-code linking, athlete RLS, `redeem_invite()`.
2. Wearable server-only tables are installed in the configured production project.
   Read `docs/wearable-security-review.txt` for the current deployment status.
   `supabase/functions_schema.sql` now creates the restricted tables for new setups.

## B. Athlete logins (works immediately after the SQL)
No deployment needed — it's all app + database.
1. As a coach, open a client → **🎟️ Invite** → **Generate invite code**. Share the code.
2. The athlete signs up (same app), chooses **“I have an invite code”**, and enters it.
   `redeem_invite()` links their auth account to that client and flips their role to `athlete`.
3. The athlete now sees the **Athlete Portal**: morning Hooper check-in, session-RPE logging,
   today's prescribed session, and their readiness — all scoped to just them by row-level security.
   Their submissions flow straight into your coach views.

## B2. Admin portal (manage coaches, platform oversight)

Coach signup is **invite-only** once this is set up — only admins create coach accounts.

1. Run `supabase/schema_admin.sql` in the SQL Editor (after `schema_athlete.sql`).
2. Promote the first admin (yourself) in the SQL Editor:
   ```sql
   insert into profiles(id, role)
     select id, 'admin' from auth.users where email = 'admin@cureo.city'
   on conflict (id) do update set role = 'admin';
   ```
3. Deploy the user-management function:
   ```bash
   supabase functions deploy admin-users
   supabase secrets set APP_URL=https://your-app-domain   # used in invite emails
   ```
4. Sign in — admins land in the **Admin portal**: create/invite coaches, deactivate or
   delete accounts, send password resets, promote admins, see platform-wide stats, and
   browse any coach's client roster read-only (RLS grants admins select-only access).

Notes:
- Existing coach accounts keep working; new self-signups can only proceed as athletes
  (invite code) or wait for an admin coach invite.
- "Deactivate" bans the auth user (they can't sign in) without deleting any data.
- Admins can also add users from the Supabase dashboard, but the portal keeps roles consistent.

## C. Wearables (Oura / Whoop / Fitbit)
The local implementation now requires a server-only OAuth transaction table,
provider-specific callback URLs and the new `wearable-complete` endpoint.
Follow [the security review and coordinated rollout plan](docs/wearable-security-review.txt).
The adapted [installation SQL](docs/wearable-security-install.sql) was applied
with explicit approval. All five wearable functions are deployed: four retain
gateway JWT verification; only the OAuth callback has it disabled, with explicit
approval. APP_URL is configured as https://fitness-scribber-kq6i.vercel.app.
Vendor credentials and real OAuth testing are deferred at the user's request.
See the review for exact status.

> The field mappings in `functions/_shared/providers.ts` are best-effort — verify each vendor's
> current API field names against your approved app's scopes.
> Apple Health has no web API; keep using manual entry or build a companion iOS app.

## D. LLM coaching
1. Choose a provider and set secrets:
   ```bash
   supabase secrets set LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...
   # or:
   supabase secrets set LLM_PROVIDER=openai OPENAI_API_KEY=sk-...
   ```
2. Deploy: `supabase functions deploy insights`
3. In the Command Center, the AI panel gains an **“✨ Ask AI (live)”** button. It sends a metrics
   summary to the `insights` function and shows the model's recommendations. The rule-based guidance
   remains as an instant fallback (and the only mode if the function isn't deployed).

## Security notes
- `supabase/schema_pooling_security.sql` was applied to the existing production
  pooling schema on 2026-10-11. It restricts seven internal predicates and requires
  release-operator authorization for catalogue audit events. Do not run this on
  a fresh database without the older pooling schema. See the dated security review
  in `docs/security-release-review-2026-10-11.txt` for verification and limitations.
- Existing installations: run `supabase/schema_function_permissions.sql` after
  the athlete/admin schemas to remove anonymous access to privileged onboarding
  helpers and browser access to the automatic-RLS event trigger.
- Programs require `schema_program_library.sql`, `schema_session_name.sql`, then
  the protected-schedule, program-training-times and training-plan-sync migrations
  in timestamp order. These were installed in production on 2026-10-11.
  `docs/program-release-install.sql` is the approved one-time installation record;
  do not rerun its client-specific cleanup on another environment.
- All vendor and LLM secrets live in **function secrets** — never in the browser bundle.
- Verify deployed row-level security and privileges before real use; local code
  changes do not alter production policies.
- The new OAuth flow uses single-use state and browser proof. Database permissions
  are verified; consult the review above for remaining deployment/configuration work.
