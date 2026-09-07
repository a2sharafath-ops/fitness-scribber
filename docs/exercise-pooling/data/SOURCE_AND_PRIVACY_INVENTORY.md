# D01 / Q05 — source and privacy inventory, first pass

Draft 0.1, 2026-09-05. Repository inspection only: no real client data, secrets, live feature settings, deployment regions or provider contracts were accessed. This is a privacy-oriented subset of D01, not the completed field-by-field data dictionary.

The subsequent [D01 field dictionary](./FIELD_DICTIONARY.md) now maps assessment/intake/wellness/history fields and implementation gaps. It remains a source-based draft; live schema/permissions and provider-specific payloads are unverified.

| Source | Information / capability | Proposed use and sensitivity | Verification needed |
|---|---|---|---|
| Screening records, `src/lib/screening.js`, `src/lib/parq.js` | Personal/contact data, health history, symptoms, medicines, musculoskeletal concerns, lifestyle, goals, logistics and consent declarations. | Necessary scoped screening and coaching context; especially sensitive health material. | Minimize individual fields by purpose; adopted instrument/rights; consent version and actor; professional scope. |
| Assessment records, `src/lib/assessment.js` | Fitness, movement, body composition, pain, lifestyle and goals. | Context, progress and reviewed training needs; inferred findings may also reveal health information. | Field scales, dates, missingness, source precedence, side and no unsupported clinical inference. |
| `CheckInModal.jsx` and wellness store | Sleep quality, stress, fatigue, soreness and a derived score. | Client-reported wellness; R2 adjustment input only after reviewed rules. | Untouched defaults, skipped entry, recording actor, purpose notice and health-change additions. |
| Prescriptions, workout/set history and maximums | Assigned/planned work, completed performance and strength references. | Coaching and progression evidence; linkability makes these personal records. | Stable identity, measured versus estimated, record versions, sensitive inferences and retention. |
| Client profile / athlete portal / auth | Coach and client identity/linking, account details and own-record access. | One coach and separate client-app users; never shared coach credentials. | Exact app packaging, RLS, admin/support role access, session recovery and client consent capture. |
| `DataContext.jsx`, `src/api/sync.js`, `src/lib/storage.js` | Backend-mode data synchronization; browser localStorage in local mode. | Core persistence. Browser/device possession can affect exposure in local mode. | Active mode, backup/export controls, who can access stored records, no false backend-security claims for local mode. |
| `supabase/functions/insights/index.ts` | Optional server function sends a supplied metrics summary to Anthropic or OpenAI if configured/invoked. | Potential external transmission of health-related data. Not required by the proposed pooling engine. | Actual enabled state, payload minimization, contracts, region/retention and lawful permission. Do not declare “no external AI” until this path is verified disabled or properly disclosed/gated. |
| `supabase/functions/parse-workout/index.ts` | Optional server function sends a dictated transcript to an LLM provider. | Transcript can contain identifiable/client information even when intended as workout text. | Actual enabled state, browser speech processing, provider terms and data minimization. Do not claim all voice processing is local. |
| `supabase/functions/_shared/providers.ts` and wearable functions | Oura/WHOOP/Fitbit connector capability and tokens. | Optional additional health-related sources. | Active providers/scopes, client connection/revocation, token controls and synced-history deletion semantics. |
| Messages, reports, PDF/OCR and exercise media paths | Communications, exports/imports and third-party links/media. | Possible copies or external requests outside the core record lifecycle. | Actual uploads versus local processing, buckets/URLs, recipients, exports, speech/media providers and logs. |
| Supabase / hosting | Supabase integration in source; Vercel deployment is part of project history. | Candidate infrastructure providers, not proof of current processing regions/configuration. | Approved provider list, purpose, DPA/other required agreements, regions, sub-processors and support/log access. |

## Consent gaps to specify, not fix in this preparation turn

The current app has basic collection/sharing checkboxes in `ConsentStep.jsx` and acknowledgements in `FinalConsentStep.jsx`. Its statement that answers are shared only with the trainer needs verification against provider processing and admin/support access. Existing text is not a full privacy notice, and a generic sharing checkbox does not authorize every later clinician, AI or wearable purpose.

Specify separate, versioned evidence for participation acknowledgement, health-data consent where used, optional integrations and named clinician sharing. The client app should record the client's actual action. If the coach records consent obtained outside the app, record the method, source/version and evidence; coach login alone is not client consent.

## Required policy-to-implementation checks

- Enabled destinations and real payloads match the notice; no raw health notes in diagnostics by default.
- Authentication/access roles are tested, including privileged support/admin access.
- Withdrawal, correction, deletion and retention flows have a real operational owner; deletion includes derived records and applicable exports/backups/processors, subject to lawful retention.
- Market-specific lawful bases, health-data conditions and consent/transfer requirements are approved before market activation.
- Optional features are genuinely optional and can be revoked without silently reconnecting or inferring consent from earlier screening.
- No analytics, advertising, sale, model-training or secondary use is introduced by the pooling feature. Existing deployment behaviour remains to be verified.

All intended promises are publication gates; none is certified implemented by this document.
