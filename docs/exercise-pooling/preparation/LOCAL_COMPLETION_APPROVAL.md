# Remaining local completion — consolidated approval addendum

Version 0.6 · 7 September 2026 · **Owner approved, including A29, in conversation: “yes approve and allow”.**

This addendum follows the owner's request to map approvals first, then complete everything achievable locally. It does not revoke the already approved local R1–R3 build scope in version 0.5. No further application code, runtime installation, cleanup, external write or release is performed by preparing this document.

## Current baseline and priority

- Implementation checkpoint: `aa44aca`, branch `codex/exercise-pooling-local`; working tree was clean at inspection.
- Recovery reference: **Fitness Scribber Classic**, tag `fitness-scribber-classic-2026-09-07`, checkpoint `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`. Do not move this tag or alter the backup.
- Existing evidence: 67 unit tests, lint/build and extended synthetic browser checks passed. These are historical results for the recorded checkpoint, not a promise that later changes pass.
- Database authority/gateway SQL and Edge runtime verification remain incomplete. Prior base-database checks do not certify these additions.
- Latest disk inspection reported 1,599 MiB available. PostgreSQL commands were absent from PATH. Docker startup failure was previously recorded; it was not restarted during this mapping.
- Preparation and owner review of six PRDs/twelve catalogue artifacts are complete. No repeat product approval is requested. Professional evidence, numerical policy parameters and release acceptance remain separate.

## One decision now

The owner approved this local completion plan, including **A29**, a narrow exception to the later no-download/no-install restriction. A29 permits the local testing tools below only. All other restrictions on cleanup, shared Docker, Care, spending and production remain in force.

The owner need not reapprove ordinary edits, in-scope fixes, local commits or each sprint. Approval permits execution; it cannot guarantee runtime compatibility, capacity, successful tests or professional acceptance.

| Scope | Status / permission | Boundary |
|---|---|---|
| Local R1–R3 implementation | Already approved, A23/A28 | Complete source confirmation, selection, approval/runner integration, daily/progression/weekly workflows, administration, error handling and tests in existing React/Vite/Supabase architecture. No unrelated rewrite. |
| Local Git and Classic protection | Already approved, A22/local A17 | Scoped commits on the implementation branch; preserve main, tag, archive, existing user changes and secrets. No push, PR, merge or remote tag. |
| Synthetic services and tests | Already approved, A25/A26 | Existing local tools and localhost services, isolated test accounts/browser profiles, synthetic data. Stop only task-owned processes. Do not reuse signed-in client sessions or inspect live data. |
| **A29: isolated native testing runtime** | **Owner approved** | Download a free compatible PostgreSQL binary distribution from a provider linked by the official PostgreSQL macOS page; use existing tools first. Permit official Deno binaries only if necessary to execute the authored Edge code. Pin and record exact versions/source/integrity and review relevant licence/security information before execution. No remote install scripts. |
| Local synthetic recovery | Already approved, A27 | Restore into fresh exact paths; reset/recreate only validated task-owned disposable synthetic databases. Preserve Classic and all real records. No broad filesystem deletion. |
| Documentation and tracker reconciliation | Already approved local preparation/build scope | Reconcile stale approval/status labels against actual user decisions and test evidence. Track authored, locally verified and externally accepted separately. |

### A29 exact operating limits

