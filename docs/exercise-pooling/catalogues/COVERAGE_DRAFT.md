# R1 catalogue coverage — product proposal

Version 0.2 coverage guide, 2026-09-05. Working dimensions approved for preparation. The populated draft subset and explicit gaps are in the [schema guide](./SCHEMA_AND_VALIDATION.md) and [coverage dataset](../quality/catalogue-coverage-and-cases.draft.json). No production coverage is approved.

## Confirmed dimensions

Adults; beginner/intermediate/advanced; general fitness plus special-needs/rehabilitation support; gym/home/travel; actual equipment; coach approval before assignment; a client-facing app.

## Approved working dimensions; individual facts and domain acceptance pending

| Dimension | Proposed draft coverage | Still needed |
|---|---|---|
| Goal families | General fitness, strength, muscle development, body-composition support, conditioning/endurance, mobility/control and clinician-defined return-to-function. | Priority order; specific sports/events; no invented fat-loss exercise guarantee or therapy outcome. |
| Session duration | Templates should accept a coach-specified time budget. Existing app choices are 30/45/60/90 minutes. | Typical durations; those existing choices are not newly approved defaults for every client. |
| Setting | Gym, home and travel with session-specific equipment confirmation. | Available supports, machines, dumbbell ranges, bands, space and accessible facilities; “full gym” is not proof of each item. |
| Training level | All three requested levels, assessed per skill/pattern rather than a universal difficulty label. | Demonstrated prerequisites, familiar exercises, progression limits and advanced-content reviewer. |
| Adaptive needs | Position/support, assistance, balance, sensory/communication and environment adaptations relevant to the individual. | Which specific use cases the coach serves and what assistance is available. No diagnosis-by-label or blanket exclusion. |
| Rehabilitation | Clinician-defined permitted activities, stage/limits, supervision and reassessment triggers in specifically reviewed modules. | Types of rehabilitation, named responsible professionals, service jurisdiction and approved client-specific handoff process. Unreviewed modules are not auto-selected. |

## Eight role pools

General warm-up; mobility/lengthening; optional SMR; activation; whole-movement integration; main/accessory training; conditioning; cool-down. A reviewed exercise may serve several roles. No requirement to prescribe all eight roles in every session.

## Catalogue admission requirements

For each candidate record: stable ID/version/family; role/pattern; target/side; full equipment/support requirements; position/range/impact/skill demands; instructions; permissible dose references; source and rights; relevant restrictions/modifications; approved population/context; reviewer/scope/date; alternatives; expected-result cases. Separate unknown from not-applicable.

Do not auto-admit the imported library merely because its records say Intermediate or Beginner. Advanced content requires demonstrated prerequisites and reviewed limits; disability/clinical context does not erase ordinary goal and preference information.

## Coverage acceptance

For each agreed goal × setting × relevant ability/functional requirement × role, record reviewed candidates, compatible alternatives and explicit unsupported cells. Test clinically constrained cases against reviewed instructions, not an invented diagnosis-to-exercise map. Catalogue count follows coverage; there is no arbitrary target number to justify unreviewed entries.

Proposed clinician-handoff fields: source professional and verified authority, client/date, purpose/context, specific permitted/prohibited activities and dose/supervision limits, review triggers, document version/source, coach interpretation/review and unresolved ambiguities. A file upload is evidence, not automatic clearance. Consent to exchange information and clinical authorization are separate records.
