# Backend setup (Supabase)

The app runs in two modes, decided automatically by env vars:

- **Local mode** (no env) — data in `localStorage`, no login. Nothing to set up.
- **Backend mode** (env set) — Postgres + auth via Supabase, multi-device, per-coach isolation.

Switching modes requires **no code changes** — the data layer (`src/api/sync.js`) and auth
gate activate when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are present.

## 1. Create the project
1. Sign up at [supabase.com](https://supabase.com) and create a new project (pick a region near you; set a DB password).
2. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

## 2. Configure the app
Copy `.env.example` to `.env.local` and put the browser-safe project URL and anon/public key there:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```
Do not put a service-role key, database password, or Supabase personal access token in a `VITE_` variable. Vite exposes those values to browsers. `.env.local` is git-ignored.

## 3. Create the schema
Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates every table,
indexes, enables **Row-Level Security**, and adds a policy so each coach can only read/write
their own rows (`"coachId" = auth.uid()`).

Then run [`supabase/schema_program.sql`](./supabase/schema_program.sql) (Advanced
Programming Platform: block-structured workouts, `maxes` 1RM/Training-Max ledger,
`synonyms` voice index — plus a one-time migration of flat prescription items into
blocks). Existing installs: re-running it is safe (idempotent).

For an existing project running Phase 5, also run
[`supabase/schema_monitoring_sources.sql`](./supabase/schema_monitoring_sources.sql)
in the SQL Editor. It adds a nullable `source` column to wellness, session RPE,
resistance and conditioning records. Historic rows remain unknown rather than
being assigned an invented source. Applying this migration requires project
owner/database access; the anon/public key cannot alter the schema.

### Voice-to-workout parsing (optional)
Deploy the `parse-workout` edge function alongside `insights` — it reuses the same
`LLM_PROVIDER` + `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` secrets:
```bash
supabase functions deploy parse-workout
```
Without it (or in local mode) dictation falls back to the built-in heuristic parser.

## 4. Auth settings
- **Authentication → Providers → Email** is on by default. For quick local testing you can turn
  **off** "Confirm email" (Authentication → Providers → Email) so signup logs you straight in.
- Add `http://localhost:5173` under **Authentication → URL Configuration** (and your deploy URL later).

## 5. Run
```bash
bun install
bun run dev
```
You'll get a **sign-in screen**. Sign in with a coach account, then open **Settings → Account → "Load demo data"**
to populate your account with the sample athletes (or just start adding your own clients).

## How it works
- **Ownership & isolation:** every row has a `"coachId"` defaulting to `auth.uid()`. RLS blocks
  access to anyone else's rows at the database level — not just in the UI.
- **Reads:** on login the app fetches all of the coach's tables into the in-memory store (`fetchAll`).
- **Writes:** each `commit()` diffs the changed collection by `id` and upserts/deletes only what
  changed (`persistDiff`). All existing components keep using `commit()` unchanged.
- **Pure logic unchanged:** `src/lib/calc.js` runs identically on local or remote data.

## Optional production integrations

See [SETUP_PRODUCTION.md](./SETUP_PRODUCTION.md) for athlete accounts, wearable OAuth,
and live AI configuration. Those integrations require their own schema, edge functions,
provider credentials, and validation beyond the base backend connection.
