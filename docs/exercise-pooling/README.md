# Exercise pooling — local build and preparation

Current local code checkpoint: **`3b779d9`**, 7 September 2026. The owner approved local R1–R3 implementation and isolated runtime testing. The local build and substantial synthetic verification are saved; **full acceptance and release remain pending**. Start with the [current verification report](./operations/LOCAL_BUILD_VERIFICATION.md), [pending work and next approvals](./operations/REMAINING_WORK.md), and [sprint tracker](./sprint-backlog.json).

The preparation package FS-POOL-FULL-PREP-0.3 and the historical documents below are preserved. Their “build not authorized” statements describe the preparation stage and are superseded only by the [v0.6 local approval](./preparation/LOCAL_COMPLETION_APPROVAL.md). No hosted/remote/production permission or professional acceptance is implied.

Start with the [full preparation handoff](./preparation/FULL_PREPARATION_HANDOFF.md). All six PRD drafts and twelve catalogue artifacts now have preparation content, including daily adjustments and progression/planning. The full package has 110 synthetic test specifications, not executed app tests.

The earlier [expanded preparation approval](./preparation/FULL_PREPARATION_APPROVAL.md) brought forward all six PRDs and twelve catalogue artifacts. Local building/commits were subsequently approved under A22–A29. Push, merge, hosted action and deployment remain excluded. Earlier S1–S2 documents/archives remain scope snapshots, not current execution status.

Use the [full artifact manifest](./preparation/FULL_PREPARATION_MANIFEST.json), [sprint backlog](./sprint-backlog.json) and [remaining approvals](./preparation/OPEN_DECISIONS.md). Actual professional acceptance, numerical policy limits and business/provider facts remain pending. Existing implementation dependencies are unchanged.

The R1 design and full release boundaries below remain applicable.

## Intended outcome

A coach can review a client's current training context, inspect explainable exercise options, generate a draft and approve it in the existing workout builder. The engine separates session-level screening status from exercise eligibility, and separates long-term suitability from today's context.

The client pool is a selection resource, not a diagnosis, clearance or guarantee of safety. Working defaults are approved for preparation; record-specific content, clinical, legal and implementation acceptance remain separate.

## Proposed release boundaries

| Release | Included | Explicitly outside this release |
|---|---|---|
| R0 — preparation | PRDs, data definitions, curated catalogue scope, review policies, architecture, UX and test specifications. | Application implementation, production migration, actual reviewer sign-off. |
| R1 — coach-reviewed pooling | Reliable assessment states; reviewed catalogue subset; client context; eligibility and ranking; explanations; compatible swaps; single-session drafts within a coach-selected weekly structure; coach approval; consistent restriction checks; minimal health-change prompt; audit records. | Automatic wellness-based dosage changes, autonomous assignment, newly automated multi-week programming or progression. |
| R2 — daily adjustment suggestions | Today-specific wellness interpretation, equipment/time overrides, bounded adjustment suggestions and approval/recheck flows. | Treating readiness or wearable metrics as medical clearance; unattended changes to assigned workouts. |
| R3 — progression and planning suggestions | Performance-driven progression proposals, reassessment priorities and more advanced weekly planning. | Unreviewed rehabilitation, silently rewriting history, automatic interpretation of unexplained symptoms. |

Baseline lifestyle context can inform R1 scheduling and coach-facing recommendations. Current wellness can be displayed in R1 without applying an unapproved dose formula. Minimal health-change detection is an R1 screening requirement, not an R2 wellness feature.

The eight proposed pools are general warm-up, mobility/lengthening, SMR, activation, integration, main/accessory work, conditioning and cool-down. One exercise may have several reviewed roles. These are not eight mandatory workout blocks.

## Existing foundations and gaps

This is a source-code inventory, not verification of the live database, production deployment or actual client records. Paths below are relative to the repository root.

