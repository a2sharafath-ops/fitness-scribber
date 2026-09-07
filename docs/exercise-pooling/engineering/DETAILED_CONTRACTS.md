# R1 detailed engine, API and integration contract

E01–E05 supplement · v0.2 · design specification, not implemented endpoints/SQL.

## Engine inputs and outputs

One pure decision evaluates a target session date/timezone, a knowledge cutoff, resolved context generation, exact published catalogue/policy manifest, confirmed coach goal/slot/budget and explicit session equipment/access overrides. Inputs are immutable. Use source-specific effective time and recorded time; a replay cannot know later facts. Hash canonical semantic input with sorted stable IDs, explicit null/state and preserved numeric units. Locale, array insertion order and wall-clock randomness must not change decisions.

Stage order: resolve required sources and session authority; determine supported modules; apply candidate admission and hard constraints; identify remaining confirmed needs; rank eligible candidates by the P03 ordered tuple; compose with accepted doses and complete time accounting; return draft, gaps and explanation trace. Ranking never transforms excluded or unknown into eligible. A hard stop is not just a low score. Recompute incremental need coverage after each selection. A pinned option must pass identical eligibility.

Output distinguishes `sessionState`, each candidate's eligibility, draft completeness, required gaps, optional omissions and operation status. Explain evaluated rule/record revisions and minimum source references. No medical diagnosis or safety guarantee field. An unresolved dose can be displayed in a draft but cannot pass assignment. Keep pool preview separate from authoritative approval.

Illustrative request (fictional identifiers; transport/routes to be implemented later):

```json
{
  "operation": "approveAndAssign",
  "clientId": "fictional-client-A",
  "prescriptionRevisionId": "fictional-r12",
  "expectedPrescriptionVersion": 12,
  "expectedContextGeneration": 7,
  "expectedManifestId": "fictional-reviewed-manifest",
  "session": {"date": "2026-10-01", "timeZone": "Asia/Kolkata"},
  "idempotencyKey": "fictional-operation-01"
}
```

Success receipt contains operation ID, immutable approval ID, assignment ID, accepted prescription revision, context generation, manifest ID and server commit time. A rejected request contains typed reason codes and permitted next actions, with no partial approval or assignment IDs. An unknown network outcome is a client-observed state, not proof of server rejection; query that operation under the same actor scope.

## Permissions and field allowlists

Server derives actor/ownership from authenticated identity; posted coach/client IDs are lookup targets, never proof of authority. Every read and write checks the actor-client relationship. Client projections and coach-only health evidence are separate objects, not one unrestricted row hidden by UI.

| Operation | Authorized actor / accepted client fields | Server-only or protected fields | Result / mandatory check |
|---|---|---|---|
| Read context/pool | Owning coach; session selection | Raw private evidence never projected to client | Source states and minimal trace; no unlinked-client enumeration |
| Submit own report/correction | Linked client: response values, effective time, source revision, self-reported notes in permitted fields; coach entry has distinct attribution | Actor, recorded time, clearance, restriction resolution, approval status | Append revision; whitelist JSON subfields; increment relevant context generation |
| Record health/clinical evidence | Owning coach: evidence source and explicit interpretation; clinician authority recorded separately | Cannot fabricate verification or consent by selecting a client role | Pending/accepted evidence with review scope; upload alone grants nothing |
| Generate/save draft | Owning coach: selected goals/slot, budget, variants, proposed doses, coach notes | Context hash, admission result, ownership | Versioned draft; incomplete permitted but visibly blocked |
| Approve and assign | Owning coach: exact revision and expected versions | Approval author/time, final eligibility, assignment status | Single authoritative transaction and current scope check |
| Read assigned plan | Linked client and owning coach | Private notes, medical documents, scoring internals and other clients | Only relevant assigned revision, instructions, public reasons and actuals |
| Start/resume | Linked client or authorized coach: assignment/expected version and session health response reference | Eligibility/approval/context generation | Authoritative recheck, fail closed if unavailable/stale/hold |
| Record actual/stop/complete | Linked client or owning coach: own set actuals, effort, report/stop intent | Cannot alter targets, completed historic identity or clinical status | Preserve actuals; stop locally immediately; server receipt shown separately |
| Request change/swap | Client request only; coach proposes/approves changed revision | Client cannot set assignment or approval flags | No in-place assigned-target mutation |
| Consent event | Client records their own choice; coach records actual separately evidenced collection method | Cannot invent client signature, time, policy version or consent to unrelated purposes | Purpose/version/evidence audit; withdrawal handled per purpose |
| Publish/revoke content | Separately authorized content/release role; no client access | Accepted manifest and admission scope | Required evidenced reviews and explicit release authorization |
| Operation receipt/status | Actor authorized for original operation/resource | Other clients' outcomes and private payload | Same idempotency scope, no global key lookup |

