# P01 — Client Exercise Pooling: master PRD

Version: 0.1, 2026-09-05. Status: draft awaiting product/domain review. Preparation is approved; implementation, clinical content, policy publication and deployment are not.

## Problem and outcome

The current app collects screening, assessments, goals, wellness and workout history, but does not turn them into one explainable, consistently constrained exercise pool. The coach must connect much of this information manually. R1 should let the coach inspect suitable options, create a session draft, review its reasons and approve assignment without leaving the existing workflow.

## Confirmed product instructions

- Adult clients at beginner, intermediate and advanced training levels.
- General fitness plus support for special needs and rehabilitation.
- One operating coach with one coach sign-in.
- A client-facing app; intended service markets India, GCC, USA, UK and Europe.
- Staged R1/R2/R3 delivery; assigning only after coach approval.
- Planning must account for priority goals, gym/home/travel setting and actual available equipment.
- S1–S2 preparation only is authorized now.

The detailed goal hierarchy, session durations, specialist cases, business establishment, exact enabled countries/states, reviewer competence and client-app packaging/authentication details are not yet confirmed. Name/email are undecided. Do not replace the wider requested scope with the former beginner/intermediate-only proposal, and do not claim that broader product scope approves every clinical pathway or live jurisdiction.

## Proposed operating model requiring review

Separate training level from clinical/functional context. A highly experienced client can have a current clinical restriction; a disabled client may need an accommodation without needing a medical exercise prohibition. Avoid a single “special-needs workout” pool.

Proposed contextual pathways:

1. General training within the coach's verified competence and the adopted screening policy.
2. Adaptive training based on individual functional/accessibility needs and reviewed accommodations.
3. Clinician-guided rehabilitation/return-to-training: recorded professional instructions, scope, supervision, limits and reassessment requirements; only supported reviewed modules can generate suggestions.
4. Unresolved/unsupported context: visible review requirement or coverage gap. No fabricated rehabilitation plan or generic fallback to evade a restriction.

Actual clinical rules, use-case coverage and referral language require the relevant professional review. The app's decision support does not diagnose, prescribe treatment independently, grant clearance or promise injury prevention. A client's consent does not expand the coach's lawful professional scope.

## Users and authority

| Actor | Proposed role | Open boundary |
|---|---|---|
| Operating coach | Maintains client context, reviews/edits drafts, records actual evidence and approves assignments. | Qualifications and exact scope remain to be confirmed. No shared credentials. |
| Client | Uses the confirmed client app to supply information/consent and receive agreed coaching services. | Propose separate authenticated limited accounts, never the coach's credentials. Native app/PWA/web packaging remains undecided; current athlete portal is not removed during preparation. |
| External reviewer/clinician | Supplies scoped policy/content review or client-specific instructions when applicable. | Named people and workflow pending; no new reviewer account is assumed. |
| Assistant | Drafts specifications/content; implements only after a separate build approval; prepares evidence. | Cannot manufacture clinical/legal sign-off or publish policies/deploy under preparation permission. |

## Release scope

| Release | Included | Not included |
|---|---|---|
| R1 | Data reliability, stable reviewed catalogue, eight role-based pools, restrictions, coverage-aware ranking, explainable single-session draft within a coach-selected structure, compatible swaps, approval audit, minimal health-change detection and complete entry-point rechecks. All requested levels are design targets; clinical/adaptive content is scoped per reviewed module. | Unsupervised clinical decisions, automatic assignment, silent edits to assigned/history records, new external AI/wearable connections, unsupported specialty prescriptions. |
| R2 | Bounded daily adjustment suggestions using authorized, sufficiently reliable current inputs; coach review before material reassignment. | Readiness as clearance, compounded blind reductions, automatic mutation of assigned sessions. |
| R3 | Evidence-based progression/regression and weekly-planning suggestions; explicit reassessment proposals. | Resolution inferred from untested findings or rewriting completed workouts. |

## Core requirements and acceptance targets

