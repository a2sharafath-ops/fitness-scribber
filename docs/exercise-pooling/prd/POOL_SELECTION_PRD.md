# P03 — eligibility, ranking and pool PRD

Version 0.1, 2026-09-05. FP-105 provisional draft against pending G1 and catalogue review. Requirements REQ-002–010, 013, 016. No actual exercise mappings or clinical thresholds approved here.

## Selection boundary

The engine returns a coach review resource, not a prescription or declaration of safety. An item is selected only from a published, appropriately reviewed catalogue revision that supports the client/session/module. Candidate authoring drafts and unknown imported rights are excluded from live automation. Current handwritten library tags and correctivePlan rankings are evidence to audit, not accepted rules.

## Ordered decision stages

1. Resolve access, source availability and [client context](../data/CONTEXT_RESOLUTION.md).
2. Evaluate [session gate](../data/STATES_AND_AUTHORITY.md). Held/unavailable/unsupported sessions are inspectable, not silently replaced by generic exercise suggestions.
3. Build confirmed needs from reviewed mapping records. Keep hypothesis, source evidence and clinical restriction distinct; a visible compensation alone does not prove a muscle is weak/tight.
4. Filter candidates by review/rights/scope, required equipment/accessories/assistance, demonstrated prerequisites, restrictions, side, permitted dose and explicit refusals. Multiple reasons can apply.
5. Classify exercise outcomes and only rank eligible or conditionally eligible records. Conditional candidates may be previewed but cannot be assigned until all required conditions are satisfied.
6. Select a coverage-aware subset for the requested roles/structure, return alternatives and disclose gaps. Pool roles are defined in [D03](../data/VOCABULARY.md).

## Proposed ranking contract

No weighted clinical risk score. Use an explainable ordered tuple, subject to coaching review: incremental coverage of required confirmed needs; match to coach-approved goal priority; suitable prerequisite/skill match; practical setting/setup fit; stated preferences; variety within the selected structure; stable catalogue ID as final tie-break. Pinning can promote an **eligible** option but cannot bypass constraints. A required need's clinical priority comes from an approved rule, not an AI-invented severity weight.

Each candidate records matched need IDs/sides, conditions, ranking components, exclusions and source/rule references. Multiple findings supporting the same normalized need contribute evidence, not unlimited extra score or repeated drills. The composer must recalculate incremental coverage after each selection. Duplicate exercise IDs in different roles need explicit placement/dose review, not automatic repetition.

Dislike is a preference unless client/coach confirms refusal. A hard refusal is excluded without calling it a medical contraindication. A clinical restriction cannot be downgraded to preference. Conflicting needs or incompatible instructions require review, not summing positive and negative scores.

## Failure and coverage behaviour

| Condition | Required result |
|---|---|
| No eligible item for required role/need | Explicit gap; assignment blocked until supported resolution; never relax restriction silently |
| No candidates for optional role | Omit with explanation; do not require eight blocks |
| Unsupported adaptive/rehab combination | Label exact unsupported scope; no general-fitness fallback presented as rehabilitation |
| Missing optional lifestyle/wearable | Continue unaffected R1 selection without fabricated readiness penalty |
| Missing prerequisite/required metadata | Review-required/unsupported candidate, not presumed beginner-safe |
| Contradictory side/need mapping | Preserve evidence and request clarification; no bilateral guess |
| New catalogue/policy/source revision | Re-evaluate affected candidates and approval validity; preserve history |

## Coach controls and acceptance

Pool browsing offers role, pattern, available equipment and eligibility filters, with distinct eligible/conditional/review/excluded views. “Why this?” explains goal/need fit; “Why unavailable?” states actionable conditions. The client receives coaching instructions and relevant next actions, not diagnostic hypotheses or all private source notes.

Identical inputs/versions/request yield identical ordering. Restricting equipment or adding a prohibition must never introduce a newly forbidden selection. Coach pin/exclude, manual additions, copy and swap all use the same checks. Proposed tests [TC-010–TC-018](../quality/REFERENCE_CASES_AND_TEST_STRATEGY.md) use artificial candidates; final real exercise expectations require content review.

Open: approved required/optional role coverage, per-goal ranking order, fatigue/redundancy definitions, module boundaries, candidate catalogue and clinician-guided rules. No universal corrective count, load ratio or stretch duration adopted from existing code.

## FS-POOL-S1S2-0.2 preparation reconciliation

The owner approved the [complete working brief and defaults](../preparation/S2_WORKING_BRIEF.md). This PRD's authoring is complete for S1–S2; formal acceptance remains pending. Goal families, actual gym/home/travel inventory, existing 30/45/60/90-minute budget choices, separate authenticated restricted client accounts and online authoritative assignment/start/resume are approved drafting assumptions, not invented client facts. Detailed source/module, catalogue, UX and API supplements are linked in the [S2 handoff](../preparation/S2_HANDOFF.md). This addendum supersedes earlier requests to choose those routine working defaults; record-level clinical/content/privacy reviews and G2/A12 remain unapproved.
