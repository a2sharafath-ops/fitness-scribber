# Q01/Q02 — reference cases and verification specification

Version 0.1, 2026-09-05. FP-112 draft, supporting Q05/Q06 and later professional Q03 review. **Test specifications, not an implemented/executed pooling test suite.** Synthetic inputs only; no real client data or clinically approved expected exercise prescriptions.

## Fixture contract

Each future fixture includes ID, requirement IDs, input source states/revisions/effective and recorded times, client/session/timezone, actor/role, consent/purpose state where relevant, fictional catalogue/rule manifest, operation, exact expected gate/eligibility/reasons/coverage/side/dose state, preserved-history assertions and expected audience fields. Actual exercise/dose expectations remain pending qualified content review.

Use artificial candidates `EX-A`, `EX-B`, `EX-C`, not clinical prescriptions: A covers a fictional need with no special item; B covers that same need but needs a band; C covers a second fictional need and is explicitly excluded by a fixture restriction. Artificial values test ordering/permissions only. Their review flags are fixture data, never fabricated review evidence for the real catalogue.

## Behavioural cases

| ID | Requirement(s) | Setup/action | Exact expected invariant |
|---|---|---|---|
| TC-001 | REQ-003 | Empty legacy movement findings | No assessed-absent entries or resolved needs fabricated |
| TC-002 | REQ-003 | Untouched lifestyle 4/4/Moderate and wellness 5/3/3/3 | Legacy ambiguity retained; no automatic confirmed readiness/dose |
| TC-003 | REQ-003 | Explicit confirmed false/zero versus missing | Negative/zero preserved; missing distinct; no truthiness coercion |
| TC-004 | REQ-003–004 | Intake categorical stress plus 1–7 reassessment | No invented scale conversion or arithmetic averaging |
| TC-005 | REQ-004 | Future-effective assessment injected into earlier session | Excluded from source candidates; reason trace identifies date mismatch |
| TC-006 | REQ-004, 017 | Later-recorded backdated correction during original replay | Original cutoff excludes it; retrospective mode labelled and history unchanged |
| TC-007 | REQ-007, 012 | Left finding followed by right-only assessment | Left unresolved; no blanket resolution from missing key |
| TC-008 | REQ-004, 007 | Different movement protocols with same normalized percent | Not treated as equivalent assessment or proof of resolution |
| TC-009 | REQ-004 | Contradictory same-period/date-only sources | Conflict surfaced, not chosen by ID/array order |
| TC-010 | REQ-005 | EX-C has highest relevance but active exclusion | Never selected; no ranking component cancels exclusion |
| TC-011 | REQ-005, 008 | EX-B missing required band | Ineligible/condition unresolved, not auto-selected on “full gym” label |
| TC-012 | REQ-007 | Two findings map to same confirmed need | Evidence retained; duplicate drill count/score not inflated |
| TC-013 | REQ-007 | Left need and a contralateral mapping lacking reviewed transform | Side not guessed; affected mapping requires review |
| TC-014 | REQ-006 | Unreviewed/rights-unknown/revoked variant | Excluded from automated selection regardless of difficulty label |
| TC-015 | REQ-005, 010 | Advanced experience plus restriction | Restriction applies; experience cannot bypass hold |
| TC-016 | REQ-002, 010 | Functional accommodation without a specified clinical prohibition | No blanket disability exclusion; verify individual requirements |
| TC-017 | REQ-005, 008 | Required need has no eligible candidate | Explicit required gap and blocked assignment; no generic fallback |
| TC-018 | REQ-007–008 | Optional pool empty | Optional block omitted with reason, not a blanket client hold |
| TC-019 | REQ-009 | Missing/old/future or differently named load reference | No fabricated numeric load or substring transfer; reviewed alternative or incomplete dose |
| TC-020 | REQ-009 | Single rep saved by legacy default | Not proof of verified maximal test; source/method ambiguity retained |
| TC-021 | REQ-008 | Fictional per-side timing example in P04 | Exactly 95 seconds with declared rest/setup rules; no double counting |
| TC-022 | REQ-008–009 | Budget cannot fit required dose/rest/assistance | Visible gap/coach choice; no silent limit/rest reduction |
| TC-023 | REQ-001, 011 | Copy to new date/client or template reuse | Fresh draft/context/IDs; no approval/private clinical notes copied |
| TC-024 | REQ-001, 011 | Manual or voice item injected outside pool UI | Same metadata/eligibility checks; cannot assign unmapped item by alternate path |
| TC-025 | REQ-001, 012 | Edit assigned dose/side/timezone | New reviewable revision; prior approval not valid for changed prescription |
| TC-026 | REQ-010–012 | Old received-clearance flag plus new relevant health report | Required review remains; old status cannot clear new event |
| TC-027 | REQ-010 | Evidence resolves one of two restrictions | Only scoped restriction resolves; other remains active/unresolved |
| TC-028 | REQ-011 | Wellness skipped but required health-change unanswered | Skip not clearance; required prompt still pending; no wellness row fabricated |
| TC-029 | REQ-011–012 | New report during approval/start | Operation conflicts/blocks or assignment invalidates before start; report not lost |
| TC-030 | REQ-011–012, 017 | New hold after partial workout, then resume | Completed actuals persist; stop/report available; resume checks affected remaining work |
| TC-031 | REQ-016 | Required-source fetch error returned as empty array | Unavailable status, not no restrictions; affected assignment blocked |
| TC-032 | REQ-016 | Save fails, timeout after commit, duplicate retry | Failed/unknown distinguished; same key resolves once; no false success/duplicate assignment |
| TC-033 | REQ-012, 016 | Two coach tabs approve different revisions | Expected-version conflict; no silent overwrite or stale approval |
| TC-034 | REQ-001, 011 | Client directly writes approval/clearance/target fields | Server rejects without changing protected data; UI bypass irrelevant |
| TC-035 | REQ-011, 013, 015 | Client reads/writes another client's ID or private projection | Denied; no cross-client or unnecessary internal-note disclosure |
| TC-036 | REQ-014–015 | Coach checks consent without client evidence; optional consent withdrawn | No invented client authorization; stop affected optional processing, preserve unaffected lawful purpose handling |
| TC-037 | REQ-015 | Simulated wearable/manual defaults passed as device data | Origin retained; excluded from device-dependent rules; R1 core unaffected |
| TC-038 | REQ-006, 017 | Reload/migrate twice; name collision/custom override present | Stable IDs and preserved custom/media/history; unresolved mapping reported |
| TC-039 | REQ-017 | Missing blocks, mirrored max/assessment and prefilled target loads | No added performed work/double evidence or assumed observed load |
| TC-040 | REQ-016, 018 | Offline, local storage failure or disabled module | Honest unsaved/draft-only/unsupported status; no permission escalation or old bypass |
| TC-041 | REQ-013–014 | Keyboard/mobile/zoom/screen reader plus consent flow | Critical status/side/units/actions usable without colour/drag/tooltip; no prechecked optional consent |
| TC-042 | REQ-018 | Build, release or regional sign-off absent | No production activation/clinical approval fabricated from passing synthetic tests |
| TC-043 | REQ-004, 011 | Travel timezone change and second session same day | Date context explicit; affected approval checked; daily wellness does not suppress session health-change check |
| TC-044 | REQ-002–003 | Unknown age or Beginner profile default | No inferred adult/skill eligibility; justified required facts requested |
| TC-045 | REQ-008 | Baseline full gym, current hotel/no band/assistance unavailable | Session-specific inventory/conditions govern; lost equipment invalidates affected choice |
| TC-046 | REQ-004, 016 | Same semantic input in different array orders/locale/device time | Same semantic output and reason order; operational IDs/times not selection dependencies |

