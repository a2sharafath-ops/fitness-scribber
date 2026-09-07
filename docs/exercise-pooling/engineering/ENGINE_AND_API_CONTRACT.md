# E01/E02 — deterministic selection and authoritative API contract

Version 0.1, 2026-09-05. FP-108/FP-109 draft specification. No endpoint, database function, SQL migration or engine is implemented here. Product/security/domain acceptance remains pending. [P03](../prd/POOL_SELECTION_PRD.md), [P04](../prd/DRAFT_AND_APPROVAL_PRD.md), [D04](../data/STATES_AND_AUTHORITY.md).

## Pure engine boundary

| Contract | Required contents |
|---|---|
| Input identity | Authorized client context, session date/timezone, action, effective time and knowledge cutoff; no email/contact/token needed |
| Source bundle | Typed observations with state/provenance, active restriction/evidence versions, equipment/assistance, coach-selected goals/structure and permitted purpose; explicit load success/failure per required source |
| Content bundle | Exact engine, resolver, rule, catalogue, dose and vocabulary versions; supported module/market feature policy; approved record manifest |
| Request | Role coverage/budget, eligible pins/refusals, optional draft revision to re-evaluate; all explicit, never implicit current time |
| Output | Session gate/all reasons, per-item eligibility/conditions/exclusions, normalized needs, ranked options/components, coverage gaps, proposed blocks/doses, duration range and source/version trace |
| Semantic errors | Invalid input/unit/date, unknown version/ID, unavailable source, unresolved conflict, unsupported policy/coverage; typed and actionable, not empty success |

Pure calculation does not fetch, persist, mutate sources, generate random selection IDs, read device time/locale or invoke an external model. For stable ties use defined canonical IDs and fixed comparison rules. Operational request IDs/timestamps are separate from semantic output equality. No external AI is required for pooling; existing optional dictation/insights remain outside its trust boundary.

Snapshot trace records relevant source revision IDs and minimized normalized facts sufficient for authorized replay. Avoid copying whole clinical notes/contact/consent signatures into every draft. Retention/erasure rules must cover both snapshots and originals; replay may become unavailable after lawful erasure and should say so, not secretly retain forbidden data.

## Proposed persistence records (logical, final table names pending)

| Record | Key data and ownership | Mutation policy |
|---|---|---|
| Observation revision | client/coach relationship; field/protocol/side/value/state; effective/recorded metadata; reporter/actor; superseded revision | Append/correct through allowed-field API; preserve lineage |
| Context generation | Per-client monotonic revision plus relevant session overlays | Increment on material source/restriction/purpose changes; share concurrency boundary with approval/start |
| Clinical evidence / restriction | Client, author authority/source, scoped terms/dates, active state, interpretation and review evidence | Controlled transitions; separate client report from resolved authority |
| Catalogue revision/review | Stable ID, content and rights/source references, population/module scope, reviewer decision and publication status | Immutable published revisions; promotion requires actual review and release authority |
| Decision snapshot | Client/session, input/version manifest, minimized rationale, eligible/gap result | Immutable calculation evidence with approved retention/access |
| Prescription revision | Exact item/set/side/dose structure, context snapshot, creator, previous revision and state | New revision for material edits; no history overwrite |
| Assignment/approval | Coach identity, exact revision, context generation, engine/content versions, review timestamp and request ID | Server-created only; current validity separate from historical approval evidence |
| Execution/log events | Assigned revision, client/actor, actuals, start/resume/check references and stop/completion | Client may submit actuals; cannot alter approved target fields or authority |
| Consent/purpose event | Subject/actor/method, purpose, notice version, evidence and withdrawal | Actual action with scoped effects; not an editable global true/false |

Relationships derive the owning coach from the client; redundant coach IDs must match and are not trusted from request bodies. Do not silently reassign existing owners or erase previous clients when introducing single-coach mode.

## API operation specifications (names provisional)

