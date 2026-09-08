# A33 — approved hosted follow-up

8 September 2026. The approved engineering and hosted follow-up passed under [the bounded package](../preparation/A33_HOSTED_EXTENSION_REQUEST.md). Both new accounts and all new test authority are retired, with original rows preserved. This supersedes the earlier local-only status, not the separate release gates. [Machine-readable receipts](../quality/a33-hosted-verification.json), [all 82 tasks](A33_SPRINT_RECONCILIATION.md), [all 110 cases](../quality/HOSTED_ACCEPTANCE_MATRIX.md).

## Completed verification

- Fresh 773,481-byte private hosted backup, SHA-256 `6d22c00ddb061b84e39b8d98b7837283e1323fe68fbfa3aafb2100b7c46984a2`; all 85 public/auth/storage tables match after a new local restore.
- Scoped two-slot exception for one new engineering coach, one slot for a second. Everyone else retains one-workspace behavior. Lifetime cap nine; historical four plus new three leaves both original-coach slots reserved. Existing expiry and 160-write/Stop reserve unchanged.
- Migration rehearsed twice locally before hosted application, including original-grant rejection, deterministic primary selection, cross-account denial, direct-insert quota checks, immutable workspace identity, and the lifetime cap. The rehearsal caught a transaction-stable timestamp ordering defect; the corrected ordering passed both runs.
- Two new fictional accounts and three new workspaces created. No original account reused or old fixture reactivated. Global pooling remains off.
- Additional application isolation fix: profile responses are bound to their requested actor; direct account switches remount the data/clipboard/modal workspace. The actual hosted-backed UI passed direct account switching, sign-out with pending work, wrong-account retry refusal and switching while a committed response was held in flight. The original account retained its receipt, without returning its result into the new account's view.
- Final local regression on the fully rehearsed A33 schema: 177 unit tests, six HTTP-handler tests, all 16 native suites, clean lint/build. The task-owned clone is distinct from both restore baselines. Classic archive and full Git bundle checksums reverified.
- Live hosted kg/inventory: completed fictional 2 kg actual; 4 kg stayed unavailable without confirmed target-session inventory, then became a numerical proposal after explicit `[2,4]` kg confirmation. Dropping the actual extension-review response after commit reconciled exactly one acceptance, a separate unassigned child; no baseline rewrite.
- Actual production UI/API with real hosted Auth/REST/Edge through a loopback fault proxy: copy-last, saved-template and same-coach cross-client import each saved one unassigned draft. Actuals and recipient-private notes were stripped. Escape/backdrop could not dismiss an in-flight save; permitted close restored focus to the opener.
- Travel form rejected date/timezone disagreement. Three distinct explicit saves retain the same instant in Tokyo/Los Angeles with correct local dates, notes, separate keys and no catch-up assignments. An extra explicit Save during native date-field testing made three rows rather than the test's original expected two; the corrected exact-three check passed. The initial failed assertion is retained, not erased or represented as an app idempotency failure.
- Protected Preview `6ca02cb` login, deterministic primary workspace and saved-template editor checked at `https://fitness-scribber-kq6i-1w54vaob0-cureocity1.vercel.app`. Full faulted UI journeys above use the identical production components/API with only transport fault injection, not fake provider authentication.

## Migration and final auth evidence

Published fixture records correctly rejected in-place modification (`immutable_release`). The kg scenario uses a new immutable test release with an explicit, service-only mapping to its new A33 workspace. It does not weaken published-record immutability or admit the release for other clients. A second fresh backup (786,398 bytes, SHA-256 `e1dbfd0f6a48a038016ceed6b90c01bd0488a9fee25521412576e6aa86080314`) restored all 86 tables. The additive mapping was rehearsed twice and applied with all pre-existing table fingerprints unchanged.

The genuine provider-issued second-account JWT expired at 16:37:07 UTC. A first probe at 16:37:30 returned 200 inside the documented [PostgREST 30-second clock-skew allowance](https://postgrest.org/en/stable/references/auth.html). At 16:38:02 the same token was rejected with 401. The pending draft then received a real 401 while its original request remained journaled; the actual SDK refreshed the retained expired provider session, and exact retry saved draft 76 once. Account A's in-flight switch request saved draft 75 once. Neither is assigned. The initial timing assertion is retained and the harness now waits beyond the skew allowance; no clock, JWT claim or provider setting was changed.

All 14 recorded UI checks passed. Final ordinary-provider refresh/local sign-out also proved that the explicitly signed-out refresh token cannot resume. All fictional execution sessions were closed before retirement.

## Containment and preservation

- Both new users globally signed out and banned; fresh sign-in returns `user_banned`. Already issued access JWTs expire normally; immediate containment is the revoked workspace/release/grant scope, not a claim of instantaneous JWT invalidation.
- Three new workspaces, four new manifests, three notices, three scope grants, two engineering slot grants and the one engineering release mapping are revoked/withdrawn. Existing history is retained, not deleted.
- All **1,003 original rows across 85 public/auth/storage tables** match the pre-A33 restore, field for field by SHA-256 row multiset. No table or original row was excluded. There are 75 added application rows / 79 total retained additions including the new tables; no Storage objects or real published catalogue were added.
- Seven lifetime workspaces (four historical + three new) leave both original-coach slots reserved under the nine cap. Their two-account allowlist, expiry `2026-09-15T10:37:56.492Z` and all global-off flags remain unchanged.
- Final API accounting: 684 combined requests and 300 write-method requests, including the conservative 150/40 infrastructure/Preview reserve; at most two simultaneous mutations. Two Preview builds are allocated, the second solely for the final documentation/test-tool handoff with identical application source. No third build or additional spend is authorized.
- Mixed sequential hosted RPC sample: 106 successful requests, median 500 ms / p95 772 ms including loopback proxy overhead. This is not a representative load test, SLA or agreed performance acceptance.

The first protected application Preview is validated at `6ca02cb`; subsequent handoff changes are documentation/test tooling only. Main remains `5de01b4e960e03e28d4a8b22527937103de10ad6`; Classic remains `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`. Routine recovery must preserve the additive schema and later data, not restore an old database over them.

The pre-existing missing `public.messages` table produced legacy chat 404s during navigation. It is absent from the pre-A33 backup and is outside the approved pooling test-setup migration. This report does not certify chat setup or human app acceptance.

## Final recovery checkpoint

A fresh post-retirement export (796,921 bytes, SHA-256 `b0c6c687cd74712c2e5e6274f399c5d47f4ee290302126baf5c9ea92603c57d3`) restored successfully at 16:48:02 UTC. All **87 public/auth/storage table fingerprints** matched, including the new test-control tables. Source databases and archives remain intact. The loopback UI server and the exact task-owned PostgreSQL cluster are stopped.

This is a same-device relational recovery rehearsal, not an off-device backup or recreation of the entire managed Supabase service. Classic archive/bundle verification remains separate. No original credential, private row, JWT or backup archive is published with this handoff.

All private backups, credentials and receipts stay in ignored owner-readable folders. Main, Production, Classic, real content, client data, paid services and optional clinical/device/sharing enablement are outside this run. Human acceptance, executable domain-policy/rights sign-offs, business/privacy facts, an authorized off-device backup/managed restore target and release authorization remain separate.
