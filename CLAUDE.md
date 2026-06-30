# CLAUDE.md — Fitness Scribber

Guidance for working in this repository. Read this before adding code.

## Version control

Use the **GitHub CLI (`gh`)** for all git/GitHub operations in this project —
creating repos, pushing, PRs, releases, etc. (e.g. `gh repo create`, `gh pr create`).
Prefer `gh` over raw `git remote`/HTTPS where an equivalent `gh` command exists.
Never commit secrets: `.env` (and `.env.*`) are gitignored — keep the Supabase keys out of git.

## What this is

A fitness-tracking single-page app. Frontend: **React 19 + Vite 8**, routed with
**react-router-dom 7**, charts via **chart.js / react-chartjs-2**, linted with
**oxlint**. Runtime and package manager: **Bun**.

## The one rule that matters most

**The UI never invents data.** No component, page, or hook may hardcode domain
data (workouts, weights, exercises, users, stats). Every value the UI renders is
fetched from the **mock backend**, and every change the user makes is written
**back to SQLite** through that same backend. If you find yourself typing a
literal array of exercises into a component, stop — it belongs in the database
and behind the API.

Placeholder/empty/loading states are fine. Fabricated domain data is not.

## Architecture — three layers, one direction

```
  ┌─────────────────────────────────────────────────────────┐
  │  UI (atomic components + pages)   src/components, src/pages│
  │     renders props · raises events · holds no domain data   │
  └───────────────▲───────────────────────────┬───────────────┘
                  │ data                       │ actions
  ┌───────────────┴───────────────────────────▼───────────────┐
  │  API client            src/api/                            │
  │     the ONLY door between UI and the backend (fetch)        │
  └───────────────▲───────────────────────────┬───────────────┘
                  │ JSON                        │ HTTP
  ┌───────────────┴───────────────────────────▼───────────────┐
  │  Mock backend          server/   (Bun.serve + bun:sqlite)  │
  │     owns the SQLite DB · the single source of truth         │
  └────────────────────────────────────────────────────────────┘
                                  │
                          data/fitness.db  (gitignored)
```

Data flows up, actions flow down. The UI talks only to `src/api/`; `src/api/`
talks only to `server/`; `server/` is the only thing that touches SQLite.

## Directory layout

```
src/
  components/
    atoms/        # smallest UI units — Button, Input, Badge, Icon, Spinner
    molecules/    # small combos of atoms — Field, StatCard, SetRow, RiskDot
    organisms/    # feature sections — WorkoutForm, WeightChart, ExerciseList
    templates/    # page skeletons / layout — AppShell, PageHeader, two-column
  pages/          # one component per route, composes organisms
  api/            # fetch client + one module per resource (workouts.js, ...)
  hooks/          # reusable stateful logic (useWorkouts, useAsync, useUnit)
  lib/            # pure helpers, no React — dates.js, units.js, format.js
  App.jsx         # router + providers
  main.jsx        # entry
server/
  index.js        # Bun.serve — routes -> handlers
  db.js           # opens bun:sqlite, runs migrations, exports prepared queries
  schema.sql      # table definitions (DDL)
  seed.js         # inserts realistic starter data into the DB
data/
  fitness.db      # the SQLite file (gitignored — never commit it)
```

## Atomic design — component rules

Build the smallest piece first and compose upward. A component lives at the
lowest tier it can.

| Tier | May import | Knows about | Owns state? |
|------|-----------|-------------|-------------|
| **atom** | nothing (only `lib/`, css) | one visual job | no — props only |
| **molecule** | atoms | a small grouping | local UI state only |
| **organism** | molecules, atoms | a feature area | local UI state only |
| **template** | organisms, molecules | layout, slots | no |
| **page** | templates, organisms, hooks, api | a route + its data | yes — fetches data |

Concrete rules:

- **One component per file**, named in `PascalCase.jsx`. The file name equals the
  component name. Co-locate styles as `Component.css` next to it.
- **Atoms and molecules are pure and presentational.** They receive everything
  through props, render, and raise events via callbacks (`onSubmit`, `onChange`).
  They never `fetch`, never import from `src/api/`, never know the route.
