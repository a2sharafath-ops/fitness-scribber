# Backup to complete local build approval package

Version 0.5 · 7 September 2026 · **Owner approved local execution of A22–A28 in conversation.**
Project: Fitness Scribber. Recovery reference: **Fitness Scribber Classic**.

## Outcome and execution boundary

One approval can cover a continuous, dependency-ordered local engineering run: preserve Classic, verify code recovery, build R1 pooling/coach approval, build R2 daily proposals and R3 progression/weekly planning, test and repair, rehearse fallback, and deliver evidence. No routine sprint-by-sprint approval is requested within that scope.

This is NOT advance approval of unknown test results, specialist signatures, real-client pilots, production migrations or deployment. Complete local engineering and accepted live release are different outcomes. Any untestable component is reported incomplete, not silently counted as done. A same-day completion is an aim, not a promise; no unattended execution or completion guarantee follows from this document.

The owner has reported all six PRDs and twelve catalogue artifacts reviewed with nothing to change and directed R1 building. That is owner product acceptance, not verified clinical/legal/content-rights sign-off. The latest instruction explicitly requires this map first and consolidated approval before backup/build execution. No backup or application change is made by this mapping task.

## Verified starting conditions

- Classic code reference: `5de01b4e960e03e28d4a8b22527937103de10ad6`, on main when checked.
- Working tree: untracked docs; no tracked application edits reported.
- Repository history about 16 MB; documents about 10 MB; existing dependencies about 330 MB. Actual archive size will be measured.
- Available disk space approximately **2.5 GB** at inspection. The previously suggested 20 GB is an unmeasured safety allowance, NOT a prerequisite or measured requirement. Measure the small backup first, then check actual additional storage needs before database/browser downloads. Stop safely before exhausting storage; do not delete owner files.
- Git, Node and npm are available. Docker command exists, but access to its daemon was denied in the current execution context; daemon readiness is **unverified**, not assumed unavailable. PostgreSQL command-line tools were not found on PATH.
- Existing project commands cover build/lint/dev/preview. Dedicated pooling and backend test infrastructure must be added.
- No hosted database, deployment, secret value or real-client record was inspected by this mapping task.

## The single recommended approval bundle

Approving this version authorizes only the scopes below. These permissions complement the existing approval register; they do not rewrite historical approvals.

| Approval | What the owner can authorize once | Limits and safe defaults |
|---|---|---|
| A22 · Classic checkpoint and local backup | Read scoped project files; inspect staged changes for secrets; make local source/docs commits, a named immutable Classic tag, verified archive and Git bundle; create a separate implementation branch and temporary restore checkout. Extends A17 for local Git only. | No force reset, overwriting user changes, remote push or deletion. Exclude credentials, health exports, caches and dependencies. Preserve ignored/untracked files in place and inventory gaps. |
| A23 · Complete local R1–R3 engineering | Accept the prepared engineering/UX/data/test contracts as implementation direction; implement S3–S5, local S6 checks and local S7–S8 engines/UI/tests, integration fixes and documentation. Retain React/Vite/Supabase, local mode and existing client portal. | Explicitly permits early LOCAL R2/R3 implementation without waiting for real-client pilots. It does not waive pilot/evidence dependencies for acceptance or enablement. No unrelated redesign or native app rewrite. No model-generated clinical limits. |
| A24 · Development dependencies | Use existing runtimes; add necessary free project-local test/build packages, lockfiles and browser binaries; download required local testing dependencies from official sources/registries after license/security review. | No paid services, global/system installers, broad dependency upgrade, third-party runtime integrations or arbitrary remote scripts. New runtime dependencies require clear need within existing scope. |
| A25 · Isolated database testing | Use an available local Docker runtime with isolated synthetic Supabase/PostgreSQL services; create local schemas/accounts/fixtures, perform permission/concurrency tests and restore disposable synthetic databases. | No live credentials or data; no host-directory mounts beyond exact test paths; no deletion/pruning of unrelated Docker resources. If runtime permissions/install remain unavailable, request that specific setup and mark database tests blocked. Mock tests do not prove backend security. |
| A26 · Local verification services | Start localhost development/test services, use a separate synthetic browser profile, run automated UI and accessibility checks, build/lint/test, stop only task-owned services. | Never reuse a signed-in client profile or clear real local storage. Do not expose the app publicly. Do not print environment secrets. |
| A27 · Non-destructive recovery rehearsal | Extract backups and restore code into new isolated paths; test Classic and feature-off flows; reset ONLY disposable synthetic fixtures in exact validated test resources. | No database rewind, checkout destruction, deleting user files, restoring over the source project or automatic production recovery. |
| A28 · Gated defaults and scope discipline | Keep new features disabled by default outside explicit local synthetic test mode. Allow local fixture-only numerical rules to test engineering; production admission requires real scoped evidence. Continue independent authorized tasks if another component is blocked. | No fake signatures, invented permissions, clinical dosing defaults, production seed promotion, country activation or policy publication. No real-client use or external coordination. |

