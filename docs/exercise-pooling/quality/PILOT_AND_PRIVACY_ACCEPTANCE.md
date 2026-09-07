# O01/Q05 — pilot measures and privacy/security acceptance

Version 0.1, 2026-09-05. FP-113 draft. No pilot, participant recruitment, real-data processing or regional acceptance is authorized by this document. Relates to REQ-013–018 and the [policy pack](../policies/README.md).

## Proposed measurement plan

Start with synthetic coach walkthroughs, then request a separately scoped pilot after implementation, domain/security review and G3. Product owner selects actual participants/cohort and support arrangements; training experience and individual access/clinical needs must match reviewed content. No arbitrary minimum cohort is represented as sufficient clinical evidence.

| Measure | Proposed collection / interpretation | Proposed acceptance or decision |
|---|---|---|
| Time from session request to approved assignment | Compare equivalent current-workflow and pooling tasks with same complexity; separate source clarification time | Establish baseline first; owner approves improvement target before pilot, not after seeing results |
| Useful draft rate | Coach labels draft usable/minor edits/major edits/rejected with structured reasons | Review by goal/setting/level/module; do not hide unsupported cells in one overall percentage |
| Required constraint violations | Rule-linked inspection of every pilot output and bypass attempt | Zero tolerated known violations; stop affected feature/module and investigate |
| Approval/ownership failures | Client self-assignment, cross-client access, protected-field modification, missing audit | Zero tolerated known failures; block rollout until remediated and retested |
| Coverage gaps | Required versus optional needs; reason and setting, not raw diagnosis in telemetry | Product accepts declared supported coverage before pilot; no silent unsupported fallback |
| Comprehension/accessibility | Coach/client explains draft vs assigned, stale/held next action, side/dose and consent options | Every critical journey must be completable; confusing critical instructions are release blockers |
| Save/recovery/preservation | Failed save, timeout reconciliation, offline actuals and migration/restore fixtures | No false success, duplicated assignment, lost actuals or changed historical source values |
| Latency | Fixed hardware/fixture benchmark and authorized staging measurements | Accept/amend E05 budgets before test; report actual distributions, not just best run |

These measure workflow quality, not treatment efficacy, injury prevention or medical safety. Do not make clinical benefit claims from usage metrics. Numeric usefulness/time targets and cohort size remain explicit product choices; safety/security/preservation blockers cannot be waived through a favourable average.

## Privacy/security acceptance checklist

| Area | Required evidence before enablement |
|---|---|
| Legal/service context | Exact operator/home jurisdiction and enabled markets; actual professional/privacy reviewers; published policy versions and applicable obligations reviewed, not inferred from the broad region list |
| Purpose/data minimization | Each collected field has a documented purpose/consumer; optional body-comp/wearables/AI not forced for unrelated core functions; raw health text absent from routine analytics |
| Consent and representations | Actual subject/representative authority where applicable; separate purpose/version/action evidence; no coach checkbox fabricating client authorization; withdrawal effects tested |
| Identity and access | Own-client relationship checks for every operation; anonymous/unlinked/cross-client denial; protected fields and audience projections tested directly; admin/support scope reviewed |
| Assignment and clinical authority | Server-created coach approval, protected instructions/restrictions, no client API self-clearance; atomic revision/context validation and race cases pass |
| Storage and processors | Actual enabled providers, regions, contracts, payloads, local/offline storage and admin access match the notice; optional integrations verified separately |
| Rights/retention/deletion | Approved category schedule and operational owner; export/correction/withdrawal/erasure plus lawful exceptions, backups/derived snapshots/processor copies handled and tested |
| Incidents/support | Named contact, event triage and applicable notification/legal escalation process; no invented universal deadline or silently guaranteed emergency monitoring |
| Content/claims | Approved record rights/sources and permitted service claims; no “safe/cleared/fixed” from algorithm status alone |

## Proposed pilot stop/recovery policy

Stop affected assignment/generation on a constraint bypass, unauthorized disclosure, lost/rewritten history, material clinical-policy error or repeated false-save success. Preserve required records and allow appropriate stop/report actions. Product/operations owner coordinates recovery with the relevant reviewer; the assistant does not contact clients, regulators or reviewers without authorization. No automatic destructive restore.

Re-enable only after the exact cause/version is identified, scoped fix is authorized/verified, regression evidence exists and relevant owners approve the limited restart. Wider rollout requires G4 separately. Scope any telemetry and consent beforehand; collect structural error/coverage reasons rather than diagnosis text wherever possible. Detailed incident deadlines and client communications require regional legal/professional review.
