# Remaining pooling work and decisions

8 September 2026 · supersedes the earlier local-only pending list. The original 82-task sprint remains the scope. **A30 is approved and has been executed; do not request the same backup/build/branch-Preview approval again.** Main/Production and real-client enablement are excluded.

## Completed engineering checkpoint

R1–R3 code, source/context review, coach-only exact assignment, client execution/history, selection/swaps, daily/progression/weekly proposals, scoped reassessment and catalogue controls are implemented. The [hosted handoff](./HOSTED_BUILD_HANDOFF.md) records actual results: private backup/52-table restore, 18 additive migrations, six hosted functions, protected Preview, fictional coach/client journeys, feature-off recovery and containment. The latest candidate passes 132 unit tests, lint and build. Earlier 120-test/native/Deno evidence is retained in the historical [local report](./LOCAL_BUILD_VERIFICATION.md), not presented as a new run.

This is a tested engineering checkpoint, **not completion of every sprint acceptance criterion or authorization for live coaching**. The [complete 110-case matrix](../quality/HOSTED_ACCEPTANCE_MATRIX.md) has 57 passing engineering invariants, 43 partial cases and 10 blocked by external scope. Each partial row identifies the exact remaining work; a passing unit invariant is not a full hosted/participant case pass.

## Pending engineering, in priority order

| Priority / work | Sprint references | Remaining result required |
|---|---|---|
| P0 — adverse hosted interactions | FP-303, 504, 601 | Two actual tabs/coaches racing context changes with approval/start/weekly batch; token expiry and recovery; browser commit-response loss/offline transitions; pending actuals and account switching under failures. Native atomic guards and API retry receipts have passed, but do not replace these cases. |
| P0 — all programming entry points | FP-501–505, 601 | Complete manual/template/copy-last/cross-client/bulk and AI/voice-import UI-to-backend tests. Paid providers/audio uploads remain excluded. Existing guarded draft routes and API denial evidence are only partial coverage. |
| P0 — exact domain cases and explanations | FP-302, 401–405, 507, 601, 704, 805 | Explicit numeric budget-shortfall display and alternatives; precise load-method/inventory cap/rounding, travel timezone/setting, mirrored legacy maximum and multi-finding ranking fixtures. Many can be strengthened synthetically; accepted exercise outputs require admitted parameters/content. |
| P0 — client/Classic recovery parity | FP-307, 505, 603, B11 | Broader legacy workout/history paths and any launch-required client feature parity. Original old frontend misinterprets new stopped status. The candidate's planner/card now preserve it; do not claim the old immutable app supports every new state. |
| P1 — accessibility and performance | FP-506, 601, 604, 704, 805 | Full keyboard/focus, screen reader, zoom, actual supported devices, representative session length and bounded end-to-end latency/load against an agreed target. Current reflow checks and pure-engine benchmark are narrower evidence. Main bundle still triggers a >500 kB warning. |
| P0 release gate — full evidence closure | FP-601, 704, 805 | Close every required partial case at its stated layer, choose exact launch scope for blocked cases and record actual expected-output acceptance. Keep unmet cases visible rather than converting them into passes. |

The pooling client view intentionally hides raw coach/assessment notes and is narrower than Classic. Full client-app/onboarding feature parity is not claimed. No clinician portal, autonomous clinical clearance, unattended assignment, invented numerical policy or distinct soft-retirement lifecycle is delivered by this checkpoint.

The legacy coaching card's no-data “green light” was corrected and its prompts/live-AI route are suppressed in pooling mode. Other legacy metric heuristics, wellness defaults and third-party features are not approved pooling authority and still require their own launch review; no provider call was made in this run.

## Owner inputs and external sign-offs — consolidated

These are future gates, **not another approval request for work already done**. Ordinary in-scope code/test improvements remain covered by the existing engineering authorization. Another hosted test session needs a coordinated exclusive window and valid fictional fixtures; it must stay within the approved target/cost/resource boundaries. Any material expansion needs a new specific decision.

1. **Exact content/policy acceptance:** identify authorized exercise, clinical-policy and rights reviewers as applicable; record accepted exact revisions, populations, evidence, numerical parameters and constraints. The owner's six-PRD/twelve-catalogue product review is recorded. It cannot stand in for unidentified specialist signatures. All 48 real candidates stay unpublished; rehabilitation/special-needs paths stay closed unless their exact scope is accepted.
2. **Business/privacy/market facts:** business/coach name, contact/support route, establishment, specific first launch countries, qualification/service scope, processors/regions, retention/rights/incident owners and final notices/consent. India/GCC/USA/UK/Europe are target intentions, not blanket legal clearance.
3. **Human usability/UAT:** owner manages existing coach access and participating users. Record test scope, fictional/real data permission, device/browser and actual outcomes. No invitations, membership changes, protection bypass or real-person contact were performed. See the [test guide](./COACH_PREVIEW_TEST_GUIDE.md).
4. **Off-device and full hosted recovery:** choose a specific private encrypted destination, access/retention policy and authorize the exact managed-service restore drill. Current backups are same-device; the relational restore does not recreate every managed service or provider credential. No whole-database rewind is authorized.
5. **Pilot/release:** name operator and support owners, define cohort/criteria and accept the remaining mandatory evidence. Then separately authorize any main merge/push, Production promotion or real-client enablement. Branch push/Preview approval does not authorize those actions.

## Safe handoff

Use the [protected branch Preview](https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app). Pooling is deliberately off at handoff; run-created test accounts are disabled as recorded in the final verifier. Do not distribute old test credentials or silently turn the flags back on for UAT. No local development URL is promised because no app server is being left running.

**Fitness Scribber Classic** identifies local tag `fitness-scribber-classic-2026-09-07`, commit `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`. Main/current Production remain `5de01b4e960e03e28d4a8b22527937103de10ad6`. Follow the [rollback runbook](./RELEASE_AND_ROLLBACK_RUNBOOK.md); switching code must not erase newer client data. The newer feature-off candidate is the tested route for handling newly stopped records.
