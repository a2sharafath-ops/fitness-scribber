# D01 — pooling source/field dictionary

Version 0.1, 2026-09-05. Draft awaiting engineering/product/domain review. FP-102. Repository evidence only: no live schema, grants, records, credentials or deployment inspected. This inventory describes existing inputs and gaps; it does not approve their clinical interpretation.

## Reading the dictionary

Paths are frontend/store paths, using `[]` for a row and `{id}` for a keyed item. SQL uses the same camelCase names with nested JSONB. Grouped leaf fields share the source/writer/date stated in their section; differences are identified explicitly. Numeric input controls are not evidence of database range validation.

Source abbreviations:

| Ref | Repository source and writer |
|---|---|
| AF | `src/components/organisms/forms/AssessmentForms.jsx`: coach assessment editor, using `useSave`. |
| SA | `src/components/organisms/SelfAssessment.jsx` + `src/pages/AthletePortal.jsx`: client submits pain/lifestyle/goals, tagged `data.self: true`. |
| SF | `src/components/organisms/screening/*Step.jsx` + `ScreeningFlow.jsx`: client or coach-mediated intake; parents persist to `screenings`. |
| CF | `src/components/organisms/forms/ClientForms.jsx`: coach profile, invitation and plan assignment. |
| WF | `CheckInModal.jsx` + `LogForms.jsx`, coach/client page save handlers: wellness; LogForms also covers training/wearable logs. |
| PB | `WorkoutBuilderModal.jsx`, `src/lib/program.js`, `src/lib/workout.js`: programme authoring, workout generation and strength derivation. |
| DB | `supabase/schema.sql`, `schema_assessments.sql`, `schema_screenings.sql`, `schema_athlete.sql`, `schema_program.sql`, `schema_workouts.sql`: repository schema/policies, not deployed-state proof. |

Proposed consumers: **context** = resolved baseline; **gate** = reviewed screening/authority rules; **rank** = eligible-option relevance; **compose** = actual session structure/dose/time; **display** = coach/client-facing information without automatic inference; **later** = R2/R3 only after their approval. All identifiable source data is private; exact audience/rights are specified in [authority](./STATES_AND_AUTHORITY.md), not decided by a UI label.

## 1. Identity, profile and scheduling

CF/DB owns these unless noted. Most client fields lack a field-level effective date or revision. `joined` is not a measurement date.

| Existing path | Type, unit/meaning | Current default / gap | Proposed consumer |
|---|---|---|---|
| `clients[].id`, `coachId`, `userId` | Client key, coach auth owner, linked client auth user | `userId` added by athlete schema; authenticated actor must not be inferred from a submitted owner ID | Access only; server resolves relationships |
| `clients[].name`, `email`, `phone` | Identity/contact text | Empty strings in new form; name required by UI | Display/contact, not rank |
| `clients[].inviteCode` | Linking token text | Optional; current invite form generates/stores code | Account linking only, exclude engine input/logs |
| `clients[].goal` | Unstructured summary | Blank or screening-derived headline | Display; explicit goal normalization before rank |
| `clients[].level` | Beginner / Intermediate / Advanced | New CF defaults Beginner, no confirmation evidence | Experience context; not clinical eligibility |
| `clients[].status`, `plan`, `planId`, `joined` | Active/Paused, package, linked plan, date | Active/Standard/null/current date for new CF | Service/access and selected structure; package tier never overrides gate |
| `clients[].notes`, `intake` | Free text / legacy JSONB | No normalized current restriction contract; `intake` not an authoritative new source merely because column exists | Coach review; do not parse into clinical facts automatically |
| `clients[].monitorOptIn` | Boolean | false | Existing monitoring preference, not blanket AI/health-data consent |
| `clients[].trackedLifts[]` | Names of tracked lifts | Empty array | History display/strength tracking; canonical IDs required |
| `clients[].anthro.age` | Number, years | null, no as-of date | Adult-scope check/display when confirmed; no invented age |
| `clients[].anthro.heightCm`, `massKg`, `bodyFatPct`, `leanMassKg` | cm / kg / percent / kg | null; body-comp save also copies three values here | Context if provenance/date known; avoid treating mirrored data as independent evidence |
| `settings.tz`, `units` | Timezone string, display unit | Empty timezone and kg supported | Session-local date and conversion; unspecified timezone is an unresolved context fact |
| `sessions[].date`, `time`, `type`, `dur`, `status` | Date/time text, session type, minutes, status | Scheduling records, distinct from performed workouts | Coach-selected schedule; cancelled/missing is not performed load |

