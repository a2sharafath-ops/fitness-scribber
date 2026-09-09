# Test pooling through the normal app

This is the owner-approved development app for Sharafath and Ashok. All current clients are test records. There is no separate testing page: old `/pooling-test` URLs redirect to Clients. Each coach sees their own clients; sharing the Preview does not merge accounts.

## First workout

1. Sign in to the updated feature Preview with your own app account. Open **Clients**, then your existing test client (for example **Sharafath Client**).
2. Choose **Generate workout for [client]**. This opens that client's **Exercise Pool** tab. If Classic is active, first use **Enable integrated pooling for my account**.
3. Review existing records, using the links to **Assessments**, **Client profile and onboarding**, and **Wellness and monitoring** when changes are needed. Return to preparation after saving changes so it reads the current source version.
4. Choose session date/time, training level, setting, available minutes, priority goal, available equipment and sections. Check only confirmed capabilities. Assessment findings are prompts; explicitly choose any task needs that must be covered. Unchecked capabilities stay unknown, not cleared.
5. Choose the current health response and complete the explicit adult, equipment and source-review confirmations. Click **Generate workout for this client**. Wait for the saved draft ID. This does not assign a workout.
6. Open **Validate & approve**. Expand the newest draft, click **Validate exact draft [ID]**, and review the named exercises, sets, duration, rest, changes and any source/coverage gaps. A blocked decision must be resolved through the relevant input/source review, not bypassed.
7. Check the exact-review acknowledgement and click **Approve & assign draft [ID]**. Wait for the assignment confirmation.
8. Open **Sessions & results** on the normal client page. Choose a fresh current health response and click **Start approved session**. Targets remain separate from performed values. Enter actual results, save each set and then complete or stop the session. For software-only tests, use explicitly simulated data or zero; do not present it as measured performance.
9. Verify the workout in **Workouts → Client Workouts**, the existing **Schedule**, and **Progress** after selecting this client. **Session & results** returns to the preserved result history. Refresh/reload to verify persistence.

The development catalogue supports general-fitness testing. Weighted/band variants without reviewed resistance prescriptions remain unavailable; this is visible as an unresolved dose, not an invented weight. A 30-minute budget is a maximum, not a promise to fill all 30 minutes.

## Daily adjustment (before starting the baseline)

1. Prepare, validate and approve a fresh baseline, but do not start it yet. Use up-to-date test wellness; old historical wellness is not current just because it is visible.
2. Expand its assigned draft row and choose **Copy draft [ID] for separate review**. Do not revalidate the assigned baseline.
3. In **Daily adjustment**, enter the target date and a review question; save the request. In its expanded card choose the separate target draft, original approved assignment and admitted daily policy.
4. Click **Generate bounded review proposal**. Inspect the numerical changes and evidence. An information-required result is expected when current signals are absent; acceptance cannot fill missing facts.
5. Enter a review reason and **Accept as draft** when appropriate. Validate and explicitly approve the resulting new revision. The original targets/results remain intact.

## Progression (after comparable completed results)

1. Finish a baseline with the required set evidence and effort method. Optional effort must include its scale; the development comparison uses `rpe_0_10`.
2. In preparation choose **Reuse approved draft [ID] for progression / a later session**, choose a later date and review current inputs. This keeps occurrence identity for comparison, not the old approval.
3. Save a **Progression** request for the later target date. Select that target, the completed baseline and the development progression policy; generate the bounded proposal.
4. Review its evidence, accept as an unassigned draft if appropriate, then validate and explicitly approve. Zero, missing or incomparable performance does not qualify automatically.

## Weekly planning

1. In preparation use **Add another session for weekly planning** and enter two to five distinct dates/times. Prepare them together so their source generation is consistent. Do not separately assign them first.
2. Open **Weekly planning**. Choose the same release and its weekly policy, the seven-day window, the same timezone, full-body structure and matching goal IDs.
3. Select the current unassigned session drafts and explicitly confirm support for each. Validate and save the weekly review. Resolve date, recovery, coverage or budget gaps if returned.
4. Review and explicitly approve all sessions. Approval is atomic: no partial week is silently assigned. Check the normal Workouts and Schedule pages afterward.

## Rollback and retry

- On the normal client page, **Switch my account to Classic workflow** restores the legacy planning workflow for that coach only. Workouts, sources and results remain saved. Active pooling sessions can still be stopped. Re-enable using the same card.
- This toggle is not an exact code downgrade. The permanent Classic code reference is `fitness-scribber-classic-2026-09-07`; an additional pre-integration checkpoint is `fitness-scribber-pre-integration-2026-09-09`.
- If a save times out, inspect **Operation recovery** and reconcile the original operation. Do not repeatedly create new requests. Completed preparation steps remain saved even if a later step fails.
- If source records change, review and prepare a new current revision. Existing approvals retain their original source snapshot and history.
- Vercel's access screen, if shown, is separate from the app login. Use the approved Preview-access method; never send account passwords in a testing report.
