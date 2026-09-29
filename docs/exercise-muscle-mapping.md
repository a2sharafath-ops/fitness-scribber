# Exercise muscle mapping

The coach reviews muscle assignments in **Workouts → Exercise Library**. The client Progress page has no muscle-volume panel. Future client reports and a body model can read the same `muscleTargets` field, but neither visualization is part of this change.

## Scope and data model

- `muscleTargets.direct`: principal movers targeted by the named variation.
- `muscleTargets.indirect`: meaningful assistants or stabilizers. A muscle cannot occupy both lists.
- `muscleTargets.source`: `catalog` for the researched default, `coach` once the coach changes a role. Existing custom assignments without a source remain valid.
- The old `muscle` field is a broad browsing category, **not** an anatomical or volume attribution.
- The controlled vocabulary in `src/lib/muscleVolume.js` is stable for later body-model region mapping. The body model should map region IDs to one or more of these groups explicitly; bilateral side cannot be inferred from current records.
- A mobility exercise (foam rolling or static stretch) retains its existing `target` tissues and is excluded from resistance working-set mapping. Corrective activation exercises do get working-muscle assignments.

The 209 imported strength exercises were audited by named variation. **202 have catalog defaults**. Seven names remain explicitly `Needs review`: four “Bridge Drop Downs” variants and three “DB Press” variants. The source catalog gives no movement description or pressing direction for these, so assigning their specific movers would be a guess. All 18 corrective activation exercises have defaults; SMR and static stretches remain separate. Seeded common exercises are covered by the same mapping logic. Coach-created exercises without an unambiguous name require manual assignment.

The catalog's family rules distinguish conventional deadlift from Romanian deadlift, hip thrust from hamstring curl, horizontal from overhead press, row from pulldown, and lateral from sagittal squat/lunge. Direct/indirect roles are categorical coaching labels, not EMG percentages or measured mechanical force. The coach can correct a variation in the editor. Catalog merges now preserve exercise IDs and saved coach edits across reloads. New backend catalog IDs include the coach ID so separate coaches can save the same named exercise without a primary-key collision; existing saved IDs are retained.

## Evidence and limits

- [Deadlift variant EMG review](https://pubmed.ncbi.nlm.nih.gov/32107499/) and [conventional versus Romanian deadlift experiment](https://pubmed.ncbi.nlm.nih.gov/30662500/) support treating conventional and Romanian deadlifts differently.
- [Hip thrust versus squat EMG](https://pubmed.ncbi.nlm.nih.gov/26214739/) and [longitudinal squat versus hip thrust hypertrophy study](https://pubmed.ncbi.nlm.nih.gov/37877099/) support glute emphasis for the hip thrust while cautioning against interpreting EMG as direct growth prediction.
- [Dumbbell bench, incline and shoulder press comparison](https://pubmed.ncbi.nlm.nih.gov/26464884/) and [deltoid exercise comparison](https://pubmed.ncbi.nlm.nih.gov/33312291/) support distinct chest and shoulder roles.
- [Pulldown and row activation experiment](https://pubmed.ncbi.nlm.nih.gov/15228624/) supports the lat, upper-back and biceps roles in pulling patterns.
- [Direct versus indirect set-volume meta-regression](https://pubmed.ncbi.nlm.nih.gov/41343037/) motivates keeping these roles separate. It does not validate an exact muscle-force percentage for any exercise.

Variation, technique, range of motion, load and individual anatomy change muscle demand. These defaults are reasonable starting labels for coaching review, not individually validated muscle measurements. Evidence is strongest for common lifts; uncommon catalog labels remain more uncertain. We have not validated each of 202 named variants in a separate study, and the interface does not claim that level of proof.

## Future report calculation contract

`src/lib/muscleVolume.js` retains a pure, unmounted calculation helper for later reporting. It uses only completed main-section workout sets and resistance logs for a single client/date window. Known sets with missing actual reps/load count as sets, but not as known volume load. Volume load is recorded external kg × reps. A compound set contributes its full exercise tonnage to each direct muscle; muscle totals overlap and **must not be summed**. Zero external load does not imply zero bodyweight effort. Current records do not reliably encode per-side or per-hand load conventions, and workout/manual-log duplicates have no shared source ID, so future visualization must disclose these limitations. The body model should display mapped recorded exposure, not a physiological heatmap or injury-risk score.

## Persistence

Local mode stores the mapping with each exercise. Supabase uses `supabase/schema_exercise_muscles.sql` for muscle targets and catalog metadata. The live project also lacked the older exercise media fields (`difficulty`, `video`, `thumb`), so this migration includes them for editor upserts. It does not change RLS. On 2026-09-29, the migration was applied to project `haxxetirrcrwzwdzsdui`; a Bench Press record with direct Chest and assisting Front delts and Triceps was inserted and read back in a separate SQL query. An authenticated coach then saved that same assignment through the Exercise Library editor and reloaded the page: the saved row and coach-edited state persisted. The test-only coach-edited source label was restored to `catalog` afterward, without changing the muscle assignment.