## 2. Assessment envelope and fitness/movement

AF creates `{id, clientId, type, date, phase, data, notes, createdAt}`. SQL defaults `coachId` and `createdAt`; phase default differs: SQL reassessment, most new AF forms baseline, pain reassessment. SA chooses phase from existence of a previous type and date from the client portal's today. AF edits replace existing `data` and notes without a revision history or updated timestamp in this schema.

| Existing path | Type / unit | Current default, source and ambiguity | Proposed consumer |
|---|---|---|---|
| `assessments[].type`, `date`, `phase` | Six type IDs, date text, baseline/reassessment | User-editable date; no protocol-independent completeness guarantee | Context snapshot selection |
| `assessments[].createdAt`, `notes`, `data.self` | Recorded timestamp, notes, optional boolean | `self` present on SA; absence does not prove coach authorship; owner ≠ recorded-by | Provenance/display |
| `data.sourceWorkoutId`, `sourceMaxId` | Optional derived-source links | PB-generated fitness rows can mirror max ledger events | Deduplicate evidence; preserve source lineage |
| Fitness `data.strength[].lift` | Exercise name | Blank row omitted; case-insensitive name matching currently used | Stable exercise identity before load use |
| `strength[].weightKg`, `reps`, `valueKg` | Test kg, rep count, stored max/estimate kg | AF blank weight -> null; reps defaults 1, blank/zero can be coerced to 1; valid named rows only saved | Compose with explicit measured/stated/estimated provenance; one recorded rep alone does not verify maximal testing |
| Legacy `strength[].e1rmKg` | Alternate estimate kg | PB accepts as fallback; legacy shape varies | Preserve original, normalize with source status |
| Fitness `data.endurance.test`, `result` | Free-text protocol/result | null if no test; result may be empty | Display/review until protocol, unit and administration structured |
| Fitness `data.mobility[].joint`, `value`, `side` | Free-text joint, result, side/notes | Named-joint rows only; values can mix cm/degrees/text | No automatic threshold/cross-protocol conversion |
| Fitness `data.posture` | Free-text observation | Empty text | Coach review, not diagnosis/muscle-state assignment |
| Movement `data.protocol` | `nasm` or legacy missing identifier | New AF uses `nasm`; not a versioned licensed protocol contract | Require protocol/version before comparable needs |
| `data.findings.{itemId}.l`, `.r`, `.mid` | Boolean side/presence toggles | Missing keys appear unchecked; no assessed-absent marker | Preserve each side's unknown/present/absent state |
| `findings.{itemId}.severity` | mild / moderate / marked | UI and helpers use moderate fallback | Unconfirmed severity must not become stronger evidence |
| `findings.{itemId}.pain`, `.note` | Boolean / free text | Missing pain shown unchecked; note blank | Gate/review only under adopted policy; no missing = no pain |
| Legacy `data.screens[].pattern`, `score`, `pain` | Five patterns; ordinal 0–3; boolean | Existing rows editable; no assessment-completion coverage | Preserve protocol-specific observations, not convert into new protocol evidence |
| Derived `movementScore` / `movementDiff` | Legacy /15 or custom quality /100; change labels | Current helpers normalize unlike protocols and infer removal as resolution | Display legacy results as legacy; new engine must not use these shortcuts to clear findings |

## 3. Body composition, pain, lifestyle and goals

Dates and writers inherit the assessment envelope. AF numeric blanks become null. Imported report values prefill AF and need a save; the visible PDF/OCR tags are not persisted field-level provenance in `data`.

