# Existing-stack execution log

8 September 2026 · authorized v0.7/A30 · implementation branch only.

## Authorization and current state

Owner approved the prepared existing-stack package via delegated follow-up and requested a protected Vercel Preview and coach testing instructions. Target: Vercel `cureocity1/fitness-scribber-kq6i`, Supabase `haxxetirrcrwzwdzsdui`. Main/Production alias, existing records, Classic and unrelated projects must be preserved. Additional spending limit ₹0. No professional acceptance or real-client activation is implied.

Initial state was local HEAD `d2537e6`, before hosted execution. Coach access and human acceptance are owner-managed; no invitation or protection change is being made. Current stage results below supersede the initial preflight state.

## Stage results

| Stage | Status | Evidence / limit |
|---|---|---|
| A30 authorization | Approved | Delegated user follow-up, 8 September 2026 |
| T01 target/cost preflight | Passed for bounded run | Exact existing projects; free/Hobby allowances; ₹0 added spending; 4.0 GiB free before deployment |
| T02 inventory | Captured | 21 public tables, auth/storage, roles/grants/policies, extensions, non-secret auth settings and existing admin-users v3 source; no Storage buckets/objects |
| T03 hosted export/local restore | Passed, relational scope | All 52 public/auth/storage table counts and row fingerprints match; native PG17.11 restore of PG17.6 export |
| T04 migration | Applied and checked | 18 scripts; two-pass rehearsal, 16 restored-schema suites, atomic transaction rehearsal; post-commit all 52 baseline fingerprints unchanged; all flags off |
| T05 functions | Deployed, integration pending | Exactly six pooling functions; JWT verification not disabled; existing admin-users not redeployed |
| T06–T15 | In progress / pending | Preview and hosted auth/UI journeys still require actual evidence |

No secrets, backup contents, test passwords or identifiable health records belong in this log.

## Preflight progress

- Owner clarified that coach access and user acceptance testing are owner-managed; do not wait for coach identity or change invitations/protection. Access/UAT remain unverified until the owner tests them.
- Existing CLI backup dry-run obtains its temporary database login without a new owner password. No generated shell is executed; the recovery utility validates the exact project/host and passes private credentials only in child environment variables.
- Supabase Management API verified organization plan `free`, no selected paid addons, a 100-function entitlement (one function currently deployed), and no scheduled-backup entitlement. Existing Vercel team was verified Hobby. No upgrade/addon has been selected; bounded testing must stop on quota/provider limits rather than incur charges.
- Official Postgres.app 2.9.6 / PostgreSQL 17.11 image: 119,621,638 compressed bytes; 461,412,864 image bytes; SHA-256 `b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168`. Downloaded to `.local-test-runtime/pg17.YbRhJl/Postgres-2.9.6-17.dmg`, mounted read-only at `.local-test-runtime/pg17.YbRhJl/mounted`. Signature verification passed outside the sandbox. No global install/security bypass performed.
- Direct database TLS uses the official Supabase Root 2021 CA with `verify-full`; no machine trust-store change or certificate bypass. Export/migration succeeded.
- 122 unit tests and lint passed. These do not certify application integration.

## Recovery and migration evidence

Private backup: `.recovery/hosted-test/baseline-l0mYAT/database-full.dump`, 403,091 bytes; SHA-256 `488f7e7f037f57723c75f5d16976cc13303f2a32aea9365d9c4e988da476b9a3`. Restrictive local permissions; not committed/uploaded. Existing `admin-users` source and explicitly selected non-secret auth settings are saved alongside it. A complete secret-bearing provider-config export was not performed. No Storage files exist to copy.

Restore result: `.local-test-runtime/hosted-restore-Zc0Yjh/restore-result-fitness_hosted_restore_1788846357722.json`. All 52 public/auth/storage tables match at UTC-normalized row fingerprints. Roles/ownership/grants are restored without passwords; managed Auth/REST/Edge processes, internal realtime/vault and provider credentials are not recreated by native PostgreSQL. This is not proof of a whole hosted-project restore, nor an off-device backup.

Two-pass rehearsal and 16 existing SQL/workflow suites used a fresh clone of the actual restored target schema. Profile role insert/update were confirmed denied to ordinary authenticated users by existing column grants; no speculative profile-permission change was made. Service decision access is allowed, ordinary client/anon decision and client runtime writes are denied.

Exact transaction SHA-256: `58851ad44d60084427fe31447e80bf262c9022db5108730db707ecc02aa5e66c`. Applied as `postgres` in one guarded transaction with a checksum ledger. Hosted verification completed 2026-09-08T05:53:09Z: all 18 ledger checksums match, every baseline fingerprint unchanged, R1/R2/R3 false. This changes the shared test backend, not main or the Vercel Production alias.
