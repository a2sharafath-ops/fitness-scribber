# Weekly muscle report — implementation proposal

Status: integrated locally in Progress → Training load. The standalone HTML remains a design reference. No deployment in this change.

## Experience

One weekly report with front and back SVG body maps, a Sets / Volume load switch, and an exercise breakdown for the selected muscle. Both views remain visible on a phone. The full muscle list provides keyboard access and access to deeper groups. Select a different week to inspect partial and empty examples. Keep supporting methodology collapsed.

Exercise Library continues to own assignments. This is a proposed client report; its final location and PDF entry point need design approval. Do not put assignment editing into the report.

## Calculation contract

1. Filter by authenticated coach, client ID and a seven-day Monday–Sunday interval in the configured reporting timezone. Display dates, not an ambiguous “last week”.
2. Include completed actual working sets from Main Lift, Accessory Lift and Power only. Exclude the entire Warm-up block before exercise classification, then exclude individual warm-up sets within otherwise eligible blocks. Exclude cool-down, mobility and unclassified records pending review. Never infer working-set eligibility from exercise names, low weights or library categories. Do not substitute prescribed values. Keep unknown set counts visible in coverage.
3. Direct sets and assisting sets stay separate. Do not apply the existing helper's 0.5 fractional convention by default.
4. For known actual reps and load, volume load is sum(reps × recorded external kg) across completed sets. Sets with unknown load/reps remain in set counts but are excluded from the known subtotal; label that subtotal partial. Bodyweight-only records need their own load convention, not an invented bodyweight conversion.
5. Attribute exercise exposure to the library's direct muscle groups. Full compound-exercise tonnage appears in each direct group: totals overlap and cannot be summed. No estimated force percentages.
6. Use a sequential scale normalized to the selected week's maximum for the chosen metric, with a numeric legend. This is not a safe/unsafe or optimal-volume scale. A different week has a different scale; pin a common scale if cross-week comparison is later introduced.
7. Separate no records, known zero external load, missing data, unmapped exercises and recorded rest. The preview simplifies the zero/unknown map appearance; production must provide distinct patterns and accessible labels for these states. No risk or recovery claims.
8. Retain date, source, exercise ID, mapping provenance and per-set inputs in drill-down. Side-specific volume cannot be inferred; both sides visualize the same group aggregate.

## Existing build and gaps

- `src/lib/muscleVolume.js` already filters by client/date and resolves IDs or unique exact names, counts completed main-section workout sets and resistance logs, and tracks missing load and unmapped observations. Reuse the contract, not its optional fractional total.
- The helper already excludes the separate warmup array, but does not filter warm-up-tagged blocks inside main or individual warm-up set rows. Add an explicit working/warm-up set-purpose field and normalize Main Lifts, Assisted/accessory and Power blocks. Core/Others needs explicit accessory classification; do not include it wholesale. Older records and standalone resistance logs without block/set purpose require coach review before inclusion. Warm-up exclusion always takes precedence over Power classification.
- Workout and manual logs lack a shared source-set identifier. Add provenance/deduplication support before combining potentially duplicated records. Never silently guess duplicates from matching dates or loads.
- Current load records do not reliably specify total vs per-hand or unilateral conventions. Preserve recorded units and disclose this; extend input metadata before normalizing it.
- Seven ambiguous catalog names still require exercise descriptions or coach review. Custom unmapped exercises must appear in an “Unmapped” coverage bucket, not receive guessed assignments.
- Surface anatomy cannot expose every deep muscle independently. The SVG uses grouped schematic regions; deep groups use a list/detail view. Final anatomical geometry needs review before claiming anatomical accuracy. No inferred left/right symmetry assessment.
- Decide historical mapping behavior: snapshot mapping/version on completed sets for reproducible reports; otherwise disclose that current library changes recalculate history.
- Confirm an explicit reporting timezone, kilogram normalization, and report export requirements before implementation.

## Build sequence after approval

