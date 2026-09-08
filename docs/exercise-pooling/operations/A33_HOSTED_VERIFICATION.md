# A33 — approved hosted follow-up

8 September 2026. Execution in progress under the owner's explicit approval of [the bounded package](../preparation/A33_HOSTED_EXTENSION_REQUEST.md). This supersedes the earlier local-only status, not the separate release gates.

## Completed so far

- Fresh 773,481-byte private hosted backup, SHA-256 `6d22c00ddb061b84e39b8d98b7837283e1323fe68fbfa3aafb2100b7c46984a2`; all 85 public/auth/storage tables match after a new local restore.
- Scoped two-slot exception for one new engineering coach, one slot for a second. Everyone else retains one-workspace behavior. Lifetime cap nine; historical four plus new three leaves both original-coach slots reserved. Existing expiry and 160-write/Stop reserve unchanged.
- Migration rehearsed twice locally before hosted application, including original-grant rejection, deterministic primary selection, cross-account denial, direct-insert quota checks, immutable workspace identity, and the lifetime cap. The rehearsal caught a transaction-stable timestamp ordering defect; the corrected ordering passed both runs.
- Two new fictional accounts and three new workspaces created. No original account reused or old fixture reactivated. Global pooling remains off.
- Additional application isolation fix: profile responses are bound to their requested actor; direct account switches remount the data/clipboard/modal workspace. Lint, build and the 177 existing unit tests pass. Hosted account-switch verification remains to be recorded.

## In progress / not yet claimed

Published fixture records correctly rejected in-place modification (`immutable_release`). The kg scenario therefore uses a new immutable test release with an explicit, service-only mapping to its new A33 workspace. It does not weaken published-record immutability or admit the release for other clients. A second fresh backup precedes the additional additive mapping rehearsal/application.

Remaining execution: hosted UI copy/import and travel history; exact kg/inventory; review-response loss and recovery; genuine Auth expiry/refresh and pending account-switch combinations; protected Preview verification; retirement of both new accounts and all new grants/releases; comparison of every original row; final branch checkpoint. These are not marked passed until receipts exist.

The first genuine provider-issued JWTs expire at 16:37 UTC on 8 September. Their claims, provider expiry configuration and system clock will not be changed to manufacture an expiry pass.

All private backups, credentials and receipts stay in ignored owner-readable folders. Main, Production, Classic, real content, client data, paid services and optional clinical/device/sharing enablement are outside this run. Human acceptance, executable domain-policy/rights sign-offs, business/privacy facts, an authorized off-device backup/managed restore target and release authorization remain separate.
