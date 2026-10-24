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
