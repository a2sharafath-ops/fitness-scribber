# P02 — assessment and client-context PRD

Version 0.1, 2026-09-05. FP-103 draft; no app implementation. Parent [P01](./MASTER_PRD.md). Contracts: [D01](../data/FIELD_DICTIONARY.md), [D02](../data/CONTEXT_RESOLUTION.md), [D04](../data/STATES_AND_AUTHORITY.md).

## Outcome and boundaries

The coach can see what the app actually knows, where it came from and what still needs confirmation before selecting work. The client can supply and correct their own information without being asked to interpret clinical rules. Existing screening, six assessment types and self-report entry points remain; this is not permission to collect every possible medical detail.

## Required journeys

| Journey | Proposed behaviour | Acceptance |
|---|---|---|
| Onboarding | Show required-by-policy versus optional assessments; each item/side has assessment and confirmation state | Saving an empty form cannot imply normal movement, no pain or confirmed slider values (REQ-003) |
| Baseline reuse | Show source label, effective date and confirmation before adopting a value | SF categorical stress is not transformed into an invented numeric assessment (REQ-003–004) |
| Reassessment | Select compatible protocol and explicitly record tested items/sides; explain non-comparable history | Missing left-side item cannot resolve previous left-side finding (REQ-007, 012) |
| Correct prior mistake | Correction references original and explains changed value/date/side; material affected drafts/approvals marked stale | Original remains retrievable; actor and correction time preserved (REQ-012, 017) |
| Client self-report | Report received immediately, with source/time; client can request correction and see submission status | Relevant new report flags review before coach interpretation; client cannot write clearance fields (REQ-010–011) |
| Clinical instructions | Controlled handoff with evidence scope, dates, conditions and coach interpretation | `received` or uploaded document alone cannot clear every restriction (REQ-010) |
| Session setup | Confirm date/timezone, current location, equipment, time, selected goals/structure and assistance | A travel session cannot inherit full-gym inventory without confirmation (REQ-008) |
| Health-change check | Separate short prompt at each start/resume as required by reviewed policy, linked to the specific session | Skipping optional wellness does not skip the required change check (REQ-011) |

## Screen/content requirements

Context summary groups: service/screening status; current restrictions and assistance; reviewed goals/experience; setting/equipment/time; assessed movement/fitness; baseline lifestyle; today's optional wellness; and source issues. Do not collapse these into one readiness number. Each required issue identifies affected action, source/date, who can resolve it and the next step. Coach-only evidence is fetched only for the authorized view.

Lifestyle remains a baseline report. Current wellness is a separate dated report. R1 may surface both to the coach but must not invent automatic volume/intensity reductions. Free-text nutrition, medicines, concerns and posture are displayed for appropriate review; R1 does not automatically convert them into diagnoses or prescriptions.

Draft health-change copy for clinical/accessibility review: “Since your last check, has anything changed that could affect this session—for example a new symptom, injury, medication or instructions from a clinician?” Answers: “No change,” “Something changed,” “I'm not sure.” No preselection. This is an additional workflow prompt, not a replacement or alteration of a licensed screening instrument. Follow-up, referral and urgent-response content require the adopted reviewed policy; do not invent a universal emergency number.

Declining an optional question preserves `declined` and explains the feature impact. Required information remains required only for its justified purpose/action. Missing a body-composition measure must not force an irrelevant assessment to use otherwise-supported general training. Accessible assistance is offered without assuming a disabled adult cannot consent.

## Acceptance and open decisions

Every resolution must trace to raw record/revision/field and show effective versus recorded date when relevant. Confirmed negative findings require explicit scope; display defaults cannot become clinical facts. Load failure, invalid unit and unknown protocol must be distinguishable from no reported issue. Historical replay uses the original knowledge cutoff.

Open before acceptance: exact adopted screening policy/version/rights; required assessments by module; freshness policies; clinical-authority evidence; adult verification method; session timezone default; equipment and goal coverage; accessibility/country-specific wording. No G1 decision is recorded merely by drafting these journeys.

## FS-POOL-S1S2-0.2 preparation reconciliation

The owner approved the [complete working brief and defaults](../preparation/S2_WORKING_BRIEF.md). This PRD's authoring is complete for S1–S2; formal acceptance remains pending. Goal families, actual gym/home/travel inventory, existing 30/45/60/90-minute budget choices, separate authenticated restricted client accounts and online authoritative assignment/start/resume are approved drafting assumptions, not invented client facts. Detailed source/module, catalogue, UX and API supplements are linked in the [S2 handoff](../preparation/S2_HANDOFF.md). This addendum supersedes earlier requests to choose those routine working defaults; record-level clinical/content/privacy reviews and G2/A12 remain unapproved.