- **Only pages (and the hooks they call) fetch data.** A page loads data from
  `src/api/` via a hook, then passes it down as props. Data fetching lives at the
  top; rendering lives at the bottom.
- **Keep components small** — aim for under ~150 lines. If a component grows a
  second responsibility, split it into a molecule + organism.
- **Props are the contract.** Prefer many small, explicit props over one opaque
  object. Pass primitives and small shapes; don't pass the whole DB row if the
  atom needs two fields.
- **Lift state up, pass callbacks down.** Children request changes; the owning
  page performs the write via `src/api/` and updates state.
- **No business logic in JSX.** Compute in `lib/` (pure functions) or in a hook,
  then render the result.

## The API client — `src/api/`

The single boundary between UI and backend. One thin `client.js` (a `fetch`
wrapper with base URL, JSON parsing, error handling) and one module per resource.

- Each resource module exports plain async functions: `listWorkouts()`,
  `getWorkout(id)`, `createWorkout(body)`, `updateWorkout(id, patch)`,
  `deleteWorkout(id)`. They return parsed JSON or throw on non-2xx.
- The UI imports these functions (usually via a hook), never `fetch` directly.
- Reads come from the backend. Writes go to the backend, which persists to
  SQLite. After a successful write, refetch or update local state — the DB is the
  source of truth, not local component memory.

## The mock backend — `server/` (Bun + SQLite, no new deps)

A small `Bun.serve` HTTP API persisting to SQLite through Bun's built-in
`bun:sqlite`. It is "mock" in that it is local and simple — but it is real
persistence: data survives reloads and restarts.

- **`server/db.js`** opens `data/fitness.db`, applies `schema.sql` on startup
  (idempotent — `CREATE TABLE IF NOT EXISTS`), and exposes prepared statements.
- **`server/index.js`** maps routes to handlers and returns JSON. Enable CORS for
  the Vite dev origin, or proxy `/api` through Vite (preferred — see below).
- **Always use parameterized queries** (`db.query("... WHERE id = ?")`). Never
  string-concatenate values into SQL.
- **Use transactions** for multi-row writes (`db.transaction(...)`).
- Store timestamps as ISO strings or epoch ms; store weights in **kg** (the UI
  converts for display — see `src/lib/units.js`). Keep one canonical unit in the
  DB; convert only at the edges.
- **`server/seed.js`** fills the DB with realistic starter data so the UI has
  something to show on first run. Seeding is idempotent or guarded (don't double-
  insert). This replaces any hardcoded sample data in the frontend.

### Wiring dev (Vite proxy → avoids CORS)

Add to `vite.config.js` so the frontend calls same-origin `/api`:

```js
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
```

Then the API client uses a relative base URL (`/api`).

## Commands

```bash
bun install            # install deps
bun run dev            # Vite dev server (frontend)
bun run server         # mock backend (add to package.json: "bun server/index.js")
bun run seed           # seed the SQLite DB (add: "bun server/seed.js")
bun run lint           # oxlint — keep it clean
bun run build          # production build
```

Run `bun run lint` before considering a change done. Match the existing oxlint
rules (`react/rules-of-hooks`, `react/only-export-components`).

## Conventions & style

- Match the surrounding code: 2-space indent, no semicolons in JS where the
  existing files omit them, single quotes, small pure helpers in `src/lib/`.
- Keep `src/lib/` pure and React-free; reuse what's there (`dates.js`,
  `units.js`, `format.js`) instead of re-implementing date/unit/format logic.
- Accessibility: weights and risk states must not rely on color alone — reuse
  `RISK_ICON` from `lib/format.js` for shape cues.
- Don't add dependencies for things Bun/React already do (Bun ships `bun:sqlite`;
  React 19 ships what you need). Justify any new dependency.
- Don't commit `data/fitness.db`, build output, or `*.local` files.

## Definition of done for a UI feature

1. Data comes from `src/api/` (which reads SQLite), not from a literal in code.
2. User edits are written back through `src/api/` and persisted to SQLite.
3. Components sit at the correct atomic tier; presentational ones stay pure.
4. Loading and empty states are handled.
5. `bun run lint` passes.
