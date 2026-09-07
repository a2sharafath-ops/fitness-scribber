# Exercise pooling — prioritized sprint project

## Current update — 7 September 2026

The owner reports the six PRDs and twelve catalogues reviewed and accepted as-is and has directed building. Execution is currently paused at the owner's request to obtain one consolidated backup/recovery/full-local-build approval first. Specialist evidence and live-release permissions are not inferred. See the [complete backup-to-build package](./preparation/BACKUP_TO_BUILD_APPROVAL.md) for the current scope, every task, all permissions/sign-offs and setup requirements.

The current tracker has **82 tasks**: the original 70 below plus **FP-B01–FP-B12** in the SB backup/recovery sprint. The package contains their full acceptance criteria and dependency table; FP-301 now also requires FP-B10. SB preflight precedes S3, with final recovery after the local R1–R3 build. The proposed early local R2/R3 path requires explicit A23 approval and does not waive human/pilot/release acceptance. Earlier status text below is a preparation snapshot, superseded by this update only where stated.

Status: whole-system preparation complete. Early P05/C09, P06/C10 and operational preparation is now authorized and drafted; reviews/build/release remain pending. See the [full handoff](./preparation/FULL_PREPARATION_HANDOFF.md).

The expanded adult/advanced/adaptive/rehabilitation scope, client app and international markets add six preparation/review tasks to the original 64: **70 tasks across S0–S8**, covering the original 40 artifacts. See [machine-readable tracking](./sprint-backlog.json) and the [approval checklist](./USER_APPROVALS.md).

## Execution agreement

- The assistant owns drafting and later authorized execution/testing. Qualified reviewers retain actual domain/clinical/legal approval authority; the assistant prepares evidence and records real feedback.
- A06 permits local S1–S2 documents, catalogue drafts, source research, non-executable UX and test specifications. G1/G2 acceptance and A12 build approval remain pending. No coding or executable prototype from preparation permission.
- Each sprint is a dependency-ordered milestone, not a calendar-duration promise. Dates/capacity depend on clarified scope and reviewer/environment availability. There is no unattended-work commitment.
- P0 means safety, data integrity, permissions or gate dependency; P1 core R1 product; P2 later daily adaptation; P3 later progression/planning. Later-sprint P0 tasks cannot skip prerequisites.
- Provisional documents may be drafted with explicit unknowns while input dependencies remain open. Preparation completion is tracked separately from task acceptance and never grants permission to execute downstream code. Review gates require the specified accepted versions/evidence.
- A13–A19 separately control hosted access/writes, spending, GitHub actions, production changes, client/reviewer contact and deployment. A20/A21 separately control later preparation/build/enablement.
- No shared coach credentials: one coach plus a client app is confirmed. Separate authenticated restricted client accounts are an approved working default; exact packaging remains a specification; no native app build or deletion of the existing athlete portal is implied.
- All requested markets remain design targets. Exact countries/states and service/clinical/privacy activation are reviewed individually; a broad target list is not launch permission.
- No separate running tasks, agents, external project boards, plugin installs or scheduled work are created.

## Sprint order and exit gates

| Sprint | Focus | Release | Exit condition |
|---|---|---|---|
| S0 | Project setup and your decisions | Planning | Initial facts/unknowns recorded; A06 approved. Remaining facts are preparation decisions. |
| S1 | Requirements and technical design | R0 | G1 scope accepted; R1 PRDs, contracts, UX and verification plans drafted. No application build. |
| S2 | Catalogue preparation and implementation approval | R0 | Reviewed R1 content and design package; G2 approval and A12 explicit build permission. No application build. |
| S3 | Data foundation and backend protections | R1 | Stable identity, preserved data, source resolution and tested authoritative permissions. |
| S4 | Selection and workout-drafting engine | R1 | Deterministic, explainable drafts pass rule and coverage tests. |
| S5 | Coach and client workflow integration | R1 | Usable end-to-end local/staging workflow with checks at every entry point. |
| S6 | Verification, pilot and R1 rollout | R1 | G3 limited pilot, then evidence-based G4 wider-rollout decision. No automatic deployment. |
| S7 | Daily adjustment suggestions | R2 | Reviewed bounded daily suggestions pass tests/pilot and receive explicit enablement approval. |
| S8 | Progression and weekly-planning suggestions | R3 | Reviewed progression/planning suggestions, pilot acceptance, approved release and maintenance handoff. |

