# Local pooling build — verification and handoff

7 September 2026 · code checkpoint `3b779d962dfc8ec58352de11ee74666e48c5c847` · branch `codex/exercise-pooling-local`.

The authorized local R1–R3 implementation is now saved with substantial synthetic verification. This is **not production acceptance or a claim that every sprint acceptance criterion is closed**. The owner approved A22–A29, including “yes approve and allow”; no routine local-build approval is outstanding. See [remaining work and consolidated next gates](./REMAINING_WORK.md).

## What is implemented

| Area | Local behavior | Evidence |
|---|---|---|
| Source and context | Attributed, dated, unit/protocol/side-specific confirmations bind to an exact source hash. Unknown/failed/missing are distinct from zero, false and assessed absence. Material changes invalidate context. | Context/source unit tests; native source and context tests |
| Permissions and governance | Coach ownership, narrow client projections, protected legacy fields, recorded scope/purpose/consent, scoped restriction resolution and held-context review. Clients accept/withdraw their own policy record; a coach cannot impersonate acceptance. | SQL role tests; native consent withdrawal, cross-client and exact-resolution tests |
| Selection and composition | Published-version admission, deterministic eligibility/ranking, coverage gaps, exact reviewed doses, time accounting and compatible swaps. Never manufactures an approved prescription or assigns automatically. | Selection/decision/swap tests; native generated and swapped child drafts |
| Coach workflow | Candidate/source review, canonical session/variant/dose editor, new unassigned revisions, source-bound review, exact validation/diffs, separate single/batch approval. Copy/manual/template/voice paths are routed to non-authoritative drafts under R1. | Native transaction/bypass tests; browser candidate/source/draft checks; earlier copy tests remain historical |
| Client execution | Explicit health response before start/resume; separate targets and actuals; left/right sets, measured zero load, effort/method, performed timestamp, append-only corrections, stop and history. | Native execution/correction tests and actual-component browser fixture |
| Failure recovery | Actor/client-scoped durable operation journal, Web Locks, original-payload retry, known rejection versus unknown outcome, corrupt/quota failures, local stop independent of a slow actual write. Route changes cannot populate another client's runner. | Journal/identity tests; native idempotency; component unknown-save/stop check. Hook-to-hosted-backend E2E remains open. |
| R2 | Source-backed daily effects calculated once from the baseline; conflicting signals and missing parameters stay blocked; only an exact separately reviewed dose becomes a proposal. Coach accept/amend/reject creates drafts, not assignments. | Extension/numerical unit tests; native R2 integration |
| R3 | Comparable, fully recorded occurrences rather than individual sets drive history; side, variant revision, equipment/range/unit/load basis and effort method must match. Weekly review checks explicit selected slots/goals/time/support/coverage/recovery constraints before atomic coach approval. | Performance/weekly tests; native R3, weekly and supersession tests |
| Reassessment | Scoped requests do not clear findings. Service recording also requires an exact, current reviewer authorization. A matching resolution retains broader holds until current context review succeeds. | Native reassessment and context tests |
| Catalogue lifecycle | Validate/submit immutable review versions; separate release-operator authorization and independent exact-document acceptance hash; publication/revocation audit; withdrawn acceptance revokes future reliance. | Catalogue tests; native publication/revocation/admin tests. Withdrawal is revocation, not a separate soft-retirement state. |

All 48 real candidate records remain draft/nonassignable. Synthetic “accepted” records exist only in isolated engineering fixtures. They are not actual professional, clinical, rights or privacy approvals. Rehabilitation/special-needs automation is not enabled; implemented context admission remains fail-closed outside admitted adult general-fitness scope.

## Results actually obtained

- **120/120 Node unit tests passed**, zero skipped; `bun run test`.
- **Lint passed** with no warnings; `bun run lint`.
- **Production-format build passed**, with hosted variables empty and R1/R2/R3 explicitly false. Existing main-chunk warning remains: approximately 1.221 MB minified / 352 KB gzip. No deployment performed.
- **Six Deno HTTP tests passed**: method/body boundaries, unauthenticated and wrong-owner rejection across all six services, posted-authority rejection, private-error redaction. All six Edge entrypoints passed Deno typechecking with cached local dependencies.
- **Fresh PostgreSQL 16.15 rehearsal passed**: 18 additive pooling schemas, five SQL test files and 11 native integration scripts. Covers real SQL/RLS, batch rollback/retry, health/approval serialization, invalidated starts, zero/late/corrected actuals, scope/consent, weekly supersession, R2/R3, swaps, reassessment and catalogue lifecycle.
- **Dump/restore passed** into a separately created synthetic database. Every public table's row fingerprint matched. Switching all server flags off preserved every execution event and restored a Classic ordinary-client read.
- **Classic archive and Git bundle checksums reverified**; main and the Classic tag still resolve to checkpoint `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`.
- **Browser checks**: current coach pool has 12 unique section headings, no duplicate DOM IDs or desktop page overflow; disabled buttons visibly disabled. Actual runner component checked at 390px and 1280px in a test-only iframe. Explicit no-change start resets the response; blank actuals stay blank; left-side zero seconds/zero kg saved; simulated unknown pause leaves Stop now enabled; stop retained the result. Clean final fixture logs. This fixture uses synthetic props, not the actual API hook/backend.
- **Feature-off compiled UI**: Dashboard, Clients, Workouts and Schedule render and navigate with no console errors on an isolated no-backend origin. This is separate from the native database compatibility check, not a full Classic-to-Supabase integration test.
- **Pure-engine benchmark**: Apple M1 / macOS arm64, 500 observations, 2,000 variants, 20 samples, p95 **98.17 ms** under the proposed 250 ms target. Not a measured API/UI/load SLA.
- Development server refuses the Classic archive URL with **HTTP 403**. Runtime and backup directories are excluded from file serving/watching; existing secret denials are retained.

