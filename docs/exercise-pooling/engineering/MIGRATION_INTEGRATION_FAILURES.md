# E03/E04/E05 — preservation, integration and failure specification

Version 0.1, 2026-09-05. FP-110/FP-111 drafts. No scripts executed against client data; no migration, flag, configuration or deployment created. REQ-006, 011–012, 016–018.

## Preservation design

Repository risk: `mergeExerciseLibrary` currently replaces library-name matches with new IDs on load. Programme occurrences also have their own IDs. Future migration must distinguish catalogue identity, occurrence identity and source labels, and preserve custom overrides/media. A matching name is candidate mapping evidence, not sufficient authority to discard a row.

Proposed authorized-stage sequence:

1. Inventory exact target schema/version, client ownership and supported legacy variants using an expressly approved synthetic/staging environment. Record counts, references and custom-field hashes. Production access needs separate permission.
2. Capture restorable backups plus compatible app/schema/catalogue versions; perform restore rehearsal before write approval. A backup file existing is not proof of recovery.
3. Create additive versioned identity/provenance structures. Build old-ID -> canonical-ID mapping with method/confidence/reviewer disposition; unresolved collisions stay unresolved. Retain original names/IDs/overrides and historical snapshots.
4. Preserve old assessment raw data; attach legacy ambiguity/protocol/date metadata without backfilling absent findings, consent or actor identity. Date-only records remain date-only. Link mirrors only when lineage is supported.
5. Translate prescriptions into new **unapproved legacy-import drafts** for future use. Existing completed sessions remain history, not retroactively assigned by an invented approval. The owner must approve a documented transition policy for already-scheduled/in-progress work; no silent cancellation or start bypass.
6. Reconcile legacy `items`, `blocks`, warmup/main/cooldown and per-set actuals. Do not double count mirrors or convert absent sections into newly prescribed exercises. Preserve all completed values, missingness, notes, units and source links.
7. Dry-run/rehearse twice: IDs/counts/mappings stable on second run; verify write/reload, permissions and same-input results. Compare counts and referential integrity; unresolved mappings reported, not dropped.
8. Request exact environment/window/version approval before hosted/production changes. Local build approval does not grant that authority.

Rollback proposal: disable new generation/assignment actions while retaining access to required status and history; preserve post-migration new records; choose tested compatibility rollback or forward repair. A destructive full backup restore can erase subsequent data and needs exact recovery authority and reconciliation, never an automatic panic action. Old clients must not regain a direct-write bypass during rollback. No blanket backup retention period is invented here.

## Integration entry points

| Existing source/location | Required future integration |
|---|---|
| `AssessmentForms.jsx` / `SelfAssessment.jsx` | Explicit coverage/confirmation, reporter/revision dates; correction and new-report invalidation |
| `ScreeningFlow.jsx`, coach/client parents | Preserve raw questionnaire/version, actual consent and protected interpretation separation; meaningful save failures |
| `ClientProfilePage.jsx` / clearance review | Scoped instruction evidence, authority and affected restrictions; old `received` label insufficient |
| `program.js:correctivePlan` / movement builder seed | Route through approved mapping/eligibility and side coverage; never trust current muscle associations/dose constants by default |
| `WorkoutBuilderModal.jsx` save/manual/swap | New draft revision, required metadata/recheck, explicit coach assignment transaction |
| Builder copy-last/quick-clone/bulk dates/copy-clients | Recipient/date-specific drafts; no inherited approval/private source notes; per-target outcomes and review |
| `DictationPanel.jsx` / parse-workout | Untrusted parsed draft; identity/unit/dose review; no new model data sharing implied |
| Plan/template/AI/manual paths in `TodayWorkout.jsx` + `workout.js` | All suggestions remain non-startable drafts until coach assignment; no generic warm-up/cool-down bypass |
| `ClientDetailPage.jsx` and `AthletePortal.jsx` start handlers | Identical authoritative start/health-change/approval checks; optional wellness skip is distinct |
| Runner normalization, edits, pause/resume | Approved dose frozen; no changed training max silently backfills new targets in an approved session; preserve actuals |
| Workout completion/peak derivation | Actual-versus-target evidence and deduplication; no invented performance or automatic restriction resolution |
| `DataContext.jsx`, `api/sync.js`, `storage.js` | Awaited durable save for gated operations, availability states, version conflict/idempotency; existing unrelated writes not silently redesigned |
| Exports/insights/media/admin/support | Audience/purpose minimization and preserved permitted functionality; review privilege and provider flows separately |

Each integration must be tested through the UI **and** a direct API request. UI-only suppression of a button is not enforcement. Newly received restrictions must affect entry points even if the user opened the screen before the update.

## Failure behaviour and recovery

| Failure | Required visible behaviour / recovery |
|---|---|
| Source table unavailable | Distinct source-error status, retry and blocked affected action; no empty-table “healthy” fallback |
| Unknown schema/content version | Stop affected new automation, preserve display/history; offer supported-version recovery, not destructive auto-migration |
| Save rejected | Keep local edits visibly unsaved; previous saved revision remains; no assignment success toast |
| Timeout after request | Outcome unknown; query/retry same idempotency key; reconcile before another assignment |
| Two coach tabs edit | Expected-revision conflict; show diff and explicit new review; no last-writer-wins overwrite |
| Health report during approval/start | Shared context generation serializes or invalidates the action; no lost report |
| Network loss | Apply proposed offline policy; preserve permitted pending actuals with privacy controls, never claim authoritative approval |
| Local storage full/unavailable | Memory-only/unsaved warning; no durable-save claim; no silent loss on navigation |
| Empty required pool | Display uncovered need/setting and supported options; do not lower prerequisites or remove restrictions |
| Module/content revoked | Invalidate affected future use; keep history and explain next review; operational pause cannot erase evidence |
| Feature disabled | Disable newly governed automation without hiding active holds or restoring an unsafe direct-write path |
| Partial multi-target operation | Each target draft outcome explicit; never report all assigned. Any assignment still separately validated and reviewed |

## Proposed configuration and performance acceptance

Feature flags separate generation, assignment and module/market activation; server-side policy controls authoritative actions. Default off in future implementation until approved tests/release. Local flag cannot grant permission. No per-country rollout is executed by this specification.

Proposed initial engineering test budgets, awaiting product/hardware confirmation: synthetic 2,000 catalogue variants and 500 context observations; pure resolver+pool p95 under 250 ms on recorded test hardware; controlled staging approve-and-assign p95 under 2 seconds excluding an external outage. Measure across fixed fixtures and report hardware/sample count. Timeout should yield a typed failure/unknown outcome, not silently reduce safety checks or truncate required records. These are proposed performance targets, not observed measurements or medical thresholds.

No telemetry of raw assessment values/text by default. Use synthetic identifiers during testing and minimized aggregate operation timing/reason counts for any separately approved pilot. Real client testing, staging writes, migrations and rollout remain gated.
