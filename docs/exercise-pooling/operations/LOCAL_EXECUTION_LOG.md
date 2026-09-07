# Local execution evidence

## Authorization — 7 September 2026

Owner explicitly approved the complete version 0.5 A22–A28 local backup, recovery and R1–R3 engineering package in conversation. No remote push, hosted access, deployment, real-client data, system installation or professional attestation is authorized. Feature/content gates remain as specified in the package.

## Baseline inventory

- Classic application commit: `5de01b4e960e03e28d4a8b22527937103de10ad6` on main.
- Only untracked preparation documents existed before execution. Checkpoint adds those documents and a recovery-directory ignore; application code is unchanged.
- Docker daemon responds (29.6.1). Local PostgreSQL 16/17 and Supabase PostgreSQL images already exist; no image download required.
- Free space on latest check: 956 MiB, down from earlier approximately 2.5 GB. Heavy operations require renewed measurement, not an arbitrary 20 GB requirement.
- Candidate source/docs pattern scan found no private-key/JWT/GitHub-token/Supabase-secret-key patterns. This is a limited automated scan, not an assurance that all secrets can be detected.
- `.env` remains untouched and excluded. Configuration names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; secure values must be retained separately by the owner.
- Classic local data lives in browser localStorage under `fitscribe_v1`. No browser profile or client data was read/exported. Code backup does not back up these records.
- Hosted recovery must separately cover database rows, storage objects, auth, configuration, and writes since backup. No hosted access performed; live recovery remains unverified.
- Current architecture is React/Vite with Supabase and localStorage. CLAUDE.md describes an older SQLite architecture; explicit approved scope retains current architecture, not a SQLite rewrite.

## Recovery boundaries

Archive and Git bundle are local, secret-excluding source backups. They do not cover device loss, browser records, uploaded assets, hosted records or secret configuration. Restore only to a fresh directory, never over the current app. Future fallback disables new features without deleting new records; Classic code may run against a later schema only after compatibility verification. Real database restoration requires separate approval and reconciliation of later writes.

## Execution status

Checkpoint: `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`, immutable local tag `fitness-scribber-classic-2026-09-07`. No application or Supabase schema diff from the original Classic commit. No remote push.

Backup: `.recovery/fitness-scribber-classic/source.tar.gz` plus `history.bundle`, total approximately 17 MB. Bundle verification passed and records complete reachable history. SHA-256 values in that directory's `SHA256SUMS`. Source archive contains tracked files only; `.env`, browser records and dependencies excluded.

Restored archive and independently cloned bundle under `/private/tmp/fitness-classic-restore.xzcgOG/` compare identical (excluding Git metadata). Dependencies reconstructed with frozen Bun lockfile, offline and scripts disabled. Both original and restored builds/lints pass. Build outputs have identical asset filenames; existing large-chunk warning remains. Hosted configuration was blanked in original build and absent from restored checkout.

Task-owned PostgreSQL container `fitness-pooling-recovery-20260907` uses existing postgres:16-alpine image, network disabled, no host mounts, memory capped at 256 MB. Applied Classic base schema with synthetic auth fixtures. Ordinary-role own-coach reads/writes and cross-coach isolation checks pass. Dump/restore into separate `fitness_restored` database preserved both synthetic rows and the authorized update. This proves only the tested local base-schema path, NOT Supabase hosted auth/storage, linked-client paths or new pooling security.

Storage after dependency reconstruction: approximately 1,529 MiB available; no user files deleted.

Browser baseline: restored Classic dashboard, clients, workouts and schedule routes render; a synthetic local settings change survives reload. Existing Chromium used with a fresh temporary profile. The first harness attempt blocked a local module by mistake; corrected the test's domain filter and all five checks passed. This is a smoke baseline, not comprehensive user acceptance.

Added Classic athlete schema locally: linked synthetic client sees only its own row and cannot update protected client data. No hosted authentication equivalence claimed.

## Local preflight decision

