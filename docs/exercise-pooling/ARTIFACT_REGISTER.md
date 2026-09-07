# Exercise pooling — artifact register

Status: all independently authorable whole-system preparation is complete, including P05/P06/C09/C10 and operational drafts. See the [current full manifest](./preparation/FULL_PREPARATION_MANIFEST.json). All 40 artifacts have draft/specification coverage; actual reviews, application tests and operational execution are not complete.

## How to use this register

- IDs P01, D01, C01, etc. identify deliverables. IDs D-01, D-02, etc. in the decision register identify decisions, not data deliverables.
- R1 items need design/specification approval by G2; implementation/pilot evidence is produced before G3. R2/R3 items are outlined now and completed before their own G5 extension gate.
- Dependencies are drafting/input dependencies. Acceptance review may require additional artifacts named in the review gate; it must not create a circular drafting sequence.
- Owner/reviewer labels identify needed roles. Named people, dates and approval authority are not yet assigned. Engineering can draft material but cannot self-certify clinical validity or legal rights.
- Each deliverable must later carry version, status, accountable owner, reviewers, unresolved decisions and acceptance evidence. Proposed paths are organizational suggestions, not links to files that already exist.

## A. Product requirements — 6 deliverables

A PRD is a product requirements document: the problem, users, scope, behaviour, exceptions and acceptance criteria. Keep one master PRD with linked feature specifications, rather than several competing definitions of the same behaviour.

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| P01 | Master PRD | Problem, intended population, coach/athlete/admin roles, non-goals, release boundaries, manual versus automatic authority, success/guardrail metrics, approval gates and requirement IDs. Product owner accepts scope and open-decision list. | Product / engineering + domain | None | R1 |
| P02 | Client context and assessment PRD | Every assessment/intake source; edit/confirm flow; absent versus unassessed; effective dates; conflicting/stale inputs; legacy records; source display; reassessment resolution and structured restriction entry. Includes minimal R1 health-change flow. | Product / domain + data engineering | P01 | R1 |
| P03 | Eligibility, ranking and pool PRD | Session status versus exercise status; eight pool roles; prerequisites; hard exclusions versus preferences; ranking order; coverage and redundancy; unilateral cases; missing metadata; empty pools; explanations; coach pin/exclude behaviour. | Product / domain + engineering | P01, D02, D03, D04 | R1 |
| P04 | Draft composer and approval PRD | Goal/weekly-structure input, session budgets, block ordering, dosage, alternatives, draft/review/assignment/start, manual and voice additions, copy/import behaviour, recheck/invalidation, concurrent edits and no silent overwrites. | Product / coaching + engineering | P01, D04 | R1 |
| P05 | Daily adjustment PRD | Wellness and equipment/time changes, baseline versus today, optional wearable signals, missingness, bounded suggestions, approval authority, avoiding compounded reductions, planned future days and client-facing explanation. Keep basic screening changes in R1. | Product / domain + engineering | P01, P02, P04, C09 | R2 |
| P06 | Progression and reassessment PRD | Comparable exercise history, tolerance/effort, missed sessions, regression/progression criteria, weekly balance, reassessment evidence, proposed revisions and what requires human review. | Product / domain + engineering | P01, P04, C10 | R3 |

## B. Data and vocabulary — 4 deliverables

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| D01 | Current-state field/source inventory and data dictionary | Exact table/JSON/form paths for screening, pain, movement, fitness, goals, lifestyle, anthropometrics, wellness, equipment, history and permissions; type, scale direction, unit, default, missingness, writer, effective date, access and intended consumer. Note unsupported/planned fields and actual live-schema verification still needed. | Data engineering / product + domain | P01 | R1 |
| D02 | Client-context resolution contract | Source precedence per field; effective versus recorded time; timezone/session-date handling; stale/missing/conflicting states; source and confirmation evidence; baseline/today separation; persistent restrictions; snapshot version/invalidation. Case examples resolve deterministically without fabricated values. | Engineering / domain + product | D01, P02 | R1 |
| D03 | Canonical vocabulary and identifiers | Stable exercise/family/muscle/joint/pattern/equipment/goal/finding IDs; aliases and side semantics; movement roles distinct from workout blocks; units; unknown versus not-applicable. Includes mappings from current strings without name-based identity. | Content/data lead / domain + engineering | D01 | R1 |
| D04 | State and authority model | Assessment, review, restriction, catalogue and session lifecycle; allowed actors/actions; draft versus approved versus stale; assignment/start/resume gates; clearance changes; athlete reporting; coach versus clinical authority. Covers every transition and failure case. | Product + engineering / domain + security | P01, D01 | R1 |

## C. Catalogues and rule content — 12 deliverables