1. Runtime archives, extracted binaries, logs and synthetic database files live under a new ignored project directory: `/Users/sharafathathimannil/Claude/Projects/Fitness Scribber/.local-test-runtime/`. Use a fresh task-owned subdirectory; never overwrite pre-existing content. Temporary sockets may use a fresh `mktemp -d` directory, recorded in the test manifest.
2. No `/Applications` installation, Homebrew/global packages, administrator commands, shell-profile edits, startup agents, system services, Docker reset/prune, shared-container change or Care access. Invoke binaries using explicit paths. Do not disable Gatekeeper, signature verification or other security controls.
3. No paid tools, subscriptions or cloud accounts. No hosted database connections or credential requests. Outbound access is for official documentation and permitted runtime assets only; do not upload source or client records as part of setup.
4. Inspect actual archive and expanded-size information plus expected synthetic database/temp usage before heavy writes. Keep at least 1 GiB available as an operating guard for this attempt, not a claim about the application's minimum requirement. Measure during setup; if the next step cannot fit or size cannot be bounded, skip it and continue independent work. This approval does not authorize cleanup to create space.
5. Prefer the same PostgreSQL major version as the prior synthetic harness when available; otherwise record the version difference and do not claim deployed-schema compatibility. A portable distribution may fail its path/security/compatibility checks; do not substitute a global install automatically.
6. Bind only to loopback or an isolated local Unix socket, on a verified unused endpoint, with task-specific synthetic authentication. Do not use a public interface or modify another service's port. Keep generated test credentials out of Git and logs.
7. Native PostgreSQL can test real SQL/RLS/concurrency. It does not itself reproduce Supabase authentication, REST/storage services or Edge hosting. Deno execution is not hosted integration proof. Any missing backend layer stays explicitly unverified; mocks do not count as equivalent.
8. Retain a manifest of created resources and their purpose. Database reset is limited to disposable fixtures after validating the exact target. No deletion of personal files, old caches, Docker images/volumes or the Classic backup under this bundle.

