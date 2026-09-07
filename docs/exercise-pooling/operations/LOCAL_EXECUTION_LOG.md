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