## Status and definition of done

FP-001 (mapping) and FP-002 (recording actual replies/unknowns) are complete. A06 is approved. The first PRD, reviewer/market, catalogue-coverage and policy documents are drafts, not professional sign-offs. The machine-readable file records the current status and output paths of each task.

Current batch: all 31 S1/S2 tasks have `preparationStatus:complete` and `acceptanceStatus:pending`. FP-114/209/211/214 specifically await external acceptance after dossier preparation. No gate/review task is falsely marked done. There are 46 TC plus 24 CAT synthetic test specifications; no pooling application tests were executed.

Before marking a task accepted/done: its required output exists, dependencies and acceptance criteria are satisfied, applicable tests/checks pass and actual required review evidence is recorded. Completed draft preparation is tracked separately and does not satisfy that acceptance gate. Product preference cannot waive a release-blocking safety/security/rights/data-integrity issue.

Code tasks later require focused tests plus relevant lint/build checks; backend permissions and preservation must be tested, not only UI states. Each sprint handoff reports evidence, remaining risks, next approvals and scope for the next milestone.

## Detailed backlog

### S0 — Project setup and your decisions

Entry: Mapping complete; actual user instructions/A06 recorded.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-001 | P0 | Convert the readiness map into a traceable sprint backlog and approval checklist | Backlog covers all 40 artifacts; task IDs/dependencies and approval references validate; planning files only. | None | Current mapping request |
| FP-002 | P0 | Record your initial scope, operating facts, reviewers and preparation permission (P01) | Record actual answers, unknowns and A06 scope. Do not mark missing reviewers or unresolved facts as approved. | FP-001 | A01, A02, A03, A04, A05, A06 |

### S1 — Requirements and technical design

