# Classic client workspace: review proposal

24 September 2026. Status: approved. Shared client navigation (Phase 1), the task-focused Overview (Phase 2), the Training workspace (Phase 3), Progress (Phase 4), Check-ins & load (Phase 5), Assessments (Phase 6), Profile (Phase 7), and responsive accessibility work (Phase 8) are implemented.

## Recommendation

Use one persistent client workspace with six destinations: Overview, Training, Progress, Check-ins & load, Assessments, Profile. The design groups information by trainer task, rather than by technical metric or input type. No pooling engine or automated programme generation is proposed.

## What the current code establishes

This is a source review, not an observation of trainers using the product, a live client-data analysis, or a rendered audit of every existing screen. Current client values and usability performance have not been measured. The sample contains fictional data.

| Existing surface | Observed limitation | Proposed change |
|---|---|---|
| Overview (`src/pages/ClientDetailPage.jsx`) | Wellness cards and a 30-day chart appear before the planner; activity and all concerns follow later. Latest wellness/wearable cards omit observation dates. Message and programme actions navigate to global pages. | Put next session and attention items first. Summarize today's check-in, with date/source and missingness. Link to client-specific destinations. Show unresolved concerns first, history on demand. |
| Profile (`src/pages/ClientProfilePage.jsx`) | Mixes package/contact information, anthropometrics, full screening review and screening-derived profile. Separate profile drawer is another discovery/editing route. | Stable information here; full health screening under Assessments. Measurement snapshots link to Progress/source assessments. Drawer becomes a compact summary linking to the same editing home. |
| Assessments (`src/pages/AssessmentsPage.jsx`) | Six assessment types, baseline checklist, current lifts and trends share one page. Goals/lifestyle are mixed with performance tests. | Group screening and formal tests here. Display dated goal/lifestyle history from Profile, preserving existing records and forms. Strength outcome comparisons belong to Progress, with links back to fitness tests. |
| Load & Strength (`src/pages/CommandCenterPage.jsx`) | Workload, strength, planner and AI advice occupy one screen. Planner is also available from Overview. Strength overlays estimated/absolute max, training max, ACWR and scaled strain. | Planner under Training; strength under Progress; load under Check-ins & load. Reuse existing components before rewriting them. Advanced chart combinations are optional. |
| Monitoring (`src/pages/MonitorPage.jsx`) | Readiness, Subjective Log, Objective Log and Wearables describe data categories rather than trainer tasks. Training exposure overlaps the load dashboard. | Rename to Check-ins & load. Use Wellness, Training load, Concerns and Wearables. Session effort and resistance/conditioning logs remain discoverable within Training load. |
| Shared navigation (`src/components/templates/ClientSubnav.jsx`) | Five destinations, including one combined Load & Strength link. Routed links use tab roles without the complete tab-panel keyboard/state pattern. Header order varies by page. | Consistent header and navigation order. Use normal navigation links with current-page indication for routes. Reserve ARIA tabs for genuine in-page tab panels. |

The existing `UX_Evaluation.md` is historical guidance, not current test results. Its claims that breadcrumbs and toast feedback are absent are superseded by the present implementation. Its numerical UX ratings are not validated outcome measures.

## Detailed destination rules

