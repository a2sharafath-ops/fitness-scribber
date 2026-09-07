# Exercise pooling — requirements and approvals needed from you

## Current update — 7 September 2026

Owner reports all six PRDs and twelve catalogues reviewed with no requested changes, accepts them as-is and has directed local building. No reviewer identities or professional evidence have been supplied. The latest request pauses execution for a single mapped backup/recovery/full-local-build approval package. [Version 0.5](./preparation/BACKUP_TO_BUILD_APPROVAL.md) introduces A22–A28, records storage/runtime prerequisites and explains the proposed early isolated R2/R3 engineering path. Those new scopes await approval. Original A07–A21 retain their specialist/external/live-action boundaries; historical preparation-only statements below are not a denial of the owner's newer R1 build direction.

Status: whole-system document/rule/test/runbook preparation is approved and complete. A20/A21 preparation is now approved; their build/enablement and other external/professional permissions remain pending. See the [expanded record](./preparation/FULL_PREPARATION_APPROVAL.md).

## What I need initially

You do not need to write the PRDs or make database-level design choices. I will draft the requirements, catalogue structures, engineering designs and tests. You provide the business facts, confirm the proposed scope and identify who can approve domain-sensitive content.

| ID | What I need from you now | Proposed default / requested information | Why it matters |
|---|---|---|---|
| A01 | Intended clients — scope supplied | Adults at beginner/intermediate/advanced levels; general fitness, special needs and rehabilitation. Detailed coverage, professional boundaries and supported clinical/adaptive pathways still need review. | Determines catalogue coverage, assessments, restrictions and reviewer competence. Product scope is not a clinical eligibility rule. |
| A02 | Product scope and decision authority — confirmed | Staged R1 pools/drafts/swaps, R2 daily suggestions, R3 progression/planning; assignment only after coach approval. The app does not grant medical clearance or silently change assigned sessions. | Prevents treating a draft or coach programming approval as clinical authorization. |
| A03 | Coaching working defaults — approved for preparation | Approved working defaults cover seven goal pathways, actual gym/home/travel inventory and existing 30/45/60/90-minute budgets. Individual priorities, kit and ability are collected per client, never invented; source and clinical acceptance remain pending. | Lets me write a practical coverage matrix and acceptance cases. No identifiable client records are needed now. |
| A04 | Decision-makers and reviewers — recommendation requested | See the reviewer recommendation in the preparation folder. Product owner approves product choices; exercise/clinical/privacy reviewers remain unassigned. Personal credentials are not needed merely for drafting; authority must be established before relying on professional approval. | I can prepare review packs, but cannot supply human professional sign-off. Product/content review and client-specific clinical authorization are distinct. |
| A05 | Operating context — partly supplied | Intended markets: India, GCC, USA, UK and Europe. One coach plus a client app. Business/coach name and email undecided; legal establishment and exact launch markets remain unknown. New privacy/consent drafts requested; final retention and provider terms need verification/review. | Determines roles and regional review scope without mistaking a market list for the operator's legal location. |
| A06 | S1–S2 preparation — explicitly approved | Documentation, catalogue drafts, source research, non-executable UX specifications and test specifications in this local repository only. No application code, package installs, account changes, real-client data access, paid services, GitHub writes or deployment. | Keeps the pre-build pause. G2 acceptance and explicit A12 permission are required before starting S3. |

Source research under A06 means reading relevant official/primary public material and recording its applicability/rights. It does not mean copying protected questionnaires/manuals into the product or treating sources as professional approval.

## Before application implementation (G2)

These are visible now so there are no surprise prerequisites. I can draft proposals for these during S1–S2; you need not answer all of them in the initial reply.

| ID | Requirement / approval | What must be recorded | Scope boundary |
|---|---|---|---|
| A07 | Adopted screening and review policy | Exact instrument/version, supported population, review/clearance authority, new-health-change handling and appropriate qualified sign-off. | Your product approval does not replace professional review. An old clearance must not automatically cover new symptoms. |
| A08 | Reviewed catalogue and content rights | Approved R1 coverage; exercise/mapping/dose reviews; permission or applicable usage basis for imported content, questionnaires, images and videos; exclusions for unreviewed material. | Citations alone are not a licence. Missing rights or content approval keeps affected records out of live automation. |
| A09 | Data interpretation and preservation policy | Accept/amend explicit unknown/stale/conflict states, historical-assessment ambiguity handling, stable exercise IDs and preservation of completed workouts/custom edits. | Approval of a migration design is not permission to run it on production. |
| A10 | UX, roles and offline policy | Approve the main journeys, approval/hold states, private versus client-visible information, coach/team/admin rights and limits of local/offline operation. | We will not claim local-only checks are equivalent to backend enforcement. |
| A11 | Technical direction and development boundaries | Confirm continuing React/Vite/Supabase with compatible local mode, intended staging/preview approach and an isolated `codex/` working branch when implementation is authorized. Existing navigation is extended; a full redesign or new admin CMS is not assumed. | No provider migration, new paid dependency or external integration implied. |
| A12 | Explicit R1 build authorization | Approve the versioned G2 package and S3–S5 local implementation/testing scope. List any conditions and excluded tasks. | Permits scoped coding/tests, not remote push/PR creation, hosted database changes, production deployment or client communications. |
| A13 | Approved non-production access | Identify the exact development/staging Supabase project, preview environment and synthetic coach/athlete/admin accounts. Separately authorize any hosted staging provisioning/schema writes. Optional production metadata inspection must be read-only and specifically authorized. | Use secure existing tool/auth/environment setup. Do not paste passwords, service-role keys or identifiable health records into chat or the backlog. If unavailable, specify a local synthetic environment instead. |
| A14 | Cost and third-party boundary | Default: no new spend, subscriptions, paid APIs, new LLM sharing or new wearable integrations. Approve any specific paid service/reviewer engagement separately, with scope and limit. | I will not purchase, contact/hire reviewers or share data merely because a task mentions them. |

