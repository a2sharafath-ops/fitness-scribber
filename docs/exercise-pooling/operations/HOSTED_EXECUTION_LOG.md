# Existing-stack execution log

8 September 2026 · authorized v0.7/A30 · implementation branch only.

## Authorization and current state

Owner approved the prepared existing-stack package via delegated follow-up and requested a protected Vercel Preview and coach testing instructions. Target: Vercel `cureocity1/fitness-scribber-kq6i`, Supabase `haxxetirrcrwzwdzsdui`. Main/Production alias, existing records, Classic and unrelated projects must be preserved. Additional spending limit ₹0. No professional acceptance or real-client activation is implied.

Initial state was local HEAD `d2537e6`, before hosted execution. Coach access and human acceptance are owner-managed; no invitation or protection change is being made. Current stage results below supersede the initial preflight state.

## Stage results

| Stage | Status | Evidence / limit |
|---|---|---|
| A30 authorization | Approved | Delegated user follow-up, 8 September 2026 |
| T01 target/cost preflight | Passed for bounded run | Exact existing projects; free/Hobby allowances; ₹0 added spending; 4.0 GiB free before deployment |
| T02 inventory | Captured | 21 public tables, auth/storage, roles/grants/policies, extensions, non-secret auth settings and existing admin-users v3 source; no Storage buckets/objects |
| T03 hosted export/local restore | Passed, relational scope | All 52 public/auth/storage table counts and row fingerprints match; native PG17.11 restore of PG17.6 export |
| T04 migration | Applied and checked | 18 scripts; two-pass rehearsal, 16 restored-schema suites, atomic transaction rehearsal; post-commit all 52 baseline fingerprints unchanged; all flags off |
| T05 functions | Deployed and exercised | Exactly six pooling functions, ACTIVE v1 with JWT verification; existing admin-users v3 preserved |
| T06 protected Preview | Passed | Branch-only builds; first off, R1, R2, then R3; final off. Exact versions/URLs in the handoff report. Existing Vercel protection retained. |
| T07 identities | Passed | Five fictional identities: two coaches, two linked clients, one unlinked user; no invitations or existing-account edits |
| T08 context/selection | Passed listed engineering journeys; incomplete full coverage | Hosted confirmations/held decisions, canonical editor, generate and compatible swap; all 48 actual candidates remain unpublished |
| T09 assignment/entry points | Partial | Exact coach approval and client execution passed; all six functions reject cross-owner/unlinked actors. Not every manual/template/copy/voice UI variation was executed. |
| T10 runner/resilience | Partial | Auth refresh, account switches, exact retry, stale context, actual zero, pause/resume/complete, hold/stop/correction/history passed. Full hosted races, browser response-loss/offline and expiry injection remain. |
| T11 R2/R3 | Passed listed engineering journeys; incomplete full coverage | Daily accept/amend/reject, no-change, comparable-history progression, scoped reassessment and atomic weekly review/assignment |
| T12 governance | Passed synthetic scope | Exact-hash admission, separate operator/acceptance gates, immutable acceptance and withdrawal. No professional acceptance inferred. |
| T13 acceptance map | Mapped, not fully passed | 110 cases: 57 passed engineering invariants, 43 partial, 10 external-scope blocked. No participant UAT or full hosted latency/load certificate. |
| T14 Classic compatibility | Partial, recovery limits recorded | Original sign-in/dashboard/roster/client and candidate feature-off assessment/client routes; stop and saved history preserved. Old frontend does not fully understand new stopped status. |
| T15 containment/handoff | Final state in handoff report | Server and branch browser flags off; fictional authority revoked; exact test-user disablement and final preservation results are recorded by the final verifier. No deletion or database rewind. |

No secrets, backup contents, test passwords or identifiable health records belong in this log.

## Preflight progress