| Area | Existing foundation | Work needed before relying on it |
|---|---|---|
| Assessment records | `src/lib/assessment.js`, `src/components/organisms/forms/AssessmentForms.jsx`, `supabase/schema_assessments.sql`; six assessment types and self-report support. | Field-level dictionary, explicit not-assessed/absent/present states, effective dates, source precedence, incompatible-protocol handling and legacy ambiguity policy. |
| Movement model | `src/lib/posture.js`; named findings, laterality, severity and muscle associations. | Review each association; distinguish observed findings from hypotheses; canonical muscle/side IDs; conflicting targets; confirmation and resolution criteria. |
| Corrective selection | `src/lib/program.js` → `correctivePlan`; ranked SMR/stretch/activation suggestions and builder handoff. | Cross-domain eligibility, coverage-aware ranking, integration work, side-specific prescriptions, reviewed dosage and exclusion explanations. |
| Exercise content | `src/lib/exerciseLibrary.js`, `src/lib/correctiveLibrary.js`; imported strength and corrective lists. | Stable IDs, reviewed metadata and source/usage-rights audit. Load-time `mergeExerciseLibrary` currently replaces library-name matches with new IDs; migration must preserve references and user edits. |
| Screening | `src/lib/parq.js`, `src/lib/screening.js`, screening UI and `supabase/schema_screenings.sql`. | Review the exact adopted instrument/version and rights; separate missing/expired/review/clearance states; verify new symptoms versus old clearance; consistent enforcement. Existing synthesized rules are not automatically approved clinical policy. |
| Builder and execution | `src/components/organisms/program/WorkoutBuilderModal.jsx`, `src/components/organisms/workout/TodayWorkout.jsx`, `src/lib/workout.js`. | Pool browsing, generation, compatible swaps, time accounting, approval versions, revalidation across copies/imports/manual additions and safe handling of absent sections. |
| Daily wellness | `src/components/organisms/workout/CheckInModal.jsx`, `src/lib/calc.js`. | Confirmed versus untouched defaults, missingness, health-change prompt and R2 adjustment policy. `adaptFromPlan` exists in `src/lib/workout.js` but has no callers in `src`. |
| Persistence | `src/store/DataContext.jsx`, `src/api/sync.js`, `src/lib/storage.js`, Supabase SQL files. | Schema contracts, backend validation, permission checks, local-mode limitations, atomic approval writes, failure handling and migration rehearsal. |
| Documentation | `README.md`, `CLAUDE.md`, `SETUP_BACKEND.md`, `SETUP_PRODUCTION.md`, `UX_Evaluation.md`. | Reconcile conflicting/stale descriptions. Current code supports Supabase with a localStorage mode; `CLAUDE.md` describes an older SQLite architecture. Do not migrate to SQLite merely to match that document. |
| Verification | `package.json` provides build and lint scripts. | A pooling-specific test strategy and automated test entry point. No pooling test suite was identified in this inventory. Existing code is not evidence that the new rules are validated. |

## Workstreams and dependency order

| Step | Workstream | Principal deliverables | Result |
|---|---|---|---|
| 1 | Agree scope and responsibility | P01, decisions D-01 through D-04 and D-11 | Who the first release serves, what it may decide and who approves it. |
| 2 | Specify source data and vocabulary | P02, D01–D04, C12 draft | Shared field meanings, source dates, missingness, state transitions and provenance. |
| 3 | Define and review domain content | C01–C08, C11–C12, Q03, U03 | A reviewed subset with traceable exercise, mapping, restriction and dose records. |
| 4 | Specify behaviour and interfaces | P03–P04, E01–E05, U01–U02 | Deterministic engine contract, backend boundaries, UX states and migration design. |
| 5 | Prove the R1 design and implementation | Q01–Q06 | Reviewed cases, automated tests, domain checks, privacy/security checks, migration evidence and coach acceptance. |
| 6 | Run a controlled R1 pilot | O01–O04 | Limited cohort, measured usefulness, support process and reversible rollout. |
| 7 | Extend after evidence and approval | P05/C09, then P06/C10 and updated reviews | R2 daily adjustments, followed by R3 progression and planning. |

Work can overlap after its prerequisites are stable: UX sketches and the test-case design can proceed alongside catalogue drafting; engineering can use clearly labelled synthetic fixtures while domain review is pending. Unapproved rules/content must not enter the live recommendation path.

## Review gates

The detailed reviewer matrix is in the [decision and review register](./DECISIONS_AND_REVIEWS.md). No gate is currently passed.