FP-B01–B10 local preflight is sufficient to begin isolated implementation: checkpoint/archive/bundle restoration, frozen dependency reconstruction, baseline build/lint/browser smoke and actual local SQL ownership/recovery checks pass. Configuration/data gaps are explicit and live recovery remains unverified. The existing base/athlete schema checks are not certification of every historical migration or future pooling permissions; expand those in FP-307/601/B11. Approximately 1,435 MiB remains; use installed tooling and remeasure before heavy operations.

Feature control contract (FP-B09): independent R1/R2/R3 off-by-default gates; R2/R3 require R1; synthetic fixtures only in explicit local development mode without hosted configuration. A browser flag never grants server authority. All new persistence is additive and excluded from legacy per-table sync. Feature-off must hide new entry points while retaining all records. Approve/start/resume are guarded server operations, never optimistic local assignment. Final Classic-on-additive-schema compatibility test remains FP-B11, not complete.

Implementation branch: `codex/exercise-pooling-local`. Main and Classic tag remain at the checkpoint.

## Foundation implementation (in progress, not a completed release)

- Added off-by-default independent R1/R2/R3 client controls and protected server runtime controls.
- Added pure context resolution, candidate admission/filtering/composition, explicit dose/time accounting, compatible alternatives, effect reconciliation, history comparison and weekly draft primitives. These are not yet complete end-to-end engines; broader parameter/unit/scope validation and integration remain.
- Added an additive legacy sidecar migration preserving source JSON, duplicate names and original IDs without inferring approvals.
- Added PostgreSQL context/report/draft entities and guarded report/draft functions. Real local SQL tests cover actor isolation, protected fields, idempotent retries, payload conflicts and stale generations. Approval/start/resume transactions remain pending.
- Added thin API and gated candidate-review page with explicit unpublished/local-only states. Four Classic routes, synthetic persistence, candidate preview, disabled local authority, keyboard focus and mobile DOM smoke checks pass. Full visual/accessibility/runner verification is not yet complete.
- 35 Node unit tests pass; lint and build pass. Large bundle warning predates the work; candidate-preview import currently adds bundle weight and needs lazy loading.
- No feature enablement, migration, push or deployment outside the synthetic local environment.

Remaining substantial work: authoritative reviewed-context/content admission and atomic approval/start/resume, integration of every builder/copy/template/voice/client path, report/assessment invalidation, R2/R3 full proposal/UI workflows, secure publication/revocation, failure/concurrency/performance/security coverage, full migration/fallback rehearsal and final evidence. Do not treat these initial primitives as completion of S3–S8.

## Recovery after connection interruption

Rechecked the working tree: foundation commit `12217e2` is preserved, with unfinished `supabase/schema_pooling_authority.sql` and `tests/pooling/authority.sql` retained. The interrupted authority test has no recoverable successful result and is NOT counted as passed. Both Classic archive/bundle checksums still pass. All 35 Node tests and lint were rerun successfully.

Docker inspection and database queries hung. A bounded direct local socket health check returned `Docker Desktop is unable to start`. Backend processes exist, but that is not proof the engine or database is usable. No Docker restart, pruning, container deletion or other-project mutation was attempted. Restoring Docker availability is the current dependency for further SQL authority verification. Free disk at recovery check was approximately 2,464 MiB; this is not an assertion that storage caused the startup failure.

The candidate-review route was made lazy-loaded during recovery so its draft catalogue does not inflate the initial Classic bundle. Full builder/approval wiring remains pending. Resume by confirming Docker health, inspecting the task-owned synthetic database, applying the two additive pooling schemas as needed and running the foundation/authority SQL tests before relying on their new guards.

## Authorized Docker alternative and independent implementation

Owner authorized the quickest safe local alternative without cleanup, purchases, shared-container resets or Care database access. Searched PATH, Homebrew, Applications, local runtime/cache directories and Spotlight: no installed native PostgreSQL server/initdb found. No separately authorized non-Docker disposable database was identified. Existing linked Supabase metadata was not treated as permission to access a hosted database. No new runtime was installed; SQLite/mocks were not used to certify PostgreSQL behavior.

Chosen route: continue independent builder, local persistence and pure-engine tests with existing Node/Bun/Chromium. Zero installation delay; a runtime-recovery completion estimate remains unknown. Native PostgreSQL would require finding/installing a compatible runtime, and hosted testing would require an exact authorized disposable target. Neither is silently substituted.