| Existing path | Type / scale | Default / gap | Proposed consumer |
|---|---|---|---|
| Body-comp `data.method` | InBody / BIA / Calipers / DEXA | InBody default, not proof of actual device | Display and comparability |
| `data.massKg`, `bodyFatPct`, `leanMassKg`, `skeletalMuscleKg` | kg / percent / kg / kg | null when blank | Goals/history; only justified dependencies in composer |
| `data.visceralFat` | Device-dependent numeric score | Unit/method not normalized | Display only until protocol defined |
| Body-comp `data.hydrationL` | **Total body water**, litres | null | Body-comp display, never daily fluid intake |
| Pain `data.sites[].area` | Free text incl side | AF removes blank areas; SA requires an area | Structured region/side confirmation needed |
| `sites[].severity` | 0–10 self-report; higher = greater reported pain | Defaults 3; historical touched/confirmed status absent | Reviewed health-change handling; no invented pain cutoff |
| `sites[].aggravating`, `.limitation` | Free text | Empty; empty sites list is not an explicit no-pain declaration | Coach interpretation and scoped restrictions |
| Lifestyle `data.sleepHrs` | Hours/night | null | Baseline context, not today's wellness |
| Lifestyle `data.sleepQuality` | 1–7; higher = better | 4 in AF/SA even untouched | Baseline display; confirm before use |
| Lifestyle `data.stress` | 1–7; higher = more stress | 4 in AF/SA even untouched | Baseline context, not reversed without scale metadata |
| Lifestyle `data.hydrationL` | **Daily water/fluid intake**, L/day | null | Baseline display; distinct from total body water |
| Lifestyle `data.activityLevel` | Sedentary / Light / Moderate / Active / Very active | Moderate even untouched | Baseline context; not prerequisite demonstration |
| Lifestyle `data.steps` | Average daily step count | null | Baseline display/later; not a mandatory wearable dependency |
| Goals `data.shortTerm[]`, `longTerm[]` | Arrays of `{text, target, by}` | Text required to save row; target free text, `by` date string | Confirmed canonical goals/priority for rank; target dates not algorithmic promises |
| Goals `data.why` | Free-text motivation | Blank | Display; no sensitive inference |
| New baseline goals seed | SF goals -> AF short/long rows | Only when no goals assessment; can seed from completed **or draft** intake; AF save follows | Retain source status and review evidence; do not treat seeding as final priority approval |

## 4. Screening envelope, declarations and health history

SF uses `newScreening` empty objects, `status: draft`, step and start date. Screening SQL has `updatedAt`; `startedOn/completedOn/validUntil` are date strings. The frontend computes outcome/status. The current programme gate checks outcome/major flags and a `clearance.status` string; this is existing behaviour, not a reviewed clinical policy.