These are separate logical datasets, not necessarily separate database tables. Start with reviewed coverage for the chosen R1 population and supported settings. Do not assume the whole imported library qualifies for automation.

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| C01 | Master exercise catalogue | Stable identity; reviewed role(s), pattern, target(s), side, prerequisites, position/range/impact demands, all equipment/supports, load mode, instructions, family and media/source links. Each auto-eligible record is complete and approved; custom incomplete entries remain manual-only. | Exercise content lead / qualified exercise reviewer | D03, C12 | R1 |
| C02 | Assessment/protocol catalogue | Protocol identity/version, administration, measure/scale/unit/side, assessable fields, explicit absent/present/not-assessed states, limitations, required competence, evidence and reassessment comparability. Do not relabel historical scores as validated diagnostics. | Exercise content lead / appropriate domain reviewer | D01, D03, C12 | R1 |
| C03 | Finding-to-training-need mapping | Observed finding → possible need → required confirmation → permissible coaching action; side; confidence basis; contradictory mappings; deduplicated needs; review/referral conditions. Each mapping is reviewable independently of exercise selection. | Exercise content lead / domain + relevant clinical reviewer | C02, D03, C12 | R1 |
| C04 | Screening, restriction and clearance rule catalogue | Chosen instrument/version; input conditions; scope/population; session hold versus exercise restriction; reviewed modification; expiry/review trigger; source; precedence; authorized resolver and decision text. Exact rules require qualified review; no diagnosis-to-ban shortcuts. | Domain policy lead / appropriate clinical reviewer | D02, D04, C12 | R1 |
| C05 | Goal and weekly-structure catalogue | Goal taxonomy, coach-selectable session/weekly structures, movement coverage, priorities, experience prerequisites, realistic availability and lifestyle scheduling considerations. R1 helps fill a selected structure; advanced weekly generation stays R3. | Coaching lead / exercise reviewer | D03, C12 | R1 |
| C06 | Dosage and loading catalogue | Reviewed templates by purpose and ability; sets/reps/time/rest/tempo/effort; allowed bounds; unilateral time; warm-up/ramp-up handling; kg/lb; measured versus estimated references; unavailable-max behaviour. No invented loads or age-based fallback assumptions. | Coaching lead / exercise reviewer | C01, C05, C12 | R1 |
| C07 | Exercise-family and substitution catalogue | Progressions/regressions, comparable alternatives, preserved role/pattern/side, equipment/position differences, changed load requirements and contraindication recheck. A swap cannot inherit clearance merely by sharing a muscle. | Exercise content lead / exercise reviewer | C01, C04, C06 | R1 |
| C08 | Session-block and preparation catalogue | General warm-up, optional targeted preparation, integration, main/accessory work, conditioning and cool-down templates; sequencing, time/setup/rest model; optional versus required; over-budget and no-candidate outcomes. | Coaching lead / exercise reviewer | C01, C05, C06, C07 | R1 |
| C09 | Lifestyle, readiness and daily-adjustment rules | Which inputs provide baseline context versus current evidence; scale/missingness; confounding; optional wearable quality; bounded adjustment priorities; no double reductions; review conditions. Numeric thresholds need a documented basis and approval. | Coaching/domain lead / relevant specialist | D02, C04, C06, C12 | R2 |
| C10 | Progression and reassessment rules | Comparable performance, effort/tolerance evidence, plateau or regression checks, missed-session reasons, explicit finding resolution, reassessment triggers and recommendation revision; no symptom-as-diagnosis inference. | Coaching lead / exercise reviewer | C02, C06, C07, C12 | R3 |
| C11 | Reason, exclusion and warning catalogue | Stable reason codes; input/source references; coach/athlete variants; unknown, stale, excluded and hold wording; selected exercise's purpose; actionable next steps; no raw medical notes or false precision. Extend for R2/R3. | Product/content / domain + accessibility + privacy | D04, C03, C04 | R1 |
| C12 | Evidence, provenance and content-rights register | Source title/URL/version/date, what claim/content it supports, limitations, evidence versus heuristic, licence/permission/attribution requirements, media rights, reviewer and review date. Audit imported strength material, assessment instruments, corrective mappings and videos before reuse. | Content owner / domain + rights reviewer | P01 | R1 |

### Shared catalogue record envelope

The schemas should include, where applicable:

- `id`, `version`, `recordType`, `status` (draft/review/approved/retired).
- `applicablePopulation`, supported settings and limitations.
- Structured content with canonical referenced IDs; missing versus not-applicable explicit.
- Source/evidence identifiers, basis (observation/measurement/heuristic), rights status and attribution.
- Author, qualified reviewer, approval date, review-due policy and change reason.
- Linked acceptance cases, superseded version and deprecation/migration behaviour.

An approved parent catalogue does not automatically approve every new record. Retired records remain resolvable for historical workouts but are not newly selected. Approval of a movement association is distinct from approval of an exercise dose or medical restriction rule.