1. Finalize schematic anatomy, muscle-region IDs, placement and reporting timezone. Review unmapped library entries independently.
2. Harden pure aggregation with per-set provenance, missingness, mapping versions and load conventions. Test mixed complete/incomplete sets, compound overlap, assistance, zero external load, empty weeks, date boundaries and client isolation.
3. Connect the report to existing client data with loading, retry and failure states. Keep illustration and data list driven by one aggregate model.
4. Implement region selection, keyboard list, metric/week controls and distinct missing-data patterns. Test 390px, tablet, desktop, keyboard and readable numeric alternatives.
5. Add a print/report layout using the same aggregate, legend and coverage disclosure. Verify print clipping and totals before release. Run focused regressions, lint and build.

## Blockers

None for the HTML concept. Accurate production totals depend on resolving duplicate provenance and load conventions; anatomical precision needs a reviewed illustration. These can be addressed in implementation without inventing physiology or universal thresholds. The current HTML is illustrative and does not validate clinical or anatomical accuracy.

## Revised design — working sets only

The HTML has more contoured front/back muscle regions and fibre detail, while remaining a grouped illustration rather than a medically validated atlas. It includes a Power example (jump squat) and deliberately excludes two warm-up-block sets plus one warm-up set in Main Lift. Expected full-week total: 29 working sets; Quadriceps: 10 direct sets and 2,820 kg·reps. Jump squat contributes sets with zero recorded external load, not zero effort. Confirmed warm-up exclusions must be tested at block and set levels, including a power exercise in a warm-up block.

## Outline refinement

The interactive SVG now uses 72 traced surface regions from the supplied 768 × 768 illustration instead of approximate overlays. The trace script preserves the image pixels and simplifies contour boundaries at 0.55-pixel tolerance. Shared anatomical groups use the same aggregate across their visible sections. The reference combines serratus and lateral abdominal wall, so those two regions use an explicit separator; this remains a grouped coaching illustration, not a validated anatomical segmentation. Deeper groups remain list-only. Verified mouse selection, keyboard selection, Sets/Volume load switching and neutral fills for an empty week. Warm-up exclusions remain unchanged.

## Application integration — 2026-09-29

`ClientMuscleVolume` renders the approved traced body in the client Training load view. It uses `muscleVolume(..., { workingOnly: true })`, Monday–Sunday civil dates and the configured timezone. A client-keyed component resets week and selection when switching clients. No sample data enter the application. Volume load is explicitly kg·reps regardless of the weight display preference.

New workout set rows store `purpose` (working or warmup); the live runner exposes this selector. Existing set rows are not silently relabelled. Unknown group or purpose is excluded and shown in Coverage & calculation details, where a coach can classify a specific completed set. Review writes only group and purpose into existing workout JSON; no new database columns or migration. Save failures remain visible. Explicit warm-up/cool-down blocks always win over classification. Manual resistance logs are deliberately excluded pending reliable source linkage and warm-up metadata, preventing cross-source double counting. No automatic legacy backfill.

The report discloses missing load, unmapped sets, excluded records and current-library historical recalculation. Partial volume is a known subtotal. A striped region indicates wholly unknown direct volume; white indicates known zero external volume. Empty/no-direct regions are gray. Shared regions reflect the same muscle group, not independent measurements.

For a client with no eligible sets, the report now explains whether separate resistance logs or unclassified completed sets exist. An explicit action creates a separate **Muscle Volume Demo** client with current-week and prior-week completed workouts. Its sample workouts contain Main Lift, Accessory Lift and Power working sets plus warm-up examples that remain excluded. The demo is marked in the existing client notes field, so it can be found after reload without a schema change, and pressing the action again reuses the same client. Existing client records are untouched. Local app creation and reload were verified with 23 current-week eligible sets, 20/23 with known volume load. The demo remains local to the app instance where it was created.

Validation: 37 tests pass, including actuals vs prescriptions, exclusion precedence, review ownership, UI rendering and simulated persistence/readback through workout JSON; build and lint pass. Authenticated local browser verified region selection and metric switching; 390px layout has no horizontal page overflow. Live Supabase mutation was not exercised for this change. Existing production build emits the bundle-size advisory.