Entry: A06 preparation approval; unresolved facts are labelled, not invented.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-101 | P0 | Draft master PRD, R1 boundary and requirement IDs (P01) | PRD defines users, supported scope, non-goals, authority and measurable acceptance; traces to decisions. | FP-002 | A01, A02, A03, A04, A05, A06 |
| FP-102 | P0 | Inventory fields and reconcile architectural documentation (D01) | Every in-scope field maps to source/form/type/scale/default/owner/date; current Supabase/local mode documented; no live data accessed. | FP-101 | A06 |
| FP-103 | P0 | Specify assessment reliability and context resolution (P02, D02) | Worked cases define unknown/absent, source precedence, effective dates, conflicting/old findings and minimal health-change flow. | FP-102 | A06, A09 |
| FP-104 | P0 | Define stable vocabulary, lifecycle and authority contracts (D03, D04) | Canonical IDs/sides/units and transition matrix cover draft, review, assignment, start, resume, invalidation and authorized actors. | FP-102 | A02, A06, A09, A10 |
| FP-105 | P1 | Draft pool eligibility, ranking and explanation PRD (P03) | Defines session status separately from eligibility, all eight roles, hard versus soft rules, coverage, tie-breaks and no-candidate behaviour. | FP-103, FP-104, FP-114 | A06, A09 |
| FP-106 | P1 | Draft session generation, substitution and approval PRD (P04) | Defines time/rest/setup/side accounting, coach-selected weekly structure, dosage references and every edit/copy approval path. | FP-103, FP-104, FP-114 | A06, A10 |
| FP-107 | P1 | Prepare coach/client wireframes and accessible copy specification (U01, U02) | Non-executable specifications cover desktop/mobile, missing/held/stale/unsaved states, keyboard/focus and privacy-safe explanations. | FP-105, FP-106 | A06, A10 |
| FP-108 | P0 | Specify deterministic engine contract and reason traceability (E01) | Input/output/error contracts, versioned sources, ranking/coverage boundaries and stable ordering can be tested without JSX. | FP-105, FP-106 | A06, A11 |
| FP-109 | P0 | Specify backend persistence, permissions and atomic approval (E02) | Tables/API contracts map roles and sensitive fields; direct-write bypass, transaction consistency and local-mode limits are addressed. | FP-108, FP-104 | A06, A10, A11 |
| FP-110 | P0 | Design migration, identity preservation and rollback (E03) | Plan maps old exercise refs/overrides, legacy ambiguity, historical blocks, schema preconditions and measurable backup/restore checks. No migration executed. | FP-102, FP-104, FP-109 | A06, A09, A11 |
| FP-111 | P0 | Map integration entry points, configuration and failure behaviour (E04, E05) | Matrix covers manual/voice/template/copy/athlete flows; defines invalidation, concurrency, failed save, offline, feature flags and performance budgets. | FP-108, FP-109 | A06, A10, A11 |
| FP-112 | P0 | Draft synthetic reference cases, test coverage and CI strategy (Q01, Q02) | Required behavioural cases link to requirement IDs; domain-dependent expected selections remain draft pending reviewed content. | FP-105, FP-106, FP-108 | A06 |
| FP-113 | P1 | Draft pilot measures and privacy/security acceptance criteria (O01, Q05) | Propose measurable quality/stop criteria and minimized telemetry; record jurisdiction/consent/reviewer questions. No pilot or client contact. | FP-101, FP-109, FP-111 | A05, A06, A14, A15, A16 |
| FP-114 | P0 | Prepare and record the G1 scope review (P01, D01, D02, D04) | Actual scope/definition feedback is resolved and authorized G1 acceptance recorded; this does not authorize application code. | FP-101, FP-102, FP-103, FP-104, FP-115, FP-117 | A01, A02, A03, A04, A05, A06 |
| FP-115 | P0 | Define expanded adult/advanced/adaptive/rehabilitation scope and reviewer authority (P01, D04, Q03) | Distinguish product/content, individual clinical and coach assignment approvals; define reviewer roles without assuming credentials or blanket specialty coverage. | FP-101 | A01, A02, A04, A06, A07 |
| FP-116 | P0 | Draft client-app privacy, participation, health-data and clinician-sharing documents (Q05, U02, O03) | Separate original drafts preserve specific consent, actual client evidence, withdrawal, recipient limits and publication blockers; no compliance claim or live insertion. | FP-102, FP-115 | A05, A06, A07, A10, A16 |
| FP-117 | P0 | Map intended international markets and country-specific launch reviews (P01, Q05, O01, C12) | Retain all requested market targets; distinguish establishment and client markets; identify country/state privacy/clinical/transfer gaps and staged activation decisions. | FP-101, FP-115 | A05, A06, A16, A19 |

### S2 — Catalogue preparation and implementation approval

