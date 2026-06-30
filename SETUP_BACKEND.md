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
```bash
cp .env.example .env
```
Put your values in `.env`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 3. Create the schema
Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates every table,
indexes, enables **Row-Level Security**, and adds a policy so each coach can only read/write
their own rows (`"coachId" = auth.uid()`).

## 4. Auth settings
- **Authentication → Providers → Email** is on by default. For quick local testing you can turn
  **off** "Confirm email" (Authentication → Providers → Email) so signup logs you straight in.
- Add `http://localhost:5173` under **Authentication → URL Configuration** (and your deploy URL later).

## 5. Run
```bash
bun install
bun run dev
```
You'll get a **sign-in screen**. Create an account, then open **Settings → Account → "Load demo data"**
to populate your account with the sample athletes (or just start adding your own clients).

## How it works
- **Ownership & isolation:** every row has a `"coachId"` defaulting to `auth.uid()`. RLS blocks
  access to anyone else's rows at the database level — not just in the UI.
- **Reads:** on login the app fetches all of the coach's tables into the in-memory store (`fetchAll`).
- **Writes:** each `commit()` diffs the changed collection by `id` and upserts/deletes only what
  changed (`persistDiff`). All existing components keep using `commit()` unchanged.
- **Pure logic unchanged:** `src/lib/calc.js` runs identically on local or remote data.

## Next steps (not included yet)
- **Athlete logins** — add a `clients.userId` column and a second RLS policy
  (`"userId" = auth.uid()`) so athletes can submit their own Hooper/RPE on a read-restricted view.
- **Wearable OAuth** — add an Edge Function to hold Oura/Whoop secrets and run a daily sync into
  the `wearable` table (replaces the simulated pulls).
- **LLM coaching** — add an Edge Function `/insights` that calls an LLM; keep the current
  rule-based `AICoach` as the instant fallback.
