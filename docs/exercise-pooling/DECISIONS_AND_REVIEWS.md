# Exercise pooling — decisions and reviews

Status: the owner approved the complete S1–S2 working brief/defaults. Preparation is complete; record-specific product/professional acceptance and all build/release authority remain pending. The [remaining bundle](./preparation/OPEN_DECISIONS.md) consolidates the actual unresolved facts and sign-offs.

The [sprint backlog](./SPRINT_BACKLOG.md) now assigns drafting/execution tasks to the assistant after the relevant approval. The [user approval checklist](./USER_APPROVALS.md) translates the decisions below into initial inputs and later scoped permissions. No actual professional sign-off or application-build permission has been recorded.

## Roles to identify

| Role | Responsibility | Current assignment |
|---|---|---|
| Product owner | Intended users, scope, acceptable workflow, rollout and final product decisions. | Project owner has supplied initial scope and preparation authorization; acceptance of drafted requirements/gates remains pending. |
| Coaching/content lead | Practical programme design, exercise coverage, dosage and coaching usability. | Named reviewer to be confirmed; do not infer qualifications from project ownership. |
| Qualified exercise reviewer | Assessment administration, movement hypotheses, exercise technique, progression and supported populations. | Unassigned. |
| Appropriate clinical reviewer | Screening/referral/clearance policy and restrictions or populations needing clinical input. | Unassigned; authority/scope depends on the intended service. |
| Engineering/data lead | Architecture, deterministic engine, persistence, migration and implementation. | Assistant owns the proposed drafting/implementation tasks after scope approval; independent review roles remain to be confirmed. Implementation is not authorized by the sprint-mapping request. |
| QA/accessibility lead | Expected results, tests, end-to-end journeys and accessible status handling. | Unassigned. |
| Security/privacy/rights reviewers | Access control, health-data handling, launch obligations and content permissions; these may be different people. | Unassigned. |
| Pilot/support owner | Cohort, communication, feedback, stop decisions and incident handling. | Unassigned. |

## Open decision register

| ID | Decision needed | Proposed starting point | Decision owner / consultation | Needed before |
|---|---|---|---|---|
| D-01 | Which client population and use cases does R1 support? | User specifies adults at beginner/intermediate/advanced levels, general fitness, special needs and rehabilitation. Draft coverage for this scope; separately review clinical/adaptive pathways and unsupported cases. Experience is not clinical eligibility. | Product + domain/clinical | G1 |
| D-02 | Who has authority to approve generated workouts and resolve different holds? | Coach approves drafts and ordinary programming edits; required clearance follows the adopted professional pathway. Separate these authorities in data and UI. | Product + domain/clinical | G1 |
| D-03 | What is the first release boundary? | User confirms staged delivery and coach approval before assignment. Proposed R1 detail remains reviewed pools, single-session drafts/swaps, source reliability, restriction/health-change checks and audit trail; R2/R3 add later capabilities. | Product + engineering | G1 |
| D-04 | Which screening instrument/version and policy are adopted? | Review current implementation against the chosen instrument, population and usage rights. Do not automatically approve today's synthesized logic or blend instruments without review. | Product + clinical + rights | G2; reviewer identified at G1 |
| D-05 | Which goals/settings and catalogue coverage are mandatory? | Agree a coverage matrix for supported home/gym scenarios; publish only a reviewed subset. Exercise count is an output of coverage, not the success criterion. | Coaching/content + product | G2 |
| D-06 | How are unknown, stale and conflicting inputs handled? | Resolve per field; unknown stays unknown; ask for review when a required fact is missing; restrictions remain unresolved until explicitly addressed. Do not choose a universal expiry window without a basis. | Product + domain + engineering | G2 |
| D-07 | How do existing ambiguous assessments migrate? | Preserve original records; label interpretation as unknown where necessary; offer explicit confirmation/reassessment. Never backfill absent findings from unchecked controls. | Data owner + domain + engineering | G2 |
| D-08 | How are exercise IDs and custom edits preserved? | Stable catalogue identity plus versioned records/coach overrides; explicit old-ID mapping; avoid replacing rows by display name. | Engineering + content/data owner | G2 |
| D-09 | How is catalogue content authored and approved? | Controlled versioned authoring/review workflow first; approved records only enter automation. A dedicated admin CMS is optional, not an R1 prerequisite. | Content lead + engineering | G2 |
| D-10 | What is the local/offline operating policy? | Share calculation code, but label local recommendations as locally evaluated. Define what cannot be assigned/started without fresh backend checks; avoid claiming client-only enforcement is tamper-proof. | Product + engineering/security | G2 |
| D-11 | Who will provide domain, clinical, privacy and rights review? | Name the people, scope and available evidence; allow document drafting while appointments are pending, but no live use of unapproved rules. | Product | G1 responsibility; G2 sign-off |
| D-12 | What jurisdictions, consent and data retention apply? | Intended markets: India, GCC, USA, UK and Europe. Legal establishment and exact launch countries/states remain unconfirmed. Draft shared policies plus regional reviews; minimize health-data access and telemetry; no new external AI sharing by default. | Product + privacy/legal | G2 |
| D-13 | How are records shared across coaching roles? | User confirms one coach and a client app. Approved preparation default: separate restricted client accounts, client isolation and explicit coach/admin/support powers, plus export/deletion rules; no shared coach password. | Product + security/privacy | G2 |
| D-14 | What are acceptable draft and catalogue quality metrics? | Measure usefulness, explanation clarity, coverage gaps and time-to-approval alongside mandatory safety/security/data-integrity checks. Set numeric pilot thresholds before collecting results. | Product + coaching/QA | G2 definitions; G3 thresholds |
| D-15 | What is the rollout/rollback authority? | Opt-in limited pilot with a feature flag, named support owner and a way to disable generation without erasing existing workouts or relaxing holds. | Product + operations | G3 |
| D-16 | What product claims and service boundaries are permitted? | Coaching decision support; no diagnosis, injury-prevention guarantee or automated rehabilitation claim. Review population-specific functionality and obligations before expansion. | Product + domain/clinical + applicable adviser | G2 |
| D-17 | How much daily adaptation is allowed in R2? | Start with explainable suggestions inside approved ranges; no automatic overwrite or readiness-based medical clearance. Review sources and thresholds separately. | Product + domain | R2 G5 |
| D-18 | What evidence permits progression or finding resolution in R3? | Comparable performance and explicit reassessment evidence; distinguish inability, symptoms and logistical skips; do not resolve an untested finding. | Coaching/domain + product | R3 G5 |