## Properties and test layers

Pure contracts: deterministic replay, input immutability, monotonic exclusion (adding a restriction never admits a conflicting candidate), no unexplained unknown-to-known conversion, side preservation and bounded time arithmetic. Randomized fixtures may permute array order, omit optional fields and add contradictory sources; exact output must still follow versioned rules.

Persistence/API: use synthetic coach, linked clients A/B, unlinked client and anonymous actors. Test reads/inserts/updates/deletes plus protected JSON fields, forged owner IDs, stale expected revisions, idempotency replay with changed payload and concurrency races. Inspect API projections, not just the rendered UI. Authenticated role alone is not ownership. A privileged test harness must also test ordinary credentials so it does not mask policy failures.

Integration: exercise every E04 entry point, start/resume/stop/complete and copy path. Fault injection covers source load failures, failed writes, response loss after commit, token expiry, context/catalogue revocation, partial multi-target save and local-storage quota failure. Preservation checks compare exact counts, IDs, references, units, actuals and override/media values before/after synthetic migration and restore.

UX: documented scripts on the proposed responsive sizes, keyboard-only, screen reader and zoom/reflow. Verify required issues remain visible and consent/health-change wording is understandable. Real participant sessions require separate approval; no external users contacted here.

Domain acceptance: a qualified reviewer supplies expected real exercise/dose choices and counterexamples for each supported module/population. Passing artificial logic fixtures is not clinical validity. Content rights and regional privacy acceptance remain independent gates.

## Future CI and evidence

Once S3 build is explicitly authorized, choose a compatible test runner and add pure/unit, integration and browser/security suites in that scope. No runner, package, CI file or executable test was created now. Local checks of these documents validate links/IDs/dependencies only.

Proposed release blocking rule: all mandatory permission, approval, unknown-data, exclusion, history-preservation and declared supported-pathway tests pass; zero unresolved blocker findings. Coverage percentage is supplementary, not substitute for these cases. Performance budgets are proposals in [E05](../engineering/MIGRATION_INTEGRATION_FAILURES.md), not measured results.

Evidence record: versioned requirement/test ID, input fixture, app/engine/content/schema version, environment/actor, observed versus expected result, timestamp, reviewer where required, failure severity/owner and regression link. Keep production identifiers and raw health notes out of general CI logs. Record actual results only; this file claims no pooling tests have passed.

## S2 synthetic catalogue supplement

The [coverage and case dataset](./catalogue-coverage-and-cases.draft.json) adds CAT-001–024 with fictional inputs and expected outcomes, 63 dimensional coverage rows and seven access/specialty scenarios. Total: 70 test specifications (46 TC + 24 CAT), not 70 executed tests. Document-only schema/reference checks are recorded in [traceability and verification](./TRACEABILITY_AND_VERIFICATION.md). Any assumed approval inside a fictional fixture is not an approval of actual draft content.