1. **Overview — prepare for today.** Client identity, next session, current check-in status, unresolved concern summary, reassessment reminders and a short activity feed. Primary action: Review session, then Start/Resume where appropriate. No scheduled workout yields Plan a session, not an empty chart. Older data says Last recorded [date]; missing data says Not recorded. A completed session yields View summary. Avoid a universal green ready-to-train badge.
2. **Training — plan and execute.** Programme/week, today's session, history. Preserve Classic workout builder, templates, copy, manual progression, dictation and set logging. Session targets stay distinct from actuals. Overview links into this single working surface. Retain client/date context when editing or returning from logging. AI advice is an optional assistance panel, never the main navigation or automatic assignment.
3. **Progress — review outcomes.** Strength, body measurements, fitness/movement comparisons and attendance/completion. The HTML demonstrates strength, body and completion; detailed movement comparisons reuse assessment history in implementation. Show baseline and latest dates, source and method, tested versus estimated max, and training max separately. No mixed-unit default chart. Attendance/completion needs a displayed period and denominator; the current app's adherence comes from scheduled-session status, so do not silently substitute workout completion records.
4. **Check-ins & load — understand response.** Wellness first, then training load, concerns, wearables. Readiness is a dated summary of inputs, not clearance. Display missing, manual, device and simulated observations distinctly. Workload charts disclose units, window, available observations and incomplete periods. Advanced ACWR/monotony/strain stay accessible without presenting universal injury-risk zones. A missing wearable must not prevent manual check-ins.
5. **Assessments — establish and revisit evidence.** Health screening, fitness, movement, body composition and pain assessment history. Maintain baseline/reassessment records, recording and review dates, existing forms and comparison links. A new symptom concern links to relevant history but does not overwrite a formal assessment. Review reminders reflect stored/coach-configured timing, not a new invented clinical interval.
6. **Profile — know the person.** Contact, goals, preferences, lifestyle, package and administrative notes. Preserve goal/lifestyle assessment history, rather than copying it into undated text. Show derived measurement provenance and links to its source. Full screening and clinical detail stay one step away under Assessments, while an active concern remains visible from Overview.

## Evidence and boundaries

- **Consistent orientation:** W3C's [Consistent Navigation](https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation) supports repeated navigation in consistent order. This supports a shared client shell; it does not prescribe six tabs.
- **Meaningful grouping:** NN/g's [Tabs, Used Right](https://www.nngroup.com/articles/tabs-used-right/) discusses related peer content and problems with stacked navigation. Use one stable main row and clearly subordinate, labelled views; avoid several indistinguishable tab bars.
- **Advanced detail on demand:** NN/g's [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports moving secondary complexity behind discoverable controls. Keep concerns, missing inputs and next actions visible; disclose chart configuration and raw history on demand.
- **Semantics and keyboard access:** W3C's [Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) distinguishes true tab panels and their keyboard/state expectations. The sample uses ordinary links and hash navigation, including browser Back/Forward, plus native disclosure and dialog elements.
- **Wellness deserves visible space:** Saw, Main and Gastin's [2016 systematic review](https://pubmed.ncbi.nlm.nih.gov/26423706/) supports subjective measures for monitoring training response. This evidence comes from athlete populations and does not validate this app's particular composite score or prove these exact labels suit all personal trainers.
- **Avoid false certainty from ACWR:** Impellizzeri and colleagues' [2020 conceptual analysis](https://pubmed.ncbi.nlm.nih.gov/32502973/) identifies fundamental limitations in using ACWR. This supports treating the ratio as contextual data rather than an individual safety verdict. Navigation improvements do not validate training formulas.

These are established design principles and relevant research, not evidence that this exact redesign has already improved task performance. Current project evidence consists of the inspected source. No new medical protocol, diagnostic threshold or dose rule is introduced.

## Interaction and responsive behaviour

- Same client header, goal, breadcrumb, Message and Report actions in each destination.
- Client-specific URLs preserve selected section and subsection. Maintain legacy URLs via redirects when implemented.
- Overview shortcuts link to the same records as the full sections; no duplicated editing state.
- On smaller screens, stack content and keep the main navigation horizontally scrollable, with clear current location. Test discovery of offscreen links; a labelled section selector is an alternative if trainers miss them.
- Minimum 44px action height is a gym-floor design target. Visible keyboard focus, text labels, semantic tables and non-colour status cues are required.
- Hide secondary actions while actively logging sets; retain client identity, workout name and an explicit return path. Do not hide unresolved context or silently discard edits.
- Failed fetches show a retry/error state, not a healthy empty state. Saves need pending/saved/failed feedback. Unsaved navigation requires draft preservation or confirmation in the implementation.
- The prototype demonstrates normal, missing wellness and disconnected-device states. Loading, failed saves, real forms, live workout logging and detailed comparison charts remain implementation work, not claimed prototype functionality.

## Validate before implementation approval

Run a formative comparison with roughly five practising trainers across desktop and phone; expand testing if tasks or audiences differ. Use identical fictional cases in the current and proposed layout, counterbalance order, and record first-click destination, completion time, wrong destinations, backtracking and confidence.

Tasks: (1) find today's workout; (2) find a new symptom report; (3) compare strength against baseline; (4) find screening history; (5) record session effort; (6) change availability; (7) find a missed check-in; (8) distinguish an old wearable reading from today's data.

