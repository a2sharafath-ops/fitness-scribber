# Remaining pooling work and next approval bundle

Updated 7 September 2026 after local implementation checkpoint `3b779d9`. The original 82-task sprint remains the scope; local implementation, verification and external acceptance are tracked separately.

The owner has already approved ordinary local work and A29. **Do not ask again for the same backup/build approval.** The code is committed on `codex/exercise-pooling-local`; main and Fitness Scribber Classic are preserved. No push/deployment occurred.

## Completed local checkpoint

Core R1–R3 code, explicit source/context review, guarded permissions/assignment/execution, client reports/history/consent, selection/swaps, daily/progression/weekly proposals, scoped reassessment, catalogue controls and recovery journal are implemented. 120 unit tests, lint/build, six Deno HTTP tests and all six entrypoint typechecks passed. Fresh native PostgreSQL role/concurrency/integration and full public-row dump/restore checks passed.

The [verification report](./LOCAL_BUILD_VERIFICATION.md) is the evidence, including limitations. It supersedes this file's earlier lists of unimplemented governance, weekly composition, Deno testing and native recovery.

## Pending engineering verification and fit-for-release work

| Work | Sprint references | Current limit / next action |
|---|---|---|
| Real frontend/auth/API integration | FP-303, 306, 502–505, 601 | Native SQL and injected gateways pass; no complete isolated Supabase auth/REST/storage/Edge stack has been verified. Test sign-in, coach/client scope, refresh, expiry, sign-out/account switches, concurrent tabs, exact retry and offline/response loss through the actual app. Fix any findings. |
| Full role and entry-point acceptance | FP-504, 601 | SQL bypass guards and draft routes exist; every manual/template/voice/copy/bulk/client journey must still pass the same integrated stack. Prior copy browser results are historical, not a current full-path certificate. |
| Device, accessibility and usability acceptance | FP-506, 604, 704, 805 | Current desktop/390px/1280px component checks and semantic labels pass. Full keyboard/focus/screen-reader, supported devices, longer realistic sessions and actual participant testing remain. |
| Accepted policy/catalogue coverage | FP-302, 401–405, 507, 602, 702, 802 | 48 real candidates remain unpublished. Import actual accepted exact revisions/parameters into a release manifest, exercise all required goal/setting/level/role/side cells and diagnose coverage gaps. Fictional fixtures cannot stand in for expert decisions. |
| Complete requirement-linked acceptance suite | FP-601, 704, 805 | Map and execute every required TC/CAT/R2/R3 acceptance case with accepted expected outcomes; current automated tests cover listed invariants, not every domain test specification. Measure end-to-end latency/load; the pure-engine benchmark is not an API SLA. |
| Target-compatible migration and Classic recovery | FP-603, B11 | Fresh core-schema restore and feature-off UI checks pass separately. Still verify the actual Classic application against the migrated target Supabase API/auth/storage services, stop/log behavior and preservation of new sidecars/results. Do not certify hosted rollback from native SQL alone. |
| Release-ready operational details | FP-605–608, 705, 805 | Populate real operator/support/privacy/market/retention/provider facts, record acceptance, stage migration, run an authorized pilot, and only then consider deployment/enablement. |

The new client view intentionally protects raw assessment/clinical notes and is narrower than Classic. Full client-app/onboarding feature parity is not part of this completed pooling checkpoint. Any parity required for launch must be specified and verified before enabling R1; do not silently expose the old private fields to restore parity.

No clinician portal, autonomous clinical clearance, unattended assignment, invented numerical policy, automatic multi-week schedule or distinct soft-retirement lifecycle has been claimed as delivered.

## All remaining owner decisions / external permissions, together

These are **next-stage gates**, not a request to approve the completed local work again. An approval can authorize actions; it cannot replace evidence or another person's signature.

1. **Integration environment:** identify one exact disposable staging Supabase project/stack and region, provide secure authorized access, and approve synthetic migrations, auth/REST/storage/Edge testing plus any costs (default: no spend). Do not send passwords in chat. A local full-stack alternative also needs an exact scoped runtime plan; shared Docker resets remain excluded.
2. **Actual review evidence:** name the content/domain/clinical/rights reviewers as applicable and provide their accepted exact catalogue/policy versions and parameters. Owner product review is recorded; it is not a substitute for these separate professional decisions. Rehabilitation/special-needs enablement remains closed.
3. **Business/privacy facts:** business/coach name, contact/support route, establishment and specific launch countries, qualified coaching/clinical scope, providers/regions, retention/rights/incident ownership and final published notices/consent. India/GCC/USA/UK/Europe were target intentions, not universal legal clearance.
4. **Usability/pilot permission:** authorize specific coach/client test participants, contact/data scope and criteria. No real person has been contacted or real client assigned by this work.
5. **Release/version-control permission:** exact branch/PR/push/merge and Vercel/Supabase targets, automatic-deployment consequences, release window/cohort and rollback operator. Current default remains no remote changes and all production features disabled.
6. **Off-device/live recovery:** select an approved backup destination, access/encryption/retention and authorize the exact live/staging backup and restore rehearsal. Local same-disk archives do not protect against losing the computer.

Approve only the next environment/scope when ready. Production, clinical and privacy activation must still wait for successful evidence; a blanket “go ahead” does not manufacture it.

## Current safe stopping point

Local implementation and the listed synthetic tests are saved. Inspect at `http://127.0.0.1:4179/` while the local process runs; it has no hosted connection or publishable catalogue. The feature-off compiled preview is `http://127.0.0.1:4180/`.

Use **Fitness Scribber Classic** to identify the preserved pre-pooling code. Follow the [rollback runbook](./RELEASE_AND_ROLLBACK_RUNBOOK.md); never overwrite newer client data merely to return to old code.