Implemented local-only unassigned draft persistence in its own versioned browser key, separate from Classic data. Added expected-revision conflicts, idempotent operation keys, quota/corrupt-storage failures, browser write locking where supported and original-request retries. Builder save, tomorrow-copy, cross-client-copy and unchanged bulk-copy routes use this draft path when R1 is enabled; Classic remains the feature-off path. Cross-client notes, completed actuals and approval fields are not copied. Existing prescriptions and Training Max records are untouched. Saved drafts reopen with their contents. Legacy auto-progression UI is disabled in the new draft path; no unreviewed numeric policy is substituted.

Actual results after these changes:

- **51 Node tests pass**; lint passes without new warnings; feature-off production build passes (existing large-chunk warning retained).
- Isolated Chromium: four existing routes, reload persistence, candidate preview, disabled local authority, keyboard focus/mobile DOM, builder draft save/list refresh, next-day copies, cross-client copies and injected quota-failure/retry all pass. Browser assertions compare the Classic local database before/after and find no change. This is not a full visual/accessibility audit.
- Synthetic progression tests cover opposite-side incompatibility, missing actuals, conflicting lineage, later-known evidence, health holds and side-specific non-resolving reassessment requests.
- Pure-engine benchmark: Apple M1, macOS arm64, 500 observations + 2,000 variants, 20 measured iterations after 2 warm-ups; p95 **90.77 ms**, within the proposed 250 ms budget on this run. No backend/concurrency or production performance claim.
- Catalogue JSON is dynamically imported; all 48 records remain unpublished/nonassignable. No assignment, professional publication, remote push or deployment occurred.

Still incomplete: PostgreSQL authority and concurrency tests, trusted server decision generation, end-to-end coach assignment/start/resume, all runner/template/assessment invalidation paths, complete R2/R3 UI/workflows, content admission/revocation, final post-build migration/Classic recovery rehearsal and external acceptance. The independent workaround advances implementation but does not complete or certify the whole pooling plan.

## Continued remaining-work pass

The owner requested a remaining checklist and further no-install local implementation. See [REMAINING_WORK.md](./REMAINING_WORK.md) for the current separation of implementation, PostgreSQL verification and external gates.

Added exact-selection validation instead of silently substituting a freshly generated workout. Added server orchestration, a Supabase gateway adapter, an Edge entrypoint and proposed private source-snapshot/read/store SQL. Requests cannot supply their own catalogue/context/actor; ownership is checked before private source reads. Published module requirements, source generation, held state and a source fingerprint participate in the proposed write check. Anonymous and authenticated browser roles are explicitly denied the service-only gateway RPCs, including possible direct default grants. **This SQL has not run. The Edge entrypoint passed a TypeScript syntax parse only, not Deno/runtime/authentication verification.** Gateway unit substitutes exercise orchestration, not PostgreSQL permissions or races.

Added a shared runner preview boundary for coach/client screens: no new start/resume while authority is unverified; existing completed history remains viewable. Local stop snapshots preserve targets and actuals. Stale check-in/skip callbacks do not grant starts. Full authoritative runner logging and all backend entry-point guards remain pending.

Added R2/R3 local review-request forms with separate storage namespaces and unresolved-policy notices. They do not generate an approved numerical adjustment, rewrite targets, edit actuals or assign a week. Those fuller workflows remain unfinished.

Verification:

- **67 unit tests pass**, plus lint. Current UI build passes with the existing large-chunk warning.
- Extended isolated browser suite passes request persistence for both extensions, blocked runner start and preservation of actuals on stop, in addition to prior draft/copy/quota checks.
- Added a restored-Classic fallback check with synthetic new draft/daily/progression sidecars and stopped-workout actuals. Sidecars and actual values remained intact. This does not prove authorization behavior or live/post-migration backend rollback compatibility.
- Fixed a browser-harness navigation race discovered during the recovery test; it now waits for a new document, not a stale pre-reload view. The rerun passed.
- No new installs, runtime downloads, disk cleanup, Docker reset, Care changes, publishing, real assignments or deployment.

## Version 0.6 continuation — native PostgreSQL restored

