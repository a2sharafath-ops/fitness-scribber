# S1 — foundation/design review pack

Package v0.2 supplement, 2026-09-05. S1 preparation complete; G1 acceptance remains pending. Read with the [S2 handoff](./S2_HANDOFF.md), which supplies populated catalogues and detailed contracts. No build approval or professional sign-off.

## What this batch adds

| Area | Draft output |
|---|---|
| Existing inputs and architecture gaps | [D01 field dictionary](../data/FIELD_DICTIONARY.md) |
| Missing/old/conflicting data and source precedence | [D02 context resolution](../data/CONTEXT_RESOLUTION.md) |
| Stable identity, side, roles and units | [D03 vocabulary](../data/VOCABULARY.md) |
| Coach/client/clinical authority and session lifecycle | [D04 states and authority](../data/STATES_AND_AUTHORITY.md) |
| Assessment intake/reassessment journey | [P02 client context](../prd/CLIENT_CONTEXT_PRD.md) |
| Eligibility, ranking and coverage | [P03 pool selection](../prd/POOL_SELECTION_PRD.md) |
| Generation, dose/time, copies and assignment | [P04 draft and approval](../prd/DRAFT_AND_APPROVAL_PRD.md) |
| Coach/client views and preliminary reason copy | [U01/U02 UX specification](../ux/WORKFLOWS_AND_COPY.md) |
| Deterministic engine, data/API permissions and atomic assignment | [E01/E02 engineering contract](../engineering/ENGINE_AND_API_CONTRACT.md) |
| Migration preservation, integration and failure states | [E03–E05 specification](../engineering/MIGRATION_INTEGRATION_FAILURES.md) |
| Synthetic expected behaviours and test strategy | [Q01/Q02 reference cases](../quality/REFERENCE_CASES_AND_TEST_STRATEGY.md) |
| Pilot metrics and privacy/security acceptance | [O01/Q05 acceptance proposal](../quality/PILOT_AND_PRIVACY_ACCEPTANCE.md) |

## User instructions retained, not reopened

Adult beginner/intermediate/advanced; general fitness plus special needs/rehabilitation; one coach and a client app; India/GCC/USA/UK/Europe design targets; staged delivery; coach approval before assignment; S1–S2 preparation only. Names/email remain placeholders. Individual clinical scope, legal establishment and actual equipment/goal priorities are not invented.

## Material proposed changes needing later acceptance

| Proposal | What changes from current source | Decision/reviewer |
|---|---|---|
| Unknown stays unknown | Untouched fields, absent movement keys and failed loads cannot establish normal/cleared state | A09; product + domain |
| Per-field dated source evidence | No permanent undated profile override or future/any-age load fallback without policy | A09; data + domain |
| Protected coach/system authority | Clients submit reports/actuals but cannot write clearance, assignment approval or prescribed targets | A10/A11/A16; product + security |
| Explicit assignment | Generated/manual/template/copied sessions are drafts until reviewed by coach; copies never inherit approval | A02 confirmed in principle; detailed A10 workflow acceptance pending |
| Independent health-change check | Optional daily wellness is not screening or permission to start | A07/A10; domain + product |
| Scoped clinical handoff | Generic letter/received flag does not remove every restriction; individual instructions and content review separate | A07; relevant clinical reviewer |
| Conservative offline service | No new authoritative assignment/start/resume while server verification is unavailable; preserve permitted logs/stop/report | A10; product + security/domain |
| No automatic numeric fallbacks | Dose, time and coverage gaps surfaced; no invented age/max/load or copied clinical notes | A08/A09; content + data |

These are drafts for review, not silent product decisions already implemented. Existing independent workout-start behaviour will need an explicit transition/migration policy before build/rollout.

## Remaining preparation work and gates

Next S2 batch: versioned candidate schemas/records and source/rights register; assessment/protocol and finding-to-need records; screening/restriction policy review cases; goal/dose/substitution/session templates; completed reason registry and catalogue promotion/retirement workflow. Include advanced and individual adaptive/clinical coverage rather than silently narrowing to beginners. Do not publish clinical doses or imported rights as approved.

G1 needs actual product/domain feedback on the scope/source/authority package. Drafting against provisional inputs may continue under A06, but dependencies are not marked satisfied merely because these documents exist. G2 needs reviewed content/design/tests and explicit A12 build authorization. Operator/contact/provider/market facts and qualified review remain publication/launch blockers, not a reason to invent facts or halt every drafting task.

## Evidence and honest status

This batch uses local source inspection and primary Supabase permission documentation, linked where relevant. No application code, dependencies, executable prototype, test runner, live-client query, SQL migration, remote write or deployment was added. Test cases specify future expected behaviour; they have not been run against a pooling implementation. Document/backlog consistency checks are separate from product tests and professional review.

Checks performed for this batch: JSON parses; 70 unique task IDs with an acyclic dependency graph; all 40 artifacts and 21 approval IDs resolve; 34 recorded output paths exist; 88 relative links and table structure across 28 Markdown files validate; 46 unique synthetic test specifications cover all 18 master requirements. Existing `bun run lint` passed; Git reports only the planning `docs/` directory as untracked and no tracked app changes. These checks do not constitute G1/G2 acceptance, completed clinical/legal review, live permission verification or executed pooling tests.

## S2 completion supplement

Use [detailed contracts](../engineering/DETAILED_CONTRACTS.md), [module requirements](../data/MODULE_REQUIREMENTS.md), [screen specifications](../ux/SCREEN_SPECIFICATIONS.md), [catalogue guide](../catalogues/SCHEMA_AND_VALIDATION.md) and [review response form](../quality/DOMAIN_REVIEW_PACKET.md) for the completed preparation package. Earlier next-batch wording describes work now delivered, not outstanding authoring. Formal acceptance remains pending.
