# R2/R3 synthetic cases and acceptance plan

Version 0.1 · Q01–Q06 extension preparation · 2026-09-05. All cases below are fictional specifications, not executed application tests or professional acceptance.

## Shared fixture contract

Use fictional owning coach, linked clients A/B, unlinked actor and anonymous actor. Unless overridden, assume a synthetically reviewed test manifest, usable required context and confirmed adult status. These assumptions apply only inside a later isolated test fixture; real C09/C10 records remain draft with no approved parameters. Unspecified individual skill, clinical permission or numerical policy remains unknown, not implicitly valid.

Record each exact baseline revision, context generation, source lineage/cutoff, assignment/occurrence, relevant policy parameters, actor and expected typed result. Numerical examples below are arithmetic only. A test harness must not publish its assumed approval or numbers as production policy.

## Daily adjustment cases

| Case | Requirements / rules | Fictional input | Expected result |
|---|---|---|---|
| R2-T01 | R2-001; DA-01 | New health concern; wellness otherwise favorable | Hold/review pathway; no lighter-workout clearance |
| R2-T02 | R2-002/003; DA-02/03 | Baseline HHQ stress Moderate; untouched daily stress slider | No numeric conversion or confirmed current stress |
| R2-T03 | R2-003; DA-02 | Required context fetch fails | Unavailable, not empty restrictions or ready |
| R2-T04 | R2-003/004; DA-03/14 | Simulated HRV plus different-device baseline | No real-device trend or threshold adjustment |
| R2-T05 | R2-004/006; DA-07 | Confirmed signal but trigger/bounds unapproved | Review required; no invented percentage |
| R2-T06 | R2-005; DA-08 | Two records share same source lineage and target | One reconciled effect, not duplicate reductions |
| R2-T07 | R2-005; DA-09 | Retry same baseline/evidence and operation | Same logical proposal/outcome, not additional reduction |
| R2-T08 | R2-005/006; DA-08 | Two accepted fictional policies conflict on same field | Apply explicit accepted conflict policy or return conflict; no arbitrary average |
| R2-T09 | R2-006; DA-10 | Fictional allowed load at most 48 kg; available 45/50 kg | Never select 50; choose 45 only if accepted lower bound/rounding allows, else gap |
| R2-T10 | R2-007; DA-04 | Budget 1,800 s; required work/rest/setup 1,900 s | Required 100 s gap remains after optional omission |
| R2-T11 | R2-007; DA-05 | Band available but verified anchor unavailable | Exclude affected row; no improvised anchor or cross-lift load |
| R2-T12 | R2-007; DA-06 | Required assistant unavailable | Specific access gap, not blanket disability exclusion |
| R2-T13 | R2-008; DA-07 | Proposal changes reps, side and total duration | Diff exposes all three fields and sources; no hidden material change |
| R2-T14 | R2-009; DA-12 | Client posts approval/assigned-target fields | Reject protected writes despite own-client relationship |
| R2-T15 | R2-010; DA-12 | New report commits after preview and before approval | Stale transaction rejected; no partial assignment |
| R2-T16 | R2-010; DA-11 | First set already completed before proposal | Historic target and actual unchanged; remaining scope explicit |
| R2-T17 | R2-011; DA-12 | Approval commits but response is lost | Query/retry same operation key; one assignment |
| R2-T18 | R2-011; DA-12 | Offline cached proposal and client requests resume | No authoritative resume; pending reports/actuals labelled accurately |
| R2-T19 | R2-011; DA-14 | Optional device sharing withdrawn, core purpose valid | Stop affected optional processing, not unrelated service; no private note projection |
| R2-T20 | R2-012; all | Actual draft C09 manifest or revoked parameter | No production admission; accepted synthetic cases cannot override review gate |

## Progression and planning cases

