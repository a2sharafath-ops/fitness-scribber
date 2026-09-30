# Classic client workspace — live Supabase check

24 September 2026. The signed-in coach used the connected Supabase project through the local Classic app. All entries below are fictional and belong to a newly created temporary release-test client. No pre-existing client record was edited.

| Check | Result after a full app reload |
|---|---|
| Create client | Passed. The temporary client remained in the roster. |
| Profile preferences | Passed. “Release test: cycling” and three days per week retained their profile-update date and source. |
| Profile measurement | Passed. Height 170 cm retained its profile-entry date and source. |
| Wellness check-in | Passed. Four ratings produced 22/28, with Sep 24 date and “Coach manual” source. |
| Fitness assessment | Passed. One baseline lift, 40 kg × 5 reps, returned as a dated “Coach entry” record. |
| Session RPE | Passed. RPE 5 × 30 minutes returned as 150 AU, “Coach manual”. |
| Resistance log | Passed. A fictional squat entry, 2 × 5 × 40 kg, returned with “Coach manual” source. |
| Conditioning log | Passed. A fictional cycling entry with 20 minutes in zone returned with “Coach manual” source and other measures missing. |
| Client isolation in the app | Passed for the sampled other client: the temporary client’s test observations were absent from that client’s Check-ins view. This is not a separate-account RLS penetration test. |
| Prescribed workout | **Failed.** The builder showed an optimistic workout, then the app reported `prescriptions: governed_workflow_required`. A full reload showed the workout was not in Supabase. Workout completion cannot be accepted until this is resolved. |

Diagnosis: the database still has a legacy governance trigger on Classic prescription and workout tables. It rejects these writes with `governed_workflow_required` for clients under an old development setting, even though the Classic app no longer uses that workflow. This setting applies at coach scope, so changing it requires a separate production approval and review of its effect on existing clients.

A proposed targeted fix was to disable the signed-in coach’s legacy development setting. That is **coach-wide**: it would change behavior for all clients owned by that coach, not just the temporary client. Automatic approval review rejected executing it because the disposable-client authorization did not cover this production setting change. No governance setting or trigger was changed.

Current state: the temporary client and the seven successfully saved test data categories remain in Supabase for the pending workout retest and cleanup. The failed prescription is absent after reload. The app’s development-only warning now exposes the database error under “Technical details,” while the ordinary visible warning remains generic. Release acceptance remains open until the Classic workout save and completion are verified, the test data are removed, and the separate screen-reader, zoom/reflow, and trainer-comparison checks are completed.

## Read-only follow-up — 30 September 2026

The production database still has an enabled `pooling_legacy_guard` trigger on both `prescriptions` and `workouts`. Its function raises `governed_workflow_required` when `pooling_governed_client(clientId)` is true. The release-test client is governed by the coach's enabled legacy development setting; global pooling is off and this client is not a pooling test workspace. The coach owns four clients: three are development-governed, and one separate fictional test workspace remains governed independently. This was verified with read-only SQL; no setting or trigger was changed.

The live project has 37 `pooling_*` tables, 81 `pooling_*` functions and 73 `pooling_*` triggers. Full schema removal is a separate, broad production migration requiring dependency and data review. For the immediate Classic write blocker, [the guarded one-row setting update](./classic-release-governance-unblock.sql) is prepared for owner review. It asserts the observed scope before execution and is reversible, but it changes behavior for the three development-governed clients, including real clients. Do not execute it on the strength of disposable-client test authorization alone. After approval, retest prescription save/reload and workout completion on the fictional client before treating the release blocker as closed.

## Approved release unblock and live retest — 30 September 2026

The owner explicitly approved the coach-wide legacy setting change. The guarded SQL transaction completed on the production Supabase project. Its post-update query returned **4 coach clients, 0 development-governed clients, and 1 separately governed fictional pooling test workspace**. The SQL remains in this repository as the exact audit copy; it intentionally rejects a repeat run.

On the fictional Classic release-test client `5vvsxmi`, a Sep 30 Back Squat prescription (3 sets of 5 at 40 kg) saved and remained after a full app reload. The coach then used that prescription, logged all three working sets, completed the session with a 30-minute duration and session RPE 7, and reloaded the app. The completed status, 1/1 exercises ticked, three logged sets, 600 kg moved, and 46.7 kg Epley estimate all remained. The report also read back one completed workout and the dated Back Squat estimate. Progress showed the same three current-week direct sets for quadriceps and glutes; the quadriceps detail listed each dated Back Squat set with its 40 kg × 5 actuals and completed-workout source. The former `governed_workflow_required` write blocker is closed for this Classic release-test path.

The Overview card incorrectly showed “0 exercises” for the completed session because it read a nonexistent `workout.items` array. The local code now counts `workout.main`, and the connected app showed the corrected count. All 42 tests, lint, and build passed locally. Publication is still pending. Full removal of dormant pooling schema objects remains separate from this narrow release unblock. The fictional test records remain for release verification and planned cleanup.

The live retest exposed a separate source defect: the runner had persisted a simulated heart-rate stream and the completed-workout summary treated it as measured. The Classic runner now leaves workout HR empty without a measured source, and the summary hides old unsourced HR values and HR-derived estimates. The session-RPE dialog now requires an actual selected rating or an explicit skip; it no longer proposes a rating from peak HR. The connected app shows “No measured HR” for the test session while preserving its actual sets, volume, duration, and dated session-RPE log. This is a display and future-write correction; it does not purge historical HR columns in Supabase. After this fix, **43 tests**, lint, and build passed locally.
