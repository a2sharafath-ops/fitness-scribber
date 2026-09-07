# P04 — session draft, substitution and assignment PRD

Version 0.1, 2026-09-05. FP-106 provisional specification, awaiting G1/content/UX review. REQ-001, 005–013, 016–017. No implementation.

## Required inputs and result

Coach selects client, session date/timezone, active goal priority, weekly structure/day purpose, duration budget, actual setting/equipment, assistance and any pinned eligible choices. R1 composes one session within that structure, not an autonomous multi-week programme. Result includes ordered blocks/items/sets, catalogue/dose/source versions, side and conditions, expected duration range, coverage gaps, unresolved fields and an explanation summary.

Dose records must reference reviewed templates plus individual limits. Distinguish explicit load, percentage with an eligible reference, timed work, repetitions and effort-based prescriptions. Do not invent age, 1RM, default maximum, reference-lift ratio or missing repetitions. If valid load evidence is absent, propose only a separately reviewed non-max-dependent method or leave dose incomplete for coach review; do not create a numeric weight merely to fill the UI.

## Duration contract

Count working time, between-set rest, between-exercise rest, side switching, equipment setup, instruction/assistance/transfers and block transitions. Superset rest is attached to the correct sequence, not counted independently for overlapping work. Repetition-based time needs a reviewed tempo/estimate and uncertainty; do not imply exact duration from reps alone. Preserve deliberate per-side versus total dosing.

When the budget does not fit: keep restrictions and reviewed minimums; first identify optional work that can be omitted under the selected template; offer eligible shorter alternatives; then return a gap or ask for a different budget. Never silently shorten required rest, compress clinical instructions or omit required preparation. Preview any trade-off before assignment.

Arithmetic-only acceptance example, not an exercise dose: a fictional one-set-per-side item takes 20 seconds left + 10 seconds switch + 20 seconds right, 15 seconds initial setup and 30 seconds transition after the item = 95 seconds total. A specification/test must state whether after-item rest is included and count it exactly once.

## Edits, substitutions and copies

| Action | Proposed behaviour |
|---|---|
| Swap | Match requested role/need/side and reviewed family properties; recheck equipment, prerequisites, restrictions and dose; show before/after time and lost coverage |
| Manual exercise | Map to a known variant or mark unreviewed/unmapped; draft can be saved but assignment needs the same eligibility/metadata review |
| Voice/import | Treat parsed structure as untrusted draft input; verify identity/dose; no new external AI sharing authorized |
| Copy last / template / another date | Copy structure into a fresh draft; resolve recipient/date-specific context and load; never transfer old approval |
| Copy to another client | Strip source client's health notes and evidence; fresh recipient context/IDs and separate coach review required |
| Bulk dates/clients | Show per-target differences and validation result; copying creates drafts. R1 does not approve uninspected targets through one blanket action |
| Edit assigned session | New revision with a visible diff; original assignment preserved until replacement succeeds; any invalidated original is clearly non-startable |
| Edit during execution | Preserve performed sets; proposed remaining work is a separately reviewed revision; client may report actual deviations without rewriting prescription |
| Delete/cancel | Explicit scoped cancellation, preserving audit/history under approved policy; no cascading cleanup inferred |

## Meaningful approval

Review displays exact client/date, goals, required constraints, changes since previous version, all item/dose/side details, duration assumptions and remaining gaps. Controls: “Save draft,” “Review changes,” then **“Approve & assign.”** The latter is available only to the owning coach and only when required conditions are satisfied. An acknowledgement checkbox alone is insufficient if the actual version changed underneath it.

The backend revalidates current source/catalogue/permission revisions in the same atomic operation that records coach identity, exact prescription version, context/rule/catalogue versions and assignment. Stale review returns conflict and a diff; it does not silently assign a regenerated workout the coach has never reviewed. Client sees the new assignment only after success. Timeout leaves “Checking whether assignment saved,” followed by status lookup using the same request ID; do not blindly duplicate it.

Start and resume perform fresh applicable checks. Optional wellness can be skipped without inventing data; required health-change confirmation remains separate. New restrictions, material dose/side changes and lost equipment/assistance require appropriate review. No daily automation or history rewrite occurs in R1.

Open: reviewed dose templates, goal/weekly structures, duration estimates and limits, approved offline policy and confirmation copy. [Lifecycle](../data/STATES_AND_AUTHORITY.md), [UX](../ux/WORKFLOWS_AND_COPY.md), [API](../engineering/ENGINE_AND_API_CONTRACT.md), [tests](../quality/REFERENCE_CASES_AND_TEST_STRATEGY.md).

## FS-POOL-S1S2-0.2 preparation reconciliation

The owner approved the [complete working brief and defaults](../preparation/S2_WORKING_BRIEF.md). This PRD's authoring is complete for S1–S2; formal acceptance remains pending. Goal families, actual gym/home/travel inventory, existing 30/45/60/90-minute budget choices, separate authenticated restricted client accounts and online authoritative assignment/start/resume are approved drafting assumptions, not invented client facts. Detailed source/module, catalogue, UX and API supplements are linked in the [S2 handoff](../preparation/S2_HANDOFF.md). This addendum supersedes earlier requests to choose those routine working defaults; record-level clinical/content/privacy reviews and G2/A12 remain unapproved.