Entry: S1 vocabulary/state inputs available; approved preparation scope only.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-201 | P0 | Audit evidence, source provenance and content permissions (C12) | Every candidate source has applicability, version, attribution and rights status; uncertain rights stay unresolved/quarantined. | FP-101, FP-102 | A03, A04, A06, A08 |
| FP-202 | P0 | Draft catalogue schemas and populate the candidate exercise subset (C01, U03) | Structured candidate records cover agreed scenarios with stable IDs, complete equipment/roles/requirements and draft status. No live publish. | FP-104, FP-201 | A03, A06, A08 |
| FP-203 | P0 | Draft the assessment/protocol catalogue (C02) | Each protocol describes administration, competence, scales, side, missingness, limitations and comparable reassessment criteria. | FP-103, FP-104, FP-201 | A06, A07, A08 |
| FP-204 | P0 | Draft finding-to-need mappings with confirmation requirements (C03) | Mappings preserve laterality, label hypotheses, deduplicate needs and identify contradictory/unsupported inferences. | FP-203, FP-104 | A06, A07, A08 |
| FP-205 | P0 | Draft screening, restriction, clearance and referral rules (C04) | Rules reference the proposed instrument/version and competent authority; explicit hold/modify/review paths cover changed health and old clearance. Remain unapproved until reviewed. | FP-103, FP-104, FP-201 | A04, A06, A07 |
| FP-206 | P1 | Draft goal structures and dosage/loading templates (C05, C06) | Coach-selected structures and dose bounds fit supported goals/ability; no invented maxima, age or loads; lifestyle context is distinct from daily adaptation. | FP-202, FP-201, FP-106 | A03, A06, A08 |
| FP-207 | P1 | Draft substitution families and session/preparation templates (C07, C08) | Alternatives retain relevant needs/side and require fresh checks; session templates count rest/setup and return explicit time/coverage gaps. | FP-202, FP-205, FP-206 | A06, A08 |
| FP-208 | P1 | Finalize reason codes and coach/client explanations (C11, U02) | Each status/action has a stable code, source reference and plain-language audience variant without raw medical notes or unsupported claims. | FP-204, FP-205, FP-107 | A06, A10, A16 |
| FP-209 | P0 | Prepare review cases and record qualified content/policy feedback (Q01, Q03, C01, C02, C03, C04, C05, C06, C07, C08, C12) | Named competent reviewers accept/reject scoped records and expected cases; resolve blockers, quarantine unsupported content and preserve actual sign-off evidence. | FP-112, FP-201, FP-202, FP-203, FP-204, FP-205, FP-206, FP-207, FP-208, FP-212, FP-213 | A04, A07, A08 |
| FP-210 | P1 | Define catalogue publishing, retirement and maintenance workflow (U03, O04) | Controlled review/version/publish/retire workflow has change owners and reapproval triggers; full admin CMS not required. | FP-104, FP-201, FP-202, FP-205 | A06, A08, A10 |
| FP-211 | P0 | Assemble G2 implementation package and request explicit build approval (P01, P02, P03, P04, E01, E02, E03, E04, E05, U01, U02, Q01, Q02, Q03, Q05) | Versioned R1 requirements/content/design/tests and open-risk disposition accepted. Record A12 scope before S3; specify whether any staging access is permitted. | FP-107, FP-108, FP-109, FP-110, FP-111, FP-113, FP-209, FP-210, FP-116, FP-214 | A07, A08, A09, A10, A11, A12, A13, A14 |
| FP-212 | P0 | Extend catalogue coverage for advanced and individual adaptive/clinical contexts (C01, C03, C05, C06, C07, C08) | Coverage includes all levels and scoped clinical/adaptive modules; unsupported cells explicit; draft mappings not approved prescriptions; specialist evidence traceable. | FP-104, FP-115, FP-202, FP-203 | A01, A03, A06, A07, A08 |
| FP-213 | P0 | Specify clinician handoff, instruction provenance and client-sharing evidence (P02, D04, C04, Q03) | Define scoped instructions, supervision/review limits and meaningful coach interpretation; sharing consent separate from clearance; representative authority verified where applicable. | FP-104, FP-115, FP-116, FP-205 | A04, A06, A07, A10, A16 |
| FP-214 | P0 | Complete market policy review packs and record applicable professional acceptance (Q05, C12, U02) | Resolve operator, providers/regions, purposes/grounds, consent/rights/retention and enabled-market addenda; record real reviewer acceptance; unreviewed markets remain unapproved for activation. | FP-116, FP-117, FP-109 | A05, A06, A08, A10, A16 |

### S3 — Data foundation and backend protections

