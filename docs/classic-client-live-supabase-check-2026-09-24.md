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