- Owner clarified that coach access and user acceptance testing are owner-managed; do not wait for coach identity or change invitations/protection. Access/UAT remain unverified until the owner tests them.
- Existing CLI backup dry-run obtains its temporary database login without a new owner password. No generated shell is executed; the recovery utility validates the exact project/host and passes private credentials only in child environment variables.
- Supabase Management API verified organization plan `free`, no selected paid addons, a 100-function entitlement (one function currently deployed), and no scheduled-backup entitlement. Existing Vercel team was verified Hobby. No upgrade/addon has been selected; bounded testing must stop on quota/provider limits rather than incur charges.
- Official Postgres.app 2.9.6 / PostgreSQL 17.11 image: 119,621,638 compressed bytes; 461,412,864 image bytes; SHA-256 `b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168`. Downloaded to `.local-test-runtime/pg17.YbRhJl/Postgres-2.9.6-17.dmg`, mounted read-only at `.local-test-runtime/pg17.YbRhJl/mounted`. Signature verification passed outside the sandbox. No global install/security bypass performed.
- Direct database TLS uses the official Supabase Root 2021 CA with `verify-full`; no machine trust-store change or certificate bypass. Export/migration succeeded.
- Latest candidate: 132 unit tests, lint and build passed. A pre-existing large-bundle warning remains. These do not certify every application path.

## Recovery and migration evidence

Private backup: `.recovery/hosted-test/baseline-l0mYAT/database-full.dump`, 403,091 bytes; SHA-256 `488f7e7f037f57723c75f5d16976cc13303f2a32aea9365d9c4e988da476b9a3`. Restrictive local permissions; not committed/uploaded. Existing `admin-users` source and explicitly selected non-secret auth settings are saved alongside it. A complete secret-bearing provider-config export was not performed. No Storage files exist to copy.

Restore result: `.local-test-runtime/hosted-restore-Zc0Yjh/restore-result-fitness_hosted_restore_1788846357722.json`. All 52 public/auth/storage tables match at UTC-normalized row fingerprints. Roles/ownership/grants are restored without passwords; managed Auth/REST/Edge processes, internal realtime/vault and provider credentials are not recreated by native PostgreSQL. This is not proof of a whole hosted-project restore, nor an off-device backup.

Two-pass rehearsal and 16 existing SQL/workflow suites used a fresh clone of the actual restored target schema. Profile role insert/update were confirmed denied to ordinary authenticated users by existing column grants; no speculative profile-permission change was made. Service decision access is allowed, ordinary client/anon decision and client runtime writes are denied.

Exact transaction SHA-256: `58851ad44d60084427fe31447e80bf262c9022db5108730db707ecc02aa5e66c`. Applied as `postgres` in one guarded transaction with a checksum ledger. Hosted verification completed 2026-09-08T05:53:09Z: all 18 ledger checksums match, every baseline fingerprint unchanged, R1/R2/R3 false. This changes the shared test backend, not main or the Vercel Production alias.

## Hosted API and browser evidence

Run `fs_pool_e2e_20260908_dd376c33` uses only non-deliverable fictional identities and conspicuously labelled engineering placeholders. Private credentials, exact resources and event/check timestamps are in `.recovery/hosted-test/run-pINCGI/`. Public scripts `scripts/pooling/hosted-{fixtures,r1,r2,r3,governance-checks,containment,preservation}.mjs` define the executed API checks. They are not unattended production setup scripts; reuse requires reviewing the exact target and run state.

