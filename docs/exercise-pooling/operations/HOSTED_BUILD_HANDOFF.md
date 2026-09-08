# Fitness Scribber pooling — hosted engineering handoff

This is the historical A30 checkpoint. **Current A32:** see [engineering verification](./A32_ENGINEERING_VERIFICATION.md) and [remaining work](./REMAINING_WORK.md). Six hosted functions are now v2; 163 Node tests, six HTTP tests, 16 native suites and an 85-table restore passed. The tested application is `3b95415`. All nine engineering identities are retired. The evidence below is not a current resource count, blocker or request for reapproval.

8 September 2026 · v0.7/A30 · **tested engineering checkpoint; not launch-ready acceptance**.

The R1–R3 build is saved on `codex/exercise-pooling-local`. The approved existing-stack run exercised backup/recovery, additive migration, hosted authentication/permissions and fictional coach/client workflows. **Pooling is off at handoff.** Main, the current Production alias and the named Classic checkpoint were not promoted or replaced.

## Open the result

- [Protected branch Preview](https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app) — stable review link. Later documentation-only commits may move this alias without changing tested application source.
- [Exact tested feature-off candidate](https://fitness-scribber-kq6i-2w7a9p8nz-cureocity1.vercel.app) — application commit `bb513c2c9ae8e55826ab082d3b6b50151d653fd1`, GitHub deployment `6322555038`, Ready/success verified.
- [Existing Production app](https://fitness-scribber-kq6i.vercel.app) — unchanged commit `5de01b4e960e03e28d4a8b22527937103de10ad6`.
- [Coach test guide](./COACH_PREVIEW_TEST_GUIDE.md), [all remaining work/decisions](./REMAINING_WORK.md), [82-task sprint](../sprint-backlog.json), [110-case evidence map](../quality/HOSTED_ACCEPTANCE_MATRIX.md).

Existing Vercel authentication/protection remains enabled. The owner manages coach access and human acceptance. No invitations, public bypass, membership changes or usable test passwords are included here. A contained Preview shows the Classic workflow; it is not an enabled training recommendation demo. No local app server/URL is promised at handoff.

## What was verified

| Layer | Actual result | Important limit |
|---|---|---|
| Code | 132/132 unit tests; lint and Vite build pass | Large main-bundle warning remains; unit tests are not full browser acceptance |
| Target backup | Private PG17-compatible dump, 403,091 bytes; restored counts and row fingerprints match all 52 public/auth/storage tables | Same-device copy; not every managed hosted service or credential is recreated |
| Migration | 18 additive scripts; two-pass rehearsal, 16 restored-schema suites, exact guarded transaction and checksum ledger | No destructive reset, existing-row rewrite or Production frontend promotion |
| Hosted services | Six pooling functions ACTIVE v1, JWT verification retained; existing admin-users v3 untouched | Only the approved test project; no paid service or new provider integration |
| Hosted APIs | 98 recorded passing assertions, **91 distinct check names**; seven repeated assertions from an idempotent off-phase retry | Count is assertions, not 98 distinct test specifications; harness corrections disclosed in execution log |
| R1 browser | Explicit source/draft review, generation, compatible swap, coach checkbox/approval; linked-client start, actual zero, pause/resume, completion and reload | Fictional seconds-only placeholders, never exercise recommendations |
| R2/R3 | API daily accept/amend/reject, baseline preservation, insufficient/comparable progression; browser no-change/reject and atomic weekly review/assignment | Exact accepted numerical/domain cases and adverse interleavings remain incomplete |
| Governance | Role/projection boundaries, separate operator/hash acceptance, immutable acceptance, withdrawal, scoped reassessment and consent withdrawal | Fictional authority only; no reviewer signature is inferred |
| Feature-off | New decisions/starts denied; stop, attributed corrections and assignment history retained; new Classic stopped workout preserves data | Full original-app parity is not certified |
| Final UI fixes | Stopped session no longer offers Start/Edit/Change; absent readiness no longer gets legacy progression encouragement; pooling replaces legacy numerical/live-AI prompts | Original Production bundle is deliberately unchanged; other legacy metrics are not accepted pooling policy |
| Final preservation | **549 original rows across 52 tables unchanged**; 143 added rows retained after Auth containment, plus 19 infrastructure rows; Storage remains empty | Snapshot counts retained rows, not lifetime transient Auth tokens; exact private ledger retained |
| Containment | Three server flags and three branch browser flags off; two fictional manifests revoked; reviewer/scope/operator grants revoked; notice withdrawn; all five fictional users banned and sign-in rejection checked | Previously issued access JWTs expire normally; refresh sign-out is not instantaneous invalidation of every JWT |

The [machine-readable final verification](../quality/hosted-build-verification.json) contains the read-only verifier's timestamp and measured fields. The [execution log](./HOSTED_EXECUTION_LOG.md) describes browser evidence and harness corrections. The original [local report](./LOCAL_BUILD_VERIFICATION.md) retains earlier native concurrency, six Deno HTTP checks and six entrypoint typechecks; those are historical separate layers, not additional newly executed hosted cases.

## Recovery reference: “Fitness Scribber Classic”

| Reference | Exact identity / use |
|---|---|
| Named pre-pooling local checkpoint | Tag `fitness-scribber-classic-2026-09-07`, commit `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162` |
| Original remote main / Production | `5de01b4e960e03e28d4a8b22527937103de10ad6` |
| Recommended routine fallback for new state | New candidate with pooling flags off; understands newly stopped records |
| Database recovery snapshot | SHA-256 `488f7e7f037f57723c75f5d16976cc13303f2a32aea9365d9c4e988da476b9a3` |
| Applied migration transaction | SHA-256 `58851ad44d60084427fe31447e80bf262c9022db5108730db707ecc02aa5e66c` |

Code and database recovery are different. Saying “go back to Classic” identifies the checkpoint; it does **not** authorize erasing later data. Default recovery is disabling new authority and preserving existing results, then choosing a tested compatible frontend. The old frontend can label new `stopped` records incorrectly and is not a full reader of pooling sidecars. Follow the [rollback runbook](./RELEASE_AND_ROLLBACK_RUNBOOK.md) and reconcile new state before any later restore.

Private recovery files are under `.recovery/hosted-test/baseline-l0mYAT/` and `.recovery/hosted-test/run-pINCGI/`; native restore evidence is under `.local-test-runtime/hosted-restore-Zc0Yjh/`. Do not put these directories into Git, share links or emails. Backups have restrictive permissions and remain local. Managed Auth/REST/Edge services, internal realtime/vault and provider secrets were not rebuilt by PostgreSQL. No Storage objects existed to back up. No off-device recovery or whole-project hosted restore has been certified.

The exact task-created PostgreSQL 17 recovery process was stopped cleanly after final preservation verification; its restored databases and backup files remain intact. The read-only Postgres.app mount was not globally installed or removed. Final filesystem check showed approximately **1.4 GiB free**. Re-measure capacity before further heavy tests; do not delete backups or unrelated files automatically, and do not treat an arbitrary 20 GB as a measured prerequisite.

## What remains — not hidden by the passing test count

All 110 preparation specifications have explicit evidence/status: **57 passing engineering invariants, 43 partial, 10 external-scope blocked**. Neither the complete acceptance suite nor participant UAT has passed. Before any promotion:

1. Finish hosted two-tab/race, expiry, response-loss/offline and every supported builder/copy/template/import boundary case. Do not count a unit/native check as the missing browser scenario.
2. Complete exact budget-shortfall explanations, load/equipment/travel/side cases and required accepted catalogue/policy coverage. Real records stay unpublished until their exact scope and parameters are accepted.
3. Complete full accessibility, actual-device, representative-session and end-to-end performance testing; owner/coach records human UAT separately.
4. Supply the consolidated business/privacy/market facts and applicable professional/rights acceptance, recovery destination and operator/support decisions.
5. Separately approve any pilot, main merge/push, Production promotion or real-client enablement after mandatory evidence is complete.

No extra approval is needed merely to recognize the completed A30 work. Future scope changes, hosted test windows and release actions must retain their stated boundaries. This report does not publish exercises, supply clinical clearance, appoint reviewers or fabricate acceptance.

## Resource and publication accounting

Five of six permitted fictional identities were used. The private application harness reserved 440 rows plus 100 rows of UI headroom; the final retained count is recorded above. Auth sign-out removes run-created transient session/token rows, explaining the reduction from the earlier 186-row retained snapshot. Application/history records were not deleted. No Storage objects, invitations, paid AI calls, wearables, new addons or plan upgrades were created; authorized added spend remains ₹0.

Seven Preview builds were verified through the tested candidate: off, R1, R2, R3, UI-label fixes, off again and final fallback fixes. One additional branch-only build is reserved for publishing this documentation/test-evidence handoff, within the ten-build cap. Production variables and alias are unchanged. A bounded publication scan checks configured server secrets and high-confidence token/private-key patterns; it is not a comprehensive security audit. Real passwords, backup records and service credentials are excluded from this public repository.
