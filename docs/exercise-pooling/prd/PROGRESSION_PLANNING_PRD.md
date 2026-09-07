# P06 — Progression, reassessment and weekly-planning suggestions

Version 0.1 · R3 preparation · 2026-09-05. Draft authoring complete; domain acceptance, build and enablement pending. Extends P01–P05 with evidence-based proposals, not autonomous programming or clinical clearance.

## Problem and scope

The coach needs to distinguish a genuine opportunity to progress from missing data, logistical skips, changed variants, symptoms or an unsuitable comparison. The product may propose progression, regression, reassessment and a future weekly structure, but the coach chooses the exact prescription and retains responsibility within professional scope.

Included: same-variant performance comparison, adherence/reason classification, bounded progression/regression proposals, task-specific reassessment prompts, explicit schedule/pattern coverage and constrained weekly drafts. Excluded: universal clinical progressions, automatic load increases, diagnosis of recovery, inference that an untested finding resolved, retrospective history edits, automatic catch-up after missed sessions and new external data integrations.

## Requirements

| Requirement | Proposed behavior | Acceptance example |
|---|---|---|
| R3-001 | Compare only compatible performances | Different variant/range/equipment/side or estimated-versus-measured max cannot silently share a trend |
| R3-002 | Preserve actuals, targets, source and completeness separately | Planned repetitions are not assumed completed; missing effort is unknown |
| R3-003 | Interpret non-completion using recorded reasons | Travel skip does not imply physical inability; symptoms trigger review rather than automatic regression |
| R3-004 | Require accepted evidence windows and policy parameters | No fabricated number of successful sessions, weekly increment or tolerance threshold |
| R3-005 | Bound every proposal by current restrictions, skill, inventory and permitted dose | Rounding to available plates cannot exceed an accepted maximum |
| R3-006 | Prevent compounded progression and cross-release conflicts | A temporary R2 reduction is not silently made the permanent progression baseline |
| R3-007 | Preserve side and exercise-family boundaries | Same family assists discovery but cannot transfer load history or clinical permission |
| R3-008 | Suggest scoped reassessment without claiming resolution | A partial right-side test leaves an untested left-side finding unresolved |
| R3-009 | Build weekly drafts from explicit goals, days, time, support and accepted structure | No feasible required pattern returns a gap, not an invented exercise or extra training day |
| R3-010 | Make rationale and plan diffs reviewable | Coach sees the exact evidence, parameter versions, changed fields and exceptions |
| R3-011 | Require atomic approval/revalidation and preserve history | A newly committed restriction blocks stale progression approval |
| R3-012 | Gate actual validation, pilot and release separately | Preparation completion does not enable progression on client accounts |

## Comparable history contract

For each occurrence, retain catalogue variant/revision, task/range, position, side/dose basis, equipment/load units, target and actual sets/reps/time/distance, effort method/confirmation, assistance, performance conditions, session completion status/reason, assessment method and effective/recorded dates. Define compatibility using an accepted policy. A display-name match or similar exercise is insufficient.

Exclude future/later-known evidence from historical replay. Mark partial, missing, invalid, simulated or conflicting data explicitly. A maximum estimate retains formula/method and assumptions; no default one-rep entry becomes a tested maximum. Clinical instructions and reported symptoms outrank historical success. No generic training-age label proves task skill.

## Proposal families

Progression: only after accepted evidence sufficiency, compatible performance and current eligibility, propose an allowed field change within reviewed limits and available increments. Coach may retain the current plan even when a proposal exists. No forcing progression because a calendar period elapsed.

Regression: distinguish task difficulty, reported intolerance and logistical constraints. A symptom-related concern takes the clinical review route, not an automatic percentage reduction. Where an accepted ordinary-training policy permits regression, state the field, evidence and intended review point without diagnosing a cause.

Reassessment: identify exact finding/task/side/protocol and why current evidence is insufficient or review-triggered. Completion of a workout does not resolve a screening restriction. Only comparable explicit reassessment or an authorized scoped decision can resolve the relevant record.

Weekly planning: coach confirms priority goals, permitted session days, time budgets, setting/inventory/support for each slot, chosen split, required patterns/needs and accepted distribution/recovery constraints. Compose future session drafts using the existing eligibility and time rules. Show unmet coverage, incompatible constraints, unused slots and uncertain durations. Do not move an assigned session to another day silently or turn missed sessions into accumulated mandatory volume. Shared-need coverage and dose accounting must avoid double-counting multirole exercises.

## Interaction with daily adjustments

Store baseline programme revision, temporary session adjustment, completed actuals and proposed future programme revision separately. Explain whether progression considers the original target, adjusted target or measured actual under the accepted comparison policy. A reduced session is not automatically failed training; a restored original target is not automatically progression. Concurrent R2/R3 proposals for the same future occurrence must be reconciled and approved as one current revision, not independently stacked.

## UX, API and failure handling

Coach review: evidence table with compatible/incompatible sessions and reasons; proposal diff; bounded load/volume/time calculations; unresolved data; weekly required gaps; side-specific reassessment prompts; accept/amend/reject. Client sees only the resulting approved future plan and relevant explanation, and may request review. Never project private clinical documents or internal inferred pathology.

Approve an exact weekly draft revision atomically for the explicitly selected scope, or expose clearly independent per-session approvals if the coach chooses that mode. No invisible partial success. Every individual assignment still revalidates at start/resume. Changes to a week's constraints invalidate affected future authority, not completed actuals. Concurrent edits, token expiry, revoked content and unknown write outcome follow the R1 contract.

## Acceptance and research boundaries

C10 contains original procedural proposals and parameter requirements, not adopted numerical dosing or clinical rules. General healthy-adult evidence referenced in C12 does not validate a condition-specific progression or every catalogue variant. Qualified reviewers must approve actual evidence windows, increments, limits, supported populations, expected results and exceptions. Revisit this draft after R1/R2 evidence before G5 acceptance.

Measure usefulness, rejected/incompatible comparisons, unnecessary changes, unmet weekly requirements, coach editing burden, source completeness and approval/history failures. Define cohort and numeric pilot targets before collecting evidence; do not equate adherence with clinical recovery. See [C10](../catalogues/progression-planning.draft.json), [extension contracts](../engineering/EXTENSION_CONTRACTS.md) and [test specifications](../quality/EXTENSION_TEST_SPECIFICATIONS.md).
