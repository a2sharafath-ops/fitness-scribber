# A32 engineering and hosted verification

8 September 2026. The additional implementation and bounded hosted verification run is complete and contained. **Full sprint acceptance is not complete:** 86 engineering invariants pass, 14 cases remain partial, and 10 require external scope/review. The partial cases below are not represented as completed engineering/UAT.

## Deployed and tested result

Application commit: `3b9541543e75c6dbff7f4c5b6ffdb64fd033899b`, on `codex/exercise-pooling-local`. [Exact tested protected Preview](https://fitness-scribber-kq6i-n0dg6r4zw-cureocity1.vercel.app/pooling-test); GitHub deployment `6329365167`, Vercel `8r263XgqahjGfYmhNm1xXryNQLbL`. [Stable coach entry](https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app/pooling-test).

Six pooling Edge functions are ACTIVE version 2 with JWT verification. The pre-existing admin-users function remains version 3 and unchanged. The owner separately and directly approved the shared-backend impact before deployment. Main and the Production frontend were not changed; the shared backend was changed as approved.

## Implemented improvements

- Exact confirmed per-session load inventory is required. Unavailable weights and cap-breaking rounding cannot silently produce a prescription. Future-effective source mismatch has an explicit reason; legacy defaults remain unknown.
- Budget failures expose required time, available time and numerical shortfall, with coach alternatives. Required dose/rest/support is not shortened to make the result fit.
- Daily/progression proposals expose the complete original/proposed prescription and calculated time. Acceptance creates an unassigned revision; the original remains intact.
- Canonical selections no longer crash the manual builder as undefined blocks. The warning explains that manual inputs are a separate review draft. A second browser-discovered bug—mutation inside a React updater duplicating parsed exercises—was fixed with an immutable merge and regression test.
- Pooling-mode parsing uses typed/pasted text locally only; microphone and external AI are unavailable. Legacy Training Max, age-default target HR and auto-1RM hints cannot become pooling authority through this builder.
- Heavy routes are lazy-loaded with recoverable loading failure. The initial JS bundle is 352.46 kB / 106.09 kB gzip, down from about 1,224 kB / 352 kB. The former >500 kB route-bundle warning is gone.
- Private harness ledgers use flushed temporary writes plus atomic rename, retaining the last valid ledger when disk space fails.

## Executed verification

| Layer | Observed result |
|---|---|
| Current code | 163/163 Node tests; lint; production build pass |
| HTTP gateway | 6/6 Deno tests pass, covering all six services |
| Native current schema | 16/16 suites pass on a fresh clone of the verified A32 rehearsal |
| Hosted authorization | All six v2 services reject a valid cross-owner JWT; malformed JWT and direct service impersonation denied |
| Hosted Auth | Real refresh succeeds; explicitly signed-out refresh token cannot resume |
| Hosted concurrency | Two authenticated API sessions race report/approval; daily/weekly and new-health/weekly batch races preserve stale-source denial and all-or-none assignments |
| Hosted numerical workflow | Exact before/after proposal; repeat daily acceptance returns the same unassigned child; progression excludes wrong effort method, accepts corrected comparable history and preserves the original |
| Browser transport | Real actual/draft commits with dropped responses reconcile to exactly one row; WebKit automatically retried these two POSTs. Separate offline-before-send fault produced visible unknown outcome, preserved pending actual plus independent Stop, then exact retry/reload retained both actuals including zero |
| Browser programming | Actual manual/local-parser, copy-to-tomorrow and two-date bulk UI produce four single-exercise drafts and zero assignments. Six import boundaries also tested through normal RPC/Edge |
| Final protected Preview | Login, fresh preparation, exact decision/acknowledgement/approval, mandatory health answer, start, explicit zero, pause/fresh-answer resume, Stop, then stale approval across two real same-owner tabs |
| Display | Engine-derived 100-second shortfall and repetition/side/full-time comparison exposed to accessibility tree; 390px container, 358px table, no container overflow at ordinary/200% text-size fixture; explicit row/column header scopes |

Final Preview approved draft 61 / assignment 21. Another tab committed a new concern; stale draft 62 approval showed “stale context” and created no assignment. This is a controlled two-tab ordering test, not two human participants. Independent API tests used simultaneous requests.

Mixed browser/proxy read-RPC sample: 206 observations; median 514 ms, p95 751 ms. Pure engine 2,000-variant / 500-observation sample p95 was 34.1 ms. These are bounded measurements, not an agreed SLA, cold-start breakdown or concurrency/load certificate. CSS text-size fixtures are not OS zoom, a real screen reader or a physical device.

## Backup, preservation and containment

Fresh relational backup: 757692 bytes, SHA-256 `d83d1ea90a8a8894523fd26aee5c4ebc323cf082e2499616b0cd972ae73c05ee`. Native restore matches all 85 public/auth/storage tables. A32 corrective migration passed two rehearsals before application; checksum `391802a04b0fcadc6d693833846f9c3b43e5f423d4fe011b45df9327bb54ede5`. The historical A31 migration was not rewritten.

Final read-only subset verification: **all 815 pre-A32 rows in 85 tables preserved unchanged**, including all existing accounts. 182 new public rows / 188 total added rows remain as separate test evidence; nothing was deleted to make the comparison pass.

All three A32 Auth users are globally signed out and banned from future login; their three workspaces, manifests, notices and scope grants are revoked/withdrawn. Historical actuals, corrections and assignments remain. Existing JWTs have their own expiry; immediate pooling containment is the revoked workspace, not a claim that every issued JWT disappears instantly. The six earlier A30/A31 engineering identities are also retired. No original coach account, role or password was changed.

Global R1/R2/R3 are all false. The original two coaches retain only their explicit fictional testing window, ending **15 September 2026, 16:07:56 IST**; no window extension and no real-client enrollment. Zero Storage objects and zero real published catalogue candidates. All 48 real catalogue candidates remain unpublished.

A32 resources: 3/3 new Auth identities; 3/4 Preview builds reserved at this receipt; 471 conservatively reserved application rows; 188/800 harness reservations; 486/1200 proxied requests and 274/300 proxied write-method requests. The actual added-public-row check is below 1,000. No added paid service or spend.

Classic source/archive checksums and full Git bundle verify again. Classic remains commit `08ac0673d6e1d67ccd9fee2ffc5995074bcbf162`; remote main/Production remain `5de01b4e960e03e28d4a8b22527937103de10ad6`, Production deployment `6119996170`. Do not rewind a database to return to old code. New stopped-history compatibility is verified in the candidate; the immutable old frontend is not claimed to understand every new status.

Backups remain private and on this same device. Native restore does not recreate hosted Auth/REST/Edge services, managed internal services, provider secrets or off-device disaster recovery. The local proxy, app/fixture servers and exact native restore database were stopped after verification; retained files can be reused.

## Corrections and limits recorded during execution

- A weekly-race harness initially required daily acceptance to succeed. The backend correctly returned source_changed after a newer weekly decision. Exact keys were reconciled: the whole week committed; no daily child appeared. The assertion was corrected, a fresh separate daily proposal succeeded, and the subsequent health/batch race passed.
- One progression run could not write its local receipt because the device briefly ran out of space. The existing ledger remained readable; no unknown write was blindly repeated. After atomic ledger handling and removal of only the unused task-downloaded PostgreSQL 16 installer (112,949,293 bytes), the exact saved test resumed and passed. The installer can be re-downloaded; no code, database, backup or document was deleted. Free space later fluctuated down to about 139 MiB: no further heavy restore copies should start without measuring headroom.
- A raw provider microsecond timestamp in an auxiliary harness did not match the normalized per-session confirmation; the backend correctly blocked it. The harness now reuses the exact persisted proposal. The final Preview preparation already used the correct normalized identity.
- No microphone, paid AI, wearable, real clinical pathway, original coach credentials or real exercise execution was used.

## Still open — not silently marked complete

[All 110 cases](../quality/HOSTED_ACCEPTANCE_MATRIX.md) and [all 82 sprint tasks](./A32_SPRINT_RECONCILIATION.md) retain their actual scope and acceptance state.

| Partial case | Remaining scope / evidence |
|---|---|
| TC-023 | Actual manual/local-parser/tomorrow/bulk hosted UI and six API import boundaries passed. Positive cross-client/template/copy-last UI permutations still need an expanded accepted fixture set. |
| TC-036 | Client-only core consent and withdrawal passed; optional-sharing lifecycle awaits accepted privacy scope. |
| TC-040 | Actual browser simulated transport outage preserved pending actual and independent Stop; reconnect/retry/reload passed. Full browser quota/account-switch/forced-expiry permutations remain. |
| TC-041 | 390px budget/diff container stayed 390px with 358px table and 200% text-size fixture; table row/column scopes verified. Not OS zoom, screen-reader, physical-device or participant certification. |
| TC-043 | Explicit timezone/per-session source contract passed; travel timezone UI journey remains. |
| R2-T11 | Anchor gate passed on fictional metadata; exact admitted equipment transition remains. |
| R2-T17 | Hosted exact daily-acceptance retry passed. Browser dropped responses were actual/draft saves, not the extension-review response itself. |
| R3-T05 | No invented catch-up day; travel-reason UI history scenario remains. |
| R3-T08 | Hosted comparable-history proposal passed with fictional seconds; exact kg/inventory case remains. |
| CAT-002 | Fictional anchor prerequisite tested; exact admitted EX-028 domain fixture pending. |
| CAT-004 | Demand exclusion passed; exact two-variant catalogue case awaits admission. |
| CAT-005 | Side/laterality mismatch blocked; exact observation-to-dose mapping fixture remains. |
| CAT-010 | Required gap behavior passed; exact travel/push/pull accepted catalogue fixture remains. |
| CAT-018 | Core withdrawal invalidates authority; complete support/privacy-rights service workflow remains. |

The 10 externally blocked cases concern unaccepted clinical/accommodation/mapping, optional-device/sharing and privacy scope. Owner acceptance of the six PRDs and twelve catalogue drafts is recorded; it does not invent named professional signatures, numerical policy approvals or content rights. Business identity/contact, exact launch market/service scope, qualified reviewers as applicable, real-device/participant UAT, off-device recovery destination and main/Production/pilot release remain separate decisions. No further user permission was needed for this contained run.
