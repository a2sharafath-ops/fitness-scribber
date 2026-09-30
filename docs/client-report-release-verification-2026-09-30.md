# Client report release verification — 30 September 2026

The approved report design is implemented at `/report/:id`. It reads client-scoped workouts, appointments, check-ins, assessments and the existing Exercise Library muscle mappings. Report choices and the coach note are stored in the selected client's `intake.reportPreferences` JSON; no schema migration is required.

## Verified

- Local demo client: completed working sets produced a strength trend and weekly muscle map; the booking result remained unavailable when no appointments existed. Warm-up blocks and warm-up sets were excluded.
- Local client without workout records: strength, bookings, muscle exposure and assessment sections showed explicit empty or missing states without inventing values.
- The 390 px report view had no horizontal page overflow; visible report actions met the 44 px height target.
- Supabase-connected app: the existing fictional `CODEX RELEASE TEST 2026-09-24` client showed its stored wellness, session RPE, dated resistance log and formal fitness assessment. A temporary report note and Body measurements choice saved and returned after a full reload. Both were then restored to their original empty/off state, also confirmed after reload. No real client record was changed.
- Dated resistance logs now form their own strength series when present. They are never merged with completed workout sets, which could describe the same work, and they do not inflate the classified working-set muscle map.
- The initial report pass had 42 passing tests. After the workout-source correction below, `npm test` passed 43 tests; `npm run lint` and `npm run build` passed. Vite's existing large-chunk advisory remains.

## Release status

The deployed Vercel URL is reachable and currently shows the sign-in page. This report build has not been pushed or deployed, so production report behavior is not yet verified. GitHub CLI credentials had expired; reauthorization was rejected by automatic approval review because the offered OAuth grant included broad persistent private-repository, workflow and public-key access. Do not use another route around that rejection. Publish only after approved repository access is available, then verify the deployed report route and a signed-in test-client readback.

The broader Classic release still has separate acceptance items in `classic-client-phase10-review.md` and `classic-client-live-supabase-check-2026-09-24.md`. The owner-approved legacy setting change closed the governed-workflow rejection for the fictional Classic test client: its prescription and completed workout both survived full app reloads, and this report read back the completed workout and dated strength estimate. Trainer comparison, screen-reader and zoom/reflow acceptance, test-data cleanup, and publication remain open.

The post-completion browser check also found that a simulated in-session heart-rate stream had been stored as if measured. The local Classic runner no longer writes those values; summaries with no explicit measured HR source show the HR-derived fields as unavailable, while the report keeps using the separate observed session-RPE record. This corrective change is verified by the 43-test suite, lint, and build. Existing unsourced HR fields remain in Supabase but are ignored by the local summary.