| Existing path under `screenings[]` | Type / source | Current default / gap | Proposed consumer |
|---|---|---|---|
| `id`, `coachId`, `clientId`, `status`, `step` | IDs; draft/complete; progress string | Client/coach parents send records | Access, collection lifecycle; complete ≠ professional approval |
| `startedOn`, `completedOn`, `validUntil`, `updatedAt` | Dates / recorded update timestamp | Validity derived from completion in current helper; individual field dates absent | Context and reviewed policy validity; no universal new expiry inferred |
| `consent.collect`, `consent.share` | Timestamp string or null | Checkbox action; no policy version/actor/purpose ledger | Existing evidence only, not invented new-policy consent |
| `parq.general.{questionId}` | Explicit booleans keyed by current instrument | Missing stays undefined; completeness helper exists | Adopted instrument only; rights/version review pending |
| `parq.lists.{questionId}`, `conditionsAndMeds` | Free text | Empty | Restricted source display; not copied into ranking reasons |
| `parq.delay.{flagId}` | Boolean | Missing displayed unchecked | Confirmation/review required; current outcome calculation does not itself interpret these flags |
| `parq.followup.{gateOrQuestionId}` | Boolean | Missing vs conditional non-applicability differ | Preserve routing/completeness under approved instrument version |
| `parq.declaration.name`, `signature`, `guardian`, `witness`, `date` | Typed text and date | Name/signature required by UI; extra names do not establish representative authority | Versioned declaration evidence; not clinical clearance |
| `acknowledgements.accurate`, `.share`, `.notMedicalAdvice`, `.reportChanges` | Checkbox values | Final UI requires truthy values; not new-purpose consent | Participation/reporting evidence, subject to policy review |
| `outcome`, `programStatus` | A/B/C/null; ready/gated | Derived by frontend; stored alongside answers | Server-derived future states; client-submitted flags are not authority |
| `clearance.action`, `.status`, `.notes`, `.dateCleared` | Action/status enums and text/date | Status not_started/requested/received; no structured scope/signer/review-trigger fields | Replace reliance on status alone with scoped evidence model |
| `hhq.personal.dob`, `.age` | Date / years | DOB derives age; otherwise number; no as-of timestamp | Confirm adult scope; use age-at-reference-date rather than guessed birthday |
| `personal.sex`, `.gender` | Enumerated sex at birth / optional free-text identity | Blank allowed | Restricted display; only use when explicitly required by approved protocol; never infer one from other |
| `personal.heightCm`, `.massKg` | cm / kg | null | Baseline fallback with provenance |
| `personal.preferredContact`, `.language`, `.occupation`, `.workActivity` | Text; work sitting/standing/manual | Blank | Communication/accommodation/scheduling, not diagnoses |
| `hhq.contacts.emergencyName`, `.emergencyPhone`, `.emergencyRelation`, `.physician`, `.physicianPhone`, `.insurance` | Contact text; optional insurance boolean | Blank/undefined | Restricted service/contact only; no ranking or automatic sharing |
| `hhq.conditions.{conditionId}.status`, `.note` | no/past/current and note; IDs in `HHQ_CONDITIONS` | UI displays `no` for missing status without storing explicit response | Unknown preserved; no blanket contraindication from a category |
| `hhq.symptoms.{symptomId}` | Boolean; IDs in `HHQ_SYMPTOMS` | Undefined until action | Adopted policy/review; not a general exercise score |
| `hhq.risk.familyHistory`, `.vaping`, `.highCholesterol`, `.highGlucose` | Boolean | Undefined | Approved screening interpretation only |
| `risk.smoking`, `.packsPerDay`, `.alcohol` | Categorical smoking; free-text quantities | Blank; units/meaning not uniformly validated | Restricted display/policy inputs only |
| `hhq.meds.prescriptions`, `.otc`, `.supplements`, `.allergies` | Free text | Blank | Human review; never infer medication changes or doses |
| `meds.hrbpMeds` | no/yes/unsure | Blank | Approved policy or unresolved review; unsure ≠ no |
| `hhq.msk.currentPain`, `.pastInjuries`, `.surgeries`, `.implants`, `.romLimits`, `.avoidMovements` | Free text | Blank | Source for human-confirmed scoped needs/restrictions |
| `msk.balanceFalls` | Boolean | Undefined | Individual assessment/review, not blanket disability classification |
| `hhq.womens.pregnant`, `.postpartum`, `.notes` | Boolean, boolean, text | Conditional visibility; pregnancy flag may come from PAR-Q delay answer | Hidden ≠ absent/not applicable; professional policy pending |

## 5. Screening lifestyle, goals and logistics

All paths below are under `screenings[]`. Writers/dates inherit SF. Strings default blank, arrays may be undefined. **Displayed slider defaults are not necessarily stored values.**