The official [PostgreSQL macOS distribution page](https://www.postgresql.org/download/macosx/) identifies native packages and binary-only options. [Postgres.app installation guidance](https://postgresapp.com/documentation/install.html) notes that alternate locations can have limitations. These establish a candidate route, not evidence that this machine's isolated setup works. Exact asset/version selection and footprint checks precede any download after approval.

## Work sequence and acceptance evidence

This decomposes the existing sprint rather than adding duplicate sprint tasks. Continue independent items whenever a dependency is unavailable.

| Order | Existing task references | Work still to complete | Evidence required |
|---|---|---|---|
| 1 | FP-301, FP-601 | Reconcile tracker; inspect existing test runtime; attempt bounded A29 setup if approved | Exact versions/paths, capacity checks, authenticated synthetic connection or precise blocker |
| 2 | FP-302–305 | Canonical identity, legacy preservation, input confirmation, source snapshot collection/normalization and context resolution | Missing/absent/unknown, sides/dates/units/conflicts, preserved originals and invalidation tests |
| 3 | FP-303, FP-306 | Versioned persistence, trusted decisions, protected client fields and atomic approval/start/resume | Real ordinary-role database tests and exact-version concurrency checks; separate gateway/auth-runtime evidence |
| 4 | FP-401–405 | Finish eligibility, ranking, coverage, reviewed dose, duration, substitutions and explanations/replay | Versioned synthetic reference cases; no unreviewed live catalogue admission or invented numerical policy |
| 5 | FP-501–505 | Complete pool/builder/health-change and runner workflows; all copy/template/manual/voice/client entry points | Exact coach approval, no inherited approval, stale-source checks, failure/retry/reload/offline and actual-history preservation |
| 6 | FP-507 | Canonical content/dose review, publication/retirement/revocation and audit tooling | Synthetic accepted-version and revocation cases; real candidate content remains unpublished without required evidence |
| 7 | FP-703, local FP-704 | Daily adjustment proposal/diff/accept-amend-reject workflow | Reviewed-parameter requirement, original-baseline effects, missing/skipped inputs and no silent assigned-target mutation |
| 8 | FP-803–804, local FP-805 | Progression, reassessment, weekly planning and batch approval | Comparable-history checks, explicit finding resolution, weekly constraints, atomic failure and preserved actuals/history |
| 9 | FP-506, FP-601, local FP-704/805 | Full achievable regression, integration, permissions, failure, concurrency, performance and accessibility checks | Actual results and defects linked to requirements; no mock-as-backend or smoke-as-full-accessibility claims |
| 10 | FP-307, local FP-603, FP-B11 | Final additive-schema migration and Classic/feature-off fallback rehearsal | Counts/references/new writes/actuals preserved; local test evidence is separate from hosted/live recovery |
| 11 | FP-605–606 local preparation, FP-B12 | Final runbooks, demonstration, readiness packet and handoff | Updated tracker; feature-by-feature authored/verified/blocked status, recovery steps, remaining human/hosted gates |

FP-701/801 drafting and the reviewed PRD/catalogue preparation are not to be recreated. FP-602/604/607/608/705 and external portions of FP-702/802/805 remain real review/pilot/release actions, not tasks the assistant can certify from local implementation.

## Defaults that avoid repeated product questions

- Keep the agreed single-coach account plus existing client portal model and approved PRD direction.
- Use synthetic adults and explicit fixture-only parameters to test approved engineering contracts. Do not treat a fixture as a professional recommendation.
- Missing clinical/numerical/equipment/goal information stays missing. Build the configuration/review path; do not invent live defaults or infer clearance.
- New features stay off by default. Approval/assignment/start/resume can be exercised only in the explicitly isolated synthetic test environment after applicable authority checks pass. No real-client assignment.
- Preserve legacy data, targets and actuals; use additive changes and separate approval history.
- Real catalogue publication requires exact accepted versions and appropriate evidence. Owner review is not relabelled as another person's signature.
- Continue to the next independent authorized task after a blocker. Do not stop merely to report a passing test or seek another routine sprint approval.

## Fully mapped exclusions and later approvals

These are not requested for this local run. Keep affected release actions disabled, prepare the needed forms/evidence, and report what remains. A general “approve” of this addendum does not authorize them.

| Later decision/evidence | What is needed | Why it cannot be completed by this local approval |
|---|---|---|
| Space cleanup/system/shared-runtime repair | Exact verified paths/resources and safe action approved by owner, or owner-managed space release | Current no-cleanup/no-shared-Docker rule remains. No blanket delete or reset. |
| Exercise/protocol/clinical acceptance | Named appropriate reviewers, scope, exact versions, accepted limits, exclusions, dates and applicable client-specific clinician instructions | Cannot fabricate professional competence, feedback or signatures. Unapproved paths remain unavailable. |
| R2/R3 numerical policies | Actual accepted thresholds, bounds, units, evidence windows and versioned rules | Fixture values are engineering tests only. |
| Content/instrument/media rights | Exact licensed assets, permissions and responsible acceptance evidence | No inferred licence or unapproved content publication. |
| Operator/privacy/markets | Business establishment, name/contact, exact activated countries, processors/regions, retention/consent/rights decisions and appropriate review | Previously accepted drafts cannot supply unknown facts or establish legal compliance. |
| Human output and usability acceptance | Actual authorized coach/client/domain review of generated versioned outputs | Automated tests cannot impersonate participants or approve their experience. |
| Hosted staging | Exact private non-production target/region, accounts, schema/data scope and spending limit | No new cloud infrastructure, hosted data access or upload is included now. |
| Off-device backup / Git remote | Exact private destination or repository, branch/tag, scope and deployment-trigger review | Current checkpoint/archive are local and same-device; no remote write now. |
| Live backup and migration | Exact live target, authorized data access, secure destination, retention, change window and post-backup-write recovery plan | Synthetic recovery cannot authorize or certify real-data recovery. |
| Deploy, pilot and wider rollout | Tested build/content versions, accepted cohort, relevant sign-offs, rollback authority and explicit release decision | Unknown future results and real-client exposure cannot be pre-certified. R1/R2/R3 enablement remains separate. |
| Material scope changes, purchases or security bypass | A specific new decision after describing the change/risk | Not normal implementation details; no inferred approval. |

## Completion and stopping rule

Aim to finish all locally achievable items above in a continuous execution run, fix in-scope defects and verify proportionately. Do not promise a date or uninterrupted operation across computer sleep, unavailable permissions or service failure. No separate agents/tasks, recurring automation or external coordination is created by this approval.

If A29 cannot safely run, continue all independent implementation/documentation/test work. Report database/auth/runtime-dependent verification as blocked with exact evidence; do not label authored SQL as tested or the whole system as complete. Stop for user action only when all remaining meaningful work requires an excluded action, missing permission, unavailable environment or external evidence.

Final delivery must separate: completed implementation; actual passing checks; partially implemented features; unexecuted tests; external release gates. It must include the local commit, runnable instructions and Classic recovery reference. No additional “build authorization” is required inside this scope after the owner accepts it.

**Decision recorded:** owner approved version 0.6 for the remaining local completion run, including the narrowly scoped A29 download/runtime permission above. All external, destructive, shared-system and live-release actions remain excluded.