The initial scope answers are already recorded; do not ask the user to repeat them. Qualified reviewer assignments and business facts remain open, but personal credentials are not required merely to continue document preparation. The [reviewer recommendation](./preparation/REVIEWERS_AND_LAUNCH_SCOPE.md) explains the different approval responsibilities.

## Review matrix

These are independent review responsibilities, even when several reports are stored together. This matrix maps required reviews; none has been performed by creating these documents.

| Review | What is examined | Required evidence | Reviewer / gate |
|---|---|---|---|
| Product and scope | P01–P04, role boundaries, population, release scope and success criteria. | Approved requirement version and resolved blocking decisions. | Product owner / G1 and G2 |
| Data semantics | D01–D04; dates, defaults, unknowns, sources, scales, side and migration interpretation. | Worked cases with agreed output; no clinical meaning inferred from empty fields. | Data engineering + domain / G2 |
| Assessment and exercise content | C01–C03, C05–C08, supported coverage and limitations. | Per-record/protocol review, reviewer competence/scope, accepted/rejected entries and expected cases. | Qualified exercise reviewer / G2 |
| Screening and clinical-policy boundary | C04, health-change flow, restrictions, clearance, referral text and special populations. | Adopted protocol/version, scoped professional approval, escalation authority and review cases. | Appropriate clinical reviewer / G2 |
| Evidence and content rights | C12, imported manual-derived content, questionnaires, images and videos. | Traceable sources, permitted use, required attribution/permission and unresolved rights quarantine. A source citation alone is not a licence. | Content/rights reviewer; adviser where needed / G2 |
| Architecture and integration | E01–E05, all entry points, deterministic behaviour, versions and transactional approval. | Contract review; known failure and bypass paths addressed; stale docs reconciled. | Engineering / G2 |
| UX, comprehension and accessibility | U01–U02, health-change burden, pool explanations and unknown/hold distinction. | Task walkthroughs, accessible states, clear copy; pilot usability results before expansion. | Design/QA + representative users / G2 design, G3/G4 evidence |
| Security and privacy | E02, C11, O01 and Q05; direct API access, tenant isolation, raw notes, telemetry, retention and consent. | Permission tests, data-flow review, minimized logs, resolved findings and applicable obligation review. | Security/privacy / G2 design, G3 evidence |
| Migration and preservation | E03 and Q06, exercise IDs, coach overrides, legacy assessments and historical workouts. | Staging diff/count/reference checks, backup restore and rollback rehearsal. | Data engineering + QA/data owner / G3 |
| Algorithm correctness and domain acceptance | E01, Q01–Q03; eligible/excluded/review outcomes and generated drafts. | Requirement-linked automated results plus human assessment of expected recommendations; fixed seeds/stable versions where relevant. | QA + domain / G3 |
| Pilot and operational readiness | O01–O04, Q04/Q06, rollout thresholds and support/stop process. | Named owners, consent/cohort, logs/metrics, feature flags, rollback and issue escalation. | Product + pilot/operations / G3/G4 |
| Change/release reapproval | New exercise/rule versions, new population, R2 or R3 scope. | Impact analysis, refreshed expected cases and appropriate repeat reviews. | Relevant original reviewers / G5 or next content release |

## Review record template

For each actual review, record:

- Review ID and artifact/catalogue/rule versions in scope.
- Named reviewer, role/qualification and limits of authority.
- Inputs/evidence and scenarios examined; date of review.
- Findings by severity and their owners; explicitly rejected/unsupported cases.
- Decision: approved, approved for a stated limited scope, revision required or rejected.
- Conditions, remaining non-blocking issues, review-due or change triggers.
- Linked acceptance tests, applicable release and approval record.

Do not pre-fill approval names or dates, treat silence as approval, or mark a gate passed merely because a draft exists. Conditional approval cannot waive an unresolved safety, security, rights or data-integrity issue that blocks the intended use.

## Work we can prepare versus external decisions

| Can be prepared from this project and authorized research | Needs owner input or qualified/independent review |
|---|---|
| PRD drafts, current-state inventory, proposed field schemas and decision contracts. | Intended population, product scope, service/claim boundaries and approval authority. |
| Candidate catalogue structure, normalized IDs, provenance inventory and clearly labelled draft mappings. | Exercise/mapping/dosage correctness and suitability for the supported population. |
| Proposed architecture, migration scripts/design, UX drafts, test harness and synthetic cases. | Adoption of screening/referral/clearance rules, clinical restrictions and instrument/content permissions. |
| Traceability, proposed success metrics, pilot/runbook drafts and review checklists. | Launch jurisdictions/privacy obligations, named reviewers, pilot participants, deployment authority and final gate approvals. |

The next action is preparation of the R1 requirements and data/catalogue contracts, not immediate implementation of all releases. This mapping request did not authorize live database changes, deployment, contacting reviewers or sharing client data.
