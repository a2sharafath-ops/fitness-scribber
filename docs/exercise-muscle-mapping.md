# Exercise muscle mapping

The coach reviews muscle assignments in **Workouts → Exercise Library**. The builder, fitness strength-test picker, muscle-volume views and client reports share these exercise identities and muscle assignments.

## Scope and data model

- `muscleTargets.direct`: principal movers targeted by the named variation.
- `muscleTargets.indirect`: meaningful assistants or stabilizers. A muscle cannot occupy both lists.
- `muscleTargets.source`: `catalog` for the researched default, `coach` once the coach changes a role. Existing custom assignments without a source remain valid.
- The old `muscle` field is a broad browsing category, **not** an anatomical or volume attribution.
- The controlled vocabulary in `src/lib/muscleVolume.js` is stable for later body-model region mapping. The body model should map region IDs to one or more of these groups explicitly; bilateral side cannot be inferred from current records.
- A mobility exercise (foam rolling or static stretch) retains its existing `target` tissues and is excluded from resistance working-set mapping. Corrective activation exercises do get working-muscle assignments.

The original 209 imported strength exercises were audited by named variation. **202 have catalog defaults**. The 2026-10-20 expansion adds **201 exercises**, each with explicit defaults, for **410 strength/power entries plus 42 corrective drills (452 catalog entries)**. Seven original names remain explicitly `Needs review`: four “Bridge Drop Downs” variants and three “DB Press” variants. The source catalog gives no movement description or pressing direction for these, so assigning their specific movers would be a guess. All 18 corrective activation exercises have defaults; SMR and static stretches remain separate. Coach-created exercises without an unambiguous name require manual assignment. See the expansion audit below for every added exercise.

The catalog's family rules distinguish conventional deadlift from Romanian deadlift, hip thrust from hamstring curl, horizontal from overhead press, row from pulldown, and lateral from sagittal squat/lunge. Direct/indirect roles are categorical coaching labels, not EMG percentages or measured mechanical force. The coach can correct a variation in the editor. Catalog merges now preserve exercise IDs and saved coach edits across reloads. New backend catalog IDs include the coach ID so separate coaches can save the same named exercise without a primary-key collision; existing saved IDs are retained.

## Evidence and limits