| Path | Type / scale | Default / gap | Proposed consumer |
|---|---|---|---|
| `hhq.lifestyle.sleepHrs`, `.sedentaryHrs` | Hours/night, hours/day | Blank -> null | Baseline context |
| `hhq.lifestyle.sleepQuality` | poor/fair/good | Empty string | Preserve categorical scale; no fabricated 1–7 conversion |
| `hhq.lifestyle.stress` | low/moderate/high | Empty string | Preserve scale, separate from 1–7 reassessment |
| `hhq.lifestyle.stressSources`, `.nutrition`, `.caffeine`, `.energy` | Free text | Blank; nutrition can include hydration text | Display/review, no automatic numeric extraction |
| `hhq.activity.exercises` | Boolean | Undefined | Self-reported activity only |
| `hhq.activity.detail`, `.priorTrainer`, `.sports` | Free text | Blank | Baseline context/coach review |
| `hhq.activity.trainingAge` | new/returning/experienced | Blank | Distinct from Beginner/Intermediate/Advanced; no direct automatic mapping |
| `hhq.activity.selfRating` | 1–10, higher = higher self-rating | Displays 5 if missing; stored only after action | Display, not a skills qualification |
| `goals.primary`, `.secondary[]`, `.priority` | Category, category array, free-text ranking | No structured total ordering | Coach/client confirm active goal order |
| `goals.smart`, `.event`, `.target.metric`, `.target.value`, `.target.date` | Free text, metric enum, free-text value, date | Blank; target includes its own units as text | Display until structured/confirmed |
| `goals.availability.daysPerWeek` | Integer 1–7 | Displays 3 if missing | Schedule proposal only once confirmed |
| `availability.sessionMinutes` | 30/45/60/90 current UI choices | Undefined until chosen | Session budget; no assumed 60-minute default |
| `availability.timeOfDay`, `.start`, `.splitPref`, `.unavailable` | Free text | Blank; no structured travel interval | Coach-selected structure, explicit session overrides |
| `goals.environment.locations[]` | Location labels from LOCATION_OPTIONS | Undefined/empty; home/gym/travel/outdoors/studio/mix | Resolve actual session setting |
| `environment.equipment[]` | Coarse equipment labels | Full gym or none/bodyweight not complete item inventory | Verify each mandatory item/accessory, load range and availability |
| `environment.space`, `.groupPref` | Free text | Blank | Setup/supervision confirmation; preference is not guaranteed assistance |
| `goals.prefs.enjoys[]`, `.dislikes[]`, `.intensity`, `.hardNo` | Lists, category and text | Missing; refusal may appear in hardNo | Preferences after restrictions; confirmed hard refusals excluded separately |

## 6. Daily wellness, history and catalogue