| Case | Requirements / rules | Fictional input | Expected result |
|---|---|---|---|
| R3-T01 | R3-001; PG-01 | Similar name, different exercise variant/range | Incompatible comparison; no transferred load history |
| R3-T02 | R3-001/007; PG-01 | Left per-side history compared with bilateral total | No automatic equivalence or doubling/halving |
| R3-T03 | R3-002; PG-02 | Planned 10 reps, actual missing | Actual remains unknown, not 10 successful reps |
| R3-T04 | R3-002/004; PG-02 | Default one-rep strength entry, no method evidence | Not a tested max or sufficient progression basis |
| R3-T05 | R3-003; PG-06 | Missed session explicitly due to travel | Logistics context; no inability inference or compulsory catch-up |
| R3-T06 | R3-003/005; PG-05 | Incomplete set with new pain report | Review/hold, not an automatic ordinary-training regression |
| R3-T07 | R3-004; PG-02/03 | Success window or bounds null/unapproved | No numerical progression |
| R3-T08 | R3-004/005; PG-03 | Fictional policy permits +2 kg from 40 kg; all required conditions met | Candidate 42 kg subject to inventory/bounds/coach approval; not automatically assigned |
| R3-T09 | R3-005; PG-08 | Fictional cap 42 kg; equipment offers 40/45 kg | Never round to 45; retain/review or gap as accepted policy specifies |
| R3-T10 | R3-006; PG-07 | Original 40 kg; temporary adjusted target 35 kg | Keep baseline and adjustment distinct; restoring 40 is not automatically progression |
| R3-T11 | R3-006; PG-13 | Daily and weekly proposals modify same future occurrence | One reconciled reviewed revision or conflict; no stacked independent changes |
| R3-T12 | R3-007; PG-01 | Same discovery family, different support/assistance | Recheck task compatibility; family membership grants neither load nor clinical permission |
| R3-T13 | R3-008; PG-09/10 | Right side reassessed; left omitted | Left finding unresolved; no global clearance |
| R3-T14 | R3-008; PG-09 | Workout completed despite old unresolved restriction | No inferred restriction resolution |
| R3-T15 | R3-009; PG-11/12 | Two available days, required work fits only three | Explicit infeasible week; no invented third day |
| R3-T16 | R3-009; PG-11/12 | Required pulling pattern, no accepted equipment/variant | Visible required gap, not a generic unreviewed fallback |
| R3-T17 | R3-010; PG-01/03 | Some history excluded as incomparable | Coach sees excluded evidence and rationale, not just a progress score |
| R3-T18 | R3-011; PG-14 | New restriction during weekly batch approval | Reject stale batch atomically under all-or-none mode; no hidden partial success |
| R3-T19 | R3-011; PG-14 | Completed prior week; proposed new weekly schedule | Preserve old schedule/targets/actuals; new future revision only |
| R3-T20 | R3-012; all | Client self-approval, revoked policy or actual draft C10 | No assignment/production admission; review/build/enablement gates remain |

## Test layers and evidence ownership

Pure tests: determinism, source-order invariance, explicit missingness, monotonic exclusions, effect deduplication, increment bounds, complete time accounting and incompatible-history rejection. Property-based fixtures should perturb array order, units, precision, source lineage, missing fields and side; outputs must retain declared invariants.

API/security tests: ordinary authenticated actors, cross-client reads/writes, nested protected fields, batch scoping, malicious posted owner IDs, token expiry and minimally projected health data. Privileged test setup must not mask ordinary-role failures.

Integration/failure tests: every current manual/copy/template/voice/client entry point, concurrent reports and policy revocations, repeated proposals, lost responses, unsupported source versions, partial logs, offline/quota and restore. Weekly atomicity must be tested against the chosen approval mode.

UX tests: keyboard/screen reader/mobile review of diffs and evidence; comprehensible no-change versus insufficient-evidence versus hold; no false save/monitoring claims; optional sharing withdrawal. Actual participant involvement requires separate permission.

Domain/privacy review: named qualified reviewers accept exact scoped cases/parameters and supply missing clinical or population-specific counterexamples. No test count establishes clinical sufficiency. R1/R2 pilot evidence must be assessed before accepting later policies. Zero known approval/permission/history/constraint bypasses are tolerated in the proposed release gate; usefulness and timing thresholds require pre-agreed pilot decisions.

Result evidence later records exact app/engine/schema/policy versions, synthetic input, expected and observed output, environment/actor, defect/owner, rerun and reviewer disposition. Current observed application results: none. Current professional case acceptances: none.