- [Deadlift variant EMG review](https://pubmed.ncbi.nlm.nih.gov/32107499/) and [conventional versus Romanian deadlift experiment](https://pubmed.ncbi.nlm.nih.gov/30662500/) support treating conventional and Romanian deadlifts differently.
- [Hip thrust versus squat EMG](https://pubmed.ncbi.nlm.nih.gov/26214739/) and [longitudinal squat versus hip thrust hypertrophy study](https://pubmed.ncbi.nlm.nih.gov/37877099/) support glute emphasis for the hip thrust while cautioning against interpreting EMG as direct growth prediction.
- [Dumbbell bench, incline and shoulder press comparison](https://pubmed.ncbi.nlm.nih.gov/26464884/) and [deltoid exercise comparison](https://pubmed.ncbi.nlm.nih.gov/33312291/) support distinct chest and shoulder roles.
- [Pulldown and row activation experiment](https://pubmed.ncbi.nlm.nih.gov/15228624/) supports the lat, upper-back and biceps roles in pulling patterns.
- [Direct versus indirect set-volume meta-regression](https://pubmed.ncbi.nlm.nih.gov/41343037/) motivates keeping these roles separate. It does not validate an exact muscle-force percentage for any exercise.

Variation, technique, range of motion, load and individual anatomy change muscle demand. These defaults are reasonable starting labels for coaching review, not individually validated muscle measurements. Evidence is strongest for common lifts; uncommon catalog labels remain more uncertain. We have not validated each of 202 named variants in a separate study, and the interface does not claim that level of proof.

## Report calculation contract

`src/lib/muscleVolume.js` calculates recorded exposure for one client/date window. Known sets with missing actual reps/load count as sets, but not as known volume load. Volume load is recorded external kg × reps. A compound set contributes its full exercise tonnage to each direct muscle; muscle totals overlap and **must not be summed**. Zero external load does not imply zero bodyweight effort. Current records do not reliably encode per-side or per-hand load conventions, and workout/manual-log duplicates have no shared source ID. The body model displays mapped recorded exposure, not a physiological heatmap or injury-risk score.

## Persistence

Local mode stores the mapping with each exercise. Supabase uses `supabase/schema_exercise_muscles.sql` for muscle targets and catalog metadata. The live project also lacked the older exercise media fields (`difficulty`, `video`, `thumb`), so this migration includes them for editor upserts. It does not change RLS. On 2026-09-29, the migration was applied to project `haxxetirrcrwzwdzsdui`; a Bench Press record with direct Chest and assisting Front delts and Triceps was inserted and read back in a separate SQL query. An authenticated coach then saved that same assignment through the Exercise Library editor and reloaded the page: the saved row and coach-edited state persisted. The test-only coach-edited source label was restored to `catalog` afterward, without changing the muscle assignment.

## Expansion audit — 2026-10-20

Added **201** entries to the existing 251, for **452 built-in exercises**. This audit covers the shipped catalog; coach-created entries may increase the visible count.

The gap check focused on beginner regressions, machine and cable hypertrophy work, shoulders/arms, calves and shins, trunk work, grip/carries, and non-Olympic power movements. Existing loaded squat/hinge/press/pull variants are retained.

Alternate names resolve through search. Examples: “dumbbell bench press” finds “DB Bench Press 2-Arm”; “seated cable row” finds “Cable Row (Neutral)”; “slider hamstring curl” reuses “Bridge Lift and Curl (Slide Board)”. Typographic legacy names remain compatible with saved workouts.

The filter label is **Muscles assigned**. Exercise suggestions in the builder and Fitness form show an **Also called** description and every matching variation in a scrollable list. Exact exercise names rank first. Partial aliases, RFESS/BSS, RDL, DB/KB/BB, punctuation, and one-arm/single-arm wording are supported. Rear-foot-elevated split squat matches the Bulgarian variants across their existing equipment. It does not turn a front-foot-elevated or ordinary split squat into a Bulgarian split squat, or a conventional/stiff-leg deadlift into an RDL. Selecting a suggestion uses the stored exercise name. These are English coaching aliases; automatic multilingual translation is not provided.

### Every new exercise

| Family | Added |
| --- | ---: |
| Squat | 19 |
| Knee extension | 3 |
| Hinge | 10 |
| Hip extension | 8 |
| Knee flexion | 8 |
| Hip abduction | 6 |
| Hip adduction | 2 |
| Ankle | 11 |
| Push | 14 |
| Chest isolation | 6 |
| Overhead press | 7 |
| Shoulder isolation | 13 |
| Shoulder rotation | 4 |
| Pull | 14 |
| Scapular elevation | 3 |
| Elbow flexion | 12 |
| Elbow extension | 10 |
| Grip | 5 |
| Core | 26 |
| Carry | 6 |
| Power | 14 |

### Squat

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Bodyweight Squat | Bodyweight | Beginner |
| Sit-to-Stand | Bench | Beginner |
| Supported Squat | Suspension Trainer | Beginner |
| Hack Squat | Machine | Intermediate |
| Smith Machine Squat | Smith Machine | Intermediate |
| Pendulum Squat | Machine | Intermediate |
| Heels-Elevated Goblet Squat | Dumbbell | Intermediate |
| Landmine Squat | Landmine | Beginner |
| Safety Bar Squat | Safety Bar | Intermediate |
| Spanish Squat | Bands | Intermediate |
| Wall Sit | Bodyweight | Beginner |
| Bodyweight Step-Up | Box | Beginner |
| Bodyweight Split Squat | Bodyweight | Beginner |
| Bodyweight Reverse Lunge | Bodyweight | Beginner |
| Bodyweight Forward Lunge | Bodyweight | Beginner |
| Smith Machine Split Squat | Smith Machine | Intermediate |
| Front-Foot-Elevated Split Squat | Dumbbell | Intermediate |
| Bodyweight Lateral Lunge | Bodyweight | Beginner |
| Cossack Squat | Bodyweight | Intermediate |

### Knee extension

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Leg Extension | Machine | Beginner |
| Single-Leg Leg Extension | Machine | Beginner |
| Reverse Nordic Curl | Bodyweight | Advanced |

### Hinge

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Dumbbell Kickstand Romanian Deadlift | Dumbbell | Intermediate |
| Barbell Kickstand Romanian Deadlift | Barbell | Intermediate |
| Smith Machine Romanian Deadlift | Smith Machine | Intermediate |
| Kettlebell Romanian Deadlift | Kettlebell | Beginner |
| Banded Good Morning | Bands | Beginner |
| Trap Bar Deadlift | Trap Bar | Intermediate |
| Kettlebell Deadlift | Kettlebell | Beginner |
| Dumbbell Deadlift | Dumbbell | Beginner |
| Block Deadlift | Barbell | Intermediate |
| Deficit Deadlift | Barbell | Advanced |

### Hip extension

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Barbell Hip Thrust | Barbell | Intermediate |
| Smith Machine Hip Thrust | Smith Machine | Intermediate |
| Machine Hip Thrust | Machine | Beginner |
| Dumbbell Hip Thrust | Dumbbell | Beginner |
| Cable Glute Kickback | Cable | Beginner |
| Machine Glute Kickback | Machine | Beginner |
| Banded Glute Bridge | Bands | Beginner |
| Frog Pump | Bodyweight | Beginner |

### Knee flexion

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Seated Leg Curl | Machine | Beginner |
| Lying Leg Curl | Machine | Beginner |
| Standing Leg Curl | Machine | Beginner |
| Single-Leg Seated Leg Curl | Machine | Beginner |
| Single-Leg Lying Leg Curl | Machine | Beginner |
| Suspension Hamstring Curl | Suspension Trainer | Intermediate |
| Banded Leg Curl | Bands | Beginner |
| Assisted Nordic Curl | Bands | Intermediate |

### Hip abduction

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Seated Hip Abduction | Machine | Beginner |
| Standing Cable Hip Abduction | Cable | Beginner |
| Banded Lateral Walk | Bands | Beginner |
| Banded Monster Walk | Bands | Beginner |
| Clamshell | Bodyweight | Beginner |
| Banded Clamshell | Bands | Beginner |

### Hip adduction

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Seated Hip Adduction | Machine | Beginner |
| Standing Cable Hip Adduction | Cable | Beginner |

### Ankle

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Standing Calf Raise | Machine | Beginner |
| Seated Calf Raise | Machine | Beginner |
| Single-Leg Calf Raise | Bodyweight | Beginner |
| Dumbbell Standing Calf Raise | Dumbbell | Beginner |
| Dumbbell Seated Calf Raise | Dumbbell | Beginner |
| Leg Press Calf Raise | Machine | Beginner |
| Smith Machine Calf Raise | Smith Machine | Beginner |
| Donkey Calf Raise | Machine | Intermediate |
| Bent-Knee Single-Leg Calf Raise | Bodyweight | Beginner |
| Wall Tibialis Raise | Bodyweight | Beginner |
| Tibialis Raise | Tib Bar | Beginner |

### Push

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Machine Chest Press | Machine | Beginner |
| Incline Machine Chest Press | Machine | Beginner |
| Smith Machine Bench Press | Smith Machine | Intermediate |
| Smith Machine Incline Bench Press | Smith Machine | Intermediate |
| Dumbbell Decline Bench Press | Dumbbell | Intermediate |
| Cable Chest Press | Cable | Intermediate |
| Banded Chest Press | Bands | Beginner |
| Incline Push-Up | Bench | Beginner |
| Wall Push-Up | Bodyweight | Beginner |
| Kneeling Push-Up | Bodyweight | Beginner |
| Decline Push-Up | Bench | Intermediate |
| Banded Push-Up | Bands | Intermediate |
| Close-Grip Bench Press | Barbell | Intermediate |
| Assisted Dip | Machine | Beginner |

### Chest isolation

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Pec Deck Fly | Machine | Beginner |
| Cable Chest Fly | Cable | Intermediate |
| Low-to-High Cable Fly | Cable | Intermediate |
| High-to-Low Cable Fly | Cable | Intermediate |
| Dumbbell Chest Fly | Dumbbell | Intermediate |
| Incline Dumbbell Fly | Dumbbell | Intermediate |

### Overhead press

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Seated Dumbbell Shoulder Press | Dumbbell | Intermediate |
| Standing Dumbbell Shoulder Press | Dumbbell | Intermediate |
| Machine Shoulder Press | Machine | Beginner |
| Smith Machine Shoulder Press | Smith Machine | Intermediate |
| Arnold Press | Dumbbell | Intermediate |
| Pike Push-Up | Bodyweight | Intermediate |
| Handstand Push-Up | Bodyweight | Advanced |

### Shoulder isolation

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Dumbbell Lateral Raise | Dumbbell | Beginner |
| Seated Dumbbell Lateral Raise | Dumbbell | Beginner |
| Cable Lateral Raise | Cable | Intermediate |
| Machine Lateral Raise | Machine | Beginner |
| Banded Lateral Raise | Bands | Beginner |
| Dumbbell Front Raise | Dumbbell | Beginner |
| Cable Front Raise | Cable | Beginner |
| Plate Front Raise | Plates | Beginner |
| Dumbbell Rear Delt Fly | Dumbbell | Intermediate |
| Reverse Pec Deck | Machine | Beginner |
| Cable Rear Delt Fly | Cable | Intermediate |
| Face Pull | Cable | Intermediate |
| Band Pull-Apart | Bands | Beginner |

### Shoulder rotation

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Cable External Rotation | Cable | Beginner |
| Banded External Rotation | Bands | Beginner |
| Cable Internal Rotation | Cable | Beginner |
| Banded Internal Rotation | Bands | Beginner |

### Pull

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Seated Machine Row | Machine | Beginner |
| T-Bar Row | Landmine | Intermediate |
| Single-Arm Cable Row | Cable | Intermediate |
| Inverted Row | Barbell | Beginner |
| Suspension Row | Suspension Trainer | Beginner |
| Banded Seated Row | Bands | Beginner |
| Renegade Row | Dumbbell | Advanced |
| Assisted Pull-Up | Machine | Beginner |
| Band-Assisted Pull-Up | Bands | Beginner |
| Single-Arm Lat Pulldown | Cable | Intermediate |
| Kneeling Banded Lat Pulldown | Bands | Beginner |
| Straight-Arm Cable Pulldown | Cable | Intermediate |
| Machine Pullover | Machine | Beginner |
| Dumbbell Pullover | Dumbbell | Intermediate |

### Scapular elevation

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Dumbbell Shrug | Dumbbell | Beginner |
| Barbell Shrug | Barbell | Intermediate |
| Machine Shrug | Machine | Beginner |

### Elbow flexion

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| EZ-Bar Curl | EZ Bar | Beginner |
| Hammer Curl | Dumbbell | Beginner |
| Incline Dumbbell Curl | Dumbbell | Intermediate |
| Concentration Curl | Dumbbell | Beginner |
| Cable Biceps Curl | Cable | Beginner |
| Preacher Curl | EZ Bar | Intermediate |
| Machine Preacher Curl | Machine | Beginner |
| Spider Curl | Dumbbell | Intermediate |
| Bayesian Cable Curl | Cable | Intermediate |
| Banded Biceps Curl | Bands | Beginner |
| EZ-Bar Reverse Curl | EZ Bar | Intermediate |
| Dumbbell Reverse Curl | Dumbbell | Intermediate |

### Elbow extension

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Rope Triceps Pushdown | Cable | Beginner |
| Straight-Bar Triceps Pushdown | Cable | Beginner |
| Single-Arm Cable Triceps Pushdown | Cable | Beginner |
| Overhead Cable Triceps Extension | Cable | Intermediate |
| Dumbbell Overhead Triceps Extension | Dumbbell | Intermediate |
| EZ-Bar Skull Crusher | EZ Bar | Intermediate |
| Dumbbell Lying Triceps Extension | Dumbbell | Intermediate |
| Dumbbell Triceps Kickback | Dumbbell | Beginner |
| Machine Triceps Extension | Machine | Beginner |
| Banded Triceps Pushdown | Bands | Beginner |

### Grip

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Dumbbell Wrist Curl | Dumbbell | Beginner |
| Dumbbell Reverse Wrist Curl | Dumbbell | Beginner |
| Plate Pinch Hold | Plates | Intermediate |
| Dead Hang | Pull-Up Bar | Beginner |
| Hand Gripper | Hand Gripper | Beginner |

### Core

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Plank | Bodyweight | Beginner |
| Side Plank | Bodyweight | Beginner |
| Kneeling Side Plank | Bodyweight | Beginner |
| Pallof Press | Cable | Beginner |
| Banded Pallof Press | Bands | Beginner |
| Half-Kneeling Pallof Press | Cable | Intermediate |
| Cable Wood Chop | Cable | Intermediate |
| Cable Lift | Cable | Intermediate |
| Ab Wheel Rollout | Ab Wheel | Advanced |
| Stability Ball Rollout | Fitness Ball | Intermediate |
| Stir the Pot | Fitness Ball | Intermediate |
| Plank Shoulder Tap | Bodyweight | Intermediate |
| Hollow Body Hold | Bodyweight | Intermediate |
| Cable Crunch | Cable | Intermediate |
| Machine Abdominal Crunch | Machine | Beginner |
| Abdominal Crunch | Bodyweight | Beginner |
| Reverse Crunch | Bodyweight | Beginner |
| Bicycle Crunch | Bodyweight | Intermediate |
| Russian Twist | Bodyweight | Intermediate |
| Bird Dog | Bodyweight | Beginner |
| Hanging Knee Raise | Pull-Up Bar | Intermediate |
| Hanging Leg Raise | Pull-Up Bar | Advanced |
| Captain Chair Knee Raise | Machine | Intermediate |
| Lying Leg Raise | Bodyweight | Intermediate |
| Copenhagen Plank (Short Lever) | Bench | Intermediate |
| Copenhagen Plank (Long Lever) | Bench | Advanced |

### Carry

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Farmer Carry | Dumbbell | Intermediate |
| Suitcase Carry | Dumbbell | Intermediate |
| Trap Bar Carry | Trap Bar | Intermediate |
| Front Rack Carry | Kettlebell | Intermediate |
| Overhead Carry | Kettlebell | Advanced |
| Sandbag Bear Hug Carry | Sandbag | Intermediate |

### Power

| Exercise | Equipment | Difficulty |
| --- | --- | --- |
| Box Jump | Box | Intermediate |
| Countermovement Jump | Bodyweight | Intermediate |
| Broad Jump | Bodyweight | Intermediate |
| Lateral Bound | Bodyweight | Intermediate |
| Split Squat Jump | Bodyweight | Advanced |
| Pogo Jump | Bodyweight | Intermediate |
| Dumbbell Jump Squat | Dumbbell | Advanced |
| Kettlebell Swing | Kettlebell | Intermediate |
| Single-Arm Kettlebell Swing | Kettlebell | Intermediate |
| Medicine Ball Chest Pass | Medicine Ball | Intermediate |
| Plyometric Push-Up | Bodyweight | Advanced |
| Medicine Ball Slam | Medicine Ball | Intermediate |
| Medicine Ball Rotational Throw | Medicine Ball | Intermediate |
| Medicine Ball Scoop Toss | Medicine Ball | Intermediate |

### Limits and compatibility

- This is a practical gap audit against the shipped catalog, not an exhaustive list of every possible exercise or a prescription for every client.
- Muscle roles and difficulty are coaching defaults inferred from the named movement. They are not validated muscle-force measurements or individual screening decisions.
- Holds and carries can use the existing Seconds/Minutes prescription metrics. Distance, speed, power, calories and device resistance have no dedicated set fields; these need a separate logging design.
- No new relative 1RM percentages, exercise-specific load recommendations, medical protocols or normative testing values were added.
- Existing entries, custom names, saved IDs, media and coach overrides remain intact. Name aliases support finding existing entries without changing workout history.
- The existing demo links open a YouTube search; these are not individually reviewed video demonstrations. No third-party photographs or instructions were copied.
- Seven ambiguous legacy entries remain for coach review. Cardio modalities and specialized rehabilitation protocols are deferred pending suitable measurement and protocol support.

All added rows use the existing exercise columns. They are merged on load with stable owner-scoped IDs; no database migration is required. Repeated loads do not add more copies. Equipment choices in the editor come from the library, and search/filtering uses equipment, muscles and alternate names. Generic non-exercise autocomplete fields retain their existing matching behaviour.

[Machine-readable audit with every direct/assisting mapping and search alias](exercise-library-expansion.json).

### Sources checked

- [ACE Exercise Library: body parts, equipment and experience levels](https://www.acefitness.org/resources/everyone/exercise-library/)
- [ACE: exercise research and program coverage](https://www.acefitness.org/continuing-education/certified/august-2023/8398/the-ultimate-ace-workout-an-evidence-based-approach-to-programming-and-class-design/)
- [Sport Keele: home exercise library](https://www.keele.ac.uk/sportatkeele/activekeele/exerciselibrary/)
- [NSCA: Romanian Deadlift (RDL) terminology](https://dxpprod.nsca.com/education/articles/kinetic-select/romanian-deadlift-rdl/)
- [NSCA: Bulgarian / rear-foot-elevated split squat terminology](https://dxpprod.nsca.com/contentassets/9dab08fc28274f3ba1d76af31bbbe40b/coach3.1-screening_and_preventing_common_injuries_in_division_i_basketball_players.pdf)

These sources informed coverage and terminology. The mapping of every added variant is a categorical coaching judgment; this is not a claim of a separate validation study for each variant.

## Second expansion audit — 2026-10-24

Live verification on 24 October: added these 28 rows through the signed-in Exercise Library form. The current account increased from 272 to 300 entries. After a full reload, all 28 appeared exactly once with matching direct/assisting roles and equipment; the original name counts were unchanged and no data warning was shown. Beginner/intermediate/advanced difficulty samples also persisted. This is a live data addition, not a code deployment: the alias-search changes and earlier built-in expansion remain local until released.

Added **28** more exercises after comparing the previous 452 built-ins, aliases, and the visible live library. Built-in total: **480** (438 strength/power + 42 corrective). The earlier audit above remains the historical first batch. Live account counts differ because coach-created exercises and release versions differ.

Focus: supported unilateral work; step-down direction; scapular control; different cable setups; forearm rotation; core, loaded marching and unilateral hops. These are distinct movements or equipment/support choices, not duplicate alternate names.

| Exercise | Primary equipment | Direct muscles | Assisting muscles |
| --- | --- | --- | --- |
| Supported Single-Leg Dumbbell Romanian Deadlift | Dumbbell | Hamstrings, Glutes | Spinal erectors |
| Dumbbell Single-Leg Hip Thrust | Dumbbell | Glutes | Hamstrings, Abdominals |
| Lateral Step-Down | Bodyweight | Quadriceps, Glutes | Hip abductors, Adductors |
| Forward Step-Down | Bodyweight | Quadriceps, Glutes | Hip abductors, Adductors |
| Dumbbell Lateral Step-Up | Dumbbell | Quadriceps, Glutes | Hip abductors, Adductors |
| Standing Cable Hip Flexion | Cable | Hip flexors | Abdominals |
| Hip Airplane | Bodyweight | Hip abductors, Glutes | Hamstrings, Abdominals |
| Scapular Push-Up | Bodyweight | Serratus anterior | Abdominals |
| Weighted Push-Up | Bodyweight | Chest | Triceps, Front delts, Abdominals |
| Single-Arm Dumbbell Floor Press | Dumbbell | Chest | Triceps, Front delts, Abdominals |
| Dumbbell Squeeze Press | Dumbbell | Chest | Triceps, Front delts, Abdominals |
| Half-Kneeling Single-Arm Cable Chest Press | Cable | Chest | Triceps, Front delts, Abdominals |
| Standing Cable Row | Cable | Lats, Upper back | Biceps, Rear delts, Forearms, Abdominals |
| Scapular Pull-Up | Bodyweight | Trapezius, Lats | Forearms |
| Dumbbell Preacher Curl | Dumbbell | Biceps | Forearms |
| Cable Hammer Curl | Cable | Biceps, Forearms | — |
| Zottman Curl | Dumbbell | Biceps, Forearms | — |
| Cross-Body Cable Triceps Extension | Cable | Triceps | — |
| Dumbbell Forearm Pronation | Dumbbell | Forearms | — |
| Dumbbell Forearm Supination | Dumbbell | Forearms | — |
| Bear Plank | Bodyweight | Abdominals | Serratus anterior, Front delts, Hip flexors |
| Bear Crawl | Bodyweight | Abdominals | Serratus anterior, Front delts, Hip flexors |
| Plank Walk-Up | Bodyweight | Abdominals | Serratus anterior, Front delts, Hip flexors |
| Suitcase March | Dumbbell | Abdominals, Forearms | Hip flexors, Glutes, Spinal erectors |
| Kettlebell Turkish Get-Up | Kettlebell | Abdominals, Glutes, Front delts | Triceps, Rotator cuff, Hip abductors |
| Kettlebell Windmill | Kettlebell | Abdominals, Glutes | Hamstrings, Rotator cuff, Front delts |
| Single-Leg Pogo Jump | Bodyweight | Calves | Quadriceps, Glutes |
| Single-Leg Hop and Stick | Bodyweight | Quadriceps, Glutes, Calves | Hamstrings, Hip abductors |

All additions have search aliases. Examples: hand-supported single-leg RDL; lateral heel tap; rope hammer curl; commando plank; KB TGU. Pronation and supination remain separate, as do forward and lateral step-downs. Scapular push-ups use straight arms and are not an alias for a complete push-up plus.

Equipment is the primary resistance: step work also requires a stable platform, hip thrusts/preacher curls need suitable support, weighted push-ups need a secure added load, and scapular pull-ups need a pull-up bar. Bodyweight is not a claim that no setup is needed.

Holds/marching/crawling use the existing time or repetition fields. No distance, force-platform, cardio or rehabilitation-protocol fields were added. No max-load conversion was invented. Advanced entries remain coach-selected options, not automatic recommendations.

Muscle assignments are categorical coaching judgments, including stabilizers for carries and get-ups. They are not measured activation percentages. Existing custom mappings, IDs and client prescriptions survive a catalog upgrade; tests include upgrading an exercise first added manually through the live UI.

### Additional references

- [NASM Exercise Library: coverage and terminology](https://www.nasm.org/workout-exercise-guidance)
- [ACE: Bear Crawl](https://www.acefitness.org/resources/everyone/exercise-library/150/bear-crawl/)
- [Catalyst Athletics: Step-Down](https://catalystathletics.com/exercise/579/Step-Down/)
- [UCSF: Scapular Stabilization Protocol (movement reference only)](https://sportsrehab.ucsf.edu/sites/g/files/tkssra10961/files/Scapular%20Stabilization%20Protocol.pdf)

References informed coverage and movement terminology; clinical protocols and their dosage were not imported. No external images or instructional text were copied.

## Quality batch 3 — 2026-10-24

Live verification: 300 → 308 rows (298 distinct names; the 10 pre-existing duplicate demo rows were not changed). After reload, each of the eight additions appeared exactly once with the expected equipment and direct/assisting mappings. All original name counts were preserved and no data warning appeared. Alternate-name search remains a local code change until release.

Added **8** distinct options, bringing the built-in catalog to **488 unique names** (446 strength/power + 42 corrective). Target: 600 unique catalog exercises, excluding aliases and duplicate demo rows. Seven ambiguous legacy entries still need review; the number is not a claim that every old entry has passed the new quality standard.

The live account had 300 rows / 290 unique names before this batch. Local built-in totals differ because the earlier 201-entry expansion has not been deployed. No commit, push or deployment is part of this batch.

### Acceptance criteria

An entry must offer a distinct coaching choice, avoid existing names/aliases, use supported logging fields, state equipment/setup, have defensible categorical muscle roles, and have an appropriate difficulty and search aliases. No target count overrides these criteria. Evidence supports movement selection and terminology, not a claim that every variant is superior or suitable for every client. Mapping and difficulty remain coaching judgments.

| Exercise | Why it is separate | Primary equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Hand-Assisted Pistol Squat | Hand support offers a regression from the existing unassisted pistol; unlike the box variation, the coach controls assistance rather than a seated depth stop. | Bodyweight | Quadriceps, Glutes / Hip abductors, Adductors, Abdominals |
| Dumbbell Deficit Reverse Lunge | A stable front-foot platform changes available range compared with the existing floor reverse lunge. It is not a front-foot-elevated static split squat. | Dumbbell | Quadriceps, Glutes / Hamstrings, Hip abductors, Adductors, Forearms |
| Seated Barbell Good Morning | Bench support and bent knees change the hinge setup; trunk extensor emphasis differs from the existing standing version. | Barbell | Spinal erectors / Glutes, Hamstrings, Abdominals |
| Single-Leg Cable Romanian Deadlift | A low pulley changes resistance direction from the existing dumbbell and barbell single-leg hinges. This entry is a hinge, not a combined RDL-and-row. | Cable | Hamstrings, Glutes / Spinal erectors, Abdominals, Forearms |
| Standing Split-Stance Single-Arm Landmine Press | Adds a standing split-stance option alongside the existing half-kneeling press. Requires a barbell secured in a landmine base; it is a strict press, not a leg-driven push press. | Barbell | Front delts, Triceps / Chest, Serratus anterior, Abdominals |
| Dumbbell Scaption Raise (Thumbs Up) | Scapular-plane elevation is a distinct option from the existing front and lateral raises. The name makes the thumbs-up variation explicit. | Dumbbell | Front delts, Side delts, Rotator cuff / Trapezius, Serratus anterior |
| Cable Serratus Punch | Adds cable-resisted scapular protraction to the existing bodyweight scapular push-up and wall slide. It is not a full elbow-bending chest press. | Cable | Serratus anterior / Chest, Abdominals |
| Chest-Supported Dumbbell Y Raise | Incline-bench chest support and external load provide a distinct option from the existing floor Y-T-W activation series. Requires an incline bench. | Dumbbell | Trapezius, Upper back / Rear delts, Rotator cuff, Serratus anterior |

The hand-assisted pistol needs a fixed hand support; the deficit lunge needs a stable step; seated good mornings and chest-supported Y raises need suitable benches; the landmine press needs a secured barbell attachment. The equipment field records primary resistance rather than every setup item.

All eight use existing sets/reps/load/effort fields. None receives a guessed relative 1RM conversion or a copied clinical dosage. A seated good morning is mapped to spinal erectors directly, with glutes/hamstrings assisting; it is not treated as a standing hamstring-dominant hinge. Scaption is not a synonym for a front raise. Cable serratus punches are not a synonym for cable chest presses.

### Held back deliberately

- **Reverse Plank / Side Plank with Hip Abduction:** Legacy straight-leg bridge and single-leg lateral-bridge names could overlap. Review those movements before adding another canonical name.
- **Ankle eversion isolation:** The current muscle vocabulary lacks fibularis/peroneal muscles; do not assign it falsely to the tibialis groups.
- **New cardio and distance-specific prescriptions:** The app lacks dedicated pace, distance and cardio prescription fields; these are not filled with fake strength metrics.
- **Extra tempo, pause and grip-only name variants:** Prefer the existing exercise and its prescription notes when no distinct selection or reporting need is established.

Next audits should reconcile prepared catalog coverage with the live release before adding more names, then consider well-supported warm-up/mobility choices and equipment substitutions only where selection and logging remain clear.

### References

- [NSCA: single-arm split-stance landmine press](https://www.nsca.com/globalassets/education/tsac-report/tsac-report-67.pdf)
- [ACE: scaption and scapular stabilization terminology](https://www.acefitness.org/certifiednewsarticle/2660/a-commonsense-approach-to-addressing-shoulder-instability/)
- [Catalyst Athletics: seated good morning](https://www.catalystathletics.com/exercise/184/Seated-Good-Morning/)
- [Duncan and Liebenson: The deficit reverse lunge (editorial)](https://doi.org/10.1016/j.jbmt.2018.11.003)
- [Centr: cable single-leg Romanian deadlift](https://centr.com/blogs/features/phase-3-day-2)
- [Decker et al.: serratus anterior activity during selected exercises](https://doi.org/10.1177/03635465990270061601)
- [PureGym coaching guide: chest-supported Y raises](https://www.puregym.com/exercises/arms-and-shoulders/rear-delt-exercises/y-raises/)
- [Swiss military sport exercise library: assisted pistol squat](https://mil-sport.ch/en/topics/exercise/665)

The references are movement/protocol sources, not independent validation of each muscle-role label. No instructional prose, images or prescribed loads were copied.

## Quality batch 4 — 2026-10-24

Live verification: 308 → 314 rows, with 304 distinct names. All six additions appeared exactly once after reload, with matching direct/assisting roles and equipment. All prior name counts were unchanged and no data warning appeared. The extra search aliases and prepared catalog release remain local code changes.

Added **6** bodyweight/band options. Built-in catalog: **494 unique names** (452 strength/power + 42 corrective). Seven ambiguous legacy entries remain for review. Before this batch the live account held 308 rows / 298 distinct names; earlier prepared catalog changes still await release.

| Exercise | Why it fills a gap | Primary equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Hamstring Walkout | Heel steps lengthen and shorten the lever while holding a bridge. This adds a floor option without a curl machine, ball or sliding board; it is distinct from the existing sliding curl. | Bodyweight | Hamstrings, Glutes / Abdominals, Calves |
| Bodyweight Triceps Extension (Fixed Bar) | Adds bodyweight elbow-extension isolation against a fixed bar. Unlike a push-up/dip it emphasizes elbow extension with relatively fixed upper arms; body angle changes resistance. | Bodyweight | Triceps / Abdominals, Front delts |
| Band-Assisted Push-Up | Assistance reduces the bodyweight demand and permits a full push-up pattern. The existing Banded Push-Up is the resisted catalog option; the two now have explicit, separate search aliases. | Bands | Chest / Triceps, Front delts, Abdominals |
| Standing Banded Overhead Press | Fills the missing vertical band press for sessions without dumbbells or a press machine. Existing band chest presses remain horizontal pushing options. | Bands | Front delts, Side delts, Triceps / Trapezius, Serratus anterior, Abdominals |
| Supported Kneeling-to-Standing | Adds a hand-supported floor-to-standing transfer, which is a different task from a chair sit-to-stand or a step-up. A stable support and tolerated kneeling position are part of the setup. | Bodyweight | Quadriceps, Glutes / Abdominals, Hip abductors |
| Inchworm | Adds a walking hinge-to-plank warm-up movement. It is distinct from the existing Plank Walk-Up, which transitions between forearms and hands. Hamstring lengthening does not become direct hamstring resistance volume. | Bodyweight | Abdominals / Serratus anterior, Front delts, Hip flexors |

### Setup and logging

- The fixed bar must be secured; it is a support for the triceps extension, not a bar being lifted. The floor-to-stand movement uses a steady hand support. Band-assisted push-ups need an assistance arrangement, rather than a band wrapped to add resistance. Band pressing requires a secure band position. Primary equipment labels do not list every support item.
- Use existing repetitions or time, with a coach-defined full movement cycle. No distance field or estimated band-resistance kilograms were introduced. A band label does not imply a calibrated load or a percentage of 1RM.
- Inchworm is a warm-up option. Put it in a Warm-up block when used that way; the existing working-set report excludes that block. It has an abdominal stabilization mapping, not a claim that hamstring stretching equals strength work.
- The supported floor transfer is a general movement option, not an imported rehabilitation protocol. No clinical dosage, outcome threshold or injury-prevention claim was copied.

All mappings/difficulty are categorical coaching defaults. The sources establish movement descriptions and practical use, not comparative superiority or individual suitability. Existing names/IDs and custom mappings are preserved. The resisted-push-up alias clarifies the existing catalog name without renaming saved workouts.

### Held back

- **Dynamic mobility drills:** The current corrective selection maps Stretch mode to timed holds and posture-derived overactive muscles. Do not misclassify moving hip/thoracic/ankle drills just to list them.
- **Body-saw and suspension isolation variants:** Deferred until equipment setup can be represented consistently in the released exercise editor; do not hide a required suspension setup behind a generic label.
- **Extra pause/tempo/stance-only names:** Use the existing prescription and notes where no distinct exercise selection is needed.

### References

- [ASCA Exercise Highlight: assisted and resisted push-ups](https://www.strengthandconditioning.org/exercise-highlight?start=25)
- [Queen's Gaels Strength & Conditioning: hamstring walkout in home programming](https://s3.us-east-2.amazonaws.com/sidearm.nextgen.sites/gogaelsgo.com/documents/2020/5/31/QueensStrengthandConditioning_TrainingBlock2.pdf)
- [Bodybuilding.com / Mike Hildebrandt: fixed-bar bodyweight triceps extension demonstration](https://www.youtube.com/watch?v=tuAsmNVuwRg)
- [University of Windsor APEX exercise manual: resistance-band shoulder press](https://www.uwindsor.ca/kinesiology/sites/uwindsor.ca.kinesiology/files/apex_manual_oct_2020_-_vision_1.1.pdf)
- [Wirral University Teaching Hospital: supported kneeling-to-standing movement](https://www.wuth.nhs.uk/media/30860/spinal-rehabilitation-class.pdf)
- [US Marine Corps fitness video library: inchworm in flexibility/mobility](https://www.fitness.marines.mil/videolinks/Flexibility-Mobility/)

No external instructional text/images or sample prescriptions were imported. Demo search links are not individually verified videos.

## Quality batch 5 — 2026-10-24

Live verification: 314 → 318 rows, with 308 distinct names. Each of the four additions persisted exactly once after reload with matching equipment and direct/assisting roles. All prior name counts were preserved; no data warning appeared. Search aliases are prepared locally and require a code release.

Added **4** entries. Built-in catalog: **498 unique names** (456 strength/power + 42 corrective). Seven legacy ambiguous entries remain for review; the count is not a claim of universal validation. The live account had 314 rows before this batch. Earlier prepared catalog additions and alias-search changes still await deployment.

| Exercise | Why it fills a gap | Primary equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Landmine Rotation | Adds a standing rotational core task around a fixed barbell pivot, distinct from the existing landmine presses, cable wood chop and medicine-ball throws. This is the controlled rotation, not a rotational press. | Barbell | Abdominals / Glutes, Front delts, Forearms, Spinal erectors |
| Banded Face Pull | Adds a band option for the combined pull/scapular movement when a cable stack is unavailable. The existing band pull-apart has a different elbow/shoulder action and is not treated as the same exercise. | Bands | Rear delts, Upper back / Rotator cuff, Biceps |
| Banded Overhead Triceps Extension | Provides an overhead elbow-extension option without a cable stack or dumbbell. It is distinct from the existing band pushdown because the upper arm is overhead. | Bands | Triceps / — |
| Dumbbell Wrist Radial and Ulnar Deviation | Adds side-to-side wrist movement, distinct from wrist flexion/extension and forearm pronation/supination. Both directions share one canonical exercise and aliases rather than inflating the count with two entries. | Dumbbell | Forearms / — |

### Setup and scope

- Landmine rotation requires a barbell secured in a landmine base. The Barbell equipment field records the primary resistance; it is not a free-barbell twisting movement. The coach chooses a controlled version and range, rather than importing a ballistic throw prescription.
- Face pulls need a secure band anchor. Overhead triceps extensions require a secure band setup and overhead upper-arm position. Neither receives a fabricated kilogram resistance or relative 1RM conversion.
- Wrist deviation uses forearm support and a suitable light dumbbell setup. The aliases for radial and ulnar deviation both select the same combined row; direction/setup belong in the prescription notes. This is not wrist rotation or a wrist curl.
- These use existing sets/reps/load/effort fields. No injury treatment protocol, pain tolerance advice, clinical dosage or outcome thresholds were imported from clinical references. Muscle roles and difficulty are categorical coaching defaults, not measured muscle force or individual recommendations.

### Held back

- **Single-leg balance and tandem walking:** Useful candidates, but establish balance-specific classification/reporting first rather than treating improved control as resistance-work volume or adding assessment outcomes the logger cannot record.
- **Additional grips, pauses and unsupported named combinations:** Keep under existing exercise/prescription notes unless they solve a distinct selection need.

### References

- [NSCA TSAC Report 74: controlled landmine rotation](https://www.nsca.com/globalassets/education/tsac-report/tsac-report-74.pdf)
- [[P]rehab: banded face pull](https://library.theprehabguys.com/4-most-undervalued-exercises/)
- [[P]rehab: overhead band triceps extension](https://theprehabguys.com/vimeo-video/overhead-tricep-extension-band/)
- [CHCP MSK: weighted wrist radial/ulnar deviation](https://www.chcpmsk.org.uk/uploads/resource/document/135/Wrist___hand_pain_-_MODERATE.pdf)
- [UHCW: wrist strengthening movement reference](https://www.uhcw.nhs.uk/download/clientfiles/files/Patient%20Information%20Leaflets/Clinical%20Support%20Services/Therapies/Hand%20Therapy/Hand%20Therapy%20-%20Wrist%20strengthening.pdf)

Sources establish movement terminology and practical use; they do not establish superiority of these variations. No instructional prose, images or sample prescription values were copied.

## Quality batch 6 — 2026-10-24

Live verification: 318 → 321 rows, with 311 distinct names. All three additions persisted exactly once after reload with matching direct/assisting roles and equipment. All original name counts were preserved and no data warning appeared. The app briefly displayed its athlete-loading screen before the verification; no duplicate saves were retried. Alias-search changes remain local until code release.

Added **3** entries. Built-in catalog: **501 unique names** (459 strength/power + 42 corrective). Seven ambiguous legacy entries still require review. The live account had 318 rows before this batch; older prepared additions and search aliases still await code release.

| Exercise | Why it fills a gap | Primary resistance | Direct / assisting roles |
| --- | --- | --- | --- |
| Hip Hike (Step) | Adds a controlled, stance-side hip-abductor task with the foot fixed and the pelvis moving. Unlike the existing step-down, the support knee stays relatively straight; unlike open-chain hip abduction, the free leg is not being lifted sideways. | Bodyweight | Hip abductors / Abdominals |
| L-Sit Hold (Parallel Bars) | Adds straight-arm supported hip/trunk flexion held isometrically, distinct from a hanging leg raise, lying leg raise or hollow hold. This entry denotes the straight-leg supported hold, not a hanging or tucked variant. | Bodyweight | Abdominals, Hip flexors / Triceps, Quadriceps, Lats |
| Seated Pike Leg Lift | Adds dynamic active hip flexion from a seated, already-flexed hip position. It is a floor-based compression option rather than a supine or hanging leg raise; it does not require holding the whole body above the floor like an L-sit. | Bodyweight | Hip flexors, Abdominals / Quadriceps |

### Setup and measurement

- Hip hike: use a stable step and hand support as needed. Count pelvic raise/lower cycles on each working side. It is not an assessment of balance time, a step-down repetition or an instruction to bend the support knee.
- L-sit: stable parallel bars or parallettes are required even though Bodyweight is the primary-resistance label. Select **Seconds** in the builder for a hold duration; the library name does not automatically switch the intensity metric. Do not substitute repetitions or guessed external kilograms for the hold. Existing validation accepts a positive timed target without requiring a rep count; the regression test checks that a zero-second hold is rejected.
- Seated pike lift: both legs move from a seated floor position. Use repetitions; the coach can describe range and hand support in the prescription notes. Range and leverage are not automatically measured by the app.
- No external-load conversion, assessment norm, clinical protocol or automatic corrective assignment was introduced. Muscle roles/difficulty are categorical coaching defaults; the hip-hike label does not claim an exhaustive mapping of every pelvic muscle.

### Held back

- **Tuck, one-leg and hanging L-sit variants:** Do not multiply the new family in the same batch; first establish the straight-leg supported hold and its measurement. Do not label a tucked or hanging version as the same recorded standard.
- **Additional rear-delt rows:** Existing wide rows, rear-delt flies and face pulls cover the immediate use cases; no distinct equipment or selection need was established in this audit.
- **Static triceps and shoulder stretches:** Potential future additions belong in the existing Stretch pathway. The current live New Exercise form cannot set that mode, so do not create incorrectly mapped strength rows just to add them now.

### References

- [Collings et al. study supplement: supported hip-hike movement description](https://cdn-links.lww.com/permalink/mss/c/mss_2022_11_25_collings_22-00522_sdc1.pdf)
- [[P]rehab: hip hike](https://library.theprehabguys.com/vimeo-video/hip-hike/)
- [CrossFit: the L-sit and time-based measurement](https://www.crossfit.com/essentials/the-l-sit)
- [LWCalisthenics: seated pike lift movement description](https://www.lwcalisthenics.com/exercise-library/v/seated-pike-lift)

Sources inform task definition and measurement, not superiority or individual suitability. No instructional text, images, sample dosage or training thresholds were copied.

## Quality batch 7 — 2026-10-24

Live verification: 321 → 325 rows, with 315 distinct names. Each of the four additions appeared exactly once after reload with the expected direct/assisting mappings and equipment. Prior name counts were preserved and no data warning appeared. The live additions are data changes; catalog classifications and aliases still await code release.

Added **4** entries. Built-in catalog: **505 unique names** (463 strength/power + 42 corrective). Seven ambiguous legacy entries still require review. Before this batch, the live account had 321 rows. Earlier prepared catalog additions, aliases and catalog metadata still await release.

| Exercise | Why it fills a gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Floor Sit-Up | Adds full floor-to-upright trunk/hip flexion rather than the smaller trunk-flexion task in the existing abdominal crunch. This entry is not a GHD sit-up or a separate equipment variation. | Bodyweight | Abdominals, Hip flexors / — |
| Dumbbell Side Bend | Adds loaded lateral trunk flexion. The existing side plank and suitcase carry resist lateral movement; Russian twists, wood chops and landmine rotations use rotational tasks. Wrist side-bend aliases remain separate and the exact trunk exercise ranks first. | Dumbbell | Abdominals / Spinal erectors |
| Single-Arm Kettlebell Clean | Adds a one-kettlebell hinge-to-rack movement. It differs from the existing kettlebell swing finish and the existing barbell clean technique. It is not a clean-and-press combination or a kettlebell snatch. | Kettlebell | Hamstrings, Glutes / Abdominals, Forearms, Upper back, Front delts |
| Barbell Thruster | Adds one continuous front-squat-to-overhead movement. The full squat and linked drive distinguish it from a push press or separately prescribed squat and press sets. One barbell load applies to the whole repetition. | Barbell | Quadriceps, Glutes, Front delts, Triceps / Abdominals, Spinal erectors, Trapezius |

### Setup and measurement

- The floor sit-up is a bent-knee floor exercise, not a crunch, hanging raise or GHD exercise. The coach records the chosen setup in notes; the app does not automatically equate different sit-up standards.
- Dumbbell side bend uses one held dumbbell and controlled lateral trunk movement. Repetitions and load are recorded per side as prescribed. It is not wrist deviation and makes no waist-fat-loss claim.
- Kettlebell clean uses a single bell and finishes in the rack. The coach specifies the working side. The thruster uses a barbell for a continuous squat-to-overhead repetition. Both are advanced coach-selected movement skills; neither is automatically added to client plans.
- The two linked lifts are Ballistic/Power options in the prepared catalog. The released exercise form exposes muscle/equipment fields, not this force-velocity category. A coach still selects the appropriate workout block. Existing sets, reps, load and effort fields suffice; no interval, round-scoring or cardio subsystem was added.
- No relative 1RM conversion from a barbell clean, squat, bench or shoulder press was assigned. Do not infer a kettlebell clean load from a barbell clean max or a thruster load from a squat/press max. The sources define movements; they do not justify those conversions or universal exercise superiority.

Muscle roles and difficulty remain categorical coaching defaults. Exact-name/alias tests preserve the distinction between trunk side bends and wrist deviation, and between a full squat-to-press and push press. Existing IDs and custom mappings remain intact.

### Held back

- **Kneeling cable pulldown variants:** Current cable pulldowns and single-arm pulldown cover the immediate use case. Record the kneeling setup in notes instead of multiplying entries by stance.
- **Extra kettlebell/clean/press combinations and grip permutations:** No further linked combinations were added just because component exercises can be joined. This batch includes only the established clean-to-rack and thruster tasks with a clear single-repetition definition.

### References

- [CrossFit: floor sit-up demonstration](https://www.youtube.com/watch?v=8Ax9H9VPdm4)
- [StrengthLog coaching guide: dumbbell side bend](https://www.strengthlog.com/dumbbell-side-bend/)
- [StrongFirst: kettlebell clean technique and purpose](https://www.strongfirst.com/3-cleans-relationship-form-function/)
- [CrossFit: barbell thruster movement](https://www.crossfit.com/essentials/the-thruster)

No source instructions, images, sample loads, efficacy promises or training volumes were imported.

## Live activation batch 8 — 2026-10-24

Activated **6 existing prepared entries** in the signed-in live library. No new catalog definitions were added. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective); the target of 600 has not been reached. This batch prioritizes useful missing live options over adding increasingly minor source variations.

Live verification: **325 → 331 rows**, with **321 distinct names**. Each addition persisted exactly once after a full reload, with the expected equipment and direct/assisting muscle roles. All previous name counts were preserved; no data warning appeared. Pallof Press was absent after the first reload, confirmed missing, saved once again, then verified after another reload. The ten preexisting duplicate demo rows were not counted as unique additions or altered.
| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Seated Leg Curl | Adds a seated machine knee-flexion option; existing ball/slider curls and Nordic curls use different support and loading. | Machine | Hamstrings / Calves |
| Machine Chest Press | Adds a supported machine horizontal press, distinct from the existing barbell, dumbbell and cable presses. | Machine | Chest / Front delts, Triceps |
| Assisted Pull-Up | Adds a machine-assisted vertical pull for a scalable pull-up prescription; existing unassisted and scapular pull-ups do not supply machine assistance. | Machine | Lats / Biceps, Upper back, Forearms |
| Rope Triceps Pushdown | Adds a cable elbow-extension option with arms at the sides, distinct from overhead and cross-body extensions. | Cable | Triceps / — |
| Cable Lateral Raise | Adds cable resistance for shoulder abduction; the existing unspecified Demo Lateral Raise is preserved rather than assumed to represent this setup. | Cable | Side delts / Trapezius |
| Pallof Press | Adds a cable anti-rotation trunk exercise; it is not a rotating wood chop, lateral side bend or plank. | Cable | Abdominals / Spinal erectors |

### Prescription limits


- Assisted Pull-Up denotes the assisted machine, not a band-assisted version. The app has no dedicated assistance-load field or automatic bodyweight-minus-assistance calculation. Enter the assistance setting in prescription notes; do not enter the assisting stack as positive external load, because existing load totals would interpret it as resistance. Lower assistance is not a loss of progress.

- Machine and cable stack numbers are equipment-specific. Compare the same setup and do not infer free-weight 1RM values or load conversions. Pallof Press is anti-rotation: prescribe the selected side, repetitions or hold duration explicitly; use Seconds for a timed hold.

- Existing canonical muscle mappings and difficulty labels were reused. These are categorical coaching defaults, not measurements of individual muscle force. No exercise was automatically added to a client program; no template, client data, schema, or dependency was changed.

- The six entries are available as live data. Their prepared default metadata and the broader alias-search improvements still depend on a later code release. No duplicate source rows, extra rope/grip/stance variants, commit, push, or deployment was created in this batch.

### Verification


All **19 focused tests** passed across the catalog/muscle-map/merge and exercise autocomplete suites. These cover unique normalized names, valid mappings, alias targets, stable merges, preserved coach edits and exercise references, and autocomplete matching. No application code changed in this activation batch; the previous full suite/build/lint results were not rerun without a new implementation change.

## Live activation batch 9 — 2026-10-24

Activated **4 existing prepared entries** in the live library. No new source definitions or alias variants were created. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective). These are practical availability gaps, not progress toward 600 by counting the same exercise twice.

Live verification: **331 → 335 rows**, representing **325 distinct names**. Every addition persisted exactly once after full reload, with exact equipment and direct/assisting mappings. Previous name counts were unchanged and no data warning appeared. The ten preexisting duplicate demo rows remain untouched and are excluded from the distinct-name count.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Seated Calf Raise | Adds a bent-knee seated machine calf exercise; the live straight-foot/standing calf entries do not describe this setup. | Machine | Calves / — |
| Seated Hip Abduction | Adds supported machine resistance for moving the thighs apart; the existing side-lying hip abduction uses a different support/loading setup. | Machine | Hip abductors / Glutes |
| Seated Hip Adduction | Adds supported machine resistance for bringing the thighs together; the existing side-lying hip adduction does not provide this setup. | Machine | Adductors / — |
| Bird Dog | Adds opposite-arm-and-leg extension from quadruped while controlling the trunk; the existing Quadruped Hip Extension is a leg-only task. | Bodyweight | Abdominals, Spinal erectors / Glutes |

### Setup and recording

- Seated Calf Raise denotes a seated calf-raise machine with bent knees, not a seated leg-press calf extension. Machine is the primary equipment label, including plate-loaded units. Calves remains the existing muscle group; the app does not split soleus and gastrocnemius totals.

- Seated Hip Abduction and Seated Hip Adduction describe two opposite actions, even when performed on the same dual-function machine. Keep the machine setup and load convention consistent across records. No comparison between different machines or automatic conversion from side-lying exercises was introduced.

- Bird Dog denotes the quadruped opposite-arm-and-leg task. Record the intended repetitions per side or choose Seconds for timed holds. The name does not automatically choose the metric or double unilateral volume. Existing Quadruped Hip Extension remains separate; no plank or weighted versions were added.

- Muscle roles and difficulty are categorical coaching defaults. Sources support exercise identity and setup, not individual suitability, universal superiority, or exact muscle-force percentages. No instructions, images, sample programs or efficacy promises were copied.

### Held back

- **Cable Crunch:** Prepared entry inherits Spinal erectors as an assisting muscle from a broad Core family. Review this assignment against the intended trunk-flexion task before activating it live; no unsupported mapping was added in this batch.
- **Extra calf toe-angle, hip lean-angle and bird-dog variants:** No separate coaching/recording need was established. Keep setup details in the prescription rather than create near-duplicate exercise rows.

### Verification and release status

All **19 focused tests** passed across the exercise muscle-map/catalog/merge and autocomplete suites. The live verification checked all four exact mappings, equipment, uniqueness and previous name counts after reload. Application code, clients, programs, schema and dependencies were unchanged; no commit, push or deployment was performed. Broader prepared catalog additions and alias-search improvements still await code release.

### References

- [Hammer Strength: seated calf raise equipment and setup](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-seated-calf-raise)
- [Life Fitness: seated hip abductor/adductor machine](https://shop.lifefitness.com/products/axiom-series-hip-abductor-adductor)
- [NASM exercise library: Bird Dog, core and spinal erectors](https://www.nasm.org/workout-exercise-guidance)
- [ACE: Bird-dog exercise definition](https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/)

## Live activation batch 10 — 2026-10-24

Activated **4 existing prepared entries** in the signed-in live library. No new source definitions were added. The prepared catalog remains **505 unique names** (463 strength/power + 42 corrective). These additions fill availability gaps; they do not increase the prepared total or count aliases as exercises.

Live verification: **335 → 339 rows**, representing **329 distinct names**. All four additions persisted exactly once after a full reload, with matching equipment and direct/assisting roles. The complete rendered row values for all previous entries were preserved, including prior duplicate demo rows; no data warning appeared.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Pec Deck Fly | Adds a machine horizontal-adduction chest exercise; the existing presses do not describe a fly task. | Machine | Chest / Front delts |
| Reverse Pec Deck | Adds a supported machine rear-deltoid fly; it is the opposite action to a pec-deck chest fly and is not a row or face pull. | Machine | Rear delts, Upper back / Rotator cuff |
| Machine Shoulder Press | Adds a supported machine overhead press; the current barbell, dumbbell, kettlebell and band press options do not specify this setup. | Machine | Front delts, Side delts, Triceps / Trapezius |
| Straight-Arm Cable Pulldown | Adds a cable shoulder-extension pulling task with relatively fixed elbows, distinct from elbow-bending lat pulldowns and rows. | Cable | Lats / Chest, Triceps |

### Setup and measurement

- Pec Deck Fly and Reverse Pec Deck may use the same dual-function machine, but prescribe two opposite actions and separate exercise histories. They are not aliases of one movement.

- Machine Shoulder Press is a seated machine overhead press. No unilateral, grip or machine-brand entries were added. Record seat position, machine identity and the chosen load convention in prescription notes; the app does not equate stack loads between machines or convert them to free-weight maxima.

- Straight-Arm Cable Pulldown keeps the elbow angle relatively fixed while the arms move down. It is not an elbow-flexing lat pulldown, a triceps pushdown, or a row. Bar/rope choice and stance belong in notes in this batch. No new load-conversion ratio was assigned.

- Existing canonical mapping and difficulty defaults were reused. Muscle labels are categorical roles, not measured force percentages. Sources support movement identity and equipment, not universal superiority, medical clearance, or individualized exercise selection. No instructions, videos, images, or sample dosage were copied into the app.

### Held back

- **Grip-width, rope-versus-bar and stance variants of straight-arm pulldown:** Keep attachment and stance in prescription notes. No separate movement or recording need was established for additional rows.
- **More press grip and machine-brand variants:** The general machine press is sufficient for this batch; preserve setup in notes without multiplying brand or grip labels.
- **Cable Crunch:** The preceding batch flagged its inherited spinal-erector assisting map for review. It remains unactivated; no mapping correction is claimed here.

### Verification and release status

All **19 focused catalog/muscle-map/merge and exercise autocomplete tests passed**. UI verification checked exact mappings, equipment, unique new names and unchanged prior rendered records after reload. Application code, clients, programs, schema and dependencies were unchanged; no commit, push or deployment was performed. The broader prepared catalog and alias-search updates still await a later code release.

### References

- [Life Fitness: pectoral fly/rear deltoid dual-function equipment](https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-pectoral-fly-rear-deltoid)
- [ACE: seated machine shoulder press](https://www.acefitness.org/resources/everyone/exercise-library/186/seated-shoulder-press/)
- [Catalyst Athletics: straight-arm pulldown task definition](https://www.catalystathletics.com/exercise/907/Straight-Arm-Pulldown/)

## Live activation batch 11 — 2026-10-24

Activated **3 existing prepared entries** in the live library. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective); these are availability additions, not three new source definitions or progress toward 600 through duplicate labels.

Live verification: **339 → 342 rows**, representing **332 distinct names**. All three persisted exactly once after a full reload with correct equipment and direct/assisting mappings. The full rendered values and multiplicities of all previous rows were preserved. No data warning appeared; the ten preexisting duplicate demo rows were left untouched and excluded from distinct-name totals.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Farmer Carry | Adds a bilateral loaded walking carry. Suitcase March uses one-sided loading and marching in place; it does not represent this two-handed walking task. | Dumbbell | Forearms, Abdominals / Trapezius, Spinal erectors, Glutes |
| Dumbbell Wrist Curl | Adds loaded wrist flexion with the forearm supported, distinct from the current elbow curls, forearm rotation and wrist deviation exercises. | Dumbbell | Forearms / — |
| Dumbbell Reverse Wrist Curl | Adds loaded wrist extension, the opposite wrist action to a wrist curl. It is not a reverse elbow curl or forearm pronation. | Dumbbell | Forearms / — |

### Recording limits and setup

- Farmer Carry denotes two dumbbells held while walking. Prescribe **Seconds** or **Minutes** for a timed carry; the builder already supports both. There is no dedicated distance intensity metric, so any optional distance belongs in notes. Do not enter meters or steps as repetitions. The exercise name does not automatically select a timed metric.

- Use a consistent load convention and specify whether the number is per hand or total in prescription notes. The app does not automatically double the load of a dumbbell pair, calculate distance-based work or convert carry time into kilogram-repetition volume.

- Wrist Curl and Reverse Wrist Curl are supported-forearm wrist flexion and extension respectively. They are separate from forearm pronation/supination, radial/ulnar deviation and elbow curls. Record working side and repetitions consistently. The app groups these under Forearms; it does not separately total wrist-flexor versus wrist-extensor subgroups.

- Existing canonical muscle-role and difficulty defaults were reused. These are qualitative coaching labels, not measured muscle force, clinical treatment rules or automatic individualized recommendations. Sources support the movement definitions; no source images, instructions, prescribed dosage or efficacy promises were copied into the app.

### Held back

- **Carry grip, implement and stance permutations:** Establish the standard two-dumbbell walking carry without separate handles, towel, trap-bar or other grip rows in this batch.
- **Additional wrist-curl implements and support angles:** Keep the chosen support and side in notes; no additional barbell, cable or grip variants were needed for the current live gap.
- **Cable Crunch:** Earlier audit flagged the inherited spinal-erector assisting map. This batch does not claim to resolve it or activate that entry.

### Verification and release status

All **19 focused catalog/muscle-map/merge and autocomplete tests passed**. Live reload checks confirmed exact new mappings/equipment and unchanged existing rendered rows. No application code, client, program, schema or dependency changes were made; no commit, push or deployment was performed. The broader prepared catalog and alias-search improvements still await code release.

### References

- [Catalyst Athletics: farmer carry identity, bilateral implements and time/distance prescription](https://www.catalystathletics.com/exercise/515/Farmer-Carry/)
- [ACE: dumbbell wrist-curl flexion and forearm rotation are separate exercise entries](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=4)
- [ACE: wrist-curl extension exercise entry](https://www.acefitness.org/resources/everyone/exercise-library/body-part/arms/extensors/)

## Live activation batch 12 — 2026-10-24

Activated **3 existing prepared entries** in the live library. No duplicate definitions or new source rows were created. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective), rather than claiming another three toward 600.

Live verification: **342 → 345 rows**, representing **335 distinct names**. Each addition persisted exactly once after a full reload with matching equipment and muscle roles. The full rendered values and multiplicities of previous rows were preserved; no data warning appeared. Ten preexisting duplicate demo rows remain untouched and excluded from distinct-name totals.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Cable External Rotation | Adds a standing cable shoulder external-rotation task with the elbow at the side. The existing side-lying dumbbell version has a different position and resistance direction. | Cable | Rotator cuff / — |
| Cable Glute Kickback | Adds standing cuff-loaded hip extension. It is distinct from the existing quadruped floor hip extension and supported hip-thrust patterns. | Cable | Glutes / Hamstrings, Abdominals |
| Banded Lateral Walk | Adds repeated lateral stepping against band resistance, distinct from seated machine or side-lying hip abduction. | Bands | Hip abductors / Glutes |

### Setup and recording

- Cable External Rotation denotes the standing elbow-at-side standard. It is not forearm supination, torso rotation or an elevated-arm shoulder-rotation protocol. Rotator cuff remains the existing broad muscle label; the app does not split its individual muscles or infer a corrective prescription from assessment findings.

- Cable Glute Kickback requires a low cable and a suitable ankle cuff. Record working side and the chosen setup in notes. No equivalence with quadruped hip extension, band resistance or another machine stack was introduced.

- Banded Lateral Walk uses Bands as the primary resistance. Record the band identity/position and steps per direction in prescription notes. Repetitions can represent the explicitly prescribed step count, or choose Seconds for a timed bout. Do not enter distance as repetitions or invent kilograms from band color; the app does not calculate band tension.

- These entries are ordinary coach-selected exercise options. They were not automatically assigned as rehabilitation, warm-up or corrective tasks. Muscle roles and difficulty are categorical defaults, not measured muscle-force values. No source images, instructions, dosage or clinical recommendations were copied.

### Held back

- **Shoulder-rotation arm-angle and extra band/cable variants:** Keep one cable external-rotation standard in this batch. No extra arm-angle or grip rows are needed.
- **Band-walk placement and diagonal-walk variants:** Document band position, direction and step count in notes; do not add multiple band-placement labels or a monster-walk variation just to raise the count.
- **Cable Crunch:** Its previously flagged inherited assisting-muscle mapping still needs review; it remains unactivated.

### Verification and release status

All **19 focused catalog/muscle-map/merge and autocomplete tests passed**. Live checks confirmed exact new mappings/equipment and unchanged prior rendered rows after reload. Application code, client programs, schema and dependencies were unchanged; no commit, push or deployment occurred. The wider prepared catalog and alias-search improvements still await code release.

### References

- [Bowflex workout guide: cable shoulder rotator-cuff external rotation](https://download.bowflex.com/bowflex/x2se/x2se-workout-guide.pdf)
- [PureGym: cable kickback exercise identity and ankle-cuff setup](https://www.puregym.com/exercises/glutes/glute-kickbacks/cable-kickbacks/)
- [NASM: lateral band walk task definition](https://www.nasm.org/resource-center/blog/active-recovery)

## Live activation batch 13 — 2026-10-24

Activated **4 existing prepared entries** in the live library. The prepared catalog stays at **505 unique names** (463 strength/power + 42 corrective). These fill beginner-option availability gaps without creating duplicate source definitions or counting aliases toward 600.

Live verification: **345 → 349 rows**, representing **339 distinct names**. All four persisted exactly once after a full reload with the expected equipment and muscle mappings. Full rendered values and multiplicities of previous rows were unchanged, and no data warning appeared. Ten preexisting duplicate demo rows remain untouched and are excluded from distinct totals.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Wall Push-Up | Adds a standing wall-supported pressing regression without requiring floor access or assistance bands. | Bodyweight | Chest / Front delts, Triceps |
| Kneeling Push-Up | Adds the knees-supported floor pressing standard, distinct from a full push-up, wall push-up or band-assisted push-up. | Bodyweight | Chest / Front delts, Triceps |
| Bodyweight Split Squat | Adds an explicitly unloaded split-stance squat with both feet kept in place; existing barbell, dumbbell and goblet entries specify external resistance. | Bodyweight | Quadriceps, Glutes / Adductors, Spinal erectors |
| Bodyweight Reverse Lunge | Adds an explicitly unloaded step-back lunge, distinct from the stationary split squat and existing loaded reverse-lunge entries. | Bodyweight | Quadriceps, Glutes / Adductors, Spinal erectors |

### Setup and recording

- Wall Push-Up uses a wall as support; Kneeling Push-Up uses the knees as the floor support. These are different prescribed standards, not new hand-width variants or aliases of an ordinary full push-up. Do not infer a numerical bodyweight percentage or bench-press equivalent.

- Bodyweight Split Squat keeps both feet on the floor in a stationary split stance. It is not rear-foot elevated. Bodyweight Reverse Lunge adds the backward step and return. Specify repetitions per side versus alternating total in prescription notes; the app does not automatically double unilateral repetitions.

- All four use Bodyweight as the equipment/resistance label. Do not enter total body mass as external kilograms. Repetitions remain the relevant result when no external resistance is used; zero external load does not mean no exercise work.

- Existing qualitative muscle-role and difficulty defaults were reused. No individual suitability, rehabilitation rule, clinical clearance, automatic corrective assignment or inferred max conversion was added. No source instructions, images, dosage or efficacy promises were copied into the app.

### Held back

- **Push-up hand-width and split-squat stance permutations:** Prescribe setup details in notes rather than create additional near-duplicate labels.
- **Wall Sit:** Not activated from the broad squat family without a separate review of its isometric task and muscle roles.
- **Cable Crunch:** Its previously flagged inherited assisting-muscle map remains pending review; this batch does not resolve or activate it.

### Verification and release status

All **19 focused catalog/muscle-map/merge and autocomplete tests passed**. Reload checks verified exact new mappings/equipment, uniqueness and unchanged previous rendered records. Application code, clients, programs, schema and dependencies were unchanged. No commit, push or deployment occurred; wider prepared catalog and alias-search updates still await code release.

### References

- [NASM: wall and knees-supported push-up modifications](https://www.nasm.org/resource-center/exercise-library/push-up)
- [ACE: bent-knee push-up standard](https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/)
- [Personal Trainer Collective: bodyweight split squat distinguished from rear-foot-elevated split squat](https://lwfiles.mycourse.app/personaltrainercollective-public/publicFiles/New%20Exercise%20Continuum%20PDF%20%284%29.pdf)
- [Nordic Fitness Education: reverse lunge without equipment](https://nordicfitnesseducation.net/reverse-lunge-2/)

## Live activation batch 14 — 2026-10-24

Activated **3 existing prepared entries** in the live library. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective). No duplicate source definitions or alias rows were created to inflate progress toward 600.

Live verification: **349 → 352 rows**, representing **342 distinct names**. Each addition persisted exactly once after reload with matching equipment and muscle roles. Full rendered values and multiplicities of previous rows were unchanged; no data warning appeared. Preexisting duplicate demo rows remain untouched and excluded from the distinct-name count.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Lying Leg Curl | Adds the prone leg-curl machine setup. The seated leg curl, Nordic curl and ball/slider bridge curls do not specify this support and loading setup. | Machine | Hamstrings / Calves |
| Dumbbell Shrug | Adds dedicated scapular elevation with dumbbells. Rows, overhead presses and loaded carries do not prescribe repeated shrug repetitions. | Dumbbell | Trapezius / Forearms |
| Dumbbell Lying Triceps Extension | Adds elbow extension with dumbbells while lying on a bench. It is distinct from the existing pushdowns, cross-body extensions and banded overhead extension. | Dumbbell | Triceps / — |

### Setup and recording

- Lying Leg Curl denotes the two-legged prone machine standard. It is not a Nordic curl, seated curl or single-leg variation. Use the same machine and setup for comparisons; no conversion between machine stacks or curl types was introduced.
- Dumbbell Shrug denotes repeated scapular elevation with the weights held at the sides, not an upright row, shoulder roll or static carry. The existing Trapezius label is broad and does not split upper versus lower regions.
- Dumbbell Lying Triceps Extension uses dumbbells and a flat bench; Dumbbell is the primary-resistance label, not a claim that no support equipment is needed. Record whether paired-dumbbell load is per hand or total consistently in prescription notes; the app does not automatically double it.
- Canonical muscle-role and difficulty defaults were reused. They are qualitative coaching classifications, not measured muscle-force percentages, treatment rules or individualized recommendations. No source instructions, images, dosage or efficacy promises were imported.

### Held back

- **Single-leg and eccentric-only prone-curl variants:** First make the general prone-machine option available; no extra tempo or unilateral rows were needed in this batch.
- **Shrug grip, machine and shoulder-roll variants:** Keep the standard two-dumbbell shrug without additional minor variants.
- **Triceps-extension grip, alternating-arm and bench-angle variants:** Specify setup in notes rather than create extra exercise rows.

### Verification and release status

All **19 focused catalog/muscle-map/merge and autocomplete tests passed**. UI checks confirmed new records and unchanged existing rendered rows after reload. Application code, clients, programs, schema and dependencies were unchanged. No commit, push or deployment occurred; the wider prepared catalog and alias-search changes still await code release.

### References

- [NASM: lying leg curl machine exercise](https://www.nasm.org/resource-center/exercise-library/lying-leg-curl)
- [PureGym: dumbbell shrug exercise identity and trapezius role](https://www.puregym.com/exercises/back/shrugs/dumbbell-shrug/)
- [Bowflex SelectTech owner manual: dumbbell lying triceps extension](https://download.bowflex.com/supportdocs/OM/Bowflex/BFX_ST220_OM_web.pdf)

## Live activation batch 15 — 2026-10-24

Activated **3 existing prepared entries** in the live library. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective). No duplicate source definitions or alias rows were created to inflate progress toward 600.

Live verification: **352 → 355 rows**, representing **345 distinct names**. Each addition persisted exactly once after reload with matching equipment and muscle roles. Full rendered values and multiplicities of previous rows were unchanged; no data warning appeared. Preexisting duplicate demo rows remain untouched and excluded from the distinct-name count.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Abdominal Crunch | Adds the floor trunk-curl exercise, distinct from the existing full Floor Sit-Up. | Bodyweight | Abdominals / — |
| Reverse Crunch | Adds the pelvis-curling reverse crunch, distinct from a floor trunk curl or a hip-flexion leg raise. | Bodyweight | Abdominals / — |
| Cable Crunch | Adds a kneeling cable-resisted trunk curl, with an explicit abdominal mapping rather than inherited spinal-erector assistance. | Cable | Abdominals / — |

### Setup and recording

- The previously deferred Cable Crunch mapping has been reviewed and corrected for this standard. Abdominal Crunch and Reverse Crunch receive the same explicit no-assisting-muscle override. This avoids automatically attributing spinal-extensor exposure to completed crunch sets; it is not a claim of zero muscle activity outside the listed target.
- Abdominal Crunch means a partial floor trunk curl, not the existing full Floor Sit-Up. Reverse Crunch means curling the pelvis from the floor; lifting the thighs without pelvic curling describes a different task. No additional upper/lower-abdominal muscle groups, spot-fat-loss claims or duplicate regional crunch labels were created.
- Cable Crunch requires a suitable cable/rope setup and uses Cable as primary equipment. Prescribe repetitions and the chosen load/setup consistently. The app does not equate cable-stack kilograms with bodyweight crunch difficulty or estimate a free-weight 1RM from a crunch.
- The two floor entries use Bodyweight. Do not enter body mass as external load. Existing defaults remain categorical coaching labels, not force measurements or clinical prescriptions. No source instructions, images, dosage or efficacy promises were copied.
- The three live entries were saved with the corrected mapping through the existing form. Future code release is still required for the local default corrections and regression test to ship; no existing coach-edited records were overwritten.

### Held back

- **Twisting, weighted-floor, machine and bench-angle crunch variants:** First establish these three distinct basic standards instead of multiplying minor setup variations.
- **Broader core-family mapping audit:** Only the three selected crunch defaults were changed. No correction to all remaining core entries is claimed.

### Verification and release status

All **20 focused catalog/muscle-map/merge and autocomplete tests passed**. UI checks confirmed new records and unchanged existing rendered rows after reload. The full suite passed **224 tests**, and lint and production build passed. Only Cable Crunch, Abdominal Crunch and Reverse Crunch catalog defaults changed: the inherited Spinal erectors assisting label was removed through an explicit row override. A comparison against the pre-change expansion snapshot verified identical ordering and values for all 251 other expansion entries. The new regression checks working-set reporting, stable existing IDs and preserved coach overrides. Clients, programs, schema and dependencies were unchanged. No commit, push or deployment occurred; source/catalog changes still await code release.

### References

- [ACE exercise library: Crunch, abdominal target, no equipment](https://www.acefitness.org/resources/everyone/exercise-library/body-part/abs/)
- [Bowflex owner manual: abdominal and reverse-crunch standards](https://download.bowflex.com/supportdocs/OM/Bowflex/BFX_ST220_OM_web.pdf)
- [PureGym: kneeling Cable Crunch exercise definition](https://www.puregym.dk/inspiration/cable-crunches)

## Live activation batch 16 — 2026-10-24

Activated **3 existing prepared entries** in the live library. Prepared catalog remains **505 unique names** (463 strength/power + 42 corrective). No duplicate source definitions or alias rows were created to inflate progress toward 600.

Live verification: **355 → 358 rows**, representing **348 distinct names**. Each addition persisted exactly once after reload with matching equipment and muscle roles. Full rendered values and multiplicities of previous rows were unchanged; no data warning appeared. Preexisting duplicate demo rows remain untouched and excluded from the distinct-name count.

| Exercise | Why it fills a live gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Banded Leg Curl | Adds an elastic-resistance knee-flexion option when a leg-curl machine is unavailable; it is distinct from bridge walkouts and Nordic curls. | Bands | Hamstrings / Calves |
| Banded Chest Press | Adds a band-resisted horizontal press without a press machine or free weights. It is not an assisted push-up or an overhead band press. | Bands | Chest / Front delts, Triceps |
| Banded Seated Row | Adds a seated elastic-resistance row, distinct from a face pull or cable/machine row. | Bands | Lats, Upper back / Biceps, Rear delts, Forearms |

### Setup and recording

- Banded Leg Curl uses an anchored band for the knee-flexion task; record the working side and chosen body position consistently. Banded Chest Press uses band resistance for horizontal pressing. Banded Seated Row denotes the seated rowing task rather than a standing face pull.
- All three use Bands as primary resistance. Describe band identity, anchor position and starting stretch in notes; there is no universal kilogram conversion from band color. Do not compare the load field directly with cable-stack or free-weight kilograms.
- The live additions are coach-owned rows. Project-wide availability comes from the prepared catalog merged into each coach's store on load. The pending release contains 505 built-in names, while each coach retains personal additions, stable existing IDs and explicit coach muscle assignments.
- No extra grip, stance or band-color variants were added, and no source instructions, images, dosage or efficacy promises were copied.

### Held back

- **More band colors, grips and stance permutations:** Use prescription notes rather than inflate the catalog with setup labels.

### Verification and release status

All **20 focused catalog/muscle-map/merge and autocomplete tests passed**. UI checks confirmed new records and unchanged existing rendered rows after reload. The release also applies the reviewed no-spinal-erector override to Machine Abdominal Crunch and Bicycle Crunch, extending the same regression check to all five selected crunch standards. Clients, programs, schema and dependencies were unchanged. No commit, push or deployment occurred; source/catalog changes still await code release.

### References

- [ACE: prone hamstring curl with band or cable resistance](https://www.acefitness.org/resources/everyone/exercise-library/131/prone-lying-hamstrings-curl/)
- [Stroops: resistance-band chest press](https://stroops.com/pages/exercises/chest-press-for-toner)
- [Sit and Be Fit: seated row with band](https://www.sitandbefit.org/seated-row-band-upper-body-strengthening/)

## Release preparation — 2026-10-24

The requested main-branch release includes the 505-name built-in catalog, aliases, equipment filters, autocomplete improvements, custom fitness tests, movement-pain visibility and static-posture ordering. The current signed-in live library has 358 rows / 348 distinct names before deployment, including the three band additions in batch 16.

Library scope: exercises created through the UI are coach-owned records. The built-in catalog is project code: fetchAll calls ensureProgramShape with the signed-in coach ID, and mergeExerciseLibrary supplies owner-scoped stable catalog IDs, fills missing definitions by normalized name and preserves explicit coach muscle mappings. Once the release is deployed, each coach receives the built-in defaults on load; personal additions and edits remain separate. Screen totals may exceed 505 because existing custom/demo rows are retained.

No database migration is part of this release. The reviewed abdominal-flexion override now also covers Machine Abdominal Crunch and Bicycle Crunch, in addition to the three crunch entries from batch 15. Checks passed: 224 application tests, lint, production build, and all three local SQL regression suites. A credential-pattern scan of the 26 pending release files found no matching secrets or environment files. Ignored recovery files, local databases and build output are excluded from the commit.

## Project quality batch 17 — 2026-10-24

Added **2 new project defaults**: the built-in catalog is now **507 unique names** (465 strength/power + 42 corrective), up from 505. Batches 8–16 activated definitions already prepared in the project; this batch adds genuinely new definitions. Canonical names and aliases were checked across the full catalog. All 254 previous expansion definitions remain identical. Aliases and retained demo duplicates do not count toward the 600 target.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Single-Arm Kettlebell Snatch | Adds a single-bell backswing-to-overhead task. The existing kettlebell clean finishes in the rack, while barbell snatches use a different implement and bilateral setup. | Kettlebell | Hamstrings, Glutes / Quadriceps, Abdominals, Forearms, Trapezius, Front delts, Rotator cuff, Serratus anterior |
| Barbell Split Jerk | Adds the standalone front-rack-to-overhead jerk with a split catch. It can be prescribed without a preceding clean and differs from the existing push press and continuous squat-to-press thruster. | Barbell | Quadriceps, Glutes / Calves, Abdominals, Spinal erectors, Front delts, Triceps, Trapezius, Serratus anterior, Rotator cuff |

### Setup and measurement

- Kettlebell snatch denotes the single-arm hang/backswing-to-overhead movement. Record repetitions per side and one bell's load consistently; no automatic side doubling or sport scoring is introduced.
- Split jerk starts with the barbell in the front rack and uses a split receiving position. Record total barbell load and repetitions. The rack/blocks used to set up do not create additional catalog rows. This is not a clean-and-jerk complex or a press held in a split stance.
- Both are Advanced, Ballistic/Power selections. Existing rep/load prescriptions suffice; coach selection determines the workout block. The sources establish movement identity; direct and assisting muscle roles are categorical coaching defaults, not measured activation percentages or equivalent hypertrophy doses.
- No relative 1RM conversion is assigned. A barbell snatch, clean-and-jerk or push-press maximum does not automatically determine these loads. No new template, client session, database schema or dependency is introduced.

### Held back

- **Forward Sled Push:** The legacy Sled Marching entry may already denote this task; resolve that identity before adding a duplicate. Dedicated distance prescription is also unavailable.
- **Additional jerk, snatch, stance and implement permutations:** Not added merely to multiply an established task. Review a separate coaching need before adding more variants.

### References

- [CrossFit: kettlebell snatch movement definition](https://www.crossfit.com/essentials/the-kettlebell-snatch)
- [NCSF: Teaching Techniques for Overhead Ballistics](https://www.ncsf.org/pdf/ceu/teaching_techniques_for_overhead_ballistics.pdf)
- [NSCA / Human Kinetics: Exercise Technique Manual, fourth edition (Split Jerk listed)](https://us.humankinetics.com/products/exercise-technique-manual-for-resistance-training-4th-edition-with-hkpropel-online-video)

Source material was used to verify movement identity. Instructions, illustrations, sample programming and efficacy claims were not imported.

### Verification and release status

All **225 application tests passed**, including the new search/prescription regression and existing catalog-wide uniqueness, valid mappings, stable IDs, coach overrides and idempotent merge checks. Lint, production build and diff whitespace checks passed. These are local project-source additions pending release; no live account rows were written.

## Project quality batch 18 — 2026-10-24

Added **2 new project defaults** for training without machines. Catalog: **509 unique names** (467 strength/power + 42 corrective), up from 507. All 256 previous expansion definitions remain identical. Checks compared candidate names and aliases with the entire catalog, including corrective entries. Equipment substitutions are intentional here: the required machine/cable stations may be unavailable, while bands are already supported by the builder.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Seated Banded Leg Extension | A seated, band-resisted knee-extension option without a leg-extension machine. Its ankle/foot resistance and larger knee excursion distinguish it from the existing standing terminal knee extension with a band behind the knee. | Bands | Quadriceps / — |
| Banded Straight-Arm Pulldown | An elastic-resistance substitute when a cable station is unavailable. The straight-arm shoulder movement differs from the existing elbow-bending band lat pulldown and triceps pushdown. | Bands | Lats / Chest, Triceps, Abdominals |

### Setup and recording

- Seated Banded Leg Extension uses a stable chair and a band resisting the lower leg. It is a seated knee-extension task, not a standing terminal-extension drill or a hamstring curl. The coach specifies side, anchor and chosen range in notes.
- Banded Straight-Arm Pulldown uses a secure high anchor and a shoulder-driven pull with the elbow angle substantially maintained. It is distinct from elbow-bending lat pulldowns and elbow-extension pushdowns. Record the selected support/body position in notes.
- Both use existing sets, reps and effort fields; regression checks validate a rep/RIR prescription with no kilogram value. Record band identity, starting stretch and anchor setup consistently. Band color is not converted to kilograms, and no machine-load or 1RM equivalence is inferred. Progression is coach-selected rather than a new automatic band-tension calculation.
- Muscle roles and Beginner difficulty are catalog defaults, not clinical suitability judgments or measured activation percentages. No rehabilitation protocol, sample dosage or treatment claim is imported from the references.

### Held back

- **Seal Row / Barbell Box Squat:** Already represented by Bench Pull (Seal Row alias) and Box Squat; no new canonical rows needed.
- **Band colors, grips and anchor-height permutations:** Record setup in notes; these do not warrant separate exercises.

### References

- [Bexley MSK NHS: resisted seated knee extension](https://msk-bexley.nhs.uk/conditions/knee-pain/knee-osteoarthritis)
- [Gonex equipment exercise demonstration: straight-arm band pulldown](https://www.gonexsport.com/pages/fitness-video-26)

### Verification and release status

All **226 application tests passed**, including band search distinctions, prescriptions without a kilogram value, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. The earlier batch 17 changes remain in the working tree.

## Project quality batch 19 — 2026-10-24

Added **2 new project defaults**. Catalog: **511 unique names** (469 strength/power + 42 corrective), up from 509. All 258 previous expansion definitions remain identical. Full-catalog canonical names and aliases were checked, including corrective entries. Existing floor presses received equipment-specific aliases instead of duplicate definitions.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Meadows Row | Adds a unilateral row performed side-on to the loaded end of an anchored barbell. This setup differs from the existing bilateral landmine T-bar row and free-moving dumbbell row. | Landmine | Lats, Upper back / Biceps, Rear delts, Forearms, Abdominals, Spinal erectors |
| Barbell JM Press | Adds the named triceps accessory with its distinct elbow/bar path between pressing and lying extension. It is not another name for the existing close-grip bench press or skull crusher. | Barbell | Triceps / Front delts |

### Setup and recording

- Meadows Row uses a secured landmine/barbell setup and the side-on single-arm rowing task. Record side, hand/support position and working-end plate load consistently. The app does not calculate lever-arm resistance or equate the plates to a dumbbell load. Changing handle, bar length or landmine setup can affect comparability.
- Barbell JM Press denotes the bench-based barbell triceps accessory, not a close-grip chest press, floor variation or skull crusher renamed. It is Advanced because of its technique requirements. Record total barbell load. No assumption about elbow tolerance or suitability for an individual is made.
- Both use existing sets, reps, load and effort fields. No relative 1RM percentage, bench-max conversion, new prescription metric or automatic program assignment is introduced. Direct/assisting roles are categorical coaching defaults, not activation measurements or claims that one variation is superior.
- Floor Press now matches Barbell Floor Press / BB Floor Press; DB Floor Press matches Dumbbell Floor Press / Two-Arm Dumbbell Floor Press. Their canonical names, existing IDs and saved history remain intact.

### Held back

- **Barbell Floor Press / Two-Arm Dumbbell Floor Press:** Already present as Floor Press and DB Floor Press. Added implement-specific aliases without new rows or renamed history.
- **Smith-machine, dumbbell, chains and band versions of JM press; more landmine row handles:** No separate selection need established for this batch. Keep one defined version of each new task.

### References

- [John Meadows: Master the Meadows Row](https://archive.t-nation.com/training/tip-master-the-meadows-row/)
- [EliteFTS: official JM Blakley instruction linked in JM Press section](https://elitefts.com/blogs/training/build-bench-with-tricep-exercises)
- [JM Blakley / EliteFTS: The Official JM Press Tutorial](https://www.youtube.com/watch?v=hOCW9cE-GJg)

References verify movement identity only. Instructions, sample programs, images and efficacy claims were not imported.

### Verification and release status

All **227 application tests passed**, including named-accessory search distinctions, reuse of existing floor-press records, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account rows were written. Previous batches 17–18 remain in the working tree.

## Project quality batch 20 — 2026-10-24

Added **2 new project defaults**. Catalog: **513 unique names** (471 strength/power + 42 corrective), up from 511. All 260 previous expansion definitions remain identical. Candidate names and aliases were checked across the full catalog, including corrective entries. Both new entries use existing prescription fields.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Barbell Upright Row | Adds the controlled upward shoulder-pull task, distinct from shoulder shrugs, lateral raises and the existing explosive clean/snatch high pulls. One barbell version is defined rather than a series of grip and implement variants. | Barbell | Side delts / Trapezius, Biceps, Forearms, Abdominals |
| Barbell Z Press | Adds an unsupported long-sitting overhead press from the floor. The support and lower-body setup differ from the existing standing and bench-seated presses; it is not a supine floor bench press. | Barbell | Front delts, Side delts, Triceps / Abdominals, Spinal erectors, Trapezius, Serratus anterior |

### Setup and recording

- Barbell Upright Row denotes a controlled shoulder pull with a stationary torso, not the leg-driven acceleration of an Olympic high pull. Record chosen grip and range consistently in notes. Shoulder range and exercise suitability remain individual coaching decisions; this entry does not impose a universal pull height or claim therapeutic benefit.
- Barbell Z Press denotes the unsupported floor-seated overhead task, with legs extended rather than a supported bench position. Advanced difficulty reflects the setup/control requirements. Record the selected leg position and total barbell load consistently; no seated-press, standing-press or bench-max conversion is assigned.
- Both entries are Grinding, with explicit shoulder mappings and no relative-max ratios. Muscle roles are categorical defaults rather than measured activation, proof of hypertrophy superiority or a claim that every assisting muscle receives an equivalent training dose. Existing sets, reps, load and effort fields suffice; no client plan is changed automatically.
- Search regression checks separate upright rows from high pulls and Z-presses from supine floor presses. In particular, a Barbell Floor Press query continues to resolve to the existing Floor Press record.

### Held back

- **Additional upright-row grips, cable/dumbbell versions and Z-press implements:** No further coaching selection need established; prescribe setup in notes rather than add permutations.
- **High Pull as an upright-row alias / Floor Press as a Z-press alias:** These broad terms would conflate different tasks and split or misdirect exercise selection/history. Retain existing high pulls and floor presses separately.

### References

- [NSCA / Human Kinetics upright-row technique excerpt, Coaches Association of Ontario](https://www.coachesontario.ca/articles/breaking-down-the-upright-row/)
- [Catalyst Athletics: Z-Press exercise definition](https://www.catalystathletics.com/exercise/914/Z-Press/)

Sources verify movement identity. No instructions, illustrations, training volumes or efficacy claims were imported.

### Verification and release status

All **228 application tests passed**, including shoulder-task search distinctions, retained floor-press search behavior, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account rows were written. Previous batches 17–19 remain in the working tree.

## Project quality batch 21 — 2026-10-24

Added **3 new project defaults**. Catalog: **516 unique names** (474 strength/power + 42 corrective), up from 513. All 262 previous expansion definitions remain identical. Candidate names and aliases were checked across the full catalog, including corrective entries. This batch distinguishes different initiation, landing and throwing tasks rather than multiplying implement variants.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Squat Jump (Static Start) | Adds the static-start vertical jump without a preparatory dip, distinct from the existing countermovement jump. This is a recognized jump task, not a separate arbitrary tempo label on every squat. | Bodyweight | Quadriceps, Glutes, Calves / Hamstrings, Abdominals |
| Depth Jump | Adds the drop-to-ground then vertical-rebound task. It differs from jumping onto a box and from landing-and-holding drills. One rebound standard is added without height or contact-time permutations. | Box | Quadriceps, Glutes, Calves / Hamstrings, Abdominals |
| Wall-Ball Shot | Adds the linked medicine-ball squat-to-wall-target throw and catch. It is distinct from chest passes, scoop tosses and barbell thrusters. | Medicine Ball | Quadriceps, Glutes, Front delts, Triceps / Abdominals, Spinal erectors, Calves, Trapezius, Serratus anterior |

### Setup and recording

- Squat Jump (Static Start) removes the preparatory countermovement. Keep chosen starting depth and arm use consistent in notes. The catalog entry supports prescribed repetitions; it does not implement the cited assessment protocol or calculate jump height, force, power or eccentric-utilization ratios.
- Depth Jump denotes one drop-and-vertical-rebound cycle per repetition, using a suitable stable box and landing area. Record drop height and chosen standard in notes. Advanced difficulty reflects the impact and technique demands. No default box height, readiness threshold or automatic ground-contact count is imposed.
- Wall-Ball Shot uses a suitable medicine ball and wall target; one squat/throw/catch cycle is one repetition. Record ball mass, target height and squat standard consistently. Existing sets/reps/load fields suffice for this entry. No interval prescription, rounds-for-time scoring, target-hit detection or automatic progression is claimed.
- The jumps may use explicit zero external load; the wall-ball load is the ball mass. No fictitious kilogram equivalent is assigned to box height, bodyweight, landing impact or flight height. No relative 1RM conversion is added. All three are Ballistic/Power options, and coaches choose whether they suit a client and workout block.
- Muscle roles are categorical coaching defaults, not equivalent training doses, activation measurements or evidence that a drill is universally superior. No source instructions, illustrations, recommended volumes or competitive standards were imported.

### Held back

- **Separate rows for each drop height, ball mass or target height:** These are prescription/setup details, not new exercises.
- **Drop Jump as a universal Depth Jump alias:** Different coaching/testing protocols use the term for different contact-time goals. Keep this entry explicitly a drop-to-vertical-rebound depth jump.
- **Automatic jump testing, ground-contact counts and wall-ball circuit scoring:** Current prescription/logging fields support repetitions and load, not force-platform data, contact time, target validation or interval scoring.

### References

- [NSCA / Human Kinetics: static vertical squat-jump definition](https://us.humankinetics.com/blogs/excerpt/maximum-muscular-power-high-speed-strength-test-protocol-squat-jump-static-vertical-jump)
- [NSCA: Basics of Strength and Conditioning Manual, Depth Jump](https://www.nsca.com/contentassets/116c55d64e1343d2b264e05aaf158a91/basics_of_strength_and_conditioning_manual.pdf)
- [CrossFit: The Wall-Ball Shot movement definition](https://www.crossfit.com/essentials/the-wall-ball)

### Verification and release status

All **229 application tests passed**, including power-task search distinctions, bodyweight/ball-load prescription checks, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–20 remain in the working tree.

## Project quality batch 22 — 2026-10-24

Added **2 new project defaults**. Catalog: **518 unique names** (476 strength/power + 42 corrective), up from 516. All 265 previous expansion definitions remain identical. Canonical names and aliases were checked across the entire catalog, including corrective entries. These additions change stationary lifting/loading tasks rather than reintroducing existing carries.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Single-Arm Kettlebell Suitcase Deadlift | Adds a stationary two-foot hinge with one bell held beside the body. Its asymmetric loading differs from the existing centered kettlebell deadlift, single-leg hinges and suitcase carry/march tasks. | Kettlebell | Hamstrings, Glutes / Quadriceps, Abdominals, Spinal erectors, Forearms, Hip abductors, Upper back |
| Sandbag Bear Hug Squat | Adds a squat with a bag embraced against the torso, enabling a practical odd-object loading option. The existing sandbag carry is locomotion, while front/goblet squats use different load support and equipment. | Sandbag | Quadriceps, Glutes / Adductors, Abdominals, Spinal erectors, Upper back, Front delts, Forearms |

### Setup and recording

- Single-Arm Kettlebell Suitcase Deadlift keeps both feet on the ground and the single bell beside the body. Single-arm describes the loading, not single-leg support. Record the working hand, bell mass and starting height consistently. Side changes do not create extra automatic repetitions or multiply the logged mass.
- Sandbag Bear Hug Squat uses the bag embraced against the torso, rather than handles, a shoulder-supported bag or a carry route. Record total filled bag mass and the chosen bag/setup consistently. Bag shape and fill can affect comparability; the app does not convert bag mass to an equivalent front-squat or goblet-squat load.
- Both use existing sets, reps, load and effort fields. No distance field, new interval scheme, benchmark, relative 1RM ratio or automatic client-plan assignment is introduced. Muscle roles and Intermediate difficulty are categorical defaults, not activation measurements or claims of universal suitability or superiority.
- Regression checks distinguish these stationary tasks from carries, marches, centered deadlifts and single-leg hinges. References establish movement identity; instructions, illustrations, sample programs and efficacy claims were not imported.

### Held back

- **Dumbbell/barbell suitcase deadlifts and sandbag shoulder/front-hold squat permutations:** Start with one explicit version of each missing task rather than multiplying implements and holding positions.
- **Further suitcase carries and bear-hug carries:** These tasks already exist; they must not be reintroduced as additions or aliases for the stationary lifts.

### References

- [Cathal Fanning / Independent Personal Trainers: Suitcase Deadlift](https://www.independentpersonaltrainers.org/wp-content/uploads/2023/12/38.-Suitcase-Deadlift-Booklet.pdf)
- [StrongFirst / Pavel Macek: suitcase deadlift among kettlebell hinge progressions](https://www.strongfirst.com/3-month-plan-for-beginner-group-lessons/)
- [Sandbag Fitness: Sandbag Bear Hug Squat movement definition](https://www.sandbagfitnessstore.com/pages/sandbag-bear-hug-squat)

### Verification and release status

All **230 application tests passed**, including stationary-task search distinctions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–21 remain in the working tree.

## Project quality batch 23 — 2026-10-24

Added **2 new project defaults**. Catalog: **520 unique names** (478 strength/power + 42 corrective), up from 518. All 267 previous expansion definitions remain identical. Canonical names and aliases were checked across the entire catalog, including corrective entries. Both tasks use the existing Gymnastic Rings equipment label.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Ring Support Hold (Top) | Adds the timed straight-arm top support task on rings, rather than another dip repetition or a hanging drill. It provides a separately prescribable support-strength task using the existing Seconds metric. | Gymnastic Rings | Chest, Triceps / Front delts, Lats, Rotator cuff, Serratus anterior, Abdominals |
| Strict Ring Muscle-Up | Adds the linked pull, transition and dip skill. The transition distinguishes it from separately prescribing the existing ring pull-up and ring dip. Strict execution is explicit rather than conflating kipping or assisted versions. | Gymnastic Rings | Lats, Chest, Triceps / Biceps, Upper back, Front delts, Forearms, Abdominals, Rotator cuff, Serratus anterior |

### Setup and recording

- Ring Support Hold (Top) denotes the straight-arm support above the rings, not a bottom dip hold, dead hang or L-sit. Use the builder's existing Seconds metric with no fabricated repetition target. Record ring position and support standard consistently in notes. Duration is not converted into repetitions or a kilogram-volume equivalent. The manual external-load resistance form is not a timed-hold recorder.
- Strict Ring Muscle-Up denotes the linked hang-to-support skill without kipping. Count one complete pull/transition/dip cycle as one repetition, rather than logging an extra pull-up and dip automatically. Record grip and chosen range consistently. Assistance, momentum and failed attempts should not be mistaken for successful strict repetitions.
- Ring support is Intermediate and strict muscle-up is Advanced as categorical catalog defaults. Coaches decide readiness, assistance, apparatus setup and progression; no prerequisite count, fixed hold duration or automatic progression is imported from the sources. The two examples in validation tests demonstrate supported field shapes, not recommended dosage.
- Both are Grinding tasks with no relative 1RM conversion. The muscle-up's Pull/Push pattern describes its linked nature; the separate manual external-load form can use its existing Other category. Explicit zero external load for a bodyweight repetition does not estimate total bodyweight, force or mechanical work.
- Muscle roles are coaching defaults, not measured activation or an equivalent training dose for every listed muscle. No source instructions, images, programming plans or efficacy claims were imported.

### Held back

- **Kipping/bar muscle-ups, assisted transitions and ring-turnout permutations:** Not interchangeable with the two defined tasks. No further selection need established for this batch; do not multiply skill variations merely to reach the target.
- **Fixed-bar support holds or additional ring dips/pull-ups:** The existing ring dips/pull-ups remain intact; apparatus changes or a different support task require separate review.

### References

- [Roger Harrell / CrossFit Journal: Got Rings? Now What? (The support)](https://library.crossfit.com/free/pdf/44_06_GotRings_NowWhat.pdf)
- [Pamela Gagnon / CrossFit: ring muscle-up strength and skill breakdown](https://www.crossfit.com/essentials/crossfit-ring-muscle-up-rx-plan)

### Verification and release status

All **231 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including timed-hold/rep prescriptions, strict-versus-kipping search distinctions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. The initial default-concurrency run exhausted process memory in two unrelated PGlite security-test files; rerunning the complete suite with concurrency limited to two passed without code changes. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–22 remain in the working tree.

## Project quality batch 24 — 2026-10-24

Added **2 new project defaults** for practical training without hip machines/cable stacks. Catalog: **522 unique names** (480 strength/power + 42 corrective), up from 520. All 269 previous expansion definitions remain identical. Candidate names and aliases were checked across the full catalog, including corrective entries. Existing clamshells and band walks were retained rather than added again.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Seated Banded Hip Abduction | Adds seated outward hip work using a loop band and chair instead of an abduction machine. It is a practical equipment substitution, distinct from the existing side-lying clamshell and band-walking tasks. | Bands | Hip abductors / Glutes |
| Standing Banded Hip Adduction | Adds anchored inward hip work without a cable stack or adduction machine. Standing unilateral movement differs from the existing side-lying bodyweight option. | Bands | Adductors / Hip abductors, Abdominals |

### Setup and recording

- Seated Banded Hip Abduction denotes the seated loop-band outward hip task. Use a stable seat and record the chosen loop position, band identity, starting stretch and posture consistently. It is distinct from side-lying clamshells and lateral walking; the broad Hip abductors mapping is not a claim of isolated activation of every muscle in that group.
- Standing Banded Hip Adduction uses an anchored band for the inward movement of the working leg. Record working side, anchor and any balance support. Adductors are direct; stance-hip and trunk roles are assisting defaults, not an equivalent working dose to the moving limb.
- Both use existing sets, reps and RIR/RPE fields. A regression check validates rep/RIR prescriptions without a kilogram value. Band color and stretch are not automatically converted into kilograms, and no machine/cable-stack or relative 1RM equivalence is inferred. No new schema, dependency, benchmark or automatic client-plan assignment is introduced.
- Beginner difficulty and muscle roles are categorical coaching defaults. The clinical demonstration sources verify movement identity only; no condition-specific treatment, post-operative clearance, sample dosage or suitability claim is imported. No source instructions or images were copied.

### Held back

- **More band colors, seated trunk angles, loop placements and anchored hip permutations:** Record setup and resistance identity in notes. These do not justify separate catalog rows for this batch.
- **Additional clamshells and band walks:** Already represented in the project catalog. Do not re-add them under alternative names.

### References

- [Prehab exercise demonstration: seated hip abduction with band](https://theprehabguys.com/vimeo-video/seated-hip-abduction-band/)
- [University of Melbourne: standing resistance-band adduction (HAD2)](https://healthsciences.unimelb.edu.au/departments/physiotherapy/chesm/video-library/exercise/hip-oa/hip-adductor-exercises)

### Verification and release status

All **232 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including band hip direction/position/equipment search distinctions, prescriptions without a kilogram value, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–23 remain in the working tree.

## Project quality batch 25 — 2026-10-24

Added **2 new project defaults**. Catalog: **524 unique names** (482 strength/power + 42 corrective), up from 522. All 271 previous expansion definitions remain identical. Names and aliases were checked across the entire catalog, including corrective entries. Both tasks use existing repetition or timed-hold prescriptions.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| V-Up | Adds linked trunk and straight-leg flexion from the floor, distinct from the existing bent-knee floor sit-up, lying leg raise and static hollow/L-sit holds. | Bodyweight | Abdominals, Hip flexors / Quadriceps |
| Supine Adductor Squeeze (Ball) | Adds a low-equipment isometric inward hip squeeze with bent knees and a compressible ball. It differs from a moving band/cable adduction task and the supported Copenhagen plank. | Soft Ball | Adductors / — |

### Setup and recording

- V-Up denotes the floor movement with trunk and straight legs rising together, not a static V-sit, a bent-knee sit-up or a stability-ball knee tuck. Record the chosen range and arm position consistently. It uses repetitions with explicit zero external load for the bodyweight version; no estimated total bodyweight or automatic performance score is added.
- Supine Adductor Squeeze (Ball) denotes a bent-knee, floor-supported isometric squeeze against a compressible ball between the knees. Use the builder's existing Seconds metric with no artificial repetition target; record ball size, compressibility, placement and intended effort in notes. The separate manual external-load form is not a timed-hold recorder.
- Soft Ball is a descriptive equipment label for the compressible tool. Existing library filter and exercise-edit equipment lists derive options from stored entries, so no new UI or schema is needed. Do not enter the ball's weight as squeeze resistance or convert seconds to kilogram-volume. The app does not measure pressure, force or peak-strength change for this hold.
- Both are Grinding tasks with no relative 1RM ratio. Difficulty and muscle roles are categorical coaching defaults. Coaches choose suitability and dosage; the clinical source verifies movement identity without importing treatment protocols, post-operative advice or efficacy claims. No source instructions or images were copied.

### Held back

- **Weighted, single-leg and tuck V-up permutations:** First define the common linked floor movement; no need to multiply load or limb variations.
- **More ball sizes, squeeze tools and postures:** Document setup in notes. Tool dimensions and compressibility do not create new canonical exercises.
- **Automatic squeeze-force or bodyweight-volume estimates:** Ball mass does not measure squeeze resistance, and the existing app does not measure compression force.

### References

- [Rogue athlete demonstration: V-Ups](https://www.roguefitness.com/gb/theindex/movement-library/movement-demo-v-ups)
- [University of Melbourne: crook-lying leg squeeze (HAD1)](https://healthsciences.unimelb.edu.au/departments/physiotherapy/chesm/video-library/exercise/hip-oa/hip-adductor-exercises)

### Verification and release status

All **233 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including floor-task search distinctions, rep/timed-hold prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–24 remain in the working tree.

## Project quality batch 26 — 2026-10-24

Added **2 new project defaults**. Catalog: **526 unique names** (484 strength/power + 42 corrective), up from 524. All 273 previous expansion definitions remain identical. Candidate canonical names and aliases were checked across the full catalog, including corrective entries. Both tasks use existing rep/load prescriptions and equipment labels.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Single-Arm Dumbbell Snatch (From Floor) | Adds a one-dumbbell floor-to-overhead lift, a practical selection when dumbbells rather than kettlebells or a barbell are available. The floor start and implement distinguish it from the existing kettlebell swing-based snatch and barbell snatches. | Dumbbell | Quadriceps, Glutes, Trapezius / Hamstrings, Spinal erectors, Abdominals, Forearms, Front delts, Triceps, Rotator cuff, Serratus anterior |
| Sandbag Ground-to-Shoulder | Adds an odd-object floor-to-shoulder lift with a shoulder-supported finish. It differs from the existing sandbag carry/squat and is not an over-the-shoulder toss or an overhead lift. | Sandbag | Quadriceps, Glutes / Hamstrings, Spinal erectors, Abdominals, Upper back, Trapezius, Biceps, Forearms, Front delts |

### Setup and recording

- Single-Arm Dumbbell Snatch (From Floor) uses one dumbbell and starts each repetition on the floor. Record the working arm, receiving-position standard and any side alternation consistently. One repetition is one floor-to-overhead lift. Record one dumbbell's mass; no automatic doubling or barbell/kettlebell-max conversion is introduced.
- Sandbag Ground-to-Shoulder finishes with the bag supported on the chosen shoulder, rather than thrown behind the athlete or pressed overhead. Record total filled bag mass, side and grip/lap standard consistently. Changes in bag shape and fill can affect comparability; no barbell-clean equivalent is calculated.
- Both are Advanced Ballistic/Power selections as categorical defaults; coaches decide readiness, environment and prescription. Existing sets, reps, load and effort fields suffice. The app does not implement competitive judging, automatic rep/side detection, interval scoring or measurement of power output.
- Muscle roles are coaching defaults, not measured activation or equivalent hypertrophy doses. No relative 1RM percentage, universal loading rule, source programming, instructions, images or efficacy claim was imported. No client plan, schema or dependency changed.

### Held back

- **Separate dumbbell hang, squat-catch and alternating-only snatch entries:** No extra variants added to inflate the count. The selected entry explicitly starts on the floor; the coach records receiving position and side scheme.
- **Sandbag over-shoulder toss, front-rack clean, clean-and-press and grip permutations:** Different finishes and combinations are not aliases for shouldering. Review a separate need before adding more linked variations.

### References

- [CrossFit FAQ: dumbbell versus kettlebell snatch starting positions](https://www.crossfit.com/cf/faq)
- [Sandbag Fitness: Sandbag Shouldering movement definition](https://www.sandbagfitnessstore.com/pages/sandbag-shouldering)

### Verification and release status

All **234 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including implement/start/finish search distinctions, rep/load prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–25 remain in the working tree.

## Project quality batch 27 — 2026-10-24

Added **2 new project defaults**. Catalog: **528 unique names** (486 strength/power + 42 corrective), up from 526. All 275 previous expansion definitions remain identical. New canonical names and aliases were checked across the full catalog, including corrective entries.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Plank Body Saw | Adds forward/backward travel in a forearm plank, distinct from a static plank, shoulder tap and kneeling rollout. This entry uses the floor/toes setup rather than requiring sliders. | Bodyweight | Abdominals / Serratus anterior, Front delts, Glutes, Quadriceps |
| Suspension Knee Tuck | Adds a prone, feet-in-straps knee tuck. It differs from supine suspension hamstring curls, hanging knee raises and floor V-ups; it does not require an added push-up. | Suspension Trainer | Abdominals, Hip flexors / Front delts, Serratus anterior, Triceps, Quadriceps |

### Setup and recording

- Plank Body Saw uses a forearm plank with controlled forward/backward body travel from the toes on the floor. One out-and-back cycle is one repetition; record range and surface consistently. It is not a kneeling rollout or a new static-plank name.
- Suspension Knee Tuck uses a prone hand-supported plank with both feet in straps and both knees drawing toward the chest. One tuck-and-return is one repetition. Keep strap height, anchor setup and range consistent; no push-up is bundled into this exercise.
- Both use existing rep prescriptions with zero external load for bodyweight work; duration fields remain available when the coach chooses a timed set. Bodyweight, travel distance and strap angle are not converted into kilograms, power or relative 1RM. No new prescription UI, schema or dependency is needed.
- Muscle roles and difficulty are categorical coaching defaults, not activation measurements or equal training doses. References establish movement identity; no source dosage, images, treatment protocol or efficacy claims were imported.

### Held back

- **Separate slider and suspension body-saw variants:** Add the floor version first. Equipment permutations are not needed solely to increase catalog size.
- **Knee-tuck/push-up combinations and suspension pike variations:** Combinations and straight-leg pikes are different tasks, not aliases. No demonstrated need for extra linked variants in this batch.

### References

- [[P]rehab: Plank Body Saw demonstration](https://theprehabguys.com/vimeo-video/plank-body-saw-2/)
- [Dynamic Sports Physical Therapy: TRX Hip Program, Knee Tuck](https://www.dynamicsportspt.com/files/2012/04/TRX_Hip_Program.pdf)

### Verification and release status

All **235 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including body-saw/knee-tuck search distinctions, bodyweight rep prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–26 remain in the working tree.

## Project quality batch 28 — 2026-10-24

Added **2 new project defaults**. Catalog: **530 unique names** (488 strength/power + 42 corrective), up from 528. All 277 previous expansion definitions remain identical. New canonical names and aliases were checked across the full catalog, including corrective entries.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Suspension Biceps Curl | Fills a strap-based elbow-flexion gap for sessions without free weights or a cable stack. Unlike a suspension row, the upper arms stay forward while elbow flexion brings the hands toward the forehead. | Suspension Trainer | Biceps / Forearms, Abdominals, Front delts, Upper back |
| Suspension Overhead Triceps Extension | Fills the strap-based overhead elbow-extension gap. The handles move with the athlete, unlike the existing fixed-bar bodyweight extension; it also differs from cable/band-resisted overhead extensions. | Suspension Trainer | Triceps / Abdominals, Front delts, Serratus anterior |

### Setup and recording

- Suspension Biceps Curl is the bilateral palms-up curl facing the anchor, with upper arms held forward. It is not a suspension row or supine hamstring curl. Suspension Overhead Triceps Extension faces away from the anchor with the hands above/in front of the head; it is not a chest press.
- Both fit existing reps and RIR/RPE fields with no external load required. Record strap length, foot placement, body angle and range consistently in exercise notes; changing geometry changes the task. No bodyweight or angle-to-kilogram conversion, cable-stack equivalent or relative 1RM is introduced.
- Both use Advanced as a catalog default consistent with the ACE entries. The coach selects a suitable angle and level; the label is not a fixed load prescription. Muscle roles are categorical coaching defaults, not measured activation or equivalent training doses.
- References establish movement identity. No source instructions, images, programming dosage or efficacy claims were imported. No client program, schema, dependency or builder UI changed.

### Held back

- **Suspension hammer, reverse, single-arm and grip-only curls:** The common bilateral supinated curl fills the current gap. No extra grip or unilateral variants are needed for this batch.
- **Separate ring equivalents and kneeling triceps variants:** Do not multiply support and posture permutations without a demonstrated coaching need.
- **Automatic resistance or 1RM estimates from suspension angle:** The app does not measure strap force, anchor geometry or body angle. Effort and consistent setup can be prescribed without inventing kilograms or cable-stack equivalents.

### References

- [ACE: TRX Biceps Curl](https://www.acefitness.org/resources/everyone/exercise-library/78/trx-reg-biceps-curl/)
- [ACE: TRX Overhead Triceps Extension](https://www.acefitness.org/resources/everyone/exercise-library/80/trx-reg-overhead-triceps-extension/)

### Verification and release status

All **236 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including suspension arm search distinctions, reps/RIR prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–27 remain in the working tree.

## Project quality batch 29 — 2026-10-24

Added **2 new project defaults**. Catalog: **532 unique names** (490 strength/power + 42 corrective), up from 530. All 279 previous expansion definitions remain identical. New canonical names and aliases were checked across the full catalog, including corrective entries.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Hand-Supported Sissy Squat | Adds a standing, hand-supported knee-extension task with a backward-leaning body. The feet/toes stay on the floor, unlike the kneeling Reverse Nordic Curl; it is not the constrained machine version or an upright supported squat. | Bodyweight | Quadriceps / Calves, Abdominals |
| Kettlebell Halo | Adds a controlled around-the-head kettlebell path for shoulder preparation. It is distinct from the overhead press, windmill, Turkish get-up and around-the-waist pass. | Kettlebell | Front delts, Side delts / Rotator cuff, Trapezius, Serratus anterior, Abdominals, Forearms |

### Setup and recording

- Hand-Supported Sissy Squat uses a stable hand support and a standing forefoot-supported setup. Record the support, assistance and depth consistently. It is not the kneeling reverse Nordic or the machine exercise. Bodyweight reps can use zero external load; no assistance-to-load conversion is calculated.
- Kettlebell Halo is controlled around-head work. One complete circle returning to the front is one repetition; specify repetitions in each direction in notes or separate sets, without automatically doubling recorded reps. Record the mass of the single kettlebell. It is not an explosive lift or an around-waist circle.
- Both use existing sets, reps, load and effort fields. Advanced is a categorical catalog default, not a prescribed load or clearance decision. The halo is a shoulder-preparation option; its mapped sets do not imply equivalent shoulder-hypertrophy stimulus to presses or raises.
- Muscle roles are coaching defaults, not measured activation or equivalent training doses. References establish movement identity; no treatment claims, source dosage, images or detailed source instructions were imported. No client plan, schema, dependency or builder UI changed.

### Held back

- **Freestanding, weighted and machine sissy-squat variants:** Add one clearly defined hand-supported option first. Support, range and loading changes require consistent setup, not extra names just for the target count.
- **Plate/dumbbell halos, kneeling halos and waist-level circles:** No implement or posture permutations added. A waist-level orbit is a different task and is not used as an alias for the around-head halo.
- **Automatic direction counting and assisted bodyweight load estimates:** The builder does not measure assistance, angle, range or movement direction. Use existing notes and reps; no estimated effective kilograms or automatic left/right totals.

### References

- [[P]rehab: Sissy Squat, including hand support](https://theprehabguys.com/vimeo-video/sissy-squat-2/)
- [ACE: Kettlebell Halo](https://www.acefitness.org/resources/everyone/exercise-library/394/halo/)

### Verification and release status

All **237 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including support/path search distinctions, bodyweight/loaded rep prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–28 remain in the working tree.

## Project quality batch 30 — 2026-10-24

Added **1 new project default**. Catalog: **533 unique names** (491 strength/power + 42 corrective), up from 532. All 281 previous expansion definitions remain identical. New canonical names and aliases were checked across the full catalog, including corrective entries. This batch intentionally adds one clear gap rather than extra permutations.

| Exercise | Coaching gap | Equipment | Direct / assisting roles |
| --- | --- | --- | --- |
| Depth Drop (Stick Landing) | Adds a bilateral step-off-box landing with a deliberate hold and no rebound. The existing Depth Jump rebounds vertically, Box Jump lands on a box after takeoff, and step-downs keep one foot supported rather than dropping to land. | Box | Quadriceps, Glutes, Calves / Hamstrings, Hip abductors, Abdominals |

### Setup and recording

- Depth Drop (Stick Landing) starts on a stable box and ends in a bilateral landing held under control. There is no immediate upward jump. One drop-and-hold counts as one repetition; stepping back up is setup, not another rep.
- Use existing reps with zero external load for the bodyweight task. Record box height, surface and landing standard in notes consistently. Box height is not kilograms, a rep maximum or an automatic progression target. The app does not infer landing quality, impact force, contact time or reactive strength.
- Advanced is a catalog default. The coach selects readiness, height and prescription; no universal height, progression schedule or training clearance was imported. The Power/Ballistic grouping accommodates dynamic landing drills and does not imply a measured power output or rebound.
- Muscle roles are categorical coaching defaults, not measured activation or equal training doses. References establish the movement and its distinction from the rebound depth jump. No source dosage, images, detailed instructions or injury-prevention claim was imported. No client plan, schema, dependency or builder UI changed.

### Held back

- **Single-leg, lateral, rotational and box-height-specific depth drops:** One clear bilateral landing task fills the gap. More landing variants need a demonstrated coaching need rather than a catalog-count target.
- **Drop Jump as a Depth Drop alias:** Drop jump commonly denotes a rebound task. It would blur the distinction from Depth Jump and is deliberately excluded.
- **Automated landing quality, impact force, contact-time and reactive-strength scoring:** The current builder records prescribed/completed reps, not force-plate or video-analysis measurements. No values or clearance rules are inferred.

### References

- [[P]rehab: Depth Drop](https://theprehabguys.com/vimeo-video/depth-drop-2/)
- [NSCA Coach 3.1: Drop Landing versus Depth Jump, exercise progression](https://www.nsca.com/contentassets/9dab08fc28274f3ba1d76af31bbbe40b/coach3.1-screening_and_preventing_common_injuries_in_division_i_basketball_players.pdf)

### Verification and release status

All **238 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`, including landing/rebound search distinctions and exact-task ranking, bodyweight rep prescriptions, catalog uniqueness, valid muscle mappings, stable IDs, preserved coach overrides and idempotent merges. The broad query "depth drop" may also find Depth Jump through its existing multiword alias; the new exact landing task ranks first. Lint, production build and diff whitespace checks passed. Local project-source additions only; no live account records were written. Previous batches 17–29 remain in the working tree.

## Project quality batch 31 — 2026-10-24

Added **10 project defaults**: 6 strength/bodyweight tasks and 4 flexibility choices. Catalog: **543 unique names** (497 strength/power + 46 corrective/mobility), up from 533. All 282 previous strength expansion definitions, 42 corrective definitions and previous aliases remain identical. Names and aliases were checked against both catalogs and each other.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or flexibility target |
| --- | --- | --- | --- |
| Barbell Push Jerk | Adds a shoulder-to-overhead lift received with a knee re-bend and parallel stance, distinct from Push Press and the split-stance jerk. No separate power-jerk synonym entry is added. | Barbell | Quadriceps, Glutes, Front delts, Triceps / Calves, Trapezius, Serratus anterior, Abdominals, Spinal erectors |
| Hollow Body Rock | Adds controlled rocking while retaining a hollow body shape, distinct from a static hollow hold, sit-up or V-up. | Bodyweight | Abdominals / Hip flexors, Quadriceps, Serratus anterior |
| Superman Hold (Floor) | Adds a prone arms-overhead and legs-raised hold, distinct from the arms-back Prone Cobra, quadruped Bird Dog and supported back extensions. | Bodyweight | Spinal erectors, Glutes / Hamstrings, Trapezius, Rear delts |
| Suspension Chest Fly | Adds chest isolation through an arm arc while supported by straps and body angle, distinct from elbow-bending ring push-ups and external-load cable/dumbbell flies. | Suspension Trainer | Chest / Front delts, Biceps, Triceps, Abdominals, Serratus anterior |
| Dumbbell Box Step-Over | Adds a loaded traversal onto and across a box, finishing on the opposite side; existing step-ups return to their starting side. | Dumbbell | Quadriceps, Glutes / Hamstrings, Hip abductors, Adductors, Abdominals, Forearms |
| Dragon Flag (Body Lever) | Adds an anchored straight-body lever raised/lowered from shoulder support, distinct from hip-flexion leg raises and floor hollow holds. | Fixed Anchor | Abdominals / Lats, Forearms, Glutes, Quadriceps, Triceps |
| Static Cross-Body Shoulder Stretch | Adds a posterior-shoulder flexibility option across the chest, distinct from the doorway pectoral and overhead lat stretches. | Bodyweight | Stretch only: Posterior deltoid; no working-muscle mapping |
| Static Overhead Triceps Stretch | Adds a held elbow-flexed overhead arm stretch, distinct from resisted overhead elbow extensions. | Bodyweight | Stretch only: Triceps; no working-muscle mapping |
| Static Wrist Flexor Stretch | Adds a palm-side forearm flexibility option, distinct from loaded wrist curls and the opposing extensor stretch. | Bodyweight | Stretch only: Wrist flexors; no working-muscle mapping |
| Static Wrist Extensor Stretch | Adds the opposing back-of-forearm flexibility option, distinct from the flexor stretch and loaded wrist-extension exercise. | Bodyweight | Stretch only: Wrist extensors; no working-muscle mapping |

### Setup and recording

- Barbell Push Jerk starts at the shoulders and uses a re-bend to receive the bar with a parallel stance. It is not a split jerk or a clean-and-jerk combination. No loading ratio or separate Power Jerk alias is assumed.
- Hollow Body Rock records one out-and-back rocking cycle as a rep. Superman Hold (Floor) uses a timed prone arms-overhead/legs-raised hold. These are distinct from the static hollow hold and arms-back cobra. Coaches choose lever length, range and duration.
- Suspension Chest Fly uses existing reps/effort fields. Record body angle and strap setup consistently; the app does not turn angle or body mass into effective kilograms.
- Dumbbell Box Step-Over requires a stable box plus two dumbbells at the sides. One crossing ends with both feet on the opposite side. Record box height, lead-leg scheme and whether the entered load is combined mass consistently; there is no automatic two-dumbbell multiplier or imported competition height/score.
- Dragon Flag (Body Lever) requires a secure fixed hand anchor and shoulder support. The entry represents the straight-body task, not a hanging front lever or a negative-only/tuck progression. Use reps or a deliberately specified hold; range and body shape belong in notes. No readiness or clearance rule is inferred from its Advanced label.
- Four flexibility entries use the existing Stretch mode and seconds/minutes prescriptions. They appear under Mobility and receive no working-muscle targets. General flexibility target labels do not add posture findings, diagnoses or automatic treatment rules. Keep side and stretch position consistent.
- All muscle roles are categorical coaching defaults, not activation measurements or equivalent training doses. References establish identities and differences; source routines, images, detailed instructions, medical claims and universal dosage were not imported. No client plan, schema, dependency or builder UI changed.

### Held back

- **Additional grip, implement, pause and tempo variants:** Prescribe those details on the existing exercise; they do not justify new catalog rows in this batch.
- **Tuck/one-leg dragon flags, hollow/arch rock permutations and separate Power Jerk entry:** No progression ladders or potentially overlapping jerk names added for count. Record lever shape and footwork standards in notes.
- **Cardio/distance targets, body-angle effective loads, automatic two-dumbbell multipliers and medical protocols:** No unsupported measurements, hidden load conversion or generic treatment prescription is introduced.

### References

- [CrossFit: The Push Jerk](https://www.crossfit.com/essentials/the-push-jerk)
- [CrossFit: The Hollow Rock](https://www.crossfit.com/essentials/the-hollow-rock)
- [ACE: Supermans](https://www.acefitness.org/resources/everyone/exercise-library/9/supermans/)
- [TRX: Chest Fly](https://www.trxtraining.com/blogs/news/trx-chest-fly)
- [CrossFit 2018 Team Series Event 8: Dumbbell Box Step-Over definition](https://games-assets.crossfit.com/2018teamseries_event8_feetshneh76323bhwd.pdf)
- [GymnasticBodies: Body Lever / Dragon Flag](https://www.gymnasticbodies.com/exercises/body-lever)
- [AAOS: Crossover Arm Stretch in shoulder conditioning program](https://orthoinfo.aaos.org/globalassets/pdfs/2022-rotator-cuff-and-shoulder-conditioning-program.pdf)
- [ACE: Overhead Triceps Stretch](https://www.acefitness.org/resources/everyone/exercise-library/174/overhead-triceps-stretch/)
- [Cleveland Clinic: Wrist Flexor and Extensor Stretches](https://health.clevelandclinic.org/wrist-pain-exercises)

### Verification and release status

All **240 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`. Coverage includes distinct task aliases, rep/timed-hold prescriptions, Stretch-mode exclusion from working-muscle mappings, stable coach-scoped IDs, repeat-merge safety, preserved coach overrides and catalog uniqueness. Lint, production build and diff whitespace checks passed. All previous source references and batch IDs are retained. Local project-source additions only; no live account records were written. Previous batches 17–30 remain in the working tree.

## Project quality batch 32 — 2026-10-24

Added **10 project defaults**: 3 strength/support tasks and 7 mobility choices. Catalog: **553 unique names** (500 strength/power + 53 corrective/mobility), up from 543. All 288 previous strength expansion definitions, 46 corrective definitions and previous aliases remain identical. Names and aliases were checked against both catalogs and each other.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Bench Dip | Adds feet-supported elbow extension with hands on a bench behind the body, distinct from suspended parallel-bar/ring dips and a forward-leaning fixed-bar triceps extension. It is a selectable task, not an automatic beginner regression. | Bench | Triceps / Chest, Front delts |
| Wall-Facing Handstand Hold | Adds an isometric inverted overhead support task with the chest facing a wall, distinct from repeated handstand push-ups, a pike push-up and ring support. | Wall | Front delts, Side delts, Triceps, Serratus anterior / Trapezius, Rotator cuff, Abdominals, Forearms |
| Suspension Reverse Fly (T) | Adds a strap-based horizontal-abduction/retraction task facing the anchor. It differs from elbow-bending suspension rows and from the chest fly facing away from the anchor. | Suspension Trainer | Rear delts, Upper back / Rotator cuff, Trapezius, Abdominals, Forearms |
| Cat-Cow | Adds controlled quadruped spinal flexion/extension mobility, distinct from opposite-limb Bird Dog, the prone Superman hold and static Child's Pose. | Mat | Mobility only: Spinal mobility; no working-muscle mapping |
| Side-Lying Thoracic Rotation (Open Book) | Adds side-lying upper-trunk rotation while the bent knees remain stacked. It is distinct from loaded trunk rotation and from supine lower-trunk rotation. | Mat | Mobility only: Thoracic rotation mobility; no working-muscle mapping |
| Half-Kneeling Ankle Dorsiflexion Rock | Adds repeated forward ankle-range practice with the heel supported, distinct from held calf stretches and tibialis toe raises. | Bodyweight | Mobility only: Ankle dorsiflexion mobility; no working-muscle mapping |
| 90/90 Hip Switch | Adds seated transitions between internal/external hip-rotation positions, distinct from static piriformis stretches and hip-strength isolation work. | Mat | Mobility only: Hip internal/external rotation mobility; no working-muscle mapping |
| Supine Shoulder Flexion (Dowel-Assisted) | Adds an unloaded assisted overhead range task while lying down, distinct from serratus wall slides, loaded overhead presses and static lat stretches. | Dowel | Mobility only: Assisted shoulder flexion mobility; no working-muscle mapping |
| Supine Lower Trunk Rotation | Adds knees-together lower-trunk rotation from a supine bent-knee position. It differs from the upper-trunk open-book rotation and resisted rotational work. | Mat | Mobility only: Trunk rotation mobility; no working-muscle mapping |
| Static Biceps Stretch (Wall Support) | Adds a wall-supported anterior-arm flexibility option, distinct from overhead triceps and forearm-only stretches. | Wall | Mobility only: Biceps; no working-muscle mapping |

### Setup and recording

- Bench Dip uses a stable bench with feet supported and is selected by the coach. It is not marked as a universally safe or required step toward bar dips. Record foot placement and range consistently; the source discussion does not establish equivalent loading or superiority over other triceps work.
- Wall-Facing Handstand Hold is timed overhead support, not a wall walk, headstand or repeated push-up. Record wall orientation and support consistently; setup and exit are not counted as extra repetitions. Advanced is a catalog label, not clearance or an assigned duration.
- Suspension Reverse Fly (T) records an opening/return as one rep. Record strap setup and body angle consistently. There is no conversion of strap geometry or body mass into an external load.
- Cat-Cow, open books, ankle rocks, hip switches, dowel-assisted flexion and lower-trunk rotations can use existing rep fields for controlled motion. A Cat-Cow round trip is one rep; for sided drills specify side and counting convention in notes. A 90/90 transition to the other side is one switch, with no automatic doubling.
- The biceps stretch uses the existing timed-hold fields. Stretch mode also hosts general range-of-motion drills under Mobility; the label does not force a static execution or a timed prescription. All seven receive no working-muscle mappings and their target labels introduce no posture-finding matches.
- Dowel-assisted shoulder motion is unloaded assisted range work. No source post-surgery instructions, treatment schedule, fixed end-range targets, universal dosage or clearance rules were imported. Muscle roles on strength entries are categorical coaching defaults, not activation measurements or equal training doses.
- The current reps/seconds/minutes fields suffice. No client plan, database schema, dependency or builder UI changed. No source routines, detailed instructions, images or medical efficacy claims were copied.

### Held back

- **Scapular dips and extra handstand orientations:** Do not equate straight-arm scapular movement with elbow-bending dips, or a wall-facing hold with freestanding/back-to-wall holds. No extra support permutations added in this batch.
- **New diagnostic rules or activation maps for mobility drills:** These are manually selected general range-of-motion tasks. Existing Stretch mode keeps them outside working-muscle mappings; their target labels do not match existing posture findings.
- **Forced end-range goals, post-surgery protocols and automatic body-angle load estimates:** No medical protocol, universal range/duration, height, readiness rule, bodyweight-equivalent kilograms or source programming is imported.
- **Unreviewed source muscle tables:** The reviewed NASM bench-dip page contains an unrelated lower-body/barbell muscle table. That table was not imported; catalog roles are reviewed independently and the ACE discussion supplies context.

### References

- [ACE: bench-dip discussion and selection limitations](https://www.acefitness.org/certifiednewsarticle/1657/follow-up-q-and-a-dangerous-dips/)
- [CrossFit: lesson-plan compilation, wall-facing handstand hold](https://assets.crossfit.com/pdfs/seminars/LessonPlan_Compilation.pdf)
- [TRX: T Delt Fly and reverse-fly distinction](https://www.trxtraining.com/blogs/news/trx-shoulder-exercises)
- [[P]rehab: Cat Cow](https://theprehabguys.com/vimeo-video/cat-cow/)
- [[P]rehab: Open Book](https://theprehabguys.com/vimeo-video/open-book/)
- [B3 Physical Therapy: Half Kneeling Ankle Rocking](https://b3pt.com/half-kneeling-ankle-rocking/)
- [Advanced Therapy and Performance: 90 90 Hip Switches demonstration](https://www.youtube.com/watch?v=YxECcOkUCEY)
- [[P]rehab: Supine Shoulder Flexion, PROM with Dowel](https://theprehabguys.com/vimeo-video/supine-shoulder-flexion-prom-dowel/)
- [[P]rehab: Lower Trunk Rotation](https://theprehabguys.com/vimeo-video/lower-trunk-rotation-2/)
- [MyHealth Alberta: Biceps stretch with optional wall support](https://myhealth.alberta.ca/Health/aftercareinformation/pages/conditions.aspx?hwid=zp4494)

### Verification and release status

All **242 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`. Coverage includes distinct support/suspension aliases, mobility reps and timed holds, no new automatic posture matches, Stretch-mode exclusion from working-muscle mappings, stable coach-scoped IDs, repeat-merge safety and preserved coach overrides. Lint, production build and diff whitespace checks passed. All previous source references and batch IDs are retained. Local project-source additions only; no live account records were written. Previous batches 17–31 remain in the working tree.

## Project quality batch 33 — 2026-10-24

Added **10 project defaults**: 3 strength tasks and 7 mobility choices. Catalog: **563 unique names** (503 strength/power + 60 corrective/mobility), up from 553. All 291 previous strength expansion definitions, 53 corrective definitions and previous aliases remain identical. Names and aliases were checked across both catalogs and within this batch.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Rubber-Band Finger Opening | Adds resisted hand opening rather than closing a gripper, pinching plates or moving the wrist. It covers a distinct finger-extensor task with simple equipment. | Rubber Band | Forearms / — |
| Wrist Roller (Handheld) | Adds repeated winding/unwinding of a suspended load with a handheld roller, distinct from isolated wrist curls and static grip holds. | Wrist Roller | Forearms / Front delts, Abdominals |
| Neck Isometric Flexion (Hand Resistance) | Adds a stationary forehead-against-hand contraction, distinct from cervical retraction/chin tucks. It uses an explicit duration, without a guessed resistance value. | Bodyweight | Neck flexors / — |
| Quadruped Adductor Rockback | Adds controlled backward hip travel with one leg extended sideways, distinct from a standing adductor stretch, Cossack squat and seated hip switch. | Mat | Mobility only: Adductor mobility; no working-muscle mapping |
| Thoracic Extension (Foam Roller) | Adds extension over a positioned roller, distinct from thoracic soft-tissue rolling/massage and quadruped Cat-Cow. | Foam Roller | Mobility only: Thoracic extension mobility; no working-muscle mapping |
| Supine Active Hamstring Stretch | Adds active knee straightening with the thigh supported in a supine position, distinct from the existing passive band-assisted hamstring stretch. | Mat | Mobility only: Active hamstring mobility; no working-muscle mapping |
| Standing Leg Swing (Front-to-Back) | Adds supported sagittal-plane leg mobility, distinct from resisted hip flexion, squat work and rotational hip switches. | Bodyweight | Mobility only: Sagittal hip mobility; no working-muscle mapping |
| Standing Leg Swing (Side-to-Side) | Adds frontal-plane leg mobility across/out from the body, distinct from front-to-back swings and resisted band walks. | Bodyweight | Mobility only: Frontal hip mobility; no working-muscle mapping |
| Quadruped Wrist Extension Rock | Adds progressive palm-supported wrist-range practice using body travel, distinct from a passive wrist-flexor stretch or loaded wrist curls. | Mat | Mobility only: Weight-bearing wrist extension mobility; no working-muscle mapping |
| Supine Shoulder External Rotation (Dowel-Assisted) | Adds assisted outward shoulder rotation while supine, distinct from dowel-assisted flexion and resisted cable/band external rotation. | Dowel | Mobility only: Assisted shoulder external rotation mobility; no working-muscle mapping |

### Setup and recording

- Rubber-Band Finger Opening uses reps/effort without converting band tension to kilograms. Forearms is the current broad finger-extensor reporting group; this is not a complete intrinsic-hand anatomy map. One opening-and-return is a rep. Band and hand setup belong in notes.
- Wrist Roller (Handheld) uses existing timed work. Keep support, arm position, strap length, winding direction and attached load consistent in notes. The roller task is not a measured grip-force test or a wrist-curl 1RM, and rack-mounted variants are not assumed equivalent.
- Neck Isometric Flexion (Hand Resistance) uses a duration with no invented kilogram load or measured force. It is distinct from moving the head into flexion and from cervical retraction. No clinical source effort percentage, treatment dose or automatic progression was copied.
- The seven mobility drills use existing reps or duration fields. For leg swings, a complete out-and-return movement is one rep; specify working side and support. The two planes have different paths and should not share a progression series. Adductor rockbacks and active hamstring mobility have their own setup, not a generic squat or knee-extension strength mapping.
- Thoracic Extension (Foam Roller) is a range-of-motion task over a positioned roller, not SMR massage. Quadruped Wrist Extension Rock uses palm support and controlled body travel. Dowel-assisted shoulder rotation is assisted range work, not resisted rotator-cuff training. Record range/setup consistently; no automatic range, force or bodyweight-equivalent kilograms are calculated.
- All seven use Stretch mode under Mobility and have no working-muscle mappings. Their general mobility labels introduce no automatic posture matches. Muscle roles on strength entries are categorical coaching defaults, not measured activation or equal training doses.
- References establish task identity. No detailed source instructions, images, routines, medical claims, universal end ranges or prescription schedules were imported. No client plan, schema, dependency or builder UI changed.

### Held back

- **Finger-by-finger, band-brand and roller grip/direction permutations:** One hand-opening task and one handheld roller task fill distinct gaps. Use setup notes rather than extra rows for resistance tools and winding direction.
- **Neck extension/lateral-flexion mappings and automatic neck-loading progressions:** Only the supported neck-flexor group is mapped. No unrepresented anatomy is relabelled and no treatment, force or progression rules are inferred.
- **Universal range, rep tempo, clinical protocols and source treatment doses:** Definitions establish movement identity only. Coaches choose appropriate use and prescription; no medical routine, source schedule or guaranteed outcome is imported.
- **Massaging and extending on a roller as one interchangeable task:** Preserve the existing SMR entry and add a separate mobility entry. Generic roller searches may show both, with the exact task ranked first.

### References

- [Cleveland Clinic: Finger spring with a rubber band](https://health.clevelandclinic.org/wrist-pain-exercises)
- [Rogue: Handheld wrist roller task and setup](https://www.roguefitness.com/rogue-wrist-roller)
- [Essex Partnership University NHS: Isometric neck flexion definition](https://www.eput.nhs.uk/wp-content/uploads/2025/03/a4whiplash.pdf)
- [[P]rehab: Adductor Rock Back](https://theprehabguys.com/vimeo-video/quadruped-dynamic-long-adductor-stretch/)
- [[P]rehab: Thoracic Extension With Foam Roller](https://theprehabguys.com/vimeo-video/thoracic-extension-mobilization/)
- [Merck Manual / Tomah Memorial Hospital: Supine Active Hamstring Stretch](https://www.merckmanuals.com/professional/multimedia/video/supine-active-hamstring-stretch)
- [ACE: Front-to-back and side-to-side leg swings as dynamic warm-up movements](https://www.acefitness.org/resources/everyone/blog/6240/why-the-change-of-season-can-be-good-for-your-running-program/?topicScope=cardiovascular-training)
- [Erson Religioso, DPT: Quadruped rocking into wrist extension](https://www.themanualtherapist.com/2018/05/mini-case-when-is-wrist-pain-not-wrist.html)
- [[P]rehab: Supine Shoulder External Rotation, PROM with Dowel](https://theprehabguys.com/vimeo-video/supine-shoulder-external-rotation-prom/)

### Verification and release status

All **244 application tests passed** with `node --test --test-concurrency=2 tests/*.test.mjs`. Coverage includes distinct hand/neck task aliases, timed and effort prescriptions, mobility plane/direction distinctions, no new automatic posture matches, Stretch-mode exclusion from working-muscle mappings, stable coach-scoped IDs, repeat-merge safety and preserved coach overrides. Lint, production build and diff whitespace checks passed. All previous source references and batch IDs are retained. Local project-source additions only; no live account records were written. Previous batches 17–32 remain in the working tree.

## Project quality batch 34 — 2026-10-24

Added **10 project defaults**: 6 machine/power tasks and 4 mobility choices. Catalog: **573 unique names** (509 strength/power + 64 corrective/mobility), up from 563. All 294 previous strength expansion definitions, 60 corrective definitions and previous aliases remain identical. Names and aliases were checked across both catalogs and within this batch.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Rotary Torso Machine | Adds a seated, externally resisted trunk-rotation machine task, distinct from cable chops and anti-rotation holds. | Machine | Abdominals / Spinal erectors |
| Seated Lumbar Extension Machine | Adds supported seated lumbar extension, distinct from hip-hinge back extensions on a 45-degree or horizontal bench. | Machine | Spinal erectors / — |
| Seated Dip Machine (Plate-Loaded) | Adds a seated loaded-handle press, distinct from assisted bodyweight dips and isolated machine triceps extensions. | Machine | Triceps / Chest, Front delts |
| American Kettlebell Swing (Overhead) | Adds an explicitly overhead two-handed swing finish while preserving the existing Russian swing identity and aliases. | Kettlebell | Hamstrings, Glutes / Spinal erectors, Abdominals, Forearms, Front delts, Serratus anterior, Trapezius, Rotator cuff |
| Medicine Ball Overhead Forward Throw | Adds a two-handed overhead forward throw, distinct from downward slams, chest passes and backward throws. | Medicine Ball | Lats, Abdominals, Triceps / Chest, Front delts, Glutes, Quadriceps |
| Medicine Ball Overhead Backward Throw | Adds a backward overhead trajectory driven by leg and hip extension, distinct from forward throws and generic scoop tosses. | Medicine Ball | Glutes, Quadriceps, Hamstrings / Calves, Spinal erectors, Abdominals, Front delts, Forearms, Trapezius |
| Supine Single-Knee-to-Chest Stretch | Adds single-leg supine hip-flexion mobility, distinct from a piriformis rotation stretch and active hamstring knee extension. | Mat | Mobility only: Single-knee hip flexion mobility; no working-muscle mapping |
| Prone Press-Up (Lumbar Mobility) | Adds hand-assisted prone lumbar extension, distinct from the existing Press Up push-up, Prone Cobra and Superman Hold. | Mat | Mobility only: Prone lumbar extension mobility; no working-muscle mapping |
| Standing Shoulder CAR | Adds controlled standing shoulder circumduction, distinct from resisted shoulder rotation, raises and static stretches. | Bodyweight | Mobility only: Controlled shoulder circumduction mobility; no working-muscle mapping |
| Side-Lying Hip CAR | Adds controlled hip circumduction in a supported side-lying position, distinct from seated hip switches and loaded hip-airplane balance work. | Mat | Mobility only: Controlled hip circumduction mobility; no working-muscle mapping |

### Setup and recording

- Record the machine, seat and start position consistently. Seated lumbar extension is a supported lumbar task, not an assumption that every back-extension machine has identical mechanics. Plate-loaded seated dips use moved external resistance, not bodyweight minus assistance. Note per-arm versus combined plate convention; no automatic doubling or machine-to-free-weight 1RM conversion is introduced.
- The American swing keeps its overhead finish explicit. The existing Russian swing entry and aliases remain unchanged. Both medicine-ball throws have explicit forward/backward overhead trajectories; neither is a floor slam. Use existing reps and ball mass; the app does not measure throwing distance, velocity or power output.
- The four mobility drills use existing reps with zero external load or a duration. Specify working side and setup consistently; no automatic bilateral rep doubling, fixed range or measured force is inferred. The side-lying hip CAR is a supported circle, not a loaded hip airplane.
- Prone Press-Up (Lumbar Mobility) has qualified aliases so the existing Press Up push-up stays first for its established search. It does not replace Prone Cobra or Superman Hold.
- All four use Stretch mode under Mobility, with no working-muscle mapping and no new automatic posture matches. Strength muscle roles are categorical coaching defaults, not measured activation or equal training doses.
- Primary references establish task identity only. No copied routines, images, clinical prescriptions, universal end ranges or manufacturer marketing claims were imported. No client plans, schema, dependencies or builder UI changed.

### Held back

- **Machine-brand, handle-grip and facing-direction permutations:** Record the machine and setup in notes instead of creating near-duplicate entries or assuming equal resistance between machines.
- **Extra CAR positions and unqualified Cobra or Press-Up aliases:** One shoulder and one supported hip circumduction task fill the gap. Preserve existing push-up search priority and avoid ambiguous names.
- **Throw distance, velocity, power output and machine/free-weight max conversion:** Current prescription supports repetitions and external load, not these measurements. No invented values or equivalence ratios are added.
- **Clinical mobility protocols, automatic posture matches and fixed end ranges:** References identify the movement only. General mobility labels add no diagnostic or automatic corrective prescription rules.

### References

- [Life Fitness: Insignia Torso Rotation](https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-torso-rotation)
- [Life Fitness: Insignia Back Extension](https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-back-extension)
- [Hammer Strength: Plate-Loaded Seated Dip](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-seated-dip)
- [CrossFit: American Kettlebell Swing with Jeff Martone](https://www.crossfit.com/essentials/american-kettlebell-swing-with-jeff-martone)
- [Discovery: Athletics Coaching Manual, overhead forward throw (both arms)](https://www.discovery.co.za/microsites_za/vitality_schools/web/linked_content/pdfs/for_coaches/athletics_coaching_manual.pdf)
- [World Athletics: Backward Overhead Throw](https://worldathletics.org/en/kids-athletics/teaching-athletics/backward-overhead-throw)
- [University Hospitals Dorset NHS: Back booklet, single knee-to-chest movement](https://www.uhd.nhs.uk/uploads/about/docs/our_publications/patient_information_leaflets/orthopaedics/Back_pain_booklet_Ortho.pdf)
- [[P]rehab: Prone Press Up](https://theprehabguys.com/vimeo-video/prone-press-up/)
- [[P]rehab: Shoulder CARs](https://theprehabguys.com/vimeo-video/shoulder-cars/)
- [[P]rehab: Hip CARs, Side Lying](https://theprehabguys.com/vimeo-video/hip-cars-side-lying/)

### Verification and release status

**246 application tests passed** with test concurrency 2; lint, production build and whitespace checks passed. All 294 previous expansion definitions, 60 corrective definitions and prior aliases are unchanged. New mobility entries introduce zero automatic posture matches. Local project-source additions only; not committed, pushed or deployed. No live account records were written. Previous batches 17–33 remain in the working tree.

## Project quality batch 35 — 2026-10-24

Added **10 project defaults**: 6 strength/power tasks and 4 mobility choices. Catalog: **583 unique names** (515 strength/power + 68 corrective/mobility), up from 573. All 300 previous strength expansion definitions, 64 corrective definitions and previous aliases remain identical. Names and aliases were checked across both catalogs and within this batch.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Seated Banded Ankle Plantarflexion | Adds seated foot-against-band resistance without lifting bodyweight, distinct from calf raises and calf stretching. | Resistance Band | Calves / — |
| Seated Banded Ankle Dorsiflexion | Adds seated toe-pulling against an anchored band, distinct from toe raises under bodyweight and knee-to-wall ankle mobility. | Resistance Band | Tibialis anterior / — |
| Stability Ball Pike | Adds straight-legged hip elevation with feet supported on a rolling ball, distinct from bent-knee suspension tucks, rollouts and elbow-bending pike push-ups. | Fitness Ball | Abdominals, Hip flexors / Front delts, Serratus anterior, Triceps, Quadriceps |
| Side Plank Hip Dip | Adds repeated lowering and lifting of the pelvis from a side support, distinct from holding a side plank or hiking a hip on a step. | Bodyweight | Abdominals, Hip abductors / Glutes, Serratus anterior, Rotator cuff |
| Lateral Box Jump | Adds sideways takeoff and landing onto an elevated box, distinct from forward box jumps, single-leg lateral bounds and step-overs. | Box | Quadriceps, Glutes, Calves / Hamstrings, Hip abductors, Adductors, Abdominals |
| Tuck Jump | Adds knee-to-chest flight mechanics to a two-foot vertical jump, distinct from an untucked countermovement jump and a static-start squat jump. | Bodyweight | Quadriceps, Glutes, Calves / Hip flexors, Hamstrings, Abdominals |
| Static Seated Butterfly Stretch | Adds bilateral bent-knee seated groin mobility, distinct from standing adductor stretches and supine piriformis rotation. | Mat | Mobility only: Seated bilateral groin mobility; no working-muscle mapping |
| Dynamic Frog Stretch | Adds bilateral wide-knee rockbacks, distinct from the one-leg-straight quadruped adductor rockback and the seated butterfly hold. | Mat | Mobility only: Bilateral kneeling groin mobility; no working-muscle mapping |
| Seated Neck Rotation | Adds active cervical turning, distinct from chin retraction, neck flexion isometrics and side-bending stretches. | Chair | Mobility only: Active cervical rotation mobility; no working-muscle mapping |
| Seated Ankle Circles | Adds unresisted ankle circumduction, distinct from single-plane band resistance and weight-bearing dorsiflexion rocks. | Chair | Mobility only: Unresisted ankle circumduction mobility; no working-muscle mapping |

### Setup and recording

- Ankle band work is externally resisted plantarflexion or dorsiflexion while seated, not bodyweight calf/toe raises or a banded joint mobilization. Use reps and optional effort without inventing a kilogram value for band color or tension. Record working side, anchor, knee position and band setup consistently.
- Stability Ball Pike uses straight-legged hip elevation with the feet on the ball. It is not a knee tuck, rollout or pike push-up. Side Plank Hip Dip records lowering-and-returning repetitions, not seconds spent holding a stationary side plank. Record support and working side in notes; no automatic bilateral doubling is introduced.
- Lateral Box Jump uses two-foot sideways takeoff and an elevated landing. Tuck Jump includes a knee tuck in flight. A repetition is one completed jump; box height is not external load, and neither task estimates jump height, impact, velocity or power. Category Ballistic is the existing dynamic-drill grouping only.
- Butterfly is the seated bilateral bent-knee stretch; frog is a dynamic bilateral wide-knee rockback. These remain separate from standing adductor stretching and one-leg-straight adductor rockbacks. Neck rotation is active turning, not a neck circle, isometric or clinical test. Ankle circles are unresisted mobility; note direction and side rather than splitting entries.
- The four general mobility entries use Stretch mode and existing reps with zero external load or duration fields. They have no working-muscle mappings and introduce zero automatic posture matches. Supported strength muscle roles are categorical defaults, not activation percentages or equal training doses.
- Primary references establish task identity only. No detailed source instructions, images, treatment schedules, forced ranges or outcome guarantees were imported. No client plans, database schema, dependencies or builder UI changed.

### Held back

- **Ankle eversion, toe curls and other intrinsic-foot strength mappings:** The reporting taxonomy lacks specific fibularis/peroneal and intrinsic-foot groups. Do not assign them to unrelated supported muscles merely to add rows.
- **More band brands, box angles, kneeling side-plank and circle-position variants:** Use one explicit task per gap and record equipment, side and setup in notes. No variation permutations are added for catalog size.
- **Band tension in kilograms, jump height, landing-force or equal-dose comparisons:** These are not measured by the current exercise recorder. Keep unmeasured load blank and retain existing repetition or duration fields.
- **Mobility diagnoses, forced end ranges and source rehabilitation schedules:** References establish task identity only. Do not import treatment protocols or add automatic posture prescriptions.

### References

- [AAOS: Foot and Ankle Conditioning, elastic-band dorsiflexion and plantar flexion](https://www.orthoinfo.org/recovery/foot-and-ankle-conditioning-program/)
- [Fanshawe Fitness and Health Promotion: Stability Ball Pike](https://fitnessandhealthpromotion.ca/exercise-database/entry/2352/)
- [[P]rehab: Side Plank, Hip Dip](https://library.theprehabguys.com/vimeo-video/sideplank-hip-dip/)
- [Physitrack: Lateral Box Jump](https://ca.physitrack.com/home-exercise-video/lateral-box-jump)
- [NASM: Tuck Jump](https://www.nasm.org/resource-center/exercise-library/tuck-jump)
- [ACE: Seated Butterfly Stretch](https://www.acefitness.org/resources/everyone/exercise-library/216/seated-butterfly-stretch/)
- [[P]rehab: Frog Stretch, Dynamic](https://theprehabguys.com/vimeo-video/frog-stretch-dynamic/)
- [NHS: Flexibility Exercises, seated neck rotation](https://www.nhs.uk/live-well/exercise/flexibility-exercises/)
- [Royal Berkshire NHS: Ankle Range of Movement, ankle circles](https://www.royalberkshire.nhs.uk/media/iz3hdgmm/ankle-range-of-movement-exercises_dec25.pdf)

### Verification and release status

**248 application tests passed** with test concurrency 2; lint, production build and whitespace checks passed. All 300 previous expansion definitions, 64 corrective definitions and prior aliases are unchanged. New mobility entries introduce zero automatic posture matches. Local project-source additions only; not committed, pushed or deployed. No live account records were written. Previous batches 17–34 remain in the working tree.

## Project quality batch 36 — 2026-10-24

Added **10 project defaults**: 8 strength/conditioning tasks and 2 mobility choices. Catalog: **593 unique names** (523 strength/power/conditioning + 70 corrective/mobility), up from 583. All 306 previous strength expansion definitions, 68 corrective definitions and previous aliases remain identical. Names and aliases were checked across both catalogs and within this batch.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Archer Push-Up (Floor) | Adds side-shifting asymmetrical pressing with the assisting arm relatively straight, distinct from a symmetric wide-hand push-up or a ring push-up. | Bodyweight | Chest, Triceps / Front delts, Serratus anterior, Abdominals |
| Seated Sled Rope Pull | Adds stationary seated hand-over-hand reeling of a sled, distinct from climbing a rope or rowing a fixed cable attachment. | Sled and Rope | Lats, Upper back, Biceps, Forearms / Rear delts, Abdominals, Spinal erectors |
| Backward Sled Drag (Straps) | Adds backward stepping while facing and pulling a sled through straps, distinct from pushing directly against sled handles and from a stationary rope pull. | Sled and Straps | Quadriceps / Glutes, Calves, Hamstrings, Abdominals, Forearms |
| Battle Rope Alternating Waves | Adds alternating oscillation of anchored ropes, distinct from rope climbing, sled reeling and ball slams. | Battle Ropes | Front delts, Side delts / Trapezius, Forearms, Abdominals, Spinal erectors |
| Mountain Climber | Adds alternating knee drives from a stationary high plank, distinct from travelling bear crawls and simultaneous suspended knee tucks. | Bodyweight | Hip flexors, Abdominals / Front delts, Serratus anterior, Triceps, Quadriceps |
| Burpee (Chest-to-Floor and Jump) | Adds the established linked floor-to-standing jump task with an explicit chest-to-floor standard, distinct from a squat thrust, isolated push-up or standalone jump. | Bodyweight | Quadriceps, Glutes, Calves, Chest, Triceps / Front delts, Abdominals, Spinal erectors, Hamstrings |
| Jumping Jack | Adds repeated out-and-back leg motion coordinated with overhead arm motion, distinct from tuck jumps and straight ankle hops. | Bodyweight | Calves, Hip abductors, Adductors, Side delts / Quadriceps, Glutes, Abdominals, Trapezius |
| Dumbbell Hang Power Clean (Two-Arm) | Adds a bilateral independent-implement clean from the hang to the shoulder rack for dumbbell-based programming, distinct from the barbell hang clean, one-arm kettlebell clean and floor dumbbell snatch. | Dumbbell | Quadriceps, Glutes, Trapezius / Hamstrings, Calves, Spinal erectors, Upper back, Forearms, Abdominals |
| Supine Heel Slide (Knee Mobility) | Adds unloaded supported knee bending and straightening with the heel sliding on the floor, distinct from a loaded slider hamstring curl or bridge-and-curl. | Mat | Mobility only: Unloaded knee flexion and extension mobility; no working-muscle mapping |
| Quadruped Thread the Needle | Adds a supported reach-under thoracic rotation, distinct from the side-lying open book and a resisted rotational row. | Mat | Mobility only: Supported reach-under thoracic rotation mobility; no working-muscle mapping |

### Setup and recording

- Archer Push-Up (Floor) shifts loading between a bending arm and a relatively straight assisting arm; it is not merely a different hand width. Record side/count convention in notes, without an automatic bodyweight load or bilateral multiplier.
- Seated Sled Rope Pull uses stationary hand-over-hand pulling. Backward Sled Drag (Straps) uses backward steps while facing the sled. Use existing duration sets with reps left blank; distance and sled/surface setup can be noted but are not distance targets. Sled mass is not pulling force or a cable-stack equivalent. Forward Sled Push remains deferred because of the legacy Sled Marching ambiguity.
- Battle Rope Alternating Waves is a timed anchored-rope task. Rope mass, length and amplitude do not become measured resistance, calories or power. Specify the setup in notes. No new cardio recorder or interval-scoring logic is introduced.
- Mountain Climber is an alternating knee drive with hands stationary. Jumping Jack returns from an out-and-overhead position to feet together and arms down; one out-and-back cycle is a rep. Prefer duration when alternating-side counts are unclear. These are distinct from bear crawling, simultaneous knee tucks and tucked or star-shaped jumps.
- Burpee (Chest-to-Floor and Jump) has an explicit floor contact and jump finish; one complete floor-to-jump cycle is one rep. It does not use Squat Thrust as an alias. Its components are not automatically counted again as separate push-up or jump sets.
- Dumbbell Hang Power Clean (Two-Arm) receives two independent dumbbells at the shoulder rack from a hang start. It is not a floor snatch, overhead clean-and-press or single-arm kettlebell clean. Record the per-dumbbell versus combined-load convention consistently; no automatic doubling or barbell 1RM ratio is supplied.
- Supine Heel Slide (Knee Mobility) is an unloaded supported knee-range task, not a hamstring slider curl performed with the hips lifted. Quadruped Thread the Needle is a supported reach-under rotation, not a resisted row. Both use Stretch mode and existing reps or durations, with no working-muscle mapping and no new automatic posture matches.
- Power/Ballistic is the current dynamic-task grouping, not measured power or a guarantee of equivalent strength stimulus. Muscle roles are categorical defaults; a timed conditioning bout is not inferred to equal a loaded resistance set. Source identities do not import detailed instructions, images, clinical protocols, treatment promises, calorie formulas or workout schedules. No client plans, schema, dependencies or builder UI changed.

### Held back

- **Forward Sled Push:** Previously held back because Sled Marching may already denote this task. The identity remains unresolved; no duplicate row or broad alias was introduced.
- **Star Jump, Squat Thrust and generic Sled Pull aliases:** These can refer to different tasks. Keep the out-and-back jumping jack, chest-to-floor burpee, backward strap drag and seated rope pull explicit.
- **Extra rope waves, burpee combinations and dumbbell clean permutations:** One explicit version fills each selection gap. Do not add every arm pattern, hurdle, single-arm variation or catch position merely for count.
- **Distance targets, calorie burn, sled friction, rope-force and 1RM conversions:** Use existing durations or repetitions with consistent setup notes. Current logging does not measure these outcomes; no external mass or equal training dose is inferred.
- **Clinical mobility schedules and automatic posture recommendations:** The two mobility drills are manually chosen general range work. No diagnosis, clearance, treatment schedule or forced end range is imported.

### References

- [NASM: Archer Push-Up, floor movement description](https://www.nasm.org/resource-center/exercise-library/archer-push-up)
- [Ken Mannie, Coach and Athletic Director: Seated rope sled pull](https://coachad.com/articles/powerline-learning-the-ropes/)
- [EarthFIT Coach Sam: Backward sled drag and strap handles](https://earthfittraining.com/2022/06/10/how-to-backward-sled-drag/)
- [ACE: Battle Rope Ready, alternating arm waves](https://www.acefitness.org/continuing-education/certified/march-2023/8267/battle-rope-ready-a-research-based-workout/)
- [ACE: Mountain Climbers](https://www.acefitness.org/resources/everyone/exercise-library/258/mountain-climbers/)
- [CrossFit: The Burpee, chest-to-floor and jump finish](https://www.crossfit.com/essentials/the-burpee)
- [NASM: Jumping Jacks](https://www.nasm.org/resource-center/exercise-library/jumping-jacks)
- [CrossFit: The Dumbbell Hang Power Clean](https://www.crossfit.com/essentials/the-dumbbell-hang-power-clean)
- [Mike Rutherford, CrossFit Journal: Dumbbell Bear, bilateral hang power clean component](https://library.crossfit.com/free/pdf/58_07_Dumbbell_Bear.pdf)
- [Gateshead Health NHS: Heel slide movement identity](https://www.gatesheadhealth.nhs.uk/resources/soft-tissue-knee-injury/)
- [South Tees Hospitals NHS: Kneeling exercises, Thread the needle](https://www.southtees.nhs.uk/services/back-pain/backtracks/kneeling-exercises/)

### Verification and release status

**250 application tests passed** with test concurrency 2; lint, production build and whitespace checks passed. All 306 previous expansion definitions, 68 corrective definitions and prior aliases are unchanged. New mobility entries introduce zero automatic posture matches. Local project-source additions only; not committed, pushed or deployed. No live account records were written. Previous batches 17–35 remain in the working tree.

## Project quality batch 37 — 2026-10-24

Added the final **7 project defaults**: 5 strength/conditioning tasks and 2 mobility choices. Catalog: **600 unique names** (528 strength/power/conditioning + 72 corrective/mobility), up from 593. All 314 previous strength expansion definitions, 70 corrective definitions and previous aliases remain identical. Names and aliases were checked across both catalogs and within this batch.

| Exercise | Coaching gap | Equipment | Direct / assisting roles, or mobility target |
| --- | --- | --- | --- |
| Jump Rope (Single-Under) | Adds rope-clearance coordination with a defined one-pass jump, distinct from unroped pogo jumps and battle-rope waves. | Jump Rope | Calves / Quadriceps, Glutes, Abdominals, Forearms, Front delts |
| Crab Walk (Floor) | Adds face-up locomotion supported on hands and feet, distinct from face-down bear crawling, stationary glute bridges and banded lateral walks called crab walks. | Bodyweight | Triceps, Glutes / Hamstrings, Rear delts, Abdominals, Forearms |
| High-Knee Run (In Place) | Adds stationary alternating running knee drives, distinct from slow loaded suitcase marches and floor mountain climbers. | Bodyweight | Hip flexors, Calves / Quadriceps, Hamstrings, Glutes, Abdominals, Front delts |
| Flutter Kick (Supine) | Adds alternating small leg lifts while lying face-up, distinct from bilateral lying leg raises and whole-body hollow rocking. | Bodyweight | Hip flexors, Abdominals / Quadriceps |
| Hanging Windshield Wiper | Adds supported hanging trunk rotation with raised legs, distinct from a hanging leg raise and unloaded supine trunk mobility. | Pull-Up Bar | Abdominals, Hip flexors / Lats, Forearms, Rotator cuff, Upper back, Quadriceps |
| Wall Angel (Back-to-Wall) | Adds back-to-wall shoulder elevation through an abduction/rotation path, distinct from serratus-focused wall slides and dowel-assisted supine flexion. | Wall | Mobility only: Back-to-wall overhead shoulder mobility; no working-muscle mapping |
| Side-Lying Sleeper Stretch | Adds supported passive shoulder internal-rotation mobility, distinct from resisted internal rotation and the existing side-lying external-rotation strength exercise. | Mat | Mobility only: Side-lying shoulder internal rotation mobility; no working-muscle mapping |

### Setup and recording

- Jump Rope (Single-Under) is one rope pass per jump; it does not alias double-unders or infer success counts from duration. High-Knee Run (In Place) stays stationary and uses existing timed work, without distance, pace or calorie estimates.
- Crab Walk (Floor) is face-up hand-and-foot locomotion. The older Crab Walk with Band alias still resolves to Banded Lateral Walk; the new floor-specific aliases do not redirect that task. Specify travel direction and use duration rather than inventing distance targets or bodyweight-equivalent loads.
- Flutter Kick (Supine) alternates the legs while the trunk is supported. Prefer duration unless the coach states a consistent per-leg or paired-count convention. It is neither a static hold nor bilateral leg raising. Hanging Windshield Wiper is an advanced hanging rotational task, not a supine mobility drill. Record side/return-count and support conventions consistently; no automatic paired-side multiplier or range score is added.
- Wall Angel (Back-to-Wall) is general shoulder range work against a rear wall, distinct from the existing serratus activation slide. Side-Lying Sleeper Stretch is passive internal-rotation mobility, not a resisted cuff exercise. Both use Stretch mode, have no working-muscle mapping and introduce zero automatic posture matches. No forced contact/range or treatment protocol is supplied.
- Muscle roles are categorical coaching defaults, not measured activation, equal training doses or strength clearance. Power/Ballistic is the existing dynamic-task grouping. References establish task identity only; no detailed source instructions, images, clinical schedules or outcome guarantees were imported. No client plans, schema, dependencies or builder UI changed.

### Held back

- **Double-unders, weighted-rope, crab-direction and high-knee cadence permutations:** One explicit basic task fills each selection gap. Record direction, cadence and setup without adding variants for the numeric target.
- **Generic Crab Walk, Windshield Wiper and Wall Slide aliases:** Those terms can overlap existing band walks, floor mobility or activation exercises. Keep qualified aliases and preserve the old banded-crab-walk search.
- **Automatic skip totals, paired-side counts, pace, calorie burn and effective bodyweight:** Use existing durations or explicit coach rep conventions. None of these measurements or conversions is inferred by the app.
- **Shoulder diagnoses, forced end ranges and clinical source schedules:** The two mobility entries are manually chosen general range work. No diagnostic rule, treatment schedule or required end range is imported.

### References

- [ACE: Jumping Rope, basic rope-jump task](https://contentcdn.eacefitness.com/assets/education-resources/lifestyle/fitfacts/pdfs/fitfacts/itemid_2688.pdf)
- [ACE: Crab walks, face-up hand-and-foot support](https://www.acefitness.org/resources/everyone/blog/5055/youth-fitness-resistance-training/)
- [Special Olympics: High Knees, in-place running](https://resources.specialolympics.org/health/fitness/fitness-for-sports-coaches/high-knees)
- [U.S. Marshals Service: FIT Readiness Program, supine flutter kicks on PDF page 82](https://www.usmarshals.gov/sites/default/files/media/document/FIT-readiness-program.pdf)
- [Catalyst Athletics: Hanging Windshield Wiper](https://www.catalystathletics.com/exercise/44/Windshield-Wiper/)
- [[P]rehab: Wall Angel](https://theprehabguys.com/vimeo-video/wall-angel/)
- [AAOS: Shoulder conditioning, Sleeper Stretch movement identity](https://www.orthoinfo.org/recovery/rotator-cuff-and-shoulder-conditioning-program)

### Verification and source release

**252 application tests passed** with test concurrency 2; lint, production build and whitespace checks passed. All 314 previous expansion definitions, 70 corrective definitions and prior aliases are unchanged, including every previously committed expansion and corrective definition. New mobility entries introduce zero automatic posture matches. This source release includes accumulated project batches 17–37; earlier batch notes describe their verification-time local status. Deployment must be checked separately. No live account records were written directly.