| ID | Requirement | Acceptance example |
|---|---|---|
| REQ-001 | Meaningful coach approval precedes assignment. | Generated, manually edited, copied and voice-derived drafts cannot be assigned without an authorized approval of that version. |
| REQ-002 | Experience, clinical restrictions and functional accommodations are separate inputs. | An advanced client with a restriction cannot bypass it; an access need does not imply blanket medical exclusion. |
| REQ-003 | Unknown/default/unassessed is not confirmed/normal/cleared. | Untouched defaults and incomplete reassessments remain visible; they do not establish current readiness or resolved findings. |
| REQ-004 | Sources are resolved as of the session context. | Backdated entries, future assessments, stale references and changed symptoms have deterministic, explained outcomes. |
| REQ-005 | Safety/authority eligibility precedes relevance ranking. | A highly ranked excluded exercise cannot be selected; an unresolved session hold cannot be bypassed through a template. |
| REQ-006 | Catalogue entries have stable identity, reviewed scope and required metadata. | History survives catalogue changes; incomplete or unreviewed entries are not admitted to automated selection. |
| REQ-007 | Selection covers distinct needs and preserves side/context. | Related findings do not yield unbounded duplicate drills; a left-side finding is not silently converted to bilateral dosing. |
| REQ-008 | Drafts respect actual setting, equipment and time. | Missing support equipment and unilateral/rest/setup time affect candidates and draft duration; shortfall returns a visible gap. |
| REQ-009 | Dose sources and uncertainty are explicit. | Measured, estimated and library-derived strength references are distinguished; missing age/load/max is not fabricated. |
| REQ-010 | Clinical/adaptive pathways need defined scope and appropriate evidence. | A generic “rehabilitation” goal does not unlock treatment content; clinician instructions are interpreted/reviewed for their specific scope. |
| REQ-011 | All entry points revalidate relevant conditions. | Manual additions, copies, athlete flow, substitutions and resumption apply the same backend-enforced rules where applicable. |
| REQ-012 | Material changes invalidate affected approval for future use without rewriting history. | New restrictions require appropriate re-review; completed sets remain unchanged. |
| REQ-013 | Explanations are useful and audience-appropriate. | Coach can trace a selected/excluded item to necessary source references; client text contains no unnecessary medical notes. |
| REQ-014 | Consent is specific, evidenced and independent of coach login. | Coach-entered records identify how client consent was obtained; checking a box without the client's authorization is not valid evidence. |
| REQ-015 | Privacy wording matches actual data flows. | Enabled providers, admin access, exports, local storage and optional AI/wearables are verified before notice publication; no unsupported “only your coach” claim. |
| REQ-016 | Errors and limitations are visible. | Failed save, stale context, concurrent edit or offline constraints never appear as a successfully validated assignment. |
| REQ-017 | Existing records and supported workflows are preserved. | Migration/reference/override/history tests pass; single-coach scope is not permission to delete existing account/data records. |
| REQ-018 | Release activation requires evidence and scoped permission. | No live clinical module, production migration or wider rollout from draft approval alone. |

## Proposed success measures

Measure time to an approved draft, coach acceptance and edit reasons, unexplained/unsupported recommendation rate, catalogue coverage gaps, understanding of review/hold states, completion of source/approval evidence and permission/preservation failures. Compare against representative current workflows. Numeric thresholds, cohort and duration remain a product/pilot decision; do not infer injury reduction or clinical efficacy from these usage measures.

## Open decisions and dependencies

A03 detailed goals/equipment/durations; A04 named qualified reviewers; A05 business country/legal identity and client accounts; A07 screening/clinical model; A08 reviewed content/rights; A09 data policy; A10 UX/access/offline; A11 technical scope; A12 implementation; A15–A19 pilot/privacy/release. [Approval record](../preparation/APPROVAL_RECORD.md), [reviewer/country recommendations](../preparation/REVIEWERS_AND_LAUNCH_SCOPE.md), [policy draft pack](../policies/README.md).

G1/G2 are pending. This PRD is a draft acceptance proposal, not evidence that the app or clinical policies already satisfy it.

The [S1 foundation/design review pack](../preparation/S1_REVIEW_PACK.md) links the detailed P02–P04 requirements, D01–D04 contracts, engineering, UX and synthetic test specifications. These expand this PRD for review without changing its confirmed scope or granting build authority.

## FS-POOL-S1S2-0.2 preparation reconciliation

The owner approved the [complete working brief and defaults](../preparation/S2_WORKING_BRIEF.md). This PRD's authoring is complete for S1–S2; formal acceptance remains pending. Goal families, actual gym/home/travel inventory, existing 30/45/60/90-minute budget choices, separate authenticated restricted client accounts and online authoritative assignment/start/resume are approved drafting assumptions, not invented client facts. Detailed source/module, catalogue, UX and API supplements are linked in the [S2 handoff](../preparation/S2_HANDOFF.md). This addendum supersedes earlier requests to choose those routine working defaults; record-level clinical/content/privacy reviews and G2/A12 remain unapproved.