Proposed acceptance targets, not measured results: at least four of five trainers choose the intended first destination on each core task; no trainer mistakes missing/stale data for current or interprets the layout as clearance; median preparation-task time improves over the existing baseline; keyboard users complete all core navigation; no clipped primary actions at 390px width. Revise labels when participants disagree, especially Progress versus Assessments and Check-ins & load.

## Implementation sequence after approval

1. Shared client shell and route map; preserve old deep links and permission checks.
2. Move existing components to their designated homes; retain original data and forms.
3. Reorder Overview and add dates/source/missingness labels; contextual Message/Report links.
4. Simplify default charts and expose expert controls on demand; verify metric wording separately.
5. Add focused route, state-preservation, keyboard, mobile and workflow regression checks; compare trainer task results before rollout.

Phase 5 adds four Check-ins & load views: Wellness, Training load, Concerns and Wearables. Each observation exposes its date, source (or an explicit unknown source), and missing values. Derived load measures disclose their 7- and 28-day windows and recorded-day counts, without fixed injury-risk zones. Manual forms start with blank measurements so an untouched form cannot save invented values.

Phase 6 brings completed and prior health screenings into Assessments, followed by formal fitness, movement, body-composition and pain records. The existing assessment forms and records are retained. Workout-derived lift peaks, including legacy records identifiable only by their saved auto-update note, are shown separately from formal fitness tests and cannot satisfy an onboarding baseline or reset a reassessment reminder. Assessment dates and app recording times are labelled separately; historic records with no stored source say so. Review dates use the existing app-default or coach-configured reminder cadence, never a new clinical interval.

Phase 7 groups goals, preferences and availability, lifestyle history, measurements, and contact/administration in Profile. Dated goal and lifestyle assessment records and their entry forms moved here; old assessment URLs redirect to the Profile history routes. Preference edits are stored separately in the existing client intake JSON, so the completed health screening remains unchanged; clearing an override reveals the screening answer again. Measurement edits save only changed fields with a profile date, and the latest body-composition values carry their assessment source unless an explicit profile override exists. Older stored values with no source marker say that their origin was not recorded. The authenticated client page and 390px layout were visually checked. Preference and measurement save, reload, and override-reset flows were verified against isolated local demo data. No production client records were changed during validation. Supabase write/readback for these new fields remains to be checked with a designated test client.

Phase 8 makes all six routed client destinations visible in a two-column phone navigation, retains normal links and a single `aria-current="page"` marker, and gives client actions and modal controls at least 44 × 44px targets. The week planner reflows to three columns on phones; the month calendar has a labelled, keyboard-focusable horizontal scroll region. Planner days show Train/Rest and Today in text as well as colour and icon. Client form fields have visible keyboard focus; modal dialogs expose their title, trap Tab, close with Escape and return focus to the trigger. The session-block chooser is labelled step navigation instead of an incomplete ARIA tab set. Check-in history uses captions, column and row headers, a labelled scroll region and explicit action headers. Core text and status colours were darkened for readable contrast on white and tinted backgrounds. Browser checks across all six client routes at 390px, 768px and 1280px found no page-wide horizontal overflow or visible client action below 44px. Keyboard navigation, current location, dialog focus and Escape were exercised in the authenticated app. Formal screen-reader testing with trainers and zoom/reflow testing beyond these viewport sizes remain separate acceptance work; this browser audit does not claim WCAG certification.

New wellness, session RPE, resistance and conditioning records store provenance. Existing Supabase databases need the additive [schema_monitoring_sources.sql](../supabase/schema_monitoring_sources.sql) migration before those new records are written; historic rows remain without a known source. Existing local demo data also shows “Source not recorded” until reseeded, while newly generated demo rows are labelled “Demo sample”.

## Prototype

Open [client-page-prototype.html](./client-page-prototype.html). It is a self-contained HTML/CSS/JavaScript file with six navigable sections and subordinate views. No external libraries, network calls, Supabase keys or real client records are included. The local browser-preview action was blocked by browser URL policy; visual browser verification was not completed. Static JavaScript and route-output checks are used instead and do not establish visual or accessibility conformance.