| Gate | Required evidence | Who must approve | What it permits |
|---|---|---|---|
| G1 — scope and definition | R1 scope, roles, intended population, state model, source rules, review responsibility and measurable acceptance criteria. | Product owner, engineering lead and relevant domain reviewer. | Detailed specification and non-executable UX design under the approved preparation scope; no application build yet. |
| G2 — implementation-ready R1 package | R1 PRDs; approved eligible catalogue subset and screening/restriction policy; UX; engine/data/API contracts; migration plan; expected-result test cases; source-rights decision. | Product, exercise-domain and applicable clinical reviewers, engineering, privacy/security and rights reviewers. | Implement the agreed R1 release. Content not approved remains quarantined. |
| G3 — pilot-ready build | Passing mandatory rule tests, no unresolved release-blocking safety/security/data-integrity issues, domain review of generated cases, usable UI, verified persistence/permissions, migration-and-restore rehearsal, pilot consent and rollback switch. | QA, domain reviewers, engineering/security, product and pilot owner. | Limited production pilot under the approved operating model. |
| G4 — wider rollout | Pilot results meet pre-agreed criteria; failed/overridden recommendations investigated; support and monitoring ready; production migration approval. | Product, pilot lead, engineering and relevant reviewers. | Expand R1 availability. |
| G5 — later automation | Separate R2/R3 PRD, reviewed thresholds/templates, retrospective case testing, pilot evidence and renewed safety/privacy review. | Same relevant roles for the changed scope. | Enable that specific extension, not blanket future automation. |

Reviewer roles are requirements, not appointments. A coach's content review does not replace a clinical, privacy or legal review where those are required. Unknown population, jurisdiction or reviewer authority remains an open decision.

## Non-negotiable design requirements to carry into the PRDs

- Missing or unassessed is not normal, cleared or green; a form default is not confirmed data.
- Use information effective for the target session date, with an explicit knowledge cutoff for historical replay and conflict handling for ambiguous same-period records. Never use a future assessment or later-known fact to justify an original historical decision.
- An unresolved restriction cannot expire silently or be overridden by a ranking score. A prior clearance is not blanket approval for new symptoms.
- Session-level hold/review status is separate from per-exercise eligibility. Define draft-save, assignment, start, substitution and resume transitions explicitly.
- Screening requirements apply across all entry points, including manual programming, templates, copies, voice-generated drafts and the athlete portal. Backend mode needs authoritative enforcement, not only disabled buttons.
- Local mode can share deterministic rules, but is not equivalent to authenticated backend enforcement. Production permissions and offline policy must be explicit.
- Movement-to-muscle associations are hypotheses unless appropriately confirmed. They do not diagnose an injury or justify a treatment claim.
- Preserve side, exercise variation, equipment requirements and structured restrictions through every substitution and copy.
- Rank only eligible options; return a visible coverage gap when none fit. Do not bypass constraints with generic warm-up/cool-down fallbacks.
- Distinguish measured performance, estimated maximums and library-derived relationships. Do not invent age, load, ability or current wellness.
- Preserve catalogue IDs, historical records, completed workouts and coach-approved plans. Changes require explicit revisions; an urgent restriction can invalidate future use without rewriting past performance.
- Explain each decision with structured reason codes, source references and rule/catalogue versions. Do not expose raw medical notes in athlete messages or analytics.
- No external LLM or new wearable integration is required for R1. Any later data sharing requires separate scope, privacy and permission decisions.

## Preparation versus implementation readiness

S1/S2 authoring is complete when the agreed documents, draft datasets, source/rights audit, UX/test specifications and review dossiers exist and pass document consistency checks. G2 implementation readiness additionally requires actual qualified acceptance of the admitted scope/content, resolved blocking decisions and explicit A12 build authorization. These are different states.

Traceability is recorded in the [verification report](./quality/TRACEABILITY_AND_VERIFICATION.md) and [package manifest](./preparation/PACKAGE_MANIFEST.json). No app code, real-client data, dependencies, hosted settings, Git commits/pushes, migration or deployment were changed. Formal reviews and executed application tests are not claimed.

See the [remaining approval bundle](./preparation/OPEN_DECISIONS.md) for the next gate; no further routine drafting answers are needed.