The legacy preparation validators initially failed their obsolete 70-task/no-build assertions after the approved expansion to 82 tasks. Their authority checks now recognize the explicit local exception while preserving historical draft-manifest and professional/production gates. Both document validators pass (38,662 S1–S2 assertions and 781 full-preparation checks at the recorded run). The handoff consistency checker also passes for all 82 tasks and 18 requirements. These are document checks, not additional application tests.

## Recovery identity and evidence

- User phrase: **“Go back to Fitness Scribber Classic.”**
- Tag: `fitness-scribber-classic-2026-09-07`; commit: `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162` (includes preparation documents; original app code `5de01b4e960e03e28d4a8b22527937103de10ad6`).
- Latest successful source database: `fitness_pooling_rehearsal_1788799325180`.
- Restored database: `fitness_pooling_restored_1788799325180`.
- Dump: `.local-test-runtime/recovery-Lk9gaU/synthetic-post-build.dump`.
- Dump SHA256: `c5396b23d18c5774a17c9090c0833cf51e9cc34dfaa910e121ec9d4d2dfd801c`.

These backups are on the **same computer**. No off-device copy or live Supabase backup is certified. Feature-off does not rewind the database. Restoring old data over current data could lose later entries; do not do that without separately approved reconciliation. Consult the [runbook](./RELEASE_AND_ROLLBACK_RUNBOOK.md) and [Classic reference](./FITNESS_SCRIBBER_CLASSIC.md).

## Important verification limits

Native auth uses fictional SQL session identities, not real JWT verification. The Deno tests inject gateways; the typecheck maps the already installed Supabase SDK instead of downloading the production remote module. Hosted auth/REST/storage/Edge/network/session behavior, actual frontend-to-backend journeys, cross-tab/account/offline end-to-end behavior and target deployment compatibility remain unverified.

The R1 client portal is a deliberately restricted pooling/report/history/consent view, not full parity with every Classic portal feature or a newly completed client-onboarding application. Clinical review provisioning remains a service-side controlled workflow; no clinician portal or professional signature is fabricated. Weekly composition assembles explicitly selected session drafts; it does not invent a multi-week schedule. Manual device/keyboard/screen-reader and participant acceptance are not certified by DOM/iframe checks.

The full PRD test specifications are not all executable/accepted domain cases. Code tests prove the listed engineering invariants with fictional inputs, not clinical effectiveness, approved catalogue coverage or worldwide legal compliance. New failures discovered against an authorized staging/accepted-policy dataset remain engineering work, not automatic acceptance.

## Local inspection and reproduction

- Pooling review preview: `http://127.0.0.1:4179/` while the task-owned Vite process runs; hosted variables empty, UI flags on, no authority/catalogue publication.
- Feature-off build preview: `http://127.0.0.1:4180/` while the task-owned preview process runs.
- Actual-component fixture: `/tests/pooling/ui.html` on port 4179; dev-only, explicitly fictional, not included in production output.
- Runtime inventory and exact assets: [LOCAL_RESOURCE_MANIFEST.json](./LOCAL_RESOURCE_MANIFEST.json).
- Reproduce core tests: `bun run test`, `bun run lint`, `node tests/pooling/benchmark.mjs`.
- Native suite: supply the manifest's exact `FITNESS_POOLING_PG_BIN` and `FITNESS_POOLING_PG_SOCKET`, then run `node tests/pooling/native-recovery.mjs`. It creates fresh named synthetic databases; it never drops existing databases and enforces the approved free-space guard. OS permission may be required.
- Deno: use the manifest's binary and cache, `DENO_NO_UPDATE_CHECK=1`, `--config tests/pooling/deno.json`, `--no-remote --no-prompt` for `tests/pooling/edge.test.ts`. No global installation or live credentials.

No push, PR, merge, deployment, hosted migration, real-client assignment, off-device upload, personal-data cleanup or shared Docker/Care change was performed.
