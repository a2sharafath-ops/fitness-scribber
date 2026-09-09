# A35 — pooling in the existing app

Authority: owner approved completion on 9 September 2026. All current and newly added clients are development/test records. Sharafath and Ashok use separate sign-ins. This supersedes the earlier fictional-workspace-only UI scope, not ownership controls or the Classic checkpoint.

## Acceptance checklist

- [x] Verify Classic archive, Git bundle and exact tag; checkpoint pre-integration code.
- [x] Fresh hosted database export; rehearse restoration and additive migration locally.
- [x] Activate normal clients for the approved tester accounts, with an accessible reversible Classic switch.
- [x] Remove the separate testing destination from ordinary navigation.
- [x] Bring existing profile, onboarding, assessments and wellness into a client-specific preparation/review flow; missing information stays explicit.
- [x] Make the development exercise catalogue usable without claiming professional or production sign-off.
- [x] Generate, swap, validate and explicitly approve from the existing client record.
- [x] Keep assigned snapshots immutable; preserve source-change checks and operation recovery.
- [x] Surface assigned sessions and results in the existing client, workout and schedule flows.
- [x] Exercise daily adjustment, progression, weekly planning and failure/ownership/rollback cases.
- [x] Run unit, component, database and authenticated normal-client browser verification.

## Boundaries

Do not reset main, replace Classic, delete client/account records, fabricate clinical approvals, or release to real clients. Development content must remain separately identified and server-gated. A feature rollback preserves new history; a database restore is a separate controlled recovery operation, not an automatic rewind. Existing sharing links are not revoked as a side effect of publishing.

Pre-integration commit: `cbfcb4a281db686746bd53b56b0eb459a18a56de`.
Classic tag: `fitness-scribber-classic-2026-09-07`.

Pre-integration checkpoint tag: `fitness-scribber-pre-integration-2026-09-09`, with a separately verified Git bundle. Both checkpoint tags are permanent references, not branches to develop on.

## Recovery evidence

Classic archive checksums and its complete-history Git bundle were verified. Fresh database backup `baseline-r4vmjo` used one exported PostgreSQL transaction snapshot so live Auth refreshes cannot make the dump and fingerprints inconsistent. Dump SHA256: `7c397e92146d2b1859e55098df1f79d62b606a1bc0506d65fab09ef417cef2b2`. All **87 table fingerprints matched** after restoration into private local PostgreSQL 17. The dump contained zero Storage objects; no object-content backup was required for this snapshot.

Private receipts remain under `.recovery/hosted-test/baseline-r4vmjo/` and `.local-test-runtime/hosted-restore-Zc0Yjh/`; neither backup contents nor private client data belong in Git. The restore proves relational data/roles without passwords, not recreation of the hosted Auth, Edge, realtime or vault services.

The additive migration and release checksum is `e3ef6af78538268f4e4ffeef459db271d8d801c15aee71b9df61c241ae0e9a64`. It was rehearsed locally, tested, then applied to shared **test** Supabase `haxxetirrcrwzwdzsdui`. All 54 pre-existing public table fingerprints and old release manifests were preserved during application. Global R1/R2/R3 flags remain off; only the two approved coach accounts receive integrated development access to their own normal clients. Changes to already-applied migration/release contents require a new version, never an in-place rewrite.

## Verification evidence

- 200 Node unit tests, nine SSR component cases, lint, production build and diff whitespace checks pass. An assigned-snapshot rejection is explicitly surfaced as a definitive HTTP 409, not misreported as an unknown save.
- The isolated restored-database suite passes seven grouped cases: ordinary-client activation/ownership; atomic preparation and exact retries; generate → validate → explicit approval; immutable assigned snapshots; daily bounded proposals; completed-set progression; atomic multi-date weekly approval; source invalidation; Classic off/on preserving all results and the other coach's setting.
- Hosted browser test used the owner's **existing normal test client**, not a replacement fictional workspace. Preparation created drafts 85/86/87; decision 49 admitted the generated five-section session; explicit approval created assignment 25. A separate copy (draft 88, decision 50) did not mutate the approved source snapshot.
- The hosted session was started, an explicit **zero-second software-QA result** was saved, and the session completed. No performed exercise or measured effort was invented. The named workout, completed status and one recorded set appeared in Workouts, Schedule and the selected client's Progress page. The account's Classic switch opened the legacy planner and retained that record; integrated pooling was then re-enabled.
- Daily/progression/weekly positive transaction tests ran on the isolated restore. They are not represented as evidence that Ashok personally signed in, or that the existing client's old wellness records are current.
- All six pooling Edge functions were deployed with existing platform JWT verification retained. Unchanged function bundles may retain their prior version number. No unrelated function settings were changed.
- Publication scan passed for configured server secrets and high-confidence token/key patterns; it is not a comprehensive security audit.

## Development scope and known limits

The release contains 48 named exercise records and explicit beginner/intermediate/advanced timed test doses. Only eligible, fully dosed records can enter a session. Resistance variants (including bands and suitcase carry) cannot inherit the no-external-load dose; the engine returns `reviewed_resistance_prescription_required`. Numerical load prescriptions and clinical/rehabilitation release policy remain separate from this general-fitness development integration.

Existing source data is shown for review, and selected capabilities/needs are explicit. It is not silently interpreted as medical clearance. Old wellness keeps its original date and can correctly block a daily adjustment for missing recent evidence. Generation never assigns, optional sections cannot consume the only candidate needed by required sections, and incomplete required coverage remains visible.

The account switch is a **workflow rollback** that preserves new history. Returning to the exact old executable uses the saved Classic tag/archive and is a separate code/deployment operation; restoring an old database is never part of an automatic toggle. No main or Production frontend deployment is authorized by this feature Preview publication.

## Publication

Feature branch: `codex/exercise-pooling-local`. Stable Preview entry: https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app/clients . The GitHub deployment status for this branch records the final commit and Ready Preview URL; publication and final hosted verification follow this commit. Vercel access protection remains distinct from the app's own coach sign-in; existing unrelated share links must not be revoked.

Remaining access action: the attempted view/comment invitation for Ashok was blocked by the tool's authorization review because the exact Vercel recipient email requires explicit owner confirmation. The invitation was cancelled; no access change occurred. This does not block the build or owner verification, but must not be reported as successful Ashok access.

Tester guide: [Normal client testing](../ux/INTEGRATED_CLIENT_TESTING.md).
