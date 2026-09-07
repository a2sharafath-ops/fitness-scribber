# R2/R3 data, engine, API and UX extensions

E01–E05 / D01–D04 / U01–U03 supplement · 2026-09-05 · draft only. Read with the existing detailed R1 contracts; no endpoint, schema or screen is implemented.

## Data entities and invariant boundaries

Add logical immutable entities for adjustment proposal, progression proposal, weekly draft revision, comparison evidence set, effect ledger, parameter-policy revision and scoped reviewer acceptance. Each references client/coach ownership, original programme/assignment revision, applicable occurrence IDs, context generation, catalogue/policy manifest, effective session dates/timezone, knowledge cutoff, source lineage, proposed field differences and disposition. Targets, actuals, temporary adjustments and future baseline programme revisions remain different records.

Policy parameters include population/task scope, accepted numeric or semantic limits, source/evidence basis, reviewer identity/authority, version and invalidation triggers. Null/unapproved values cannot drive dependent numerical behavior. Fictional parameters belong only to synthetic tests and cannot be published as actual accepted limits.

Comparison records identify included/excluded performances with reasons: variant, side, range, method, equipment, effort confirmation, actual completion, unit conversion and source quality. Preserve original units, date precision and actuals. A later correction creates new evidence and proposal versions; original replay excludes later-known facts.

## Engine contracts

R2 input: original approved session, current context, confirmed session changes, optional comparable wellness, accepted C09 policy and explicit eligible scope. Output: hold/review/insufficient-evidence/no-change/proposal/gap; one reconciled effect per affected field; all source and parameter references; time/constraint effects; client-safe explanation and approval preconditions.

R3 input: original programme revision, compatible actual performance/history, accepted C10 comparison/progression policy, current restrictions and explicit future-week constraints. Output: comparison exclusions, progression/regression/reassessment proposals, weekly drafts with required gaps, evidence and bounds, proposed changed fields and approval preconditions. No schedule or increase is invented from missing inputs.

Both engines are deterministic for canonical semantic input. Numerical candidates are calculated once from their explicit baseline, then reconciled with inventory, time, accepted limits and other changes. Conflict priority is explicit in the accepted policy; otherwise return review rather than selecting an arbitrary rule. An overlapping signal with the same lineage contributes once. No numerical result may remove a clinical hold.

## Permission and operation matrix

| Operation | Actor | Allowed writes / guards |
|---|---|---|
| Report current circumstances or request change | Linked client or attributed owning-coach entry | Whitelisted report/intent fields only; no prescribed targets, approval or clinical resolution |
| Generate/read R2/R3 proposal | Owning coach | Versioned proposal from authorized source projection; no assignment side effect |
| Read client explanation | Linked client | Only own approved/resulting plan and safe status; omit private notes/documents and other clients |
| Amend/reject proposal | Owning coach | New version or recorded rejection reason; never overwrite original evidence/actuals |
| Approve session adjustment | Owning coach | Same atomic ownership/context/content/prescription checks as R1; exact diff and scope |
| Approve weekly draft | Owning coach | Explicit all-or-none selected batch or explicitly chosen independent-session mode; no invisible partial success |
| Publish policy parameters | Separately authorized content/release role | Evidence of appropriate review and release scope; no client/editor self-approval |
| Resolve clinical restriction | Accepted professional workflow | Scoped clinical evidence/authority, never a wellness or progression status |

Idempotency scope includes actor, operation, target revision and payload digest. Unknown response reconciles the original key; changed payload conflicts. All source writes participate in context invalidation. Health report/parameter revocation committed before approval causes stale rejection; a later change invalidates affected future start/resume. Every session in an approved week still gets session-specific checks.

## UI specifications

Daily review: baseline session summary; source freshness/confirmation; logistics changes; required holds; proposed field-by-field diff; full time totals; gaps; explanation; accept/amend/reject. Client sees request saved/pending and coach-review status, not an enabled self-assign button.

Progression review: history table with compatibility reasons; original versus adjusted targets and actuals; evidence sufficiency; proposed bounded changes; reassessment task/side; rejected alternatives; current policy version. Weekly review shows permitted days and budgets, setting/support per slot, required patterns and unmet constraints; moving a slot is an explicit revision.

Labels distinguish no change, insufficient evidence, unsupported policy, hold, stale, failed and unknown save. Use accessible names, non-color statuses, keyboard controls and non-drag alternatives. Focus returns predictably after review dialogs. A rejected suggestion must not sound like dismissal of a client's symptoms. Core offline restrictions and stop/report behavior remain unchanged.

## Migration, configuration and failure preparation

Add extension data without replacing existing workout/actual IDs. Synthetic migration fixtures include historic unadjusted sessions, temporary adjustments, partially completed sessions, conflicting dates, unavailable parameter versions and different unit/side variants. Preserve before/after counts, references, original target/actual values and source history; quarantine ambiguous comparisons. Rollback must preserve writes since rollout, not restore over them blindly.

Separate R1/R2/R3 and population/market enablement controls; enabling R3 cannot implicitly enable unreviewed C10 records. Retiring/revoking a parameter revision identifies dependent future proposals/assignments and triggers scoped re-review; historical evidence remains resolvable. Retained snapshots are minimized and subject to approved privacy retention, not infinite analytics.

Fault cases: new report during review, simultaneous daily/progression proposal, partial batch failure, response lost after commit, context fetch failure, unavailable increment, unsupported clinical scope, content revocation, expired authentication, offline client and storage quota. Performance tests later report representative history/weekly-plan sizes and measured latency; no extension benchmark is claimed now.

## Review dependencies

R1 evidence may change these proposals. Before implementation, agree parameter limits/units, comparison policy, weekly batch semantics, accepted client scope, required UX and expected-result cases. Before enablement, execute the permission/concurrency/preservation/accessibility suites and obtain the appropriate G5 and release decisions. Source references in C12 are reference material, not acceptance of these new policy values.
