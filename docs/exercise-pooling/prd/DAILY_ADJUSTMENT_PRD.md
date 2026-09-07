# P05 — Daily adjustment suggestions

Version 0.1 · R2 preparation · 2026-09-05. Authoring authorized; professional acceptance, implementation and enablement pending. Extends P01–P04, not their clinical/approval authority. Normative statements below describe proposed behavior, not existing app capabilities.

## Problem and outcome

A previously assigned session may no longer fit today's time, equipment, support or reported wellness. The coach needs an explainable comparison and a bounded proposal, without the system interpreting wellness as medical clearance or silently rewriting the assigned plan.

Actors: client reports current circumstances and requests a change; owning coach evaluates and approves the exact new revision; qualified professionals define applicable clinical limits; server enforces authority and current versions. R2 does not add autonomous assignment, symptom diagnosis, new wearable/AI connections, or permission to practise rehabilitation.

## Required behavior

| Requirement | Behavior | Acceptance example |
|---|---|---|
| R2-001 | Required health-change and restriction checks precede adjustment | New concern enters reviewed hold/referral pathway, not a “lighter workout” workaround |
| R2-002 | Separate baseline lifestyle, current confirmed wellness and session logistics | HHQ categorical stress is not converted to a numeric daily score |
| R2-003 | Preserve provenance, scale direction, missingness and timing | Untouched sleep defaults, simulated HRV and failed fetches cannot establish readiness |
| R2-004 | Interpret trends only under an accepted comparable-source policy | Insufficient baseline produces no trend-based numerical recommendation |
| R2-005 | Generate at most one reconciled adjustment per affected target from the approved baseline | Multiple fatigue/stress/soreness signals do not multiply reductions or reapply yesterday's adjustment |
| R2-006 | Only accepted rule parameters within coach/clinical bounds may propose dose changes | Unapproved or absent numeric limits yield coach review, not an invented percentage |
| R2-007 | Logistics changes use the existing eligibility/time engine | Missing band anchor excludes the option; reduced time cannot silently remove required content |
| R2-008 | Show original, proposal, reasons, source dates, gaps and uncertainty | Coach sees changed sets/load/time/side and the exact supporting rules |
| R2-009 | Coach approval of current proposal precedes material reassignment | Client acceptance of a suggestion is not coach approval |
| R2-010 | Revalidate versions atomically; preserve targets and completed actuals | A new symptom report invalidates an old adjustment; logged sets stay unchanged |
| R2-011 | Apply consistent actor/privacy/offline controls | No offline assignment/start/resume; no raw health notes in client projection |
| R2-012 | Evaluate with accepted cases and separate pilot permission | Passing fictional cases is not clinical validation or permission to enable |

## Inputs and resolution

Required for a proposal: authorized actor/client link, assignment and prescription revision, target session/date/timezone, context and catalogue/policy versions, actual proposed change, applicable screening/health-change status and accepted processing authority. Required for numerical changes: accepted adjustment policy parameters and original dose/load basis. Source absence or failure is explicit; source requirements are specific to the proposed operation.

Optional wellness: confirmed sleep, stress, fatigue and soreness with individual item provenance. Baseline lifestyle informs discussion/scheduling; it is not today's score. Wearable data is out of scope for new integration. If separately authorized existing data is later used, source/device, measurement window, units, quality, missingness and baseline comparability must be reviewed. No HRV/resting-heart-rate cutoff or composite threshold is adopted by this draft.

Current session inventory includes exact equipment, load increments, usable space, support/assistance and access. Budget changes include complete work/rest/setup/transfers. A change in country or service scope routes to the market/service review boundary rather than an automatic workout substitution.

## Decision order and conflict handling

First check clinical/session authority; a hold cannot be solved with wellness adjustments. Then validate source applicability and accepted rule scope. Reconcile logistics and eligible alternatives. Evaluate any permitted wellness proposal against the original approved prescription, not recursively against earlier suggestions. Resolve conflicts conservatively within the accepted policy or return a conflict requiring coach choice; never silently average incompatible clinical instructions.

Each proposal carries an effect ledger: affected occurrence/field, original value/revision, candidate value, triggering evidence lineage, rule/parameter revision, bounds, conflict disposition and time impact. Shared-source signals are deduplicated. Different proposals touching the same field produce one visible resolved change or a conflict, not multiple hidden multipliers. “No proposal” can mean no applicable change, insufficient evidence, unsupported policy or hold; those states have different explanations.

The draft catalogue C09 specifies procedural rules and unresolved review parameters. Numeric examples in tests are fictional engineering inputs, not recommendations. Changes to sets, reps, load, duration, range, effort, side or support are material and require renewed approval. A reporting typo correction still preserves provenance and causes revalidation if decision-relevant.

## UX and operations

Client: report changed time/equipment/support or optional wellness; see saved/pending status and whether coach review is required; request a change without editing approved targets. Coach: inspect side-by-side before/proposed session, evidence quality, affected constraints, total time, unresolved fields and client-visible explanation; accept, amend or reject with reason. Approved change returns an authoritative receipt and new assignment revision. Rejection does not diagnose or dismiss symptoms.

If an adjustment arrives mid-session, preserve completed actuals and evaluate only the explicitly remaining scope. Do not retroactively mark completed sets as following revised targets. Stop/report remains available. Offline drafts have no authority to resume activity. Unknown write outcome reconciles the same operation key before another submission.

## Success, dependencies and acceptance

Measure usefulness of suggestions, coach edit/reject reasons, unnecessary interruptions, time to review, required gaps, repeated-adjustment defects and failed-save/permission failures. Set pilot baseline/cohort/numeric targets before observing results. No claimed injury reduction or medical efficacy from usage metrics.

Dependencies: accepted R1 context, identity, permissions and approval engine; reviewed C09 parameters; purpose/privacy review; R1 pilot feedback; approved expected domain cases. Early authoring is complete, but final acceptance must revisit these dependencies. See [extension contracts](../engineering/EXTENSION_CONTRACTS.md), [C09](../catalogues/daily-adjustment.draft.json) and [extension test specifications](../quality/EXTENSION_TEST_SPECIFICATIONS.md).
