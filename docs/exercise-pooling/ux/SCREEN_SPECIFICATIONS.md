# R1 screen and interaction specifications

U01–U03 supplement · v0.2 · non-executable specifications; current app unchanged.

## 1. Client assessment / onboarding and reassessment

Keep current assessment navigation and lifestyle card. Add a context summary before recommendations: required review state; target session/date/timezone; last usable evidence and source; missing/conflicting/unsupported issues; link to source detail. Do not display a single green readiness percentage as clearance.

Lifestyle fields remain baseline self-report: sleep hours/quality, stress, fluid intake, usual activity and steps with existing source units. Each control distinguishes unconfirmed default, entered value, confirmed value, declined and not assessed. Untouched sliders are not saved as answers. HHQ categorical scales remain visibly different from numerical assessment scales; body-water litres never appear as fluid intake.

Coach can add an observation, confirm a task need or record a correction. Show effective date and source identity without exposing unnecessary personal information. Save appends a revision. A partial reassessment explicitly identifies assessed items; unchecked/omitted findings are not resolved. Conflict view presents relevant competing values and dates, with a reasoned resolution action, not automatic last-write-wins.

## 2. Coach pool view

Order: session context controls; actionable required issues; eight role tabs/filters; candidate list; detail panel; current selection and required gaps. Tabs with zero candidates show whether optional/unsupported/missing input. Do not imply that every role must be selected.

Candidate card: name and variant; status label; confirmed need/side served; relevant equipment/access; prerequisite and dose completeness; explanation action; add/pin/exclude. A pin never overrides a restriction. Excluded and review-needed candidates can be inspected by the coach but cannot be assigned. Show safe structured reasons and source dates, not a fabricated numerical safety score.

Filters may narrow role, pattern, equipment, position and reviewed scope; filtering must not erase a required-gap warning. Changing session inventory or goal priority recalculates preview and marks affected drafts stale. Selected exercise serving two roles appears once in time totals.

Detail panel order: variant/instructions; why considered; eligibility/restriction reasons; target versus execution side; required skill/support; dose fields and source; compatible alternatives; content revision/review scope; source detail accessible only to appropriate role. Content labelled draft/unreviewed is an authoring preview, not a live option.

## 3. Draft composer and approval

Coach chooses the existing weekly slot/session purpose, goal order, target date/timezone and 30/45/60/90-minute budget. This does not generate the whole week. Display required patterns/needs separately from optional blocks. Show each dose's sets/reps/time/load/effort/range/side/support and explicit uncertainty.

Time summary: active work, rest, side changes, setup/transfers, total and remaining budget. Missing duration is “not yet estimated,” not zero. Shortfall offers omit optional work, eligible alternative or revise session purpose/budget. A material revision requires renewed approval; no silent shrink of required work or rest.

Approval review shows exact revision, changed inputs, unresolved issues, content manifest and client-visible instructions. “Approve and assign” is available only to the coach after current validation and explicit review; successful receipt must confirm both operations. A failed/unknown write must not navigate as though assigned. Save draft remains a distinct action.

Manual additions, voice-generated text, template import and copy land in the same review flow. Copies strip approval and private source notes, create new occurrence IDs and preserve the original. A swap shows changes in need/side/equipment/load/time; family name alone is not equivalence.

## 4. Client app and session health check

Individually authenticated client sees only their permitted assigned plan and own relevant reports/actuals. Before start/resume, ask the reviewed session health-change question and show response state independently from optional wellness. Exact screening/triage language is pending clinical/instrument review; do not publish a paraphrased validated questionnaire.

States: not answered, response saved, review required, ready under current approved plan, verification unavailable, stale plan, stopped, actuals pending save and completed. “No change” is a report, not medical clearance. Optional wellness can be skipped without penalty; it cannot bypass a required health check.

Client can report concern, stop, record actuals or request a change; cannot approve a plan, edit prescribed targets, clear a restriction or assign a new exercise. Show a prominent stop action throughout execution. Local stop is immediate; report/save receipt is separate. The app must not imply the coach is watching live or guarantee a response time. Locally appropriate urgent-help instructions need professional acceptance.

## 5. Failures and recovery

| Situation | Required presentation / action |
|---|---|
| Loading required context | Explicit progress state; no stale enabled Start underneath |
| Fetch failed | Retry plus exact unavailable source category; not “no restrictions found” |
| Save failed | Preserve edits, label unsaved and permit retry |
| Response lost after possible commit | “Checking whether saved”; reconcile same operation; prevent duplicate submit |
| Another tab changed plan | Preserve local draft, show conflict/diff and latest version; no silent overwrite |
| New report/revocation | Visible hold/re-review, affected future actions disabled; completed actuals remain |
| Offline or storage quota | State local/unsaved/pending accurately; no assignment/start/resume override |
| Permission failure | Generic access error and recovery; never reveal another client's existence/details |

Use exact audience templates from C11. Coach-facing clinical trace does not travel in client API payloads just because it is visually hidden.

## 6. Content authoring and privacy choices

The proposed content-maintenance interface is specified in [review and maintenance](../catalogues/REVIEW_AND_MAINTENANCE.md); no new CMS is built now. Default view separates draft, accepted-scope and published records. No publish button for clients or ordinary report editors.

Client privacy flow separates service acknowledgement, necessary health-data processing where a valid condition is established, optional clinician sharing and optional marketing/media. No preselected optional consent. Show version/purpose, accept/decline/withdraw choices, actual evidence/receipt and consequences by purpose. Coach-assisted collection records method and genuine evidence, never a fabricated client action. Rights requests remain available when exercise participation is paused.

## Accessibility and test scripts

Proposed target: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA, subject to implementation and testing; no conformance claim now. Test 360px client and 1280px coach layouts, 200% zoom and 320 CSS-pixel reflow, keyboard-only operation and screen-reader names/status announcements. Status is not color-only. Focus moves to error summary after failed submit, to opened dialog heading and back to its trigger on close. Actions remain reachable without drag-and-drop. Errors identify fields and preserve data; consent/authentication flows must be accessible.

Walkthroughs: incomplete lifestyle default; partial unilateral reassessment; travel inventory with missing band anchor; approved draft invalidated by new report; client skips wellness but health check pending; keyboard-only swap and approval; lost save response; local stop while offline; optional sharing declined; content-revocation review. Record expected versus observed behavior after implementation; these scripts are not executed usability evidence.
