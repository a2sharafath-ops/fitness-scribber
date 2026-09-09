# A34 — test-readiness verification

9 September 2026. In progress, not a completed end-to-end claim. Scope and limits are recorded in [A34 approval](../preparation/TEST_READINESS_FOLLOWUP.md). Main, Production, real-client mutation and real-content publication are excluded.

## Current engineering evidence

- 195 Node tests, lint, production build and nine production-component render cases pass for the publication candidate. The component cases use fictional props and are not hosted evidence. Assignment-history regression confirms its pinned decision is shown instead of a later validation of the same draft.
- Isolated production-navigation fixture at a 390-pixel iframe: content width and scroll width both 388 pixels, including enlarged 200% text and disabled R2/R3 explanations. Cross-route Generate & swap focuses its destination heading. This is not physical-device or OS-zoom acceptance.
- The owner personally signed in on the guarded loopback application. No credentials were entered or extracted by the agent. The browser renders actual application components and calls the actual hosted backend through a bounded transport.
- Exactly one reserved fictional workspace was created. Private accounting is retained in ignored `.recovery/test-readiness/owner-run.json`. No historical workspace was reopened.

## Hosted journey receipts

| Step | Observed result |
|---|---|
| Create workspace | New `fs_pool_coachtest_…` workspace shown as ready; 156 counted writes remained. |
| Prepare one scenario | Six software-only source confirmations and prepared draft 78 (parent 77); 140 counted writes remained. Session instant `2026-09-09T09:32:06.083Z`. |
| Generate | Suggestion 5 saved new unassigned draft 79. |
| Compatible swap | Suggestion 6 saved new unassigned draft 80, retaining the occurrence identity and replacing only the compatible placeholder selection. |
| Validate | Decision 45, `ready_for_coach_review`, no gaps; two fictional timed sets of one second each. |
| Explicit approval | Exact-review checkbox enabled only after validation; explicit Approve & assign saved assignment 23. Earlier draft revisions remain in history. |
| Daily adjustment | Request 12 used target 80 and unstarted assignment 23. Admitted `fictional-daily` proposed one to two seconds per set, total two to four seconds, with no conflicts. Explicit reason and acceptance saved unassigned draft 81; assignment 23 still displays its original two one-second sets. |
| Corrected separate-target daily flow | Independent copies 82 and 83 retained comparable occurrence identities without superseding the original. Decision 47 explicitly approved draft 82 as assignment 24. Request 13 used separate target 83 and baseline 24; accepting the one-to-two-second proposal saved unassigned draft 84. |
| Corrected baseline Start | Assignment 24 successfully entered `start` after the separate-target daily acceptance and an explicit current no-change response. This does not claim results, correction, completion, progression or weekly acceptance. |

Session results/corrections/completion, progression, weekly and final preservation checks are not yet completed in this A34 rerun. No unverified path is counted as passed. Earlier bounded test evidence is retained separately, not substituted for this rerun.

## Findings and boundaries

- Native date entry: the browser-control ISO `fill` attempt left the native field empty; the save button correctly stayed locked. Opening the native calendar and confirming its selected date populated the exact `2026-09-09` value. Document the calendar path; this is not evidence that manual keyboard entry fails for a person.
- Existing background Messages requests return `PGRST205` / 404. This predates this follow-up; no Messages table migration is authorized here. Pooling-specific receipts above succeeded independently.
- Session-route loading failed before session actions: the local chart dependency returned HTTP 504 `Outdated Optimize Dep`, reproduced by a read-only loopback header check. The independent Vite tools shared their default dependency cache. Gave the owner transport, component renderer and navigation fixture separate cache directories and restarted only the local tools, keeping the same ledger/session/workspace. The actual session page then loaded and focused `governed-workouts`, showing assignment 23. This was a local test-tool failure, not evidence that the published production chunk was broken.
- During a local copy edit, a transient undefined variable in weekly rendering was caught and corrected before publication; the component suite passes afterward. It caused no backend write. Development-only lazy-route diagnostics now expose module-load causes while retaining the recoverable page and operation journal.
- Original baseline 23 refused Start with `source_changed` after numerical generation used its assigned draft 80 as the target. The numerical gateway creates a fresh decision snapshot for its target; assignment 23 retains decision 45 while the target was revalidated as decision 46. Correction: assigned/superseded drafts are excluded from generation/extension targets, assigned Validate controls are locked, and an explicit journaled separate-review copy creates an independent unassigned proposal with no approval, actuals or superseding parent. Drafts 82 (fresh baseline) and 83 (separate daily target) were saved through this UI; decision 47 explicitly assigned baseline 24. The old assignment and all drafts remain retained. Direct API revalidation of assigned targets is not claimed corrected at the backend; no backend deployment is included in A34.
- Real exercise and numerical policy acceptance is separate; see [content reconciliation](TEST_READINESS_CONTENT_REVIEW.md). The owner's six-PRD/twelve-catalogue review is retained, not reopened.

## Publication

The owner requested publishing the current fixes so a remote tester can use the existing authorized sign-in from Dubai. This candidate uses the first of at most two A34 feature Preview builds; deployment success must be confirmed against its exact Git SHA before handoff. Main/Production promotion and backend changes are excluded. The updated page has a visible **Test-readiness update · A34** marker and the [remote testing guide](COACH_PREVIEW_TEST_GUIDE.md) uses the stable branch Preview link.

RPC transport remains the established POST behavior. An experimental GET optimization was removed before publication because it had not completed hosted verification; no existing request accounting was discounted or reset. No account, quota, expiry, real-content release or global pooling setting is changed by this frontend publication. Remaining A34 journey checks are disclosed rather than calling this full-system acceptance.
