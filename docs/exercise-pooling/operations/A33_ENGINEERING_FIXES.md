# A33 — remaining local engineering fixes

8 September 2026. The owner asked to fix the remaining work. This record covers completed local fixes and verification, plus a **read-only** hosted preflight. It does not certify full sprint acceptance, professional review, hosted Auth behavior for this new code, or a Production release. The previous six-PRD/twelve-catalogue owner review remains accepted and is not being requested again.

## Implemented

- Recovery requests retain their original account/client scope. A key cannot be adopted under another scope. Account changes during a Web Lock wait prevent sending; changes during a response preserve the original receipt without returning it into the new account's view. RPC and Edge writes use the captured original account token, which the server still verifies independently. Tokens are not journaled.
- One shared recovery transport handles quota failure, response loss, definitive rejection and exact retry. A failed write-ahead journal sends nothing. A failed receipt write retains the original pending operation.
- Builder callbacks stop updating another client/date after navigation. The Exercise Pool workspace remounts per client, preventing carry-over of pending health answers, review state and displayed private sources.
- Escape and backdrop dismissal now use the builder's existing save-recovery guard, just like Close. Keyboard focus returns to the opener after a permitted close.
- Added a governed saved-template import path. It saves an unassigned review draft, preserves the source template, strips private notes/actuals/approval claims, regenerates occurrence/set/group identities, and requires explicit review of ambiguous legacy set counts, timed doses and rest units. No default repetitions or loads are invented.
- Canonical session history now shows the exact session instant and a saved optional planning/travel note. Notes confer no authority. Timezone/date disagreement is refused, and changing the zone creates a new draft without rewriting prior history or assigning catch-up work.

## Executed evidence

| Check | Result and limit |
|---|---|
| Unit regression | 177 passed; no failures or skips |
| HTTP handlers | 6 Deno tests passed; cached dependencies, no hosted requests |
| Database regression | All 16 existing suites passed on a fresh clone of the verified A32 rehearsal |
| Browser recovery | 12 assertions each in Chromium and WebKit, including actual bounded Web Storage quota and Web Locks; expired-token/response faults are simulated, not hosted Auth certification |
| UI → API → SQL | 17 assertions passed using actual production components/API and the Supabase HTTP client against restored PostgreSQL; authentication was explicitly synthetic |
| Exact kg progression | Completed actual 2 kg history; an admitted 4 kg dose remains unavailable until the target session's inventory includes 4 kg; original target/actual retained. Fictional policy, not accepted exercise guidance |
| UI copy/import | Copy-last, saved template and same-coach cross-client saves produce separate unassigned SQL drafts; recipient notes and actuals stripped |
| UI review loss | Response dropped after actual SQL acceptance; same key reconciles exactly one unassigned child |
| UI navigation/dismissal | In-flight Escape/backdrop blocked; late response cannot update a newly selected client's hook; focus retained/restored |
| UI travel | Date/zone mismatch refused; Tokyo/Los Angeles versions retain the same instant, distinct explicit dates and original travel note; no assignment added |
| Display | Expanded review reflow at 390/768/1280 px; keyboard checks. Not OS zoom, real screen-reader or physical-device acceptance |
| Performance | Pure engine 2,000 variants / 500 observations / 20 samples: p95 55.92 ms. Proposed 250 ms budget met; not an agreed SLA or hosted load test |
| Quality | Lint clean, production build passed; initial JS 352.63 kB / 106.14 kB gzip; whitespace and configured-secret/token-pattern scans clean |
| Post-fix local recovery | Fresh 666,031-byte dump restored into a separate database; all 85 public/auth/storage table row fingerprints match. Original and restored databases retained; task-owned cluster stopped |
| Classic checkpoint | Source archive and Git-bundle checksums still pass; no Classic tag, main or Production change performed |

Recovery SHA-256: `9cc157340591f3c04a288ae1d27955aa382825225603d1a0603c9cf65b65581d`. Private receipts and screenshot are in `.recovery/remaining-verification/`, excluded from Git. The backup remains same-device and does not recreate the managed hosted service.

Test entry points: `remaining-browser.mjs`, `remaining-native.mjs`, `remaining-integration.mjs`, `remaining-recovery.mjs` in `scripts/pooling/`; `native-inventory-progression.mjs`, `recovery-transport.test.js`, `template-import.test.js` in `tests/pooling/`. Native scripts use only the retained exact Unix-socket runtime and new task databases. Browser profiles are disposable and remote browser requests are blocked. A missing WebKit test engine was downloaded into the isolated project runtime; installed user browsers were not changed.

## Why another hosted run has not started

At 15:14:35 UTC the read-only hosted check found global R1/R2/R3 off, two original allowed coaches, four lifetime test workspaces, and two original-coach slots still reserved. The recorded six-workspace lifetime cap therefore has **zero unreserved slots**. The schema also permits only one workspace per coach, so it cannot represent the positive same-coach cross-client test.

No old test account was reactivated, no original login was used, and no reservation was consumed. Closing these hosted variations requires an explicitly bounded test-setup expansion; see [the proposed package](../preparation/A33_HOSTED_EXTENSION_REQUEST.md). No new shared-backend migration, hosted identity, Preview deployment or branch push was performed in this run. The fixes are local until that next run.

## Acceptance remains open

The A32 matrix's 86 passed engineering invariants / 14 partial / 10 external cases are retained. A33 adds local evidence to TC-023/040/041/043, R2-T17 and R3-T05/08; it does not relabel them as full hosted, participant or domain acceptance. Remaining items include real hosted expired-session/account-switch combinations, hosted equivalents of the new local UI journeys, supported-device/participant acceptance, agreed performance/load targets, exact executable content/policy/rights acceptance, business/privacy facts, an off-device backup destination/full managed-service recovery, and pilot/Production decisions.

No optional clinical/device/sharing scope is enabled. No real exercise was prescribed or performed by this test run. No recurring work or new task was scheduled.