Entry: G2 passed and A12 approved; A13 before hosted non-production actions.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-301 | P0 | Set up isolated implementation branch, test harness and disabled feature flag (Q02, E05) | Authorized codex/ branch preserves existing changes; runnable tests and pooling-off default established. No remote push or package purchase. | FP-211 | A11, A12 |
| FP-302 | P0 | Implement stable catalogue identity and legacy-reference mapping (C01, D03, E03) | Existing exercise refs, names, custom overrides and media survive reload/migration; approved vs draft/retired records behave correctly; regression tests pass. | FP-301 | A09, A12 |
| FP-303 | P0 | Implement additive local schema and versioned persistence contracts (E02, D04) | Catalogue/restriction/context/decision/approval records persist in the authorized test environment with documented ownership and compatible old data. | FP-301 | A10, A12, A13 |
| FP-304 | P0 | Implement explicit assessment/source states and input confirmation (P02, D01, D04) | Forms/persistence distinguish unknown, unassessed and absent; preserve side/date/source and legacy originals; untouched defaults are not asserted as confirmed. | FP-302, FP-303 | A09, A10, A12 |
| FP-305 | P0 | Implement deterministic client-context resolver (D02, E01) | Date/source/conflict/staleness/side cases pass; unresolved restrictions persist; historical resolution excludes future evidence. | FP-302, FP-303, FP-304 | A09, A12 |
| FP-306 | P0 | Implement authoritative permissions and approval transactions (E02, D04, C04) | Authorized test backend rejects cross-tenant and unauthorized athlete writes, bypassed holds and inconsistent approvals; local-mode limitations remain explicit. | FP-303, FP-305 | A07, A10, A12, A13 |
| FP-307 | P0 | Run synthetic migration and preservation tests (E03, Q06) | Dry-run and restore evidence preserve counts/references/overrides/history in local or expressly authorized staging; no production changes. | FP-302, FP-303, FP-304, FP-306 | A09, A12, A13 |

### S4 — Selection and workout-drafting engine

Entry: S3 contracts implemented; only reviewed catalogue/rules admitted.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-401 | P0 | Implement session eligibility and per-exercise filtering (P03, C04, E01) | Reviewed rules return session hold/review plus exercise eligible/modified/review/excluded statuses and reason codes; ranking cannot bypass them. | FP-305, FP-306 | A07, A08, A12 |
| FP-402 | P1 | Implement role-specific ranking, coverage and redundancy handling (P03, C03, C05, E01) | Stable ranking selects only eligible reviewed records, preserves side, reduces redundant need coverage and exposes unsupported cells. | FP-401 | A08, A12 |
| FP-403 | P0 | Implement reviewed dosage and loading resolution (C06, E01) | Tests cover measured/estimated references, no-max/bodyweight/timed work, units and limits; no fabricated load or silent unsafe fallbacks. | FP-305, FP-401 | A08, A12 |
| FP-404 | P1 | Implement time-budgeted session composer and compatible alternatives (P04, C07, C08, E01) | Draft respects selected weekly structure, session duration including setup/rest/sides, optional blocks and swap rechecks; insufficient coverage is explicit. | FP-402, FP-403 | A08, A12 |
| FP-405 | P0 | Implement rationale snapshots, versions and engine replay tests (C11, E01, E02, Q02) | Outputs retain only necessary source references/reasons, engine/catalogue versions and repeatable results; private notes excluded from athlete output/telemetry. | FP-401, FP-402, FP-403, FP-404 | A10, A12, A16 |

### S5 — Coach and client workflow integration

Entry: S4 engine and S3 persistence/permissions ready.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-501 | P1 | Add the client Exercise Pool view (P03, U01, U02) | Coach can inspect categories/statuses, source dates, why/why-not, missing data and candidates; role/side meaning accessible beyond colour. | FP-402, FP-405 | A10, A12 |
| FP-502 | P1 | Integrate draft generation, compatible swaps and approval in builder (P04, U01, E04) | Draft-review-edit-approve flow preserves existing workouts, shows changed dosage/time, rechecks substitutions and stores actual approval only after successful validation/save. | FP-404, FP-405, FP-501 | A10, A12 |
| FP-503 | P0 | Integrate minimal health-change reporting at workout start (P02, C04, U01, E04) | Coach/athlete health-change paths distinguish unknown/current report and applicable review/hold without implementing R2 wellness dosage logic. | FP-304, FP-401, FP-405 | A07, A10, A12 |
| FP-504 | P0 | Enforce checks across copies, templates, manual/voice and athlete flows (E04, P04) | Each entry-point case re-evaluates target client/date/role and relevant restriction; no inherited source-client approval or hidden bypass. | FP-502, FP-503, FP-306 | A07, A10, A12 |
| FP-505 | P0 | Implement stale-plan, conflict, failed-save and offline handling (D04, E05, E04) | Changed sources trigger appropriate review, concurrent edits cannot silently overwrite, unsaved changes are labelled and retryable, and network loss obeys approved policy. | FP-502, FP-503, FP-504 | A09, A10, A12 |
| FP-506 | P1 | Finish mobile, keyboard and client-facing explanation QA (U01, U02, Q04) | Core journeys function on target sizes with keyboard/focus/error cues; clients understand unknown/review states without exposed clinical notes. | FP-501, FP-502, FP-503, FP-505 | A10, A12 |
| FP-507 | P1 | Implement controlled catalogue validation and version promotion tooling (U03, O04, E05) | Only actually approved records can be promoted; validation, retirement, change audit and rollback are testable without a new CMS; live promotion still needs release approval. | FP-302, FP-306, FP-210 | A08, A10, A12 |