### Coverage review required for C01/C03/C05/C08

Build a matrix of supported population × goal × movement need × pool role × equipment setting × ability/position requirements. Record reviewed candidates, alternatives and explicit unsupported cells. An intentionally unsupported combination returns a visible gap. The chosen release scope determines mandatory coverage; do not fabricate an exercise to fill every cell or claim universal coverage.

## D. Engineering specifications — 5 deliverables

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| E01 | Engine architecture and deterministic contract | Input snapshot → session check → eligibility → per-role ranking → coverage selection → dosage/composition → explanations. Typed input/output/error contract, stable tie-breaks, versioning, invalidation and reproducibility; ranking cannot override restrictions. | Engineering / domain + QA | D02, P03, P04 | R1 |
| E02 | Persistence, API and permissions specification | Supabase/localStore mapping; schema changes; coach/athlete/admin ownership; authoritative backend validation; atomic approval/version writes; direct-write bypass prevention; scoped queries; access to health notes and audit records; offline limitations. | Engineering / security + privacy | D01, D04, E01 | R1 |
| E03 | Migration and compatibility plan | Inventory actual deployed schema with authorization; stable exercise IDs and old-reference mapping; preserve custom overrides/media; legacy assessment ambiguity; old blocks/templates; dry-run counts, backup/restore and rollback; localStorage-to-versioned shape. Never infer missing historical findings as normal. | Engineering / QA + data owner | D01, D03, E02 | R1 |
| E04 | Integration and entry-point matrix | Assessment page, client profile, builder, planner, copies, templates, manual/voice imports, athlete portal, assignment, start, substitute, resume, reassessment and feedback. For each: reads, writes, check location, allowed role, errors, approval and regression test. | Engineering / product + QA | P02, P03, P04, D04 | R1 |
| E05 | Configuration, performance and failure design | Feature flags, catalogue/rule versions, cache invalidation, realistic client/library volumes, latency budgets, failed saves/retries/idempotency, concurrent approvals, network loss, missing tables and explicit degraded behaviour. No silently using unvalidated stale data. | Engineering / QA + operations | E01, E02 | R1 |

## E. UX and content design — 3 deliverables

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| U01 | Coach and athlete journeys / wireframes | Assessment completeness, pool categories/statuses, filters, why-selected, generation, review, swap, approval, pending review, empty/partial/stale states and health-change prompt. Desktop/mobile and keyboard paths. R2/R3 flows added later. | Design/product / coaches + engineering | P02, P03, P04 | R1 |
| U02 | UI copy and accessibility specification | Status meaning beyond colour, labels/units/side, consent and review messaging, distinction between coaching and medical claims, athlete-safe explanations, focus/keyboard/error announcements and loading/save-failure states. | Design/content / accessibility + domain + privacy | U01, C11 | R1 |
| U03 | Catalogue authoring and review workflow | Draft/import → metadata validation → content/rights review → publish/version → correction/retirement; roles and separation of duties, custom exercise handling and audit history. R1 may use a controlled repository workflow; a new admin CMS is not assumed. | Content operations / domain + engineering | P01, D03, D04, C12 | R1 |

## F. Verification and review evidence — 6 deliverables

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| Q01 | Synthetic reference cases and expected outputs | Representative clients/settings with explicit input snapshots, eligible/excluded/review results, reason codes, allowed draft outcomes, field/case coverage and expert-approved expectations. Use synthetic/de-identified data only under appropriate authority. | QA + domain / coaching + privacy | P02, P03, P04, C04 | R1 |
| Q02 | Automated test and traceability plan/results | Requirement → rule/catalogue → case coverage; unit/property, integration, API/RLS, migration and end-to-end tests; persistence/reload, version conflicts and deterministic output. Add test command/CI plan; lint/build are necessary but insufficient. Results produced for G3. | QA/engineering / domain for expected outputs | E01–E05, Q01 | R1 |
| Q03 | Exercise and clinical-policy review report | Separate sign-offs for assessments, hypotheses, exercises, dose, screening/clearance and referral wording. Record qualifications, scope, evidence, disagreements, limitations, rejected entries and test results. No blanket approval of imported libraries. | Qualified reviewers / product accountable for resolution | C01–C08, C11, C12, Q01 | R1 |
| Q04 | Coach/athlete usability and acceptance report | Representative task scripts, baseline workflow effort, reasons for overrides, understanding of unknown/hold states, accessibility, client burden, accepted/rejected drafts and resulting changes. Acceptance thresholds agreed before pilot. | Product/QA / participating coaches + clients | U01, U02, Q01 | R1 |
| Q05 | Security and privacy review/report | Tenant isolation, athlete scope, backend validation bypass, admin authority, sensitive explanations/audit logs, retention/export/deletion, telemetry minimization, future third-party sharing boundary and incident response. Resolve launch jurisdictions and applicable obligations with an appropriate reviewer. | Security/privacy leads / engineering + applicable adviser | E02, D04, C11, O01 | R1 |
| Q06 | Migration and release verification report | Actual staging results: old→new counts/references, retained user overrides, ambiguous assessments, historical workout integrity, permissions, reload persistence, downgrade/rollback and backup restore. Includes release checklist and unresolved-risk disposition. | QA/release engineering / data owner | E03, E05, Q02 | R1 |

