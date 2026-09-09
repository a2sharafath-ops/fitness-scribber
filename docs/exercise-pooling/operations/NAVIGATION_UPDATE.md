# Pooling navigation update — 9 September 2026

Scope: navigation-only follow-up to `9c93f061dd21f0b19f89410e2f01dc251146756f`. The owner explicitly approved committing/pushing this update to `codex/exercise-pooling-local` and **one additional Vercel Preview build**, outside the exhausted A33 two-build allowance. No main/Production deployment, database migration, account/fixture creation, new sign-off, or backend mutation is authorized by this follow-up.

## What changed

- The existing feature-gated sidebar entry is now **Pooling test**, directly after Workouts, with a distinct target icon and tooltip.
- Test setup, Exercise Pool and the governed client overview have a shared **Jump to a testing step** / **Jump to a pooling section** navigator.
- Links cover setup, preparation, source review, generation/swaps, validation/approval, daily adjustment, sessions/results, progression, weekly planning, draft review, health changes, reassessment, candidate catalogue and the guide. R2/R3 links require the corresponding flags.
- Client-specific links use only the exact current workspace/client ID. Before a workspace exists they are non-interactive and explain why. Expired/revoked test access keeps the sessions/history link but disables new pooling-step links.
- Navigation is not an action: no link creates, confirms, approves, assigns, reports, revokes, or completes anything. Existing form submissions remain explicit.
- Fragment destinations focus their headings after asynchronous loading, support repeated clicks and browser back/forward, and do not steal focus again on a routine form refresh. Existing Classic clients receive no pooling navigator.

## Verification

- 186 Node tests pass, including 9 new navigation tests. Lint and production build pass. Publication secret-pattern scan passes (bounded scan, not a comprehensive security audit).
- Isolated browser component check: all 14 destinations resolve to the exact route/heading and expose the current link accessibly. Delayed section mounting, back/forward and repeat-fragment navigation pass.
- No-workspace, inactive-workspace/history, and R1-only states checked in the browser.
- 390-pixel and 1280-pixel iframe viewports: no horizontal overflow; normal links meet 44-pixel touch height. Enlarged 200% text remains within the narrow viewport.
- Browser fixture uses the production navigation component with synthetic destination headings, loopback-only Vite, no project environment credentials and a same-origin network policy. Unit tests separately match every target against its actual page component. **These are navigation checks, not a rerun of authenticated hosted workflow, clinical, privacy, or human/device acceptance.** Prior A33 evidence remains attached to its recorded commits and is not relabelled as evidence for this update.

## How to use

Open the new protected Preview's `/pooling-test` route, sign in with your existing approved coach account, and choose **Pooling test** in the sidebar. Use **Test setup**, then **Prepare scenario**; the remaining links take you directly to the corresponding review/session sections. Save unfinished edits before moving to a different screen. The original protected Preview remains an immutable older deployment; reloading its exact URL will not load this update.

Retain the existing fictional-only boundaries, test write limits, expiry and recovery keys. This update does not extend or reset any of them. Main and the Fitness Scribber Classic checkpoint remain unchanged.