### S6 — Verification, pilot and R1 rollout

Entry: R1 build ready for independent review; explicit external-action approvals remain required.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-601 | P0 | Run complete regression, permissions, failure and performance suite (Q02, Q05) | Mandatory requirement-linked tests pass; cross-tenant/bypass/failure checks and agreed latency budgets meet criteria; unresolved release blockers listed honestly. | FP-405, FP-504, FP-505, FP-506, FP-507 | A12, A13, A16 |
| FP-602 | P0 | Obtain domain acceptance of generated R1 cases (Q03) | Reviewers assess actual versioned outputs, confirm or reject intended scope and resolve blocking rule/content defects; assistant does not fabricate acceptance. | FP-601, FP-209 | A04, A07, A08 |
| FP-603 | P0 | Rehearse deployed-schema migration and recovery in authorized staging (Q06, E03) | Target-compatible staging migration, save/reload, reference preservation and restore results recorded; production execution remains unapproved. | FP-601, FP-307 | A09, A13 |
| FP-604 | P1 | Run authorized coach/client acceptance sessions (Q04) | Authorized participants complete scripts; approval time, confusion, overrides and accessibility findings recorded; no contact or real-data use without permission. | FP-601, FP-506 | A15, A16 |
| FP-605 | P0 | Prepare release runbooks, help and maintenance handoff (O02, O03, O04) | Runbooks specify versioned release, backup/rollback, feature pause, support escalation, review ownership and coach/client guidance. | FP-505, FP-507, FP-113 | A12, A15, A16 |
| FP-606 | P0 | Prepare G3 pilot-readiness evidence and request external-action approvals (Q02, Q03, Q04, Q05, Q06, O01, O02) | Gate records identify exact targets/versions, actual approvals and no unresolved blocking findings; no production action is included in merely assembling the pack. | FP-602, FP-603, FP-604, FP-605 | A15, A16, A17, A18, A19 |
| FP-607 | P0 | Execute explicitly authorized version-control, migration and limited pilot release (O01, O02, Q06) | Perform only the separately approved branch/PR/merge, target migration and pilot steps; verify health/permissions; log effects and stop at any missing permission. | FP-606 | A17, A18, A19 |
| FP-608 | P1 | Review pilot results and request/execute scoped G4 rollout (O01, Q04, O04) | Compare results with pre-agreed thresholds, investigate overrides/incidents and record explicit wider-rollout decision; execute only approved scope and hand off R1. | FP-607 | A15, A16, A19 |

### S7 — Daily adjustment suggestions