Owner approved the version 0.6 addendum and A29 with “yes approve and allow”. The later no-download restriction is superseded only for its narrowly specified isolated runtime setup; no cleanup/shared-system/live permission changed.

Downloaded official Postgres.app v2.9.6's PostgreSQL 16-only archive (112,949,293 bytes), reviewed its PostgreSQL licence and verified published SHA256 `2689dc64d6a02e0a66e4585616919060d8fbf5bb06886fccc05b7f87638bf081`. Image information showed 435,197,952 logical bytes; app footprint 373 MiB. Mounted read-only at `.local-test-runtime/pg16.n2ATXM/mounted` and invoked CLI binaries directly. No `/Applications` copy or global setup. Initial sandbox signature/shared-memory checks failed; scoped OS verification succeeded: valid signature and Notarized Developer ID, then native initdb succeeded with the required sandbox permission. No security bypass occurred. An unsuccessful initdb automatically removed only its own incomplete synthetic cluster.

Runtime: PostgreSQL 16.15, same major as prior PostgreSQL 16 Docker harness. Synthetic cluster `.local-test-runtime/pg16.n2ATXM/data`; database `fitness_pooling_20260907`; private socket `/private/tmp/fitness-pg-socket.mnRSCa`, port identifier 55439, **no TCP listener**, local peer authentication. The test auth.uid function uses a synthetic session claim; this is not JWT/auth-service verification. Docker, Care, shared containers and user data were untouched. Available storage later rose to about 6.4 GiB during the run without any cleanup by this task.

New actual evidence: source/gateway schemas execute on PostgreSQL; foundation, approval/execution and gateway role/source-token tests passed. The integrated `native-flow.mjs` test passed explicit confirmed-source collection → JS gateway/decision engine → exact coach approval → client start/zero actual/stop. All acceptance content in that test is explicitly fictional. Source review/projection tests passed cross-client/private-access rejection and source-change invalidation. Added source-token rechecks at approval/start and stricter execution payload validation; no real assignments enabled.

Further implementation is in progress: explicit source-review UI, authenticated source collection, session-bound health/equipment confirmation and durable draft-operation journal/reload recovery. 78 distinct unit tests and lint pass at this intermediate point. Full permissions/legacy projections, concurrency, actual UI integration, R2/R3 completion, final recovery and Edge runtime testing are still pending; this is not the final completion report.

### Native authority and exact-review continuation checkpoint

Added conditional R1 legacy protections and narrow client assignment projection, single/batch exact-revision review UI, canonical exercise/dose editor, source-review provenance display and reload operation recovery. Journal mutations use Web Locks; malformed records are preserved and definitive rejection cannot be silently resent. A browser form-label defect was fixed; explicit synthetic zero confirmation saved and survived reload. Date/time fields now request an explicit UTC offset. Disabled buttons and review spacing were clarified. An R1 legacy numerical AICoach card was replaced with an informational review notice.

Real PostgreSQL tests passed health-change/approval/start serialization and all-or-none batch rollback/retry. Subsequent source-to-execution rerun passed after result validation began rejecting units that disagree with prescribed mode. Additional per-side/load/effort/correction SQL is authored but full negative/UI coverage is still pending.

Added R2/R3 attributed request and review ledgers, trusted numerical proposal adapter, exact reviewed-dose mapping, coach-only numerical evidence, and accept/amend/reject-as-draft actions. `native-extensions.mjs` passed source-backed fictional arithmetic, unchanged baseline, coach-only review, no assignment on acceptance, idempotent retry, and stale acceptance rejection after a health report. No real thresholds or exercise recommendations were adopted. R3 integrated history/weekly composition and Edge runtime checks remain unfinished.

Catalogue acceptance-hash publication/revocation and immutable-release SQL was created successfully in the native synthetic database; behavior and reviewer tooling need verification. Resolver/selection versions advanced to `pool-context-2` / `pool-selection-2` for changed semantics.