Local backup destination proposed: `.recovery/fitness-scribber-classic/` in the project, explicitly ignored and excluded from its own archive. The implementation checkout must not overwrite this destination. Store no secrets or health records there. It is an independent archive/bundle on the **same device**, not protection against disk loss. An additional off-device copy is recommended, but requires an exact owner-approved private destination. No claim of permanent disaster recovery until that copy exists and is verified.

The local restore directory will be a freshly created temporary directory. New code lives on a `codex/` feature branch; main and the Classic tag remain unchanged after the baseline checkpoint. Routine scoped local commits are allowed; backups are not committed recursively.

## Setup needed before leaving the computer

1. No fixed 20 GB cleanup is required to begin the small backup. Authorize measurement first; additional space or another permitted volume is needed only if the measured next operation cannot fit safely. I will not choose personal files to delete.
2. Ensure Docker Desktop or another compatible local Docker daemon is available and running. Approve any scoped tool access required by the execution environment; no passwords/keys should be pasted into chat. If a system installation is needed, the owner handles it or grants a separate exact installation scope.
3. Keep the computer powered, awake and connected while this task executes. A single instruction is not a guarantee that the app will run while the machine sleeps or loses access.
4. Approve the bundle above when safely parked. Driving does not require monitoring the screen; do not review or operate it while driving.

With these defaults there is no need to provide live credentials, reviewer signatures or production accounts to BEGIN the local engineering run. Missing professional evidence keeps affected automated content disabled. No separate tasks/agents, recurring automations or external project-management boards are part of this bundle.

## Sign-offs and permissions that remain separate

| Gate | Responsible decision/evidence | Effect if absent |
|---|---|---|
| Product acceptance | Owner's reported acceptance of six PRDs and twelve catalogues, plus acceptance of the technical/UX/test working direction in A23 | Product review report recorded as owner's statement; later requested scope changes require evaluation. |
| Exercise and protocol acceptance · A07/A08 | Qualified reviewer identity, role/scope, accepted exact records/version, exclusions and review date; instrument administration competence | Build review/admission workflow, but do not promote unknown records to live automated eligibility. |
| Clinical and numerical-policy acceptance · A07/A20/A21 | Appropriately authorized clinician where needed; exact clinical pathways, thresholds/bounds/units/evidence windows and client-specific instructions | Null parameters remain null; dependent outputs say review/unsupported. Fictional fixtures stay isolated. |
| Rights acceptance · A08 | Exact asset/instrument/media rights and allowed use, with evidence from a responsible rights reviewer | No copying or publishing unlicensed questionnaires/media or auto-admitting legacy content. |
| Privacy/security acceptance · A05/A16 | Operator name/contact/establishment, exact markets, providers/regions, retention, lawful processing and consent wording; qualified legal/privacy review as appropriate | Draft policy not published; no real health data or client launch. Test security technically without claiming legal compliance. |
| Generated-output acceptance and user acceptance · A15 | Actual outputs reviewed by appropriate people; authorized coach/client acceptance sessions and pilot criteria | Automated tests can pass; human acceptance/pilot tasks remain pending. |
| Hosted staging · A13 | Exact non-production project, region, accounts, allowed schema/data actions and cost limit | Use local synthetic environment. Hosted-equivalence/staging checks remain unverified. |
| Off-device backup or GitHub · A17 | Exact private destination/repository and branch/tag; permission for remote writes and awareness of deployment triggers | Local backup only. No push, PR, merge or remote tag. |
| Production backup/migration · A18 | Exact live target, authorized data access, secure backup destination, retention, version/window, verified recovery and reconciliation of later writes | No live backup or migration. Local rehearsal must not be labelled live recovery certification. |
| Deploy/pilot/enablement · A19/A20/A21 | Tested exact build and content versions, relevant sign-offs, supported cohort, rollback authority and explicit release decision | Deliver a disabled/local build; no Vercel production change, client rollout or auto-assignment. |

