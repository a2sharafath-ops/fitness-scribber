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
