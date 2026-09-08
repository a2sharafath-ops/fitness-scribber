# Release, migration, pilot and rollback preparation

O02 / Q06 · version 0.1 · draft runbook. No release, hosted access, backup, migration or recovery operation is authorized or executed by this file.

Current execution evidence is [A32 hosted verification](./A32_ENGINEERING_VERIFICATION.md): the already authorized shared-backend work, 85-table relational restore, exact preserved baseline and fixture revocation are complete. This file remains a runbook, not new release authority. With test enrollments, global flags alone are not the whole containment boundary: revoke the affected exact workspace lease as well. Preserve Stop, actuals, corrections and history. Old PG16 installer paths in the historical manifest need re-download; current PG17 restored data and all backups remain.

## A33 test-schema recovery addendum — 8 September 2026

The approved A33 follow-up adds explicit engineering slot/release records and deterministic primary-workspace selection. See [A33 execution](A33_HOSTED_VERIFICATION.md) for measured backups, checksums and containment, not the older counts below. Original coach reservations and the original expiry are preserved; this does not authorize a real-client release.

Keep the additive schema and historical rows during routine frontend fallback. Do **not** reintroduce the old unique `coach_id` workspace constraint over retained two-slot engineering history, delete the secondary workspace, reopen a revoked grant or edit a published fixture. Use the current guarded single-workspace default and revoke only the exact active test leases/releases/grants. Existing code checkpoints and database restore baselines remain separate; full managed-service/off-device recovery still needs its exact authorized destination.

## Local implementation addendum — 7 September 2026

Code `3b779d9` and [local evidence](./LOCAL_BUILD_VERIFICATION.md) supersede hypothetical local-build statements. Live/staging execution still requires exact-target approval. The native harness lists the authoritative tested schema order: base/athlete/workout/screening/assessment/program schemas, then pooling, authority, decision gateway, sources, projections, legacy boundary, batches, review, extensions, extension gateway, catalogue, client home, governance, context review, weekly, suggestions, reassessment and catalogue admin. Do not blindly reapply this sequence to a hosted schema whose actual state has not been inspected and backed up.

Local recovery test: `tests/pooling/native-recovery.mjs`, using the [manifest's explicit binary/socket](./LOCAL_RESOURCE_MANIFEST.json). It creates fresh synthetic databases, compares every public-table row fingerprint after dump/restore, switches the restored server flags off and checks preserved execution history and ordinary-client Classic read access. The original source database and all recovery evidence remain intact.

For a future authorized fallback, first prevent new pooling authority using privileged server `pooling_runtime` controls (R1/R2/R3 false). Browser flags alone are not a security control. Preserve the pending operation journal, sidecars, assignment targets, actuals and corrections; allow supported stop/history operations. Rebuild the browser with `VITE_POOLING_R1`, `VITE_POOLING_R2`, `VITE_POOLING_R3` false, or deploy the separately verified Classic code reference only after checking target compatibility. Vite flags are build-time settings; editing them is not a live toggle of an already built bundle.

Feature-off intentionally reinstates Classic access-policy behavior. Review that older privacy behavior before a real-user rollback; local compatibility is not proof the older policy meets the new privacy requirements. Never drop pooling tables, overwrite the live database with the synthetic dump, move the Classic tag, reset main, or discard later commits as a routine fallback.

For process cleanup, resolve current command/cwd/socket before stopping task-owned services; recorded PIDs can be reused. Stop the exact PostgreSQL cluster before unmounting its binary image. No cleanup is performed merely by documenting it.

## Release record and preflight

Before action, resolve exact operator, target environment/project, region, build/engine/schema/catalogue/policy versions, supported market/population/cohort, release owner, reviewer decisions, known gaps, feature controls, backup/restore evidence, migration window and rollback authority. Record actual facts, not example identifiers. No secrets or identifiable client records belong in this preparation pack.

Verify explicit permissions separately: local build/tests; hosted staging access/writes; costs; version-control commit/push/PR/merge with any automatic-deployment consequence; production migration; client contact; pilot enablement; wider rollout. Approval of one is not the others. Keep R1/R2/R3 and clinical/market scopes independently controllable; default new scope disabled.

## Ordered release checklist

1. Freeze proposed release manifest and accepted scope; resolve blocking reviews. Reject any unreviewed/revoked dependency and unresolved required privacy/operator fact.
2. Verify clean understanding of existing worktree and preserve unrelated changes. Run authorized application tests/build/lint, ordinary-role permissions, concurrency, accessibility and failure suites. Attach actual evidence, not document-check results.
3. Rehearse additive migration on synthetic/local or expressly authorized staging data. Inventory counts, IDs, references, targets/actuals, overrides/media, unit/side meaning and ambiguous legacy quarantine.
4. Rehearse recovery and preservation of writes made after migration. Validate backup accessibility and authorized restore method; do not overwrite current data with a stale snapshot without reconciled recovery scope.
5. Confirm actual notices/consent/rights/support routes, providers/regions, retention and incident responsibilities. No placeholder policies published.
6. Obtain G3 and exact external-action permissions. If any evidence fails, stop that release; do not broaden privileges to bypass it.
7. Deploy/migrate only the approved version and environment under an authorized window. Keep feature disabled until migration checks, role tests and smoke tests pass.
8. Enable only the approved cohort/scope. Verify assigned-revision integrity, health-check/review gates, stop/report, saved receipts, private projections and history preservation.
9. Observe pre-agreed pilot measures and incident/stop criteria. Investigate rejected suggestions and unsupported coverage separately from average usefulness.
10. Obtain separate wider-rollout approval after evidence review. R2/R3 each require their own accepted G5 build/enablement decisions.

## Stop, containment and rollback

Stop triggers: known restriction/approval bypass, cross-client or unnecessary health disclosure, corrupted/lost history, materially wrong dose/side/time behavior, false-save success, unreviewed content admitted or failed migration integrity. Clinical reports route through the accepted professional process; the app is not emergency monitoring.

First contain the affected feature/scope and prevent new invalid assignments. Preserve stop/report, privacy/support access and necessary actuals. Record minimal incident facts and implicated versions without copying medical notes into general logs. Do not delete evidence or silently rewrite approved/history records.

Choose the authorized recovery action based on failure: disable generation/adjustment/progression; revoke a content/policy version and invalidate affected future authority; revert application release if compatible with current data; use a reviewed forward repair; or execute a specifically authorized restore with post-backup write reconciliation. These are distinct operations, not interchangeable “rollback.”

After recovery verify ordinary-role access, valid context generations, accepted content manifest, idempotency/receipt behavior, all relevant source/assignment references, completed actuals and queue reconciliation. Obtain relevant owner/reviewer acceptance before re-enabling the exact scope. Never claim restoration succeeded from a command exit alone.

## Required evidence templates

Release record: proposed/action scope; approvals; version manifest; environment; preflight results; backup and restore rehearsal; migration checksum/count comparison; enablement time/cohort; smoke evidence; incidents; go/no-go owner and decision.

Rollback record: trigger and affected scope; containment; authorized action and rationale; data at risk; backup/write reconciliation; recovery checks; remaining impact; communications authority; restart decision. All actual fields are pending until a real authorized run. This draft is not a blanket authorization to use destructive recovery commands.