No signature is required from the assistant: I create evidence and implement safeguards, not professional attestation. A general owner approval cannot stand in for another person's signature or a not-yet-performed test. If reviewers have already signed, their real evidence may be supplied securely later; no need to invent or repeat review to perform isolated engineering.

## Added backup and recovery tasks

The machine-readable sprint now contains **82 tasks: the existing 70 plus these 12**. SB spans preflight and final recovery; it is not a calendar estimate.

| Task | Work | Exit evidence | Dependencies |
|---|---|---|---|
| FP-B01 | Inventory and freeze Fitness Scribber Classic | Record exact commit, tracked/untracked changes, app/build/runtime versions, safe file inventory and disk capacity; do not expose secrets. | None |
| FP-B02 | Create named local Git checkpoint | Inspect for secrets and sensitive exports before staging; commit scoped source/docs and create a non-moving Classic tag; preserve all user changes. No remote push. | FP-B01 |
| FP-B03 | Create and verify independent local recovery archive | Create source/docs archive plus Git bundle outside the implementation checkout in an ignored recovery directory; manifest/checksums verified. Exclude secrets, client exports, dependencies and generated caches. Same-device copy is not off-device disaster protection. | FP-B02 |
| FP-B04 | Inventory configuration and data recovery coverage | Record environment-variable names only, ignored-file categories, assets, local browser-storage use and hosted dependencies; identify gaps. No secret or real-client-data export. Document secure owner-managed configuration recovery. | FP-B01 |
| FP-B05 | Establish Classic build and workflow baseline | Run existing build/lint and record existing failures; exercise critical workflows only in a synthetic isolated profile with hosted connections disabled. | FP-B02, FP-B04 |
| FP-B06 | Rehearse code restore in a separate checkout | Restore verified archive/bundle to a new exact directory, reconstruct dependencies, compare manifest and run baseline checks without overwriting the working project. | FP-B03, FP-B05 |
| FP-B07 | Prepare real-data backup and recovery prerequisites | Document database, storage objects, auth/config and browser-local-data coverage, destinations, retention and post-backup-write reconciliation. No hosted backup executed under local permission; live recovery remains unverified until separately authorized. | FP-B04 |
| FP-B08 | Verify isolated synthetic database and recovery harness | Use approved local database/runtime; test owning coach/client permissions and synthetic backup/restore. Failure or unavailable backend leaves backend verification incomplete, never substitutes a mocked permission test. | FP-B05 |
| FP-B09 | Specify Classic fallback and independent feature controls | Map all changed entry points, R1/R2/R3 off defaults, schema compatibility and preservation of new records when disabled. Record explicit no-destructive-restore boundaries. | FP-B01, FP-B04 |
| FP-B10 | Accept local backup and build preflight | Code archive and restore rehearsal pass; adequate storage/config coverage known; exact local runtime access resolved; sign-off gaps remain disabled. Record go/no-go for local implementation only. | FP-B06, FP-B07, FP-B08, FP-B09 |
| FP-B11 | Rehearse Classic fallback after the whole local build | Test all new features off; test Classic code against additive synthetic schema and records written after migration; verify counts/references/actuals and failure containment. Diagnose incompatibility instead of claiming guaranteed rollback. | FP-B10, FP-307, FP-601, FP-703, FP-804 |
| FP-B12 | Deliver final local build and recovery evidence | Deliver runnable local R1-R3 engineering scope, actual test/build/lint results, comparison with Classic, recovery instructions and remaining specialist/hosted/pilot gates. Never report live release or professional acceptance from local tests. | FP-B11, FP-704 |

