# Protected Preview — owner and coach test guide

8 September 2026 · owner-managed review after the hosted engineering checkpoint.

**[Open the protected Preview](https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app).** Tested application revision: `bb513c2c9ae8e55826ab082d3b6b50151d653fd1`; later documentation-only commits may advance the branch alias. Exact immutable builds are in the [hosted handoff](./HOSTED_BUILD_HANDOFF.md). This guide is not a signed human acceptance test. The owner manages coach access and user acceptance testing; no invitation, membership change or public-access bypass was made.

**Current state: R1/R2/R3 off in the server and branch browser build.** Fictional test authority is revoked and run-created users are disabled after engineering verification. You can inspect existing permitted Classic pages with your own authorized access. The feature-on checklist below is for a separately coordinated fictional test session, not a promise that it can be run on the contained build immediately. Do not share the retired test credentials or enable real catalogue content to make a test pass.

## Before testing

- Use the final protected Preview URL supplied in the execution report, not the current Production alias. Sign in through existing authorized Vercel access first, then the application's own account. These are different access checks.
- In a coordinated feature-on session, use only newly designated authorized fictional testing accounts/clients and valid fixture-only authority. Do not enter actual health/client information, connect wearables, send invitations or exercise paid AI/email/SMS paths.
- The Preview shares the existing testing database. Agree the test window with the owner; the old app is not a separate backup database. Do not delete existing records or change global feature flags independently.
- Follow the final report's feature-state table. Fixture catalogue/policy/reviewer evidence is engineering-only, not exercise or clinical acceptance. Unaccepted real catalogue records and unsupported paths must remain blocked.
- Do not perform physical exercises based on test fixtures. This is software testing, not a training prescription.

## Test checklist

Record pass/fail, browser/device, the non-sensitive fixture ID, action, expected result and actual result. Never include passwords, tokens or real medical notes in a screenshot or defect report.

| Area | Try | Expected result |
|---|---|---|
| Access | Open protected URL; sign in/out; switch coach/client test accounts; refresh | Correct role and data after each switch; no previous user's cached private information. |
| Existing app | Open dashboard, clients, assessments, schedule, workout and history routes | Existing navigation and permitted data remain available. Any intentionally changed client view is described in the report, not silently assumed identical. |
| Onboarding/context | Enter fictional lifestyle/equipment/goals and assessment source states; leave some unknown; correct a source | Saved inputs reload accurately; missing is distinct from normal/negative; affected drafts require a new review. |
| Selection | Inspect eligible/excluded options, explanations, sides, equipment, time and required coverage | Results derive from the current fictional context and admitted test manifest. Empty coverage explains the gap; no invented clearance or fallback dose. |
| Drafting | Generate, edit, swap, copy and use templates/manual drafts | Changes produce a draft requiring explicit coach approval. Copies never inherit another client's approval or private notes. |
| Assignment/start | Approve an exact draft, then open it as the linked client; try starting an unapproved/stale draft | Only the exact approved, current assignment starts. Changed context or revoked evidence blocks new authority with a useful message. |
| Runner | Record results, including zero; reload; pause/resume; stop; correct a result | Actuals persist, duplicates do not accumulate, corrections preserve originals and stopping remains available. |
| Client privacy | Inspect client history, reports, consent and reassessment screens | Client sees their own permitted information; raw coach-only assessment/clinical notes are not exposed. The pooling client view is narrower than Classic. |
| Daily suggestions | Change fictional wellness/time/equipment; accept/amend/reject a proposal | Clear old/new comparison; missing inputs remain missing; no silent change to assigned targets. |
| Progression/planning | Try insufficient and comparable history; inspect a weekly proposal and batch approval | Insufficient evidence is reported; dates/constraints are respected; approval is explicit and a partial failure is not reported as complete success. |
| Governance | In the designated synthetic review workflow, try wrong/expired/revoked version evidence | Unauthorized publication is denied; exact review scope enforced; revoked content cannot be newly assigned; history survives. |
| Failure/recovery | With the owner present, test a stale second tab and an interrupted save | Conflict or unknown outcome is visible; retry/reconciliation does not duplicate assignments/results. Do not switch off connectivity during unrelated work. |
| Usability | Keyboard navigation, visible focus, error messages, narrow viewport and your actual supported devices | Controls are understandable/reachable, errors are not color-only, content does not clip. Automated viewport checks do not replace this human review. |

## Report a defect

Use: Preview URL / commit; test account role; fictional client ID; steps; expected versus actual; timestamp/timezone; reproducibility; screenshot with secrets/private information excluded. Report security or data-loss symptoms privately to the owner rather than in a public repository issue.

If an unauthorized account sees another client's data, an unapproved workout starts, history disappears or a save falsely reports success, stop the affected testing path and notify the owner. Preserve the evidence; do not delete records or restore the whole database yourself.

## Sign-off remains the owner's decision

The [engineering report](./HOSTED_BUILD_HANDOFF.md) and [110-case map](../quality/HOSTED_ACCEPTANCE_MATRIX.md) distinguish executed checks, partial/blocked cases, feature flags and limitations. The owner/coach records actual usability acceptance separately. A passed software test does not constitute professional exercise/clinical approval, privacy/legal acceptance or permission to promote main/Production.