- **R1:** all six Edge services denied valid JWTs belonging to the wrong coach or an unlinked user; malformed JWT denied. Purpose consent was attributable to the linked client, source confirmation was explicit and retry-safe, context-review children stayed unassigned, held/client-forged approvals failed, exact coach approval and same-key retry produced one assignment. The client could start, enter zero, pause, resume, record another actual and complete. Raw source/coach evidence was excluded from the pooling projection.
- **Browser R1:** stale editor generation was rejected. After refresh, a canonical draft was saved, generated, swapped within compatible family/laterality, validated and approved only after its full dose was inspected and the explicit review checkbox selected. The linked client completed a two-set fictional seconds-only session; reload preserved results. Coach/client switches cleared the previous role's view.
- **R2:** fixture numerical policy created a separate unassigned child on acceptance or amendment; rejection created none and the assigned baseline stayed unchanged. R3 was denied while only R1/R2 were enabled. A browser review of an already performed occurrence returned no change, disabled acceptance and allowed explicit rejection.
- **R3:** wrong effort-method history was insufficient. An attributed correction retained its original and enabled a comparable-history proposal, still unassigned. Explicit two-session weekly drafts were reviewed and assigned atomically via API and browser. Missing support and changed sources blocked future reliance. No extra training date or real exercise dose was invented.
- **Governance:** submission was not publication. Missing release-operator permission returned 403; operator without exact acceptance returned 409. Fictional exact-hash acceptance then permitted publication. Acceptance was immutable; withdrawal revoked the release. A client reassessment request did not resolve a restriction; ordinary coach/service-without-grant/wrong-side resolutions failed. Exact authorized left-side resolution retained the right-side finding. A later no-change report did not clear the existing hold; core consent withdrawal was recorded.
- **Feature-off:** decision and new start were denied, but stop and attributed late correction (including explicit zero load) remained possible. All prior targets/events were retained. A linked client stopped a newly created Classic workout without changing its performed fields. Minimal assignment history remained readable; the pooling home RPC correctly returned `feature_disabled`.
- **Responsive/UI checks:** desktop, 390×844 and 768×1024 reflow showed no page-width overflow; native date entry and disabled review controls were exercised; sampled console errors were empty. These are not screen-reader, zoom, real-device or human acceptance results. Native date entry uses the browser locale, not assumed ISO text filling.

## Findings and corrections

1. Current-unassigned draft summary now excludes assigned/superseded revisions without deleting history. Source errors/loading cannot falsely claim there are no drafts.
2. Extension UI distinguishes the draft policy from separately admitted test policies. Client headers say “approved draft ID,” not a misleading “revision ID.”
3. Feature-off planner understands `stopped`. The final client check found Today’s Workout still treated it as an unstarted draft; the candidate now renders a retained stopped record without Start/Edit/Change actions. This does not retrofit the unchanged original Production bundle.
4. The legacy coaching card offered progression encouragement with absent readiness. The candidate now shows “Readiness not established.” In pooling mode legacy numerical/live-AI prompts are replaced with an explicit pointer to the governed review flow. Other legacy metric heuristics have not acquired domain acceptance.
5. Two harness expectations were corrected: an obsolete assignment column name failed before mutation; a feature-off home RPC was initially expected to remain available, then correctly asserted as disabled. The off-phase retry reused its operation keys and exact workout. Repeated passing checks are deduplicated in the final report; these were not silently counted as new acceptance cases.

## Evidence and next gate

See [hosted handoff](./HOSTED_BUILD_HANDOFF.md), [110-case evidence map](../quality/HOSTED_ACCEPTANCE_MATRIX.md), and [remaining work](./REMAINING_WORK.md). Engineering execution is not a clinical, privacy, rights, human UAT or Production-release signature. Main and the Production alias remain on `5de01b4`; Classic remains `08ac0673` at the named local tag. Prefer the tested feature-off candidate for routine fallback involving newly stopped records; never restore an old database merely to select old code.

## A31 follow-up — usable fictional coach testing

The separately approved per-client enrollment replaces A30's feature-off handoff for two existing coaches, without global activation. See [A31 progress and exact recovery evidence](./COACH_TEST_PROGRESS.md) and [the updated walkthrough](./COACH_PREVIEW_TEST_GUIDE.md). A fresh 83-table relational restore and two-pass additive migration rehearsal preceded hosted application. The six lifetime fictional identity cap is reached; no original role/password was changed and no old test user was reactivated.

Normal hosted coach JWT and browser checks now cover creation, source preparation, generate/swap, exact approval, actual zero/correction, pause/fresh-answer resume/completion, daily and comparable-history proposals, and protected Preview weekly batch approval. Current code passes 141 unit tests, lint and build. Latest preservation: all 711 pre-A31 rows across 83 tables unchanged; no Storage objects; no real catalogue published; global flags false. Preview 9 is verified. The final tenth-build smoke/retirement/preservation receipts are written to the private run ledger after this commit and are not pre-claimed here. Remaining 110-case and real-release gates are not automatically closed.