## Execution sequence and completion rules

1. Execute FP-B01 through FP-B10 as their dependencies permit. No app implementation before the backup/preflight passes.
2. S3: identity, additive persistence, explicit source states, deterministic context, authoritative permissions and synthetic migration preservation.
3. S4: session eligibility, exercise filtering, ranking/coverage, dosage resolution, time budgeting, compatible swaps and rationale/replay.
4. S5: coach/client UI, generation/edit/approval, health-change checks, copy/template/manual/voice entry points, offline/conflict/failure handling and catalogue governance.
5. S6 local portion: regression, backend permission/concurrency, failure, performance, accessibility and synthetic migration checks. Repair in-scope defects. Real human review, staging, pilot and deployment are not simulated as accepted.
6. S7 local portion: implement daily proposals, configuration/parameter requirements, approval workflow and tests. Keep unapproved numerical policy disabled.
7. S8 local portion: implement progression/regression, weekly planning, reassessment proposals and tests. Keep unsupported clinical scope and unapproved policy disabled.
8. FP-B11: repeat feature-off and Classic compatibility/recovery tests against the final synthetic schema including writes added after migration. A feature switch must disable proposal generation without dropping new records or bypassing existing approval/restriction checks.
9. FP-B12: deliver the local build, demo instructions, test evidence, known limitations, Classic recovery procedure and exact remaining release decisions.

Original task dependencies below remain authoritative for FULL acceptance and live release. A23 grants only the identified local engineering portions an earlier path. Track localImplementationStatus and localVerificationStatus separately; never mark a combined domain/pilot/release task complete from a local test.

Recovery hierarchy: disable affected new feature first; restore Classic CODE only if compatible with current schema/data; use reviewed forward repair if not; restoring a real database is a separately authorized last-resort action with post-backup-write reconciliation. Returning to Classic is not a promise that every future schema can run the old binary indefinitely.

## Every existing sprint task retained

Detailed original acceptance criteria and dependencies remain in [the sprint backlog](../SPRINT_BACKLOG.md) and [machine-readable tracker](../sprint-backlog.json). This inventory lists every original task; it does not mark them executed.

