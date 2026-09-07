# Pooling work remaining

Local engineering only. Classic and its backup remain preserved. This is not a release approval.

## Completed local portions

- Classic code/archive/bundle restore, build/lint baseline and synthetic base-database recovery were verified before Docker stopped working.
- Draft-only builder saving, copies, failure/retry handling and separate local records are implemented and browser-tested.
- Context/selection/dose, daily-effect reconciliation, progression comparison and weekly-composition primitives have synthetic unit coverage.
- Exact-draft decision evaluation, server orchestration, a Supabase gateway adapter, an Edge entrypoint and gateway SQL are authored: verified identity/ownership comes before source loading, client-supplied authority is rejected, reviewed module requirements are checked, and a source-token/generation check is passed to storage. **Gateway SQL and the Edge runtime remain unexecuted; unit substitutes do not verify PostgreSQL or hosted authentication.**
- Shared coach/client runner preview blocks new start/resume while authority is unverified. History remains readable; the tested local stop preserves targets and actuals.
- R2/R3 local review-request screens save unassigned requests, show unresolved policy parameters and do not modify training targets.
- Restored Classic retained synthetic new sidecar records and recorded actuals during a browser fallback check. This is preservation evidence, not permission/concurrency or live rollback certification.

## Remaining implementation — can be authored locally, but not accepted without backend verification

1. Complete verified-source snapshot collection/normalization and run the authored decision-storage gateway against actual authenticated backend operations. Cover required observations, policy/market scope, exact session date/timezone and current consent/restrictions. The snapshot table defaults to unverified and has no browser write access in the proposed migration.
2. Complete explicit source-confirmation and canonical exercise/dose editing; legacy names/defaults must not become approved evidence. Finish accepted catalogue publication/revocation tooling.
3. Wire exact coach approval, assignment, start/resume and narrow client projections to the guarded transactions. The current preview deliberately does not enable these actions.
4. Connect every assessment, screening, health-change, manual/template/copy/voice and runner path to source invalidation and version checks. Existing client-role/protected-field exposure needs tested backend hardening, not just hidden buttons.
5. Complete R2 actual adjustment proposal/diff/accept-amend-reject persistence and R3 numerical proposal, reassessment and weekly batch approval workflows. Current review requests and pure calculations are only part of those workflows.
6. Complete unknown-outcome reconciliation across reloads, actual logging under holds, concurrent tabs/requests, client projections and remaining keyboard/mobile/visual/accessibility coverage.

## PostgreSQL-dependent verification — currently blocked

- Real ordinary-role RLS/column protection, authenticated source/decision adapters and atomic approval/start/resume tests.
- Concurrent health-change/approval, content revocation, stale versions, idempotency and partial batch rollback tests.
- Full additive migration, all legacy schema/record relationships, post-migration writes and final Classic compatibility/recovery rehearsal.
- Backend performance/failure tests and evidence-backed release-readiness report.

Docker health reported it could not start; coordination traced startup failure to disk exhaustion. No installed native PostgreSQL runtime or separately authorized alternative test database was found. No downloads, cleanup, shared Docker reset or Care data access were performed. Mocks and browser checks do not replace these PostgreSQL tests.

## External release gates — separate authorization/evidence

- Named professional content/clinical/rights acceptance and actual numerical policy parameters.
- Operator/privacy/market details and applicable review; actual coach/client acceptance.
- Exact hosted staging target, live backup/restore plan and release/pilot permission.
- Remote push, merge, deployment and real-client enablement remain outside this local-only scope.

## Resume order

Finish the authenticated source/storage adapter and canonical review integration; run the real database authority suite as soon as an authorized PostgreSQL runtime is available. Only after those checks pass should assignment/runner and numerical extension actions become usable in testing. Then complete all integration and recovery checks before requesting any live release decision.