| Operation | Allowed caller / input | Successful output | Mandatory rejection/check |
|---|---|---|---|
| Read context/pool | Coach own client; client receives only appropriate projection | Snapshot/generation and permitted fields/actions | Cross-client, unauthorized purpose, unavailable required sources |
| Submit report/correction | Linked client or own coach with reporter evidence; allowed field whitelist, expected source revision | Stored revision + new context generation | Protected fields, forged actor/time/owner, invalid type, unauthorized correction |
| Record scoped instructions | Authorized coach workflow plus actual external evidence and interpretation | Versioned pending/accepted interpretation according to policy | Missing authority/scope, attempt to set universal clearance |
| Generate/recheck draft | Coach; explicit session request and version manifest | Draft proposal, gaps/reasons; no assignment | Held/unsupported context cannot yield assignable generic fallback |
| Save draft | Coach; expected draft revision + allowed structure | Persisted draft revision | Race/invalid ownership; saving draft never grants approval |
| Approve and assign | Owning coach; exact draft revision, reviewed context generation/content versions and idempotency key | Assignment + approval + frozen prescription revision committed together | Stale versions, unmet conditions, required gaps, unauthorized actor, unavailable content/source |
| Start/resume | Linked client or own coach; assignment ID, current check event, expected execution revision | Authorized execution event for that assignment | Draft/stale/revoked approval; changed context; changed session conditions; unavailable authoritative check |
| Log/stop/complete | Linked client or own coach; assigned execution and actuals, request key | Actual/log event, completion/stop state | Cannot change targets/clearance/coach approval; preserve allowed reporting even under a continuation hold |
| Request/review change | Client proposes; coach reviews recipient-specific draft | Proposed revision or newly approved assignment | Client proposal cannot self-assign; old approval not copied |
| Resolve unknown request | Same authorized actor; idempotency key | Prior committed result or definitive absent/pending status | Never disclose another actor/client's request |

## Atomic approval and race semantics

1. Authenticate server-side and resolve coach/client relationship. Validate request identity and idempotency key scoped to actor/operation/client.
2. Within a transaction/concurrency boundary, read the requested immutable draft plus authoritative context generation and supported content manifest. All material report/restriction/consent mutations must participate in this same invalidation/concurrency model.
3. Compare reviewed versions with current versions. If different, return conflict with permitted changed-field summary. Do not silently substitute a freshly generated draft.
4. Re-run required gates/eligibility/dose/coverage using exact approved versions. Check client/service/module scope and any evidence conditions.
5. Atomically persist frozen revision, approval, assignment and idempotent result. No independent table diff may leave a visible assignment without approval evidence.
6. Return success only after commit. On timeout the client looks up/retries the **same** key. Same key/different payload is rejected; same completed request returns its prior result. New unrelated work needs a new key.

A symptom report arriving concurrently must either precede and block/revise the approval, or follow it and invalidate the affected assignment before start. It must not be lost between a check and an unguarded write. Start/resume use equivalent context-version checks. Exact lock/isolation/RPC implementation is an engineering design review item; the required externally observable invariant is settled here as a proposal, not an implementation claim.

## Permission strategy

Use row ownership checks **and** protected-column/allowed-operation boundaries. Keep client-writable answers/logs separate from coach/system-only clinical interpretation, approval and target data, or enforce equivalent restricted APIs/privileges. Do not expose a mixed privileged JSON object for unrestricted client upsert. Reject extra protected keys instead of relying on the UI to omit them.

Supabase distinguishes grants/row policies and column-level restrictions; row filtering is not a substitute for protecting privileged fields. Review actual deployed privileges as well as migrations when staging inspection is authorized. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [column security](https://supabase.com/docs/guides/database/postgres/column-level-security).

Repository evidence: screening row policies permit linked-client reads and updates while outcomes/clearance sit on the same row; AthletePortal requests full rows and sends finalized records. `DataContext.commit` + `persistDiff` is optimistic per-table persistence. These do not establish the proposed permission/atomicity invariants. No production vulnerability exploitation or live inspection was performed.

Client projections include their relevant answers/instructions/status, not unnecessary clinical notes, other clients or catalogue review details. A privileged backend credential must never be shipped to the browser. Avoid raw health data in error/log output; retain correlation code, operation, reason IDs and minimized version references only under reviewed retention. Full privacy/security/rights acceptance still requires Q05 and actual regional review.