| Task | Sprint | Work | Original dependencies |
|---|---|---|---|
| FP-001 | S0 | Convert the readiness map into a traceable sprint backlog and approval checklist | None |
| FP-002 | S0 | Record your initial scope, operating facts, reviewers and preparation permission | FP-001 |
| FP-101 | S1 | Draft master PRD, R1 boundary and requirement IDs | FP-002 |
| FP-102 | S1 | Inventory fields and reconcile architectural documentation | FP-101 |
| FP-103 | S1 | Specify assessment reliability and context resolution | FP-102 |
| FP-104 | S1 | Define stable vocabulary, lifecycle and authority contracts | FP-102 |
| FP-105 | S1 | Draft pool eligibility, ranking and explanation PRD | FP-103, FP-104, FP-114 |
| FP-106 | S1 | Draft session generation, substitution and approval PRD | FP-103, FP-104, FP-114 |
| FP-107 | S1 | Prepare coach/client wireframes and accessible copy specification | FP-105, FP-106 |
| FP-108 | S1 | Specify deterministic engine contract and reason traceability | FP-105, FP-106 |
| FP-109 | S1 | Specify backend persistence, permissions and atomic approval | FP-108, FP-104 |
| FP-110 | S1 | Design migration, identity preservation and rollback | FP-102, FP-104, FP-109 |
| FP-111 | S1 | Map integration entry points, configuration and failure behaviour | FP-108, FP-109 |
| FP-112 | S1 | Draft synthetic reference cases, test coverage and CI strategy | FP-105, FP-106, FP-108 |
| FP-113 | S1 | Draft pilot measures and privacy/security acceptance criteria | FP-101, FP-109, FP-111 |
| FP-114 | S1 | Prepare and record the G1 scope review | FP-101, FP-102, FP-103, FP-104, FP-115, FP-117 |
| FP-115 | S1 | Define expanded adult/advanced/adaptive/rehabilitation scope and reviewer authority | FP-101 |
| FP-116 | S1 | Draft client-app privacy, participation, health-data and clinician-sharing documents | FP-102, FP-115 |
| FP-117 | S1 | Map intended international markets and country-specific launch reviews | FP-101, FP-115 |
| FP-201 | S2 | Audit evidence, source provenance and content permissions | FP-101, FP-102 |
| FP-202 | S2 | Draft catalogue schemas and populate the candidate exercise subset | FP-104, FP-201 |
| FP-203 | S2 | Draft the assessment/protocol catalogue | FP-103, FP-104, FP-201 |
| FP-204 | S2 | Draft finding-to-need mappings with confirmation requirements | FP-203, FP-104 |
| FP-205 | S2 | Draft screening, restriction, clearance and referral rules | FP-103, FP-104, FP-201 |
| FP-206 | S2 | Draft goal structures and dosage/loading templates | FP-202, FP-201, FP-106 |
| FP-207 | S2 | Draft substitution families and session/preparation templates | FP-202, FP-205, FP-206 |
| FP-208 | S2 | Finalize reason codes and coach/client explanations | FP-204, FP-205, FP-107 |
| FP-209 | S2 | Prepare review cases and record qualified content/policy feedback | FP-112, FP-201, FP-202, FP-203, FP-204, FP-205, FP-206, FP-207, FP-208, FP-212, FP-213 |
| FP-210 | S2 | Define catalogue publishing, retirement and maintenance workflow | FP-104, FP-201, FP-202, FP-205 |
| FP-211 | S2 | Assemble G2 implementation package and request explicit build approval | FP-107, FP-108, FP-109, FP-110, FP-111, FP-113, FP-209, FP-210, FP-116, FP-214 |
| FP-212 | S2 | Extend catalogue coverage for advanced and individual adaptive/clinical contexts | FP-104, FP-115, FP-202, FP-203 |
| FP-213 | S2 | Specify clinician handoff, instruction provenance and client-sharing evidence | FP-104, FP-115, FP-116, FP-205 |
| FP-214 | S2 | Complete market policy review packs and record applicable professional acceptance | FP-116, FP-117, FP-109 |
| FP-301 | S3 | Set up isolated implementation branch, test harness and disabled feature flag | FP-211, FP-B10 |
| FP-302 | S3 | Implement stable catalogue identity and legacy-reference mapping | FP-301 |
| FP-303 | S3 | Implement additive local schema and versioned persistence contracts | FP-301 |
| FP-304 | S3 | Implement explicit assessment/source states and input confirmation | FP-302, FP-303 |
| FP-305 | S3 | Implement deterministic client-context resolver | FP-302, FP-303, FP-304 |
| FP-306 | S3 | Implement authoritative permissions and approval transactions | FP-303, FP-305 |
| FP-307 | S3 | Run synthetic migration and preservation tests | FP-302, FP-303, FP-304, FP-306 |
| FP-401 | S4 | Implement session eligibility and per-exercise filtering | FP-305, FP-306 |
| FP-402 | S4 | Implement role-specific ranking, coverage and redundancy handling | FP-401 |
| FP-403 | S4 | Implement reviewed dosage and loading resolution | FP-305, FP-401 |
| FP-404 | S4 | Implement time-budgeted session composer and compatible alternatives | FP-402, FP-403 |
| FP-405 | S4 | Implement rationale snapshots, versions and engine replay tests | FP-401, FP-402, FP-403, FP-404 |
| FP-501 | S5 | Add the client Exercise Pool view | FP-402, FP-405 |
| FP-502 | S5 | Integrate draft generation, compatible swaps and approval in builder | FP-404, FP-405, FP-501 |
| FP-503 | S5 | Integrate minimal health-change reporting at workout start | FP-304, FP-401, FP-405 |
| FP-504 | S5 | Enforce checks across copies, templates, manual/voice and athlete flows | FP-502, FP-503, FP-306 |
| FP-505 | S5 | Implement stale-plan, conflict, failed-save and offline handling | FP-502, FP-503, FP-504 |
| FP-506 | S5 | Finish mobile, keyboard and client-facing explanation QA | FP-501, FP-502, FP-503, FP-505 |
| FP-507 | S5 | Implement controlled catalogue validation and version promotion tooling | FP-302, FP-306, FP-210 |
| FP-601 | S6 | Run complete regression, permissions, failure and performance suite | FP-405, FP-504, FP-505, FP-506, FP-507 |
| FP-602 | S6 | Obtain domain acceptance of generated R1 cases | FP-601, FP-209 |
| FP-603 | S6 | Rehearse deployed-schema migration and recovery in authorized staging | FP-601, FP-307 |
| FP-604 | S6 | Run authorized coach/client acceptance sessions | FP-601, FP-506 |
| FP-605 | S6 | Prepare release runbooks, help and maintenance handoff | FP-505, FP-507, FP-113 |
| FP-606 | S6 | Prepare G3 pilot-readiness evidence and request external-action approvals | FP-602, FP-603, FP-604, FP-605 |
| FP-607 | S6 | Execute explicitly authorized version-control, migration and limited pilot release | FP-606 |
| FP-608 | S6 | Review pilot results and request/execute scoped G4 rollout | FP-607 |
| FP-701 | S7 | Draft daily-adjustment PRD, reviewed source rules and test cases | FP-608 |
| FP-702 | S7 | Obtain R2 policy review and G5 implementation approval | FP-701 |
| FP-703 | S7 | Implement bounded daily suggestions and approval workflow | FP-702 |
| FP-704 | S7 | Validate R2 failure, privacy, domain and usability cases | FP-703 |
| FP-705 | S7 | Pilot and release R2 only after separate enablement approval | FP-704 |
| FP-801 | S8 | Draft progression, reassessment and weekly-planning requirements | FP-705 |
| FP-802 | S8 | Obtain R3 domain review and G5 implementation approval | FP-801 |
| FP-803 | S8 | Implement progression/regression suggestion engine | FP-802 |
| FP-804 | S8 | Integrate weekly planning and reassessment proposals | FP-803 |
| FP-805 | S8 | Validate, pilot and obtain final scoped R3 release acceptance | FP-804 |