Review [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security) when implementing. Row access does not by itself protect client-writable JSON subfields containing approval data. Prefer separate protected entities and guarded operations. No privileged service credentials in browser bundles; privileged backend code still validates ownership and allowed fields. Confirm actual deployed policies only in a separately authorized environment.

## Atomicity and concurrent health changes

Every source edit, new health report, restriction decision and affected consent event participates in the same per-client/context generation protocol. Catalogue revocation also advances an applicable manifest/revocation generation. Approval/start/resume must read and lock or equivalently serialize those authoritative versions together with the prescription/assignment. A frontend refresh or timestamp comparison is not sufficient.

Within the future transaction: authorize actor; claim actor/operation/key plus payload digest; validate expected versions; read current required evidence and published dependencies; evaluate; persist immutable decision/approval and assignment together; emit receipt. Roll back the complete approval/assignment on failure. Same key and same payload returns original result; same key with a different payload conflicts. Idempotency retention and scope must cover the retry/recovery window and be documented before implementation acceptance.

If a health change commits first, subsequent approval fails stale. If approval commits first, the health change invalidates affected future start/resume authority; those operations must see the newer generation. If already exercising, the app should promptly display the hold when connected, preserve recorded actuals, and prohibit further authorized continuation once the hold is known. Do not claim software can instantly stop an offline human activity. Disconnect means no new authoritative start/resume; recovery checks current state before continuation.

## State transitions and failure results

| Current state | Requested action | Allowed outcome |
|---|---|---|
| Unverified/held/unsupported context | Browse/save draft | Labelled review draft and exact blockers; no assignment |
| Complete current draft | Approve + assign | Only owning coach, current server evidence and accepted manifest; atomic receipt |
| Assigned current revision | Start | Required health-change response and current source checks; record execution version |
| Assigned or in progress + material change | Continue old authority | Mark affected future use stale/held; preserve actuals; new review required |
| In progress | Stop/report | Stop intent immediately; save status independently visible; never require permission to stop |
| Paused | Resume | Current authoritative recheck; no offline bypass |
| Completed | Edit planned target | New future draft only; historic target/actual revision stays immutable |
| Any write + lost response | Retry | Query same operation; no duplicate submission with a new key |

Typed outcomes: forbidden/not-found (avoid enumeration), invalid input, missing required source, conflict, stale context, unsupported scope, exclusion, required gap, unavailable, failed save and unknown outcome. Attach the C11 reason code, safe next action and correlation ID. Logs contain no raw medical notes or authentication secrets.

## Integration and migration acceptance matrix

| Existing entry point | Proposed read/write boundary | Required future test |
|---|---|---|
| AssessmentForms / SelfAssessment / intake | Append attributed observations; resolve dates/defaults/lineage | TC-001–009, 034–036, 044 |
| program.js correctivePlan | Replace automatic legacy mapping in the new path with accepted need/policy resolver; preserve legacy display/history | TC-010–018; CAT-023 |
| WorkoutBuilderModal: manual/pool/copy/template/voice | Save draft revisions; central eligibility and atomic approval | TC-023–025, 029, 033; CAT-015 |
| TodayWorkout / athlete portal / CheckInModal | Assigned projection; separate optional wellness and required health-change; guarded start/resume | TC-026–030, 040, 043; CAT-019–020 |
| DataContext / sync / storage | Stable identity, explicit network result, operation reconciliation; no privileged local authority | TC-031–040; CAT-016, 024 |
| workout.js targets/actuals and block mirrors | Preserve occurrence IDs and completed logs; optional blocks can be absent | TC-021–023, 038–039; CAT-012–014, 022 |
| Exercise library refresh/import | Explicit legacy-to-variant mapping and immutable revisions, never name-only replacement | TC-014, 038; CAT-024 |

Migration rehearsal specification: use synthetic fixtures containing all six assessment types, default/ambiguous observations, duplicate display names, unilateral targets, custom media/instructions, old references, no optional blocks and completed/partial actuals. Inventory counts/IDs/unit meanings and reference checksums before and after; quarantine ambiguous mappings, never drop them. Expand schema before switching writes/reads, verify dual representations where temporarily needed, then switch behind the feature boundary. Backups, restore and rollback must preserve post-migration writes, not simply restore an old snapshot over them. No production migration is executed or authorized by this design.

Performance proposals remain those in E05; they have not been measured. Error injection, ordinary-role access tests, migration/restore rehearsal and end-to-end concurrency tests belong to S3–S6 after build/environment authorization. The document checker is not any of those tests.