| Existing path | Source / type / date | Current default / gap | Proposed consumer |
|---|---|---|---|
| `wellness[].sleep` | WF; 1–7 quality, higher better; date | Default 5; no hours measurement | Display R1, later R2 only with source confirmation |
| `wellness[].stress`, `.fatigue`, `.soreness` | WF; each 1–7, higher worse; date | Defaults 3; no touched flag or dedicated health-change answer | Display; not clearance |
| `wellness[].score` | Derived `sleep + (8-stress) + (8-fatigue) + (8-soreness)` | Valid complete input yields 4–28, higher better; coerced missing values can produce misleading results | Never recalculate partial inputs as complete; version formula |
| Wellness skip/duplicate | WF and coach/client start handlers | Skip creates no wellness row; same-day duplicates possible; `find`/`some` do not resolve conflicts | Separate skipped/missing/confirmed and session-specific health check |
| `wearable[].hrv`, `.rhr`, `.sleepHrs`, `.source` | WF or provider; ms, bpm, hours, source; date | Manual form defaults 60/58/7.5; simulator path exists in MonitorPage | R2 only; simulated, manual and provider records distinct; quality/provenance required |
| `srpe[].rpe`, `.duration`, `.tl`, `.sessionId` | WF/completion; 1–10 UI, minutes, derived load; date | Log form 6/60; session link can be null | Historical display/later, deduplicate session contributions |
| `resistance[]` exercise/pattern/sets/reps/weight/volumeLoad | WF; count, kg, kg-reps; date | Default counts/weight and free-text exercise; not evidence of maximal lift | Later load context; known units + actual completion required |
| `cardio[]` modality/trimp/tiz/tss/hsd; `logs[]` weightKg/squat | Legacy monitor records; date | Methods and comparability vary | Retain; no R1 selection dependency without specification |
| `concerns[]` category/severity/source/text/status/resolution | Coach/client observations; date and optional sessionId | Open/resolved is a communication state | Resolution does not automatically remove a clinical restriction |
| `maxes[]` exercise/date/kind/valueKg/source/sourceWorkoutId | PB/manual; tm/e1rm, kg | Name matching and source-specific date handling; no universal validation | Source-qualified load reference, never infer maximal test from stored label |
| `prescriptions[].blocks[]` | PB; blockId/blockType/order/autoCalculate1RM/exercises | `items` legacy mirror also exists; date/clientId | New approval/version relationship required |
| Programme `exercises[]` | exerciseId instance, exerciseDbRef, exerciseName, order, supersetLinkId, intensityType, unmapped | Instance ID differs from catalogue ID; nullable ref | Stable catalogue version + occurrence identity |
| Programme `sets[]` | setId/setNumber, prescribedReps/IntensityValue/LoadKg/Tempo/RestSeconds, completedReps/LoadKg/status | PB defaults 10 reps, 90 seconds, three sets; targets ≠ actuals | Reviewable dose; no defaults as professional prescription |
| `workouts[]` | date/title/source/planId/note/status/startedAt/endedAt/durationSec/hrAvg/hrMax | suggested/in_progress/completed; no immutable approval linkage | Execution record linked to frozen prescription, not independent assignment |
| `workouts[].warmup[]`, `.main[]`, `.cooldown[]` | PB items + setRows: targets (`pReps`, `pLoadKg`, `pIntensityType`, `pIntensityValue`, `pTempo`, `pRest`) vs actuals (`load`, `reps`, `effortType`, `effort`, `done`) | Some load cells prefill targets; completed and observed must stay distinguishable | Preserve history; target prefill is not actual confirmation |
| `exercises[]` | Library/coach; id/name/muscle/equip/difficulty/category/pattern/relPct/relTo/mode/target/source/video/thumb | Imported IDs regenerated by load-time merge; difficulty/ratios not professionally reviewed records | Candidate source only; canonical versioned reviewed metadata required |
| `plans[]`, `templates[]`, `synonyms[]` | Coach/library; names, items/blocks; phrase -> exercise | Copyable content, not per-client suitability | Draft inputs only, never carry approval to another client/date |

## 7. Missing contracts to add later, not fields already implemented

Per-field observation/confirmation state and provenance; immutable revisions and effective dates; assessment coverage by item/side; session timezone; equipment detail; normalized goals/refusals; functional assistance/supervision requirements; scoped restrictions and clinical-instruction evidence; health-change events; source-load failures; catalogue/policy review versions; draft and assignment approval records; consent purpose/version/actor/withdrawal ledger. See [context resolution](./CONTEXT_RESOLUTION.md) and [state model](./STATES_AND_AUTHORITY.md).

## 8. Architecture and permission findings

React/Vite + Supabase with localStorage fallback is current source architecture. `CLAUDE.md`'s SQLite description is historical, not a reason to migrate. `DataContext.commit` updates memory then initiates per-table diffs; it is not an awaited atomic approval transaction. `fetchAll` can return empty tables accompanied by load issues; a missing source must remain unavailable, not “no restrictions.” `storage.saveDB` can fail into memory-only behaviour; durable-save evidence is needed for new workflows.

Repository screening policies allow linked-client row reads/writes; hiding outcome/clearance in JSX does not by itself make those columns private or authoritative. Repository assessment reads include the whole linked row. These are source-level design findings, not verified production exposure. Proposed replacement and direct-API tests are in [engineering contracts](../engineering/ENGINE_AND_API_CONTRACT.md). No deployed permission changes were attempted.

This dictionary covers R1 source families and later signals at the integration boundary. Provider-specific payload fields, exact deployed schema/grants, complete historical variants, validated clinical scales and source rights remain separate review work; FP-102 is a draft, not a completed production data audit.
