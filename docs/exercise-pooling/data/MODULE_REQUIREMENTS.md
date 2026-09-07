# Required context, freshness and clinician handoff

D01–D04 supplement · v0.2 · proposed contracts. Existing field dictionary remains the source-path inventory.

## Action-specific requirements

| Action/module | Required to rely on output | Optional or unrelated data |
|---|---|---|
| Save incomplete coach draft | Authenticated owning coach; explicit source states and draft attribution | May save unknown dose/needs visibly unresolved; no assignment authority |
| General pool preview | Adult status, relevant screening/authority state, actual setting/equipment/access, confirmed task/goal and candidate prerequisites | Body composition, wearable metrics and all eight pools are not universal prerequisites |
| Movement-targeted suggestions | Comparable protocol, confirmed observation/task need and side; usable relevant restrictions | Legacy muscle links alone do not qualify |
| Strength dose | Exact variant and appropriate current performance/load/effort basis or explicit coach-selected alternative method | Age-derived formula, cross-lift percentage or default 1-rep field not accepted |
| Adaptive setup | Individual task/position/support/communication/assistance needs and available resources | Disability label alone does not require blanket medical exclusion |
| Clinical module | Accepted module and policy, verified scoped professional evidence, explicit permitted/prohibited tasks/dose/support and review triggers | Generic “rehab” goal, unverified upload or old clearance is insufficient |
| Assign | Complete draft, current authoritative context and accepted content/dependencies; required purpose authority; exact coach approval | Optional wellness cannot become mandatory by accident |
| Start/resume | Assigned approved revision, current server checks and session-linked health-change response; no unresolved relevant hold | Optional daily wellness remains separate |
| Privacy/stop/report request | Appropriate account/identity check proportionate to request | Must not require new marketing/optional-sharing consent or exercise eligibility |

Required versus optional is defined per action, candidate and accepted module. Missing a non-required assessment must not block an otherwise supported task; failure to fetch required evidence must not be treated as an empty list.

## Freshness and conflict contract

Every source carries effective time (or date with timezone/precision), recorded time, protocol/version, author/source type, state, quality and lineage. Use data effective by the session time and known by the decision cutoff. Same-period conflicting reports stay conflict until resolved; do not pick the latest form merely because it renders last. Late corrections create new revisions and a new present decision, never rewrite the original replay.

Accepted freshness policy is module-specific and includes source type, maximum age if any, event-based invalidators, who can reassess and the fallback action. There is no blanket 12-month clearance or universal lifestyle expiry in the new proposal. Persistent restrictions remain unresolved until an authorized scoped decision; a document expiry removes reliance, not the restriction. A new health change triggers review even if an older clearance has not expired.

Session equipment/access and health-change responses are bound to the actual session and context generation. A travel change or second session requires its own applicable context; do not roll over a morning answer silently. R1 wellness is displayed with provenance but does not apply an automatic dose formula. A simulated wearable source is never labelled a device measurement.

## Clinician handoff specification

Collect only necessary evidence: client link; professional identity, profession and verified service-jurisdiction authority; evidence origin/verification method; received/issued/effective dates; reason/purpose; task-specific permitted and prohibited activities; range/load/effort/time/support/supervision limits; review triggers; uncertainty; evidence version; coach interpretation and pending clarification. Keep original clinical document access restricted, with a minimal operational projection to the engine.

Separate three records: permission to share with a named recipient for a stated purpose; clinician's actual scoped instruction; coach's programming approval. None implies the others. A generic clinician note cannot authorize every exercise. If instructions conflict with a new report, an older note cannot silently override it. Resolve exactly the affected restriction; multiple unresolved restrictions stay separate.

Client-facing text says the plan needs professional/coach review without exposing unnecessary diagnosis or clinician documents. Emergency instructions require a clinically reviewed, locally appropriate policy; the app does not offer diagnosis, emergency response or continuous monitoring. No client evidence was accessed to write this specification.