Entry: R1 evidence reviewed; A20 preparation permission, followed by separate G5 build approval.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-701 | P2 | Draft daily-adjustment PRD, reviewed source rules and test cases (P05, C09, Q01) | After R2 preparation permission, distinguish today/baseline and optional wearables, missingness, bounded suggestions and no compounded reductions; no build yet. | FP-608 | A20 |
| FP-702 | P0 | Obtain R2 policy review and G5 implementation approval (P05, C09, Q03, Q05) | Specific threshold/policy versions and privacy scope reviewed; record separate R2 build authorization and allowed environments. | FP-701 | A04, A16, A20 |
| FP-703 | P2 | Implement bounded daily suggestions and approval workflow (P05, C09, E01, E04, U01) | Current-context changes yield explainable proposals within approved limits, never clearance or silent assigned-workout changes; unit and integration tests added. | FP-702 | A13, A20 |
| FP-704 | P0 | Validate R2 failure, privacy, domain and usability cases (Q01, Q02, Q03, Q04, Q05) | Missing/skipped/default wellness and unreliable wearables behave as specified; reviewed output and consent/access checks pass; remaining risks recorded. | FP-703 | A04, A13, A15, A16, A20 |
| FP-705 | P2 | Pilot and release R2 only after separate enablement approval (O01, O02, O03, O04, Q06) | Approved stage/pilot evidence precedes production enablement; apply relevant exact-target Git/database/deployment approvals; update support and governance. | FP-704 | A17, A18, A19, A20 |

### S8 — Progression and weekly-planning suggestions

Entry: A21 preparation permission and stable prior contracts; separate G5 build approval.

| Task | Priority | Work / artifact coverage | Acceptance criteria | Dependencies | Approval references |
|---|---|---|---|---|---|
| FP-801 | P3 | Draft progression, reassessment and weekly-planning requirements (P06, C10, Q01) | After R3 preparation permission, define comparable history, tolerance evidence, skip reasons, explicit finding resolution, weekly constraints and preservation rules. | FP-705 | A21 |
| FP-802 | P0 | Obtain R3 domain review and G5 implementation approval (P06, C10, Q03) | Reviewed rule versions and expected cases accepted for stated populations; separate R3 build scope authorized before coding. | FP-801 | A04, A21 |
| FP-803 | P3 | Implement progression/regression suggestion engine (P06, C10, E01) | Comparable performance produces bounded proposals with reason/history references; skips and symptoms are not inferred as incapacity/diagnosis; tests cover counterexamples. | FP-802 | A13, A21 |
| FP-804 | P3 | Integrate weekly planning and reassessment proposals (P06, C10, C05, E04, U01) | Weekly/time/goal constraints and explicit reassessment evidence drive reviewable revisions; incomplete findings do not resolve; completed/approved history preserved. | FP-803 | A13, A21 |
| FP-805 | P0 | Validate, pilot and obtain final scoped R3 release acceptance (Q01, Q02, Q03, Q04, Q05, Q06, O01, O02, O03, O04) | Domain/security/migration/usability tests and approved pilot criteria pass; separately approved release actions verified; all accepted scope reconciled and maintenance ownership handed off. | FP-804 | A04, A13, A15, A16, A17, A18, A19, A21 |

## Current preparation outputs

- [S1 foundation/design review pack](./preparation/S1_REVIEW_PACK.md): all new data/state/PRD/UX/engineering/test specification links and remaining decisions.
- [Actual approval/scope record](./preparation/APPROVAL_RECORD.md).
- [Master PRD draft](./prd/MASTER_PRD.md).
- [Reviewer and launch recommendations](./preparation/REVIEWERS_AND_LAUNCH_SCOPE.md).
- [Source/privacy inventory — first pass](./data/SOURCE_AND_PRIVACY_INVENTORY.md).
- [Catalogue coverage draft](./catalogues/COVERAGE_DRAFT.md).
- [Privacy/consent pack and regional review matrix](./policies/README.md).

## Original artifact coverage

