# U01/U02 — coach/client workflows and copy

Version 0.1, 2026-09-05. FP-107 draft, with preliminary C11 explanations for FP-208. Non-executable layout/journey specification; no UI built, Figma file or prototype created. Existing assessment/client/planner screens are extended rather than replaced. R1 web-responsive specification does not settle native/PWA packaging.

## Views and layout specification

| View | Desktop order/layout | Narrow-screen equivalent | Primary action |
|---|---|---|---|
| Client assessment context | Header (client, as-of date); full-width gate/status; source groups; right-side review detail on selection | Same order stacked; details open in focus-managed sheet; no critical status only in sidebar | Review required information |
| Exercise pool | Session context strip; role filters and candidate list; selected candidate explanation/detail | Context summary then labelled filters; list cards; details on demand | Add eligible item to draft |
| Session builder | Status + client/date; goal/equipment/time; ordered blocks; persistent review summary | Summary and full-width blocks; review footer must not obscure fields/content | Save draft / Review |
| Coach review | Exact version/context; changes and required conditions; all items/dose/side; duration/coverage; explicit coach action | Linear review, expandable non-critical detail, required issues always visible | Approve & assign |
| Client home/workout | Assigned session only; actionable status; start health-change prompt; optional wellness; execution | Touch-friendly sequential flow; actuals/stop remain available | Start assigned session / Report a change |
| Source correction/handoff | Original value/evidence, proposed correction/scope, actor/date/reason | Stacked old/new comparison with meaningful labels | Submit correction / Record evidence |

Target QA layouts: 360 CSS-pixel mobile, 768 tablet, 1280 desktop, and zoom/reflow checks. These are proposed test sizes, not a device-support promise. Avoid horizontal scrolling for essential controls; long names/translated text wrap. Dates include timezone when it could alter the session day. Units and per-side dosing remain visible alongside numbers.

## Coach walkthrough

1. Open client Assessment -> Context. See sources marked confirmed, not assessed, older, conflicting or unavailable with dates. A complete card is not automatically all-negative.
2. Review required information. Confirm only actually assessed items/sides; corrections create revisions. View clinical evidence only through authorized detail.
3. Open Pool. Select session date/setting/time and coach-selected goal/structure. Client/equipment assumptions are explicit. Separate eligible, conditional, review and excluded items.
4. Inspect “Why suggested?” / “What is needed?” Add or generate draft; no assignment is implied.
5. Review all mandatory gaps and changes. Swap preview includes side/dose/time/coverage. Copying to a different date/client creates new drafts and strips unrelated private context.
6. Approve & assign. Saving state disables duplicate actions; success follows authoritative response. A conflict retains edits and opens a source/version diff.

## Client walkthrough

1. Own authenticated account sees agreed personal information and assigned workouts, not other clients or coach-only catalogue review notes.
2. Intake/self-report uses clear purpose notices, optionality and explicit confirmation. Blank/default stays unconfirmed. Coach-entered answers identify client report versus coach observation.
3. Starting an assigned session asks the separate approved health-change prompt. New/unsure response routes to review according to policy; no pressure to choose “No change.”
4. Optional wellness offers “Submit wellness” or “Skip wellness.” Neither is clinical clearance. Existing values are labelled with date rather than silently reused as fresh answers.
5. Client can stop and report changes at any time, including while an assignment is held or the network is down. No automated “safe to continue” from wellness score.
6. A proposed session change goes to the coach; client may log actual deviations but cannot turn those into coach-approved prescription changes.

## Preliminary reason/copy registry

These stable IDs are reserved draft names; final domain wording, translations and disclosure mapping remain FP-208 review work. Structured reasons carry source/rule IDs separately from text, never raw notes in analytics.

| Code | Coach copy | Client copy / next action |
|---|---|---|
| `INPUT_NOT_CONFIRMED` | This value has not been confirmed. Review its source before use. | Please confirm this answer or leave it unanswered. |
| `INPUT_NOT_ASSESSED` | This item/side was not assessed. | This check has not been completed. |
| `SOURCE_CONFLICT` | These sources disagree. Resolve the difference before the affected action. | Your coach needs to review updated information. |
| `SOURCE_UNAVAILABLE` | Required information could not be loaded. Retry; it has not been treated as absent. | We couldn't verify this session. Retry or contact your coach. |
| `CONTEXT_CHANGED` | Information changed since this review. Compare changes and review again. | Your session needs an updated coach review. |
| `HEALTH_CHANGE_REVIEW` | A new health change was reported; follow the approved review pathway. | Your update has been recorded. Follow the instructions shown and contact your coach. |
| `INSTRUCTIONS_SCOPE_UNRESOLVED` | Instructions do not yet establish permission for this activity/condition. | Your coach needs to confirm the instructions for this session. |
| `EQUIPMENT_UNCONFIRMED` | Required equipment or support has not been confirmed for this setting. | Confirm what equipment/support is available. |
| `PREREQUISITE_UNVERIFIED` | A required exercise prerequisite has not been verified. | Your coach needs to check this exercise with you. |
| `CONTENT_UNREVIEWED` | This item is not approved for automated selection. | No technical catalogue review details needed; show resulting session action. |
| `REQUIRED_COVERAGE_GAP` | No eligible option covers this required need in the selected context. | Your coach needs to adjust the session. |
| `DOSE_REFERENCE_MISSING` | No suitable dose/load reference is available. | Your coach needs to confirm this exercise's targets. |
| `CONSTRAINT_EXCLUSION` | This option conflicts with an active restriction or required condition. | This option is unavailable for your current session. |
| `PREFERENCE_EXCLUSION` | Excluded by a confirmed client refusal. | This option is excluded by your preference. |
| `APPROVAL_REQUIRED` | Review this version before assignment. | Waiting for your coach to assign a session. |
| `SAVE_FAILED` | Changes are not saved. Your previous assignment has not been replaced. | Your update wasn't saved. Retry. |
| `SAVE_OUTCOME_UNKNOWN` | Connection ended before confirmation. Checking this request's result. | We're checking whether your update saved. |
| `OFFLINE_DRAFT_ONLY` | Local draft; authoritative assignment checks are unavailable. | A connection is required to verify starting/resuming this session. |

Do not use “cleared,” “safe,” “fixed,” or “injury prevented” merely because an algorithm ran. Clinically indicated urgent instructions must come from the reviewed localized policy and remain visible, not be replaced by generic “contact coach” copy. This table is not triage guidance.

## Interaction and accessibility acceptance

Keyboard reaches filters, items, reorder alternatives and review actions; dragging has move-up/down alternatives. Dialogs have accessible names, focus entry/trap/return and escape/cancel behaviour. Status has text and icon, not colour alone. Error summary links to fields and preserves entered values. Save success/status is announced without repeatedly interrupting input; focus moves to blocking errors, not decorative toasts.

Review footer accounts for safe areas and keyboard. Critical side/unit/condition information is not tooltip-only. Screen reader reads status, exercise name, side and units in a coherent order. Confirmation controls allow a person to deliberately keep a default value without moving it artificially. Consent toggles remain purpose-specific and unselected until actual action. Accessible representation/assistance does not substitute coach authorization for client consent.

No external user sessions were conducted. Representative usability, clinical wording, regional translations, exact offline policy and final C11 copy approval remain pending.