### Minimum reference-case set

The exact exercise outputs require reviewed catalogue content; these are required behavioural cases, not approved exercise prescriptions.

1. No screening or no assessments: unknown/review states, not automatic clearance.
2. Unmarked movement field versus explicitly absent finding.
3. Left-only finding, bilateral finding, and incomplete side reassessment.
4. Conflicting findings mapping to the same target; no arbitrary winner.
5. Backdated entry, future assessment, timezone boundary and same-day revisions.
6. New health concern after recorded clearance; saved plan revalidation.
7. Current restriction, modified permitted variation and an unauthorized override attempt.
8. Missing equipment/support, travel setting and free-text equipment ambiguity.
9. Insufficient session time including rest/setup/both sides; explicit coverage gap.
10. No candidate, unreviewed custom exercise and retired catalogue entry.
11. Related findings/duplicate exercises; coverage without double counting, while allowing purposeful warm-up/main reuse.
12. kg/lb conversion, timed/bodyweight work, missing training max and estimated versus measured references.
13. Copy/template/manual/voice/athlete entry points enforce the same applicable rules.
14. Concurrent edit/approval, stale context and failed backend save.
15. Offline/local-mode limits; no false claim of server-validated approval.
16. Cross-coach read/write attempt and athlete access to private health/audit fields.
17. Stable exercise identity and historical record preservation across migration/reload.
18. Skipped wellness, untouched defaults and non-comparable wearable history (R1 display; R2 adjustment tests later).
19. Repeated difficulty versus skipped-for-time exercise, and progression evidence (R3).
20. Incomplete reassessment must not automatically resolve a restriction or finding.

## G. Pilot, rollout and ongoing operations — 4 deliverables

| ID | Deliverable | Required contents and completion evidence | Owner / reviewer | Depends on | Release |
|---|---|---|---|---|---|
| O01 | Pilot and measurement plan | Cohort/consent, baseline measures, feature flag allocation, duration/stop rules, support owner; time-to-approved-draft, acceptance/override reasons, coverage gaps, explanation quality and safety/data-integrity guardrails. Set thresholds before judging results; do not claim reduced injuries from app usage metrics. | Product/pilot lead / domain + privacy + engineering | P01, P03, P04 | R1 |
| O02 | Deployment, rollback and support runbook | Environment/schema checks, approved catalogue versions, backups, deployment authorization, monitoring, pause switch, rollback preserving data, incident triage, escalation and support ownership. Automated mutations remain off if not explicitly approved. | Release/operations / engineering + product | E03, E05 | R1 |
| O03 | Coach/client onboarding and help | Explain pools versus assigned workouts; unknown/review/hold meanings; confirmation and reporting; edits/alternatives; no diagnosis claims; client privacy; safe manual workflow when generation is unavailable. | Product/content / coaching + accessibility | U01, U02, D04 | R1 |
| O04 | Rule and catalogue governance policy | Named future owners, review cadence, evidence updates, version promotion/retirement, change impact, regression cases, rollback, unresolved feedback, audit retention and reapproval triggers for new populations/features. | Product/content operations / domain + engineering | C12, D04, U03 | R1 |

## Suggested organization once authoring begins

Use a small document set with linked sections and machine-readable datasets, not empty placeholder files for every row:

- `prd/`: P01–P06, with R2/R3 initially brief outlines.
- `data/`: D01–D04 and catalogue schemas/validation contracts.
- `catalogues/`: C01–C12, source records and reviewed coverage matrix.
- `engineering/`: E01–E05 and integration decisions.
- `design/`: U01–U03 and approved interface/copy specifications.
- `validation/`: Q01–Q06, expected-result cases and review evidence.
- `operations/`: O01–O04 and gate records.

This register, the readiness map and the decision/review register form the original mapping package. The subsequent [sprint backlog](./SPRINT_BACKLOG.md) assigns all 40 artifacts to tasks, and [USER_APPROVALS.md](./USER_APPROVALS.md) separates preparation, build and release permissions. Draft catalogue schemas/data, logical data/API contracts, screens and test strategy are now specified in the handoff. Executable migrations/endpoints, CI implementation, reviews and deployment remain future gated work.