## When an interruption is genuinely necessary

Routine edits, test failures and fixes inside approved scope do not need new prompts. Continue independent authorized work while investigating a blocker. A fresh decision is necessary for secrets or permissions unavailable to tools; insufficient storage; unavailable database runtime; meaningful scope expansion; paid/system installation; new external destination; destructive user-data recovery; unresolved safety/security/data-loss issues; or actual professional/live-release approval.

Do not repeatedly ask for unchanged missing sign-offs. Keep affected live functionality disabled and record the release gate. If backend verification cannot run, explain precisely what remains untested rather than pretending the full engineering outcome is complete.

## Final handoff checklist

- Classic exact code reference, local tag, archive/bundle paths, checksums, contents/exclusions and tested restore evidence.
- Full feature-by-feature implementation and verification status for R1/R2/R3, including disabled or incomplete parts.
- Actual lint/build/unit/integration/UI/backend results and baseline-versus-new failures; no tests counted from specifications alone.
- Migration and feature-off compatibility evidence preserving synthetic records created after the baseline.
- Secure configuration setup guide without secret values; local run instructions and a separate live-release checklist.
- Updated sprint states and a short owner summary of what can be demonstrated locally and what still needs external acceptance.
- No live-data modification, remote push, merge, deployment or client communication under this default package.

**Decision recorded:** the owner explicitly approved version 0.5's local backup-to-build bundle A22–A28 (including local-only A17 commits and early isolated R2/R3 engineering), with the stated disabled-feature and no-production boundaries. Storage/runtime setup must be ready before dependent execution. This approval does not certify tests or professional reviews.