| Artifact | Tasks |
|---|---|
| C01 | FP-202, FP-209, FP-212, FP-302 |
| C02 | FP-203, FP-209 |
| C03 | FP-204, FP-209, FP-212, FP-402 |
| C04 | FP-205, FP-209, FP-213, FP-306, FP-401, FP-503 |
| C05 | FP-206, FP-209, FP-212, FP-402, FP-804 |
| C06 | FP-206, FP-209, FP-212, FP-403 |
| C07 | FP-207, FP-209, FP-212, FP-404 |
| C08 | FP-207, FP-209, FP-212, FP-404 |
| C09 | FP-701, FP-702, FP-703 |
| C10 | FP-801, FP-802, FP-803, FP-804 |
| C11 | FP-208, FP-405 |
| C12 | FP-117, FP-201, FP-209, FP-214 |
| D01 | FP-102, FP-114, FP-304 |
| D02 | FP-103, FP-114, FP-305 |
| D03 | FP-104, FP-302 |
| D04 | FP-104, FP-114, FP-115, FP-213, FP-303, FP-304, FP-306, FP-505 |
| E01 | FP-108, FP-211, FP-305, FP-401, FP-402, FP-403, FP-404, FP-405, FP-703, FP-803 |
| E02 | FP-109, FP-211, FP-303, FP-306, FP-405 |
| E03 | FP-110, FP-211, FP-302, FP-307, FP-603 |
| E04 | FP-111, FP-211, FP-502, FP-503, FP-504, FP-505, FP-703, FP-804 |
| E05 | FP-111, FP-211, FP-301, FP-505, FP-507 |
| O01 | FP-113, FP-117, FP-606, FP-607, FP-608, FP-705, FP-805 |
| O02 | FP-605, FP-606, FP-607, FP-705, FP-805 |
| O03 | FP-116, FP-605, FP-705, FP-805 |
| O04 | FP-210, FP-507, FP-605, FP-608, FP-705, FP-805 |
| P01 | FP-002, FP-101, FP-114, FP-115, FP-117, FP-211 |
| P02 | FP-103, FP-211, FP-213, FP-304, FP-503 |
| P03 | FP-105, FP-211, FP-401, FP-402, FP-501 |
| P04 | FP-106, FP-211, FP-404, FP-502, FP-504 |
| P05 | FP-701, FP-702, FP-703 |
| P06 | FP-801, FP-802, FP-803, FP-804 |
| Q01 | FP-112, FP-209, FP-211, FP-701, FP-704, FP-801, FP-805 |
| Q02 | FP-112, FP-211, FP-301, FP-405, FP-601, FP-606, FP-704, FP-805 |
| Q03 | FP-115, FP-209, FP-211, FP-213, FP-602, FP-606, FP-702, FP-704, FP-802, FP-805 |
| Q04 | FP-506, FP-604, FP-606, FP-608, FP-704, FP-805 |
| Q05 | FP-113, FP-116, FP-117, FP-211, FP-214, FP-601, FP-606, FP-702, FP-704, FP-805 |
| Q06 | FP-307, FP-603, FP-606, FP-607, FP-705, FP-805 |
| U01 | FP-107, FP-211, FP-501, FP-502, FP-503, FP-506, FP-703, FP-804 |
| U02 | FP-107, FP-116, FP-208, FP-211, FP-214, FP-501, FP-506 |
| U03 | FP-202, FP-210, FP-507 |

## Critical path and release completion

Accepted scope/source/state definitions → reviewed catalogue/policy and G2/A12 → stable data and backend protection → eligibility/ranking/composition → all workflow entry points → verified G3 pilot → evidence-based G4 expansion. R2/R3 have independent later approval checkpoints.

First-release usefulness does not require S7/S8. Whole-project completion requires all accepted scope, actual applicable review evidence, verified authorized release actions, preserved data and maintenance handoff. If external authority/review is withheld, report document/local/staging completion accurately rather than claiming a released system. Unapproved markets and clinical modules remain explicitly unavailable for live activation.

## Authorized early preparation completion

The owner expanded preparation while external review is pending. FP-701 and FP-801 now have their PRD/rule/contract/test drafts; FP-605 has release/help/maintenance drafts. Their preparation is complete, but final acceptance still depends on domain and actual implementation/pilot evidence. The 37 future tasks retain their execution dependencies; their preparationOutputs point to relevant specifications. No code task, actual review, pilot or release is marked done. Total synthetic test specifications: 110, including 40 new R2/R3 cases. The [expanded authority record](./preparation/FULL_PREPARATION_APPROVAL.md) is not build authorization.
