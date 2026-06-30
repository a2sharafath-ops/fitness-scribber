# Production features — athlete logins, wearables, LLM coaching

These build on the base backend in `SETUP_BACKEND.md`. Do that first.

## A. Run the additional SQL
In the Supabase **SQL Editor**, run these (after `schema.sql`):
1. `supabase/schema_athlete.sql` — roles, invite-code linking, athlete RLS, `redeem_invite()`.
2. `supabase/functions_schema.sql` — `wearable_tokens` table for OAuth tokens.

## B. Athlete logins (works immediately after the SQL)
No deployment needed — it's all app + database.
1. As a coach, open a client → **🎟️ Invite** → **Generate invite code**. Share the code.
2. The athlete signs up (same app), chooses **“I have an invite code”**, and enters it.
   `redeem_invite()` links their auth account to that client and flips their role to `athlete`.
3. The athlete now sees the **Athlete Portal**: morning Hooper check-in, session-RPE logging,
   today's prescribed session, and their readiness — all scoped to just them by row-level security.
   Their submissions flow straight into your coach views.

## C. Wearables (Oura / Whoop / Fitbit)
Needs the Supabase CLI and a developer app per vendor.

1. Install + link the CLI:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref haxxetirrcrwzwdzsdui
   ```
2. Register an OAuth app with each vendor (Oura / Whoop / Fitbit developer console) and set the
   **redirect URI** to:
   `https://haxxetirrcrwzwdzsdui.supabase.co/functions/v1/wearable-callback`
3. Set the secrets (only the vendors you use):
   ```bash
   supabase secrets set OURA_CLIENT_ID=... OURA_CLIENT_SECRET=...
   supabase secrets set WHOOP_CLIENT_ID=... WHOOP_CLIENT_SECRET=...
   supabase secrets set FITBIT_CLIENT_ID=... FITBIT_CLIENT_SECRET=...
   supabase secrets set APP_URL=http://localhost:5173
   ```
4. Deploy:
   ```bash
   supabase functions deploy wearable-connect
   supabase functions deploy wearable-callback
   supabase functions deploy wearable-sync
   ```
5. In the app: Client → Command Center → **Detailed logs → Wearables** → **Connect Oura/Whoop/Fitbit**
   (opens the vendor consent screen) and **⟳ Sync now**. Schedule `wearable-sync` daily with a cron
   (Supabase **Database → Cron** or `pg_cron`) for automatic morning pulls.

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
- All vendor and LLM secrets live in **function secrets** — never in the browser bundle.
- Row-level security isolates every coach's and athlete's data at the database.
- Harden before real use: sign the OAuth `state` (currently base64), restrict CORS to your domain,
  and review each vendor's data-retention/consent requirements for health data.