Current distinct unit count: **91 passing**, lint passing. UI build passed with the existing large-chunk warning before the latest catalogue-administration changes. In-app loopback preview port 4179 has hosted environment variables explicitly empty. It was restarted after its earlier process stopped; a new tab recovered from the old connection-error page. Last observed free space was about 4.2 GiB; no cleanup was performed. Native database and preview remain task-owned local processes. This checkpoint does **not** mark the whole build complete; see the updated remaining-work checklist.

## Local R1–R3 checkpoint and recovery handoff — 7 September 2026

Application code/tests are committed as `3b779d962dfc8ec58352de11ee74666e48c5c847` on `codex/exercise-pooling-local`. Main and Classic remain at `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`; no push/merge/deploy. Owner A29 authorization is recorded, so no repeated ordinary local-build approval is needed.

Completed the source-bound scope/consent/restriction review, client reports and immutable history, per-side actual/correction runner, durable journal identity/offline scoping, compatible generated/swapped drafts, R2 numerical review, complete-occurrence R3 history, explicit weekly composition/atomic approval, scoped reassessment requests/authorized resolution, and separate operator/acceptance-hash catalogue lifecycle. Real candidate records and numerical parameters remain unpublished/unapproved. Clinical modules remain fail-closed; fixtures do not represent actual professional acceptance.

Verification now includes 120 Node tests, clean lint, feature-off no-backend production-format build, six Deno HTTP tests across six services and six entrypoint typechecks. Native PostgreSQL ran 18 pooling schemas, five SQL test files and 11 integration scripts on a fresh synthetic core schema, followed by dump/restore and all-public-table fingerprint comparison. Latest successful databases: `fitness_pooling_rehearsal_1788799325180` and `fitness_pooling_restored_1788799325180`. Feature-off preserved all execution records and Classic ordinary-client read access. Both original Classic recovery checksums passed again.

The added swap case first correctly rejected a superseded parent but exposed an overly generic source-unavailable error. Gateway handling now preserves only allowlisted definitive errors; the test uses the current child for its invalid-variant case and explicitly checks superseded-parent rejection. The fresh complete suite then passed. Earlier failed synthetic databases are retained and are not counted as successful rehearsals.

Browser QA found pooling CSS in an unimported file and duplicate component keys. Styles now live in the imported stylesheet; component keys are unique. Final pool DOM has 12 unique headings, no duplicate IDs and no desktop overflow. The actual runner component passed fictional-props visual/action checks at 390px/1280px, explicit start response, separate blank left/right actuals, zero seconds/zero load, and stop during an unknown pause save. The compiled all-flags-off UI renders Dashboard/Clients/Workouts/Schedule with no console errors. These do not certify real Supabase frontend integration or full keyboard/screen-reader/device acceptance.

The long-running Vite preview exited with Node heap exhaustion during HMR. Recovery/runtime directories are now excluded from watching and file serving, preserving Vite's default secret denials; test components and their mount entrypoint are separated. The preview restarted; final checks passed. This is a mitigation, not proof of long-duration memory stability. An HTTP-status-only check confirmed the Classic archive is denied with 403. No personal/cache cleanup or shared Docker changes occurred. Latest recorded free space: 3.4 GiB; test-runtime directory 764 MiB, Classic recovery directory 17 MiB.

Official Deno 2.9.6 aarch64 archive SHA256 `213a2f304f04d3c9cb5220669afad138f60a5aab1fe80962abdeb8f35807a472` and PostgreSQL archive checksum were reverified. Deno uses the already installed Supabase SDK via a test-only import mapping; no remote dependency fetch, global install or hosted auth claim. Exact paths, created databases and preview endpoints are in [LOCAL_RESOURCE_MANIFEST.json](./LOCAL_RESOURCE_MANIFEST.json).

The sprint tracker is reconciled to local implementation/verification versus actual acceptance. Stale no-build/70-task assumptions in the document validators were corrected to the explicitly recorded 82-task local exception; historical draft/professional/production gates stay unchanged. Both document validators pass. [LOCAL_BUILD_VERIFICATION.md](./LOCAL_BUILD_VERIFICATION.md) and [REMAINING_WORK.md](./REMAINING_WORK.md) are the current evidence and full pending gate bundle. Full hosted/API/frontend integration, accepted domain/device cases, target recovery, participant acceptance and real release remain open; no whole-system release completion is claimed.