A12 is the explicit pre-build stop. No G2 gate is passed merely by drafting a specification. If a reviewer is unavailable, unaffected document preparation can continue; live use of unapproved clinically consequential rules cannot. Any narrower non-clinical prototype would require its own explicit scope approval rather than silently bypassing G2.

## Before pilot, remote writes or production rollout

| ID | Requirement / approval | What must be recorded | Scope boundary |
|---|---|---|---|
| A15 | Pilot and quality criteria | Named pilot/support owner, agreed participants and authority/consent to involve them, baseline measures, success thresholds, stop criteria and defect/review severity policy. I will propose measurable criteria before the pilot. | No client invitation, notification or use of real records without scoped authorization. |
| A16 | Privacy and security acceptance | Role/access test evidence, health-data visibility, telemetry minimization, retention/export/deletion rules, consent/policy review and incident handling for the operating context. | Technical tests do not by themselves certify legal compliance. |
| A17 | GitHub/version-control writes | At the relevant milestone, specify whether to commit locally, push a named branch, open a PR, merge to main and/or tag a release. Recommended: reviewed feature branch/PR workflow. Identify any automatic preview/production deployment caused by a push. | Previous requests to push main are not blanket permission for this future project. No commit/push/merge is currently authorized by this planning request. |
| A18 | Production data migration | Exact target project/environment; reviewed migration version; backup and tested recovery evidence; permitted window; expected effects and rollback authority. | Separate explicit approval before production writes; no bulk deletion, overwrite or irreversible cleanup assumed. |
| A19 | Pilot deployment and wider enablement | Approve the specific build/catalogue/rule versions, environment and limited cohort after G3. Give a separate G4 decision before widening rollout. Record who may pause the feature and authorize recovery actions. | Deployment, pilot enablement and broad availability are separate checkpoints. GitHub approval alone does not imply production approval. |

## Before later releases

| ID | Requirement / approval | What must be recorded | Scope boundary |
|---|---|---|---|
| A20 | R2 preparation approved; build/enablement pending | Authorize its preparation, then approve the reviewed PRD/rule thresholds and bounded local implementation, then accept test/pilot evidence before enablement. Identify whether any wearable data is actually available and approved for use. | No automatic dose mutation, additional client-data sharing or deployment implied by a general R2 request. |
| A21 | R3 preparation approved; build/enablement pending | Authorize its preparation, then approve performance comparability, progression/reassessment/weekly-planning rules and implementation, then accept test/pilot evidence before enablement. | Saved/finished workouts remain preserved; each material expansion gets a G5 review. |

A20/A21 each require separate recorded preparation, build and enablement checkpoints, not one advance blanket approval. A13–A19 still apply to any relevant external actions in those releases.

## What I will own

- Draft the PRDs, catalogue schemas/candidate content and data/state contracts.
- Reconcile current code with the specifications; propose technical choices and explain material trade-offs.
- After build approval, implement scoped tasks, write tests, prepare migrations and verify local/staging behaviour.
- Prepare review packs, record actual reviewer feedback and fix findings within scope.
- Maintain backlog status, traceability, demos, release evidence and handoff documentation.
- Escalate genuinely new decisions or consequential actions, without asking you to approve routine code edits already within an approved build scope.

I do not assume permission to create separate running Codex tasks, delegate to other agents, install project-management tools or schedule unattended/background work. This is a local sprint backlog for this project. Those would be separate workflow choices if desired.

## Remaining inputs during preparation

Initial answers have been received; the user does not need to repeat the six-item template. No further routine inputs are needed for preparation. Before acceptance/activation, the operator's legal establishment/contact details, exact first launch jurisdictions, reviewer assignments and actual provider/retention facts remain required. Individual goal/kit/ability facts belong to later client workflows. Drafting may continue with clearly marked unknowns; missing professional or legal review prevents the relevant gate from passing, not all document preparation.

Silence, a preselected UI option or an unanswered field is not approval. Acceptance of proposed defaults does not invent qualifications, content ownership, consent or professional sign-off.

## Approval record fields

For each actual approval, save its ID, exact scope/artifact version, approver and authority, date, conditions, permitted environment/action, expiry or change triggers and evidence/reference. Split scopes where one person cannot authorize everything. Current state: A01 scope, A02 staged/coach-approved direction, A03 working defaults and A06 complete preparation brief approved; A04 reviewer appointments and A05 operating facts remain incomplete. A07–A21 remain pending as formal acceptance/action permissions; acceptance of A09–A11-related working assumptions for drafting is not G2/A12 or external-action authority. See the actual approval record for the evidence and limits.

## Traceability to the earlier decision register

| Earlier decision | User input/approval references |
|---|---|
| D-01 | A01 |
| D-02 | A02, A07, A10 |
| D-03 | A02, A06, A12 |
| D-04 | A07, A08 |
| D-05 | A03, A08 |
| D-06 | A09 |
| D-07 | A09, A18 |
| D-08 | A09, A11 |
| D-09 | A08, A11 |
| D-10 | A10, A11, A13 |
| D-11 | A04 |
| D-12 | A05, A16 |
| D-13 | A05, A10, A16 |
| D-14 | A15 |
| D-15 | A17, A18, A19 |
| D-16 | A01, A07, A16 |
| D-17 | A20 |
| D-18 | A21 |

The expanded voice approval authorizes all independently authorable preparation, including early R2/R3 and operational drafts. This supersedes earlier “preparation deferred/unapproved” wording only. No professional sign-off, unresolved individual/business fact, build, hosted access, spending/contact or deployment permission is inferred.
