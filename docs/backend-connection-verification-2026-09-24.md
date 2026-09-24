# Backend connection verification — 24 September 2026

The local app is configured with a real Supabase project URL and browser-safe anon key in git-ignored `.env.local`. The linked Supabase project matches that URL. No service-role key or database password was placed in the Vite environment.

- Supabase Auth health responded successfully.
- All 18 app data tables, plus `profiles` and `settings`, responded through the REST API. The signed-in coach session loaded its roster in the app without a data-load or browser-console error.
- The authenticated test client's Check-ins & load page rendered its four views.
- Applied `supabase/schema_monitoring_sources.sql` through the matching production project's SQL Editor. Read-only API probes confirmed `source` is available on `wellness`, `srpe`, `resistance`, and `cardio` afterward.
- A read-only database query found row-level security enabled on all 20 checked app/profile/settings tables. Anonymous API requests returned no client or wellness rows, while the signed-in coach saw their roster.
- `npm run lint` and `npm run build` passed. The build still reports a non-blocking large-chunk warning.

This initial connection check did not seed, edit, or delete client records. A subsequent [live write/readback check](./classic-client-live-supabase-check-2026-09-24.md) used a fictional temporary client and found that the legacy governance setting still blocks Classic workout prescriptions. Dashboard SQL Editor access worked for the monitoring-source migration.
