// Curated gaps in the original STM catalog, not another import of its variants.
// Each named variation has explicit roles; no guessed relative 1RM percentages.
// A row can explicitly override assisting roles when its task differs from the family.
const family = (pattern, muscle, direct, indirect, rows) => rows.map(([name, equip, difficulty = 'Intermediate', assisting = indirect]) => ({
  name, equip, difficulty, pattern, muscle, category: pattern === 'Power' ? 'Ballistic' : 'Grinding',
  muscleTargets: { direct: [...direct], indirect: assisting.filter(value => !direct.includes(value)), source: 'catalog' },
  source: 'expanded-library',
}))

const FIRST_EXPANSION = [
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Adductors', 'Spinal erectors'], [
    ['Bodyweight Squat', 'Bodyweight', 'Beginner'], ['Sit-to-Stand', 'Bench', 'Beginner'],
    ['Supported Squat', 'Suspension Trainer', 'Beginner'], ['Hack Squat', 'Machine'],
    ['Smith Machine Squat', 'Smith Machine'], ['Pendulum Squat', 'Machine'],
    ['Heels-Elevated Goblet Squat', 'Dumbbell'], ['Landmine Squat', 'Landmine', 'Beginner'],
    ['Safety Bar Squat', 'Safety Bar'], ['Spanish Squat', 'Bands'], ['Wall Sit', 'Bodyweight', 'Beginner'],
    ['Bodyweight Step-Up', 'Box', 'Beginner'], ['Bodyweight Split Squat', 'Bodyweight', 'Beginner'],
    ['Bodyweight Reverse Lunge', 'Bodyweight', 'Beginner'], ['Bodyweight Forward Lunge', 'Bodyweight', 'Beginner'],
    ['Smith Machine Split Squat', 'Smith Machine'], ['Front-Foot-Elevated Split Squat', 'Dumbbell'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes', 'Adductors'], ['Hamstrings'], [
    ['Bodyweight Lateral Lunge', 'Bodyweight', 'Beginner'], ['Cossack Squat', 'Bodyweight'],
  ]),
  ...family('Knee extension', 'Legs', ['Quadriceps'], [], [
    ['Leg Extension', 'Machine', 'Beginner'], ['Single-Leg Leg Extension', 'Machine', 'Beginner'],
    ['Reverse Nordic Curl', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Hinge', 'Hamstrings', ['Hamstrings', 'Glutes'], ['Spinal erectors'], [
    ['Dumbbell Kickstand Romanian Deadlift', 'Dumbbell'], ['Barbell Kickstand Romanian Deadlift', 'Barbell'],
    ['Smith Machine Romanian Deadlift', 'Smith Machine'], ['Kettlebell Romanian Deadlift', 'Kettlebell', 'Beginner'],
    ['Banded Good Morning', 'Bands', 'Beginner'],
  ]),
  ...family('Hinge', 'Legs', ['Quadriceps', 'Glutes', 'Spinal erectors'], ['Hamstrings', 'Upper back'], [
    ['Trap Bar Deadlift', 'Trap Bar'], ['Kettlebell Deadlift', 'Kettlebell', 'Beginner'],
    ['Dumbbell Deadlift', 'Dumbbell', 'Beginner'], ['Block Deadlift', 'Barbell'], ['Deficit Deadlift', 'Barbell', 'Advanced'],
  ]),
  ...family('Hip extension', 'Glutes', ['Glutes'], ['Hamstrings', 'Abdominals'], [
    ['Barbell Hip Thrust', 'Barbell'], ['Smith Machine Hip Thrust', 'Smith Machine'],
    ['Machine Hip Thrust', 'Machine', 'Beginner'], ['Dumbbell Hip Thrust', 'Dumbbell', 'Beginner'],
    ['Cable Glute Kickback', 'Cable', 'Beginner'], ['Machine Glute Kickback', 'Machine', 'Beginner'],
    ['Banded Glute Bridge', 'Bands', 'Beginner'], ['Frog Pump', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Knee flexion', 'Hamstrings', ['Hamstrings'], ['Calves'], [
    ['Seated Leg Curl', 'Machine', 'Beginner'], ['Lying Leg Curl', 'Machine', 'Beginner'],
    ['Standing Leg Curl', 'Machine', 'Beginner'], ['Single-Leg Seated Leg Curl', 'Machine', 'Beginner'],
    ['Single-Leg Lying Leg Curl', 'Machine', 'Beginner'],
    ['Suspension Hamstring Curl', 'Suspension Trainer'], ['Banded Leg Curl', 'Bands', 'Beginner'],
    ['Assisted Nordic Curl', 'Bands'],
  ]),
  ...family('Hip abduction', 'Glutes', ['Hip abductors'], ['Glutes'], [
    ['Seated Hip Abduction', 'Machine', 'Beginner'], ['Standing Cable Hip Abduction', 'Cable', 'Beginner'],
    ['Banded Lateral Walk', 'Bands', 'Beginner'], ['Banded Monster Walk', 'Bands', 'Beginner'],
    ['Clamshell', 'Bodyweight', 'Beginner'], ['Banded Clamshell', 'Bands', 'Beginner'],
  ]),
  ...family('Hip adduction', 'Legs', ['Adductors'], [], [
    ['Seated Hip Adduction', 'Machine', 'Beginner'], ['Standing Cable Hip Adduction', 'Cable', 'Beginner'],
  ]),
  ...family('Ankle', 'Legs', ['Calves'], [], [
    ['Standing Calf Raise', 'Machine', 'Beginner'], ['Seated Calf Raise', 'Machine', 'Beginner'],
    ['Single-Leg Calf Raise', 'Bodyweight', 'Beginner'], ['Dumbbell Standing Calf Raise', 'Dumbbell', 'Beginner'],
    ['Dumbbell Seated Calf Raise', 'Dumbbell', 'Beginner'], ['Leg Press Calf Raise', 'Machine', 'Beginner'],
    ['Smith Machine Calf Raise', 'Smith Machine', 'Beginner'], ['Donkey Calf Raise', 'Machine'],
    ['Bent-Knee Single-Leg Calf Raise', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Ankle', 'Legs', ['Tibialis anterior'], [], [
    ['Wall Tibialis Raise', 'Bodyweight', 'Beginner'], ['Tibialis Raise', 'Tib Bar', 'Beginner'],
  ]),
  ...family('Push', 'Chest', ['Chest'], ['Front delts', 'Triceps'], [
    ['Machine Chest Press', 'Machine', 'Beginner'], ['Incline Machine Chest Press', 'Machine', 'Beginner'],
    ['Smith Machine Bench Press', 'Smith Machine'], ['Smith Machine Incline Bench Press', 'Smith Machine'],
    ['Dumbbell Decline Bench Press', 'Dumbbell'], ['Cable Chest Press', 'Cable'],
    ['Banded Chest Press', 'Bands', 'Beginner'], ['Incline Push-Up', 'Bench', 'Beginner'],
    ['Wall Push-Up', 'Bodyweight', 'Beginner'], ['Kneeling Push-Up', 'Bodyweight', 'Beginner'],
    ['Decline Push-Up', 'Bench'], ['Banded Push-Up', 'Bands'],
  ]),
  ...family('Chest isolation', 'Chest', ['Chest'], ['Front delts'], [
    ['Pec Deck Fly', 'Machine', 'Beginner'], ['Cable Chest Fly', 'Cable'], ['Low-to-High Cable Fly', 'Cable'],
    ['High-to-Low Cable Fly', 'Cable'], ['Dumbbell Chest Fly', 'Dumbbell'], ['Incline Dumbbell Fly', 'Dumbbell'],
  ]),
  ...family('Push', 'Arms', ['Triceps', 'Chest'], ['Front delts'], [
    ['Close-Grip Bench Press', 'Barbell'], ['Assisted Dip', 'Machine', 'Beginner'],
  ]),
  ...family('Overhead press', 'Shoulders', ['Front delts', 'Side delts', 'Triceps'], ['Trapezius'], [
    ['Seated Dumbbell Shoulder Press', 'Dumbbell'], ['Standing Dumbbell Shoulder Press', 'Dumbbell'],
    ['Machine Shoulder Press', 'Machine', 'Beginner'], ['Smith Machine Shoulder Press', 'Smith Machine'],
    ['Arnold Press', 'Dumbbell'], ['Pike Push-Up', 'Bodyweight'], ['Handstand Push-Up', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Side delts'], ['Trapezius'], [
    ['Dumbbell Lateral Raise', 'Dumbbell', 'Beginner'], ['Seated Dumbbell Lateral Raise', 'Dumbbell', 'Beginner'],
    ['Cable Lateral Raise', 'Cable'], ['Machine Lateral Raise', 'Machine', 'Beginner'], ['Banded Lateral Raise', 'Bands', 'Beginner'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Front delts'], ['Serratus anterior'], [
    ['Dumbbell Front Raise', 'Dumbbell', 'Beginner'], ['Cable Front Raise', 'Cable', 'Beginner'], ['Plate Front Raise', 'Plates', 'Beginner'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Rear delts', 'Upper back'], ['Rotator cuff'], [
    ['Dumbbell Rear Delt Fly', 'Dumbbell'], ['Reverse Pec Deck', 'Machine', 'Beginner'],
    ['Cable Rear Delt Fly', 'Cable'], ['Face Pull', 'Cable'], ['Band Pull-Apart', 'Bands', 'Beginner'],
  ]),
  ...family('Shoulder rotation', 'Shoulders', ['Rotator cuff'], [], [
    ['Cable External Rotation', 'Cable', 'Beginner'], ['Banded External Rotation', 'Bands', 'Beginner'],
    ['Cable Internal Rotation', 'Cable', 'Beginner'], ['Banded Internal Rotation', 'Bands', 'Beginner'],
  ]),
  ...family('Pull', 'Back', ['Lats', 'Upper back'], ['Biceps', 'Rear delts', 'Forearms'], [
    ['Seated Machine Row', 'Machine', 'Beginner'], ['T-Bar Row', 'Landmine'], ['Single-Arm Cable Row', 'Cable'],
    ['Inverted Row', 'Barbell', 'Beginner'], ['Suspension Row', 'Suspension Trainer', 'Beginner'],
    ['Banded Seated Row', 'Bands', 'Beginner'], ['Renegade Row', 'Dumbbell', 'Advanced'],
  ]),
  ...family('Pull', 'Back', ['Lats'], ['Biceps', 'Upper back', 'Forearms'], [
    ['Assisted Pull-Up', 'Machine', 'Beginner'], ['Band-Assisted Pull-Up', 'Bands', 'Beginner'],
    ['Single-Arm Lat Pulldown', 'Cable'], ['Kneeling Banded Lat Pulldown', 'Bands', 'Beginner'],
  ]),
  ...family('Pull', 'Back', ['Lats'], ['Chest', 'Triceps'], [
    ['Straight-Arm Cable Pulldown', 'Cable'], ['Machine Pullover', 'Machine', 'Beginner'], ['Dumbbell Pullover', 'Dumbbell'],
  ]),
  ...family('Scapular elevation', 'Back', ['Trapezius'], ['Forearms'], [
    ['Dumbbell Shrug', 'Dumbbell', 'Beginner'], ['Barbell Shrug', 'Barbell'], ['Machine Shrug', 'Machine', 'Beginner'],
  ]),
  ...family('Elbow flexion', 'Arms', ['Biceps'], ['Forearms'], [
    ['EZ-Bar Curl', 'EZ Bar', 'Beginner'], ['Hammer Curl', 'Dumbbell', 'Beginner'],
    ['Incline Dumbbell Curl', 'Dumbbell'], ['Concentration Curl', 'Dumbbell', 'Beginner'],
    ['Cable Biceps Curl', 'Cable', 'Beginner'], ['Preacher Curl', 'EZ Bar'], ['Machine Preacher Curl', 'Machine', 'Beginner'],
    ['Spider Curl', 'Dumbbell'], ['Bayesian Cable Curl', 'Cable'], ['Banded Biceps Curl', 'Bands', 'Beginner'],
  ]),
  ...family('Elbow flexion', 'Arms', ['Forearms'], ['Biceps'], [
    ['EZ-Bar Reverse Curl', 'EZ Bar'], ['Dumbbell Reverse Curl', 'Dumbbell'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], [], [
    ['Rope Triceps Pushdown', 'Cable', 'Beginner'], ['Straight-Bar Triceps Pushdown', 'Cable', 'Beginner'],
    ['Single-Arm Cable Triceps Pushdown', 'Cable', 'Beginner'], ['Overhead Cable Triceps Extension', 'Cable'],
    ['Dumbbell Overhead Triceps Extension', 'Dumbbell'], ['EZ-Bar Skull Crusher', 'EZ Bar'],
    ['Dumbbell Lying Triceps Extension', 'Dumbbell'], ['Dumbbell Triceps Kickback', 'Dumbbell', 'Beginner'],
    ['Machine Triceps Extension', 'Machine', 'Beginner'], ['Banded Triceps Pushdown', 'Bands', 'Beginner'],
  ]),
  ...family('Grip', 'Arms', ['Forearms'], [], [
    ['Dumbbell Wrist Curl', 'Dumbbell', 'Beginner'], ['Dumbbell Reverse Wrist Curl', 'Dumbbell', 'Beginner'],
    ['Plate Pinch Hold', 'Plates'], ['Dead Hang', 'Pull-Up Bar', 'Beginner'], ['Hand Gripper', 'Hand Gripper', 'Beginner'],
  ]),
  ...family('Core', 'Core', ['Abdominals'], ['Spinal erectors'], [
    ['Plank', 'Bodyweight', 'Beginner'], ['Side Plank', 'Bodyweight', 'Beginner'], ['Kneeling Side Plank', 'Bodyweight', 'Beginner'],
    ['Pallof Press', 'Cable', 'Beginner'], ['Banded Pallof Press', 'Bands', 'Beginner'],
    ['Half-Kneeling Pallof Press', 'Cable'], ['Cable Wood Chop', 'Cable'], ['Cable Lift', 'Cable'],
    ['Ab Wheel Rollout', 'Ab Wheel', 'Advanced'], ['Stability Ball Rollout', 'Fitness Ball'],
    ['Stir the Pot', 'Fitness Ball'], ['Plank Shoulder Tap', 'Bodyweight'], ['Hollow Body Hold', 'Bodyweight'],
    ['Cable Crunch', 'Cable', 'Intermediate', []], ['Machine Abdominal Crunch', 'Machine', 'Beginner', []],
    ['Abdominal Crunch', 'Bodyweight', 'Beginner', []], ['Reverse Crunch', 'Bodyweight', 'Beginner', []],
    ['Bicycle Crunch', 'Bodyweight', 'Intermediate', []], ['Russian Twist', 'Bodyweight'],
  ]),
  ...family('Core', 'Core', ['Abdominals', 'Spinal erectors'], ['Glutes'], [
    ['Bird Dog', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Core', 'Core', ['Hip flexors', 'Abdominals'], [], [
    ['Hanging Knee Raise', 'Pull-Up Bar'], ['Hanging Leg Raise', 'Pull-Up Bar', 'Advanced'],
    ['Captain Chair Knee Raise', 'Machine'], ['Lying Leg Raise', 'Bodyweight'],
  ]),
  ...family('Core', 'Core', ['Adductors', 'Abdominals'], ['Hip abductors'], [
    ['Copenhagen Plank (Short Lever)', 'Bench'], ['Copenhagen Plank (Long Lever)', 'Bench', 'Advanced'],
  ]),
  ...family('Carry', 'Full Body', ['Forearms', 'Abdominals'], ['Trapezius', 'Spinal erectors', 'Glutes'], [
    ['Farmer Carry', 'Dumbbell'], ['Suitcase Carry', 'Dumbbell'], ['Trap Bar Carry', 'Trap Bar'],
    ['Front Rack Carry', 'Kettlebell'], ['Overhead Carry', 'Kettlebell', 'Advanced'],
    ['Sandbag Bear Hug Carry', 'Sandbag'],
  ]),
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hamstrings', 'Abdominals'], [
    ['Box Jump', 'Box'], ['Countermovement Jump', 'Bodyweight'], ['Broad Jump', 'Bodyweight'],
    ['Lateral Bound', 'Bodyweight'], ['Split Squat Jump', 'Bodyweight', 'Advanced'],
    ['Pogo Jump', 'Bodyweight'], ['Dumbbell Jump Squat', 'Dumbbell', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Hamstrings', 'Glutes'], ['Spinal erectors', 'Abdominals', 'Forearms'], [
    ['Kettlebell Swing', 'Kettlebell'], ['Single-Arm Kettlebell Swing', 'Kettlebell'],
  ]),
  ...family('Power', 'Full Body', ['Chest', 'Triceps', 'Front delts'], ['Abdominals', 'Glutes'], [
    ['Medicine Ball Chest Pass', 'Medicine Ball'], ['Plyometric Push-Up', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Abdominals', 'Lats', 'Triceps'], ['Glutes', 'Quadriceps'], [
    ['Medicine Ball Slam', 'Medicine Ball'],
  ]),
  ...family('Power', 'Full Body', ['Abdominals', 'Glutes'], ['Chest', 'Front delts', 'Quadriceps'], [
    ['Medicine Ball Rotational Throw', 'Medicine Ball'], ['Medicine Ball Scoop Toss', 'Medicine Ball'],
  ]),
]

// Second gap audit: distinct support, direction and movement options rather
// than another name for an exercise already present. Equipment is the primary
// resistance; step-downs/step-ups still require a stable step or platform.
export const EXERCISE_LIBRARY_ADDITIONS_2026_10_24 = [
  ...family('Hinge', 'Hamstrings', ['Hamstrings', 'Glutes'], ['Spinal erectors'], [
    ['Supported Single-Leg Dumbbell Romanian Deadlift', 'Dumbbell'],
  ]),
  ...family('Hip extension', 'Glutes', ['Glutes'], ['Hamstrings', 'Abdominals'], [
    ['Dumbbell Single-Leg Hip Thrust', 'Dumbbell'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Hip abductors', 'Adductors'], [
    ['Lateral Step-Down', 'Bodyweight', 'Beginner'], ['Forward Step-Down', 'Bodyweight', 'Beginner'],
    ['Dumbbell Lateral Step-Up', 'Dumbbell'],
  ]),
  ...family('Hip flexion', 'Legs', ['Hip flexors'], ['Abdominals'], [
    ['Standing Cable Hip Flexion', 'Cable', 'Beginner'],
  ]),
  ...family('Hip stability', 'Glutes', ['Hip abductors', 'Glutes'], ['Hamstrings', 'Abdominals'], [
    ['Hip Airplane', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Scapular protraction', 'Shoulders', ['Serratus anterior'], ['Abdominals'], [
    ['Scapular Push-Up', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Push', 'Chest', ['Chest'], ['Triceps', 'Front delts', 'Abdominals'], [
    ['Weighted Push-Up', 'Bodyweight', 'Advanced'], ['Single-Arm Dumbbell Floor Press', 'Dumbbell'],
    ['Dumbbell Squeeze Press', 'Dumbbell'], ['Half-Kneeling Single-Arm Cable Chest Press', 'Cable'],
  ]),
  ...family('Pull', 'Back', ['Lats', 'Upper back'], ['Biceps', 'Rear delts', 'Forearms', 'Abdominals'], [
    ['Standing Cable Row', 'Cable'],
  ]),
  ...family('Scapular depression', 'Back', ['Trapezius', 'Lats'], ['Forearms'], [
    ['Scapular Pull-Up', 'Bodyweight'],
  ]),
  ...family('Elbow flexion', 'Arms', ['Biceps'], ['Forearms'], [
    ['Dumbbell Preacher Curl', 'Dumbbell'],
  ]),
  ...family('Elbow flexion', 'Arms', ['Biceps', 'Forearms'], [], [
    ['Cable Hammer Curl', 'Cable', 'Beginner'], ['Zottman Curl', 'Dumbbell'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], [], [
    ['Cross-Body Cable Triceps Extension', 'Cable'],
  ]),
  ...family('Forearm rotation', 'Arms', ['Forearms'], [], [
    ['Dumbbell Forearm Pronation', 'Dumbbell', 'Beginner'],
    ['Dumbbell Forearm Supination', 'Dumbbell', 'Beginner'],
  ]),
  ...family('Core', 'Core', ['Abdominals'], ['Serratus anterior', 'Front delts', 'Hip flexors'], [
    ['Bear Plank', 'Bodyweight', 'Beginner'], ['Bear Crawl', 'Bodyweight'],
    ['Plank Walk-Up', 'Bodyweight'],
  ]),
  ...family('Carry', 'Full Body', ['Abdominals', 'Forearms'], ['Hip flexors', 'Glutes', 'Spinal erectors'], [
    ['Suitcase March', 'Dumbbell'],
  ]),
  ...family('Core', 'Full Body', ['Abdominals', 'Glutes', 'Front delts'], ['Triceps', 'Rotator cuff', 'Hip abductors'], [
    ['Kettlebell Turkish Get-Up', 'Kettlebell', 'Advanced'],
  ]),
  ...family('Core', 'Full Body', ['Abdominals', 'Glutes'], ['Hamstrings', 'Rotator cuff', 'Front delts'], [
    ['Kettlebell Windmill', 'Kettlebell', 'Advanced'],
  ]),
  ...family('Power', 'Legs', ['Calves'], ['Quadriceps', 'Glutes'], [
    ['Single-Leg Pogo Jump', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hamstrings', 'Hip abductors'], [
    ['Single-Leg Hop and Stick', 'Bodyweight', 'Advanced'],
  ]),
]

// Small follow-up batch: each option changes assistance, support, resistance
// direction or movement plane. Reasons and setup requirements are in the audit.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_3 = [
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Hip abductors', 'Adductors', 'Abdominals'], [
    ['Hand-Assisted Pistol Squat', 'Bodyweight'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Hamstrings', 'Hip abductors', 'Adductors', 'Forearms'], [
    ['Dumbbell Deficit Reverse Lunge', 'Dumbbell', 'Advanced'],
  ]),
  ...family('Hinge', 'Back', ['Spinal erectors'], ['Glutes', 'Hamstrings', 'Abdominals'], [
    ['Seated Barbell Good Morning', 'Barbell', 'Advanced'],
  ]),
  ...family('Hinge', 'Hamstrings', ['Hamstrings', 'Glutes'], ['Spinal erectors', 'Abdominals', 'Forearms'], [
    ['Single-Leg Cable Romanian Deadlift', 'Cable', 'Advanced'],
  ]),
  ...family('Push', 'Shoulders', ['Front delts', 'Triceps'], ['Chest', 'Serratus anterior', 'Abdominals'], [
    ['Standing Split-Stance Single-Arm Landmine Press', 'Barbell'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Front delts', 'Side delts', 'Rotator cuff'], ['Trapezius', 'Serratus anterior'], [
    ['Dumbbell Scaption Raise (Thumbs Up)', 'Dumbbell', 'Beginner'],
  ]),
  ...family('Scapular protraction', 'Shoulders', ['Serratus anterior'], ['Chest', 'Abdominals'], [
    ['Cable Serratus Punch', 'Cable', 'Beginner'],
  ]),
  ...family('Scapular control', 'Back', ['Trapezius', 'Upper back'], ['Rear delts', 'Rotator cuff', 'Serratus anterior'], [
    ['Chest-Supported Dumbbell Y Raise', 'Dumbbell'],
  ]),
]

// Bodyweight/band gaps: no duplicate tempo or grip-only entries. The audit
// records support requirements and distinguishes assistance from resistance.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_4 = [
  ...family('Knee flexion', 'Hamstrings', ['Hamstrings', 'Glutes'], ['Abdominals', 'Calves'], [
    ['Hamstring Walkout', 'Bodyweight'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], ['Abdominals', 'Front delts'], [
    ['Bodyweight Triceps Extension (Fixed Bar)', 'Bodyweight'],
  ]),
  ...family('Push', 'Chest', ['Chest'], ['Triceps', 'Front delts', 'Abdominals'], [
    ['Band-Assisted Push-Up', 'Bands', 'Beginner'],
  ]),
  ...family('Overhead press', 'Shoulders', ['Front delts', 'Side delts', 'Triceps'], ['Trapezius', 'Serratus anterior', 'Abdominals'], [
    ['Standing Banded Overhead Press', 'Bands', 'Beginner'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Abdominals', 'Hip abductors'], [
    ['Supported Kneeling-to-Standing', 'Bodyweight'],
  ]),
  ...family('Core', 'Full Body', ['Abdominals'], ['Serratus anterior', 'Front delts', 'Hip flexors'], [
    ['Inchworm', 'Bodyweight'],
  ]),
]

// Rotational core, distinct wrist action and practical band substitutions.
// Radial/ulnar deviation is one combined entry, not two quota-filling variants.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_5 = [
  ...family('Core', 'Core', ['Abdominals'], ['Glutes', 'Front delts', 'Forearms', 'Spinal erectors'], [
    ['Landmine Rotation', 'Barbell'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Rear delts', 'Upper back'], ['Rotator cuff', 'Biceps'], [
    ['Banded Face Pull', 'Bands'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], [], [
    ['Banded Overhead Triceps Extension', 'Bands'],
  ]),
  ...family('Wrist deviation', 'Arms', ['Forearms'], [], [
    ['Dumbbell Wrist Radial and Ulnar Deviation', 'Dumbbell', 'Beginner'],
  ]),
]

// Pelvic control and bodyweight compression: one canonical entry per task,
// without multiplying support, tuck or single-leg variations.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_6 = [
  ...family('Hip abduction', 'Glutes', ['Hip abductors'], ['Abdominals'], [
    ['Hip Hike (Step)', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Core', 'Core', ['Abdominals', 'Hip flexors'], ['Triceps', 'Quadriceps', 'Lats'], [
    ['L-Sit Hold (Parallel Bars)', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Core', 'Core', ['Hip flexors', 'Abdominals'], ['Quadriceps'], [
    ['Seated Pike Leg Lift', 'Bodyweight'],
  ]),
]

// Full trunk flexion, lateral flexion and established linked power tasks.
// No equipment/grip/tempo permutations or invented strength-max conversions.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_7 = [
  ...family('Core', 'Core', ['Abdominals', 'Hip flexors'], [], [
    ['Floor Sit-Up', 'Bodyweight'],
  ]),
  ...family('Core', 'Core', ['Abdominals'], ['Spinal erectors'], [
    ['Dumbbell Side Bend', 'Dumbbell'],
  ]),
  ...family('Power', 'Full Body', ['Hamstrings', 'Glutes'], ['Abdominals', 'Forearms', 'Upper back', 'Front delts'], [
    ['Single-Arm Kettlebell Clean', 'Kettlebell', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Front delts', 'Triceps'], ['Abdominals', 'Spinal erectors', 'Trapezius'], [
    ['Barbell Thruster', 'Barbell', 'Advanced'],
  ]),
]

// Project batch 17 adds new defaults; batches 8–16 activated existing entries.
// Keep unilateral overhead snatching and a standalone jerk distinct from cleans
// and presses. Neither borrows a load percentage from another lift.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_17 = [
  ...family('Power', 'Full Body', ['Hamstrings', 'Glutes'], ['Quadriceps', 'Abdominals', 'Forearms', 'Trapezius', 'Front delts', 'Rotator cuff', 'Serratus anterior'], [
    ['Single-Arm Kettlebell Snatch', 'Kettlebell', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes'], ['Calves', 'Abdominals', 'Spinal erectors', 'Front delts', 'Triceps', 'Trapezius', 'Serratus anterior', 'Rotator cuff'], [
    ['Barbell Split Jerk', 'Barbell', 'Advanced'],
  ]),
]

// Practical band substitutions where the catalog only had a machine/cable task.
// Full seated knee extension is distinct from standing terminal knee extension;
// straight-arm shoulder extension is distinct from an elbow-bending pulldown.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_18 = [
  ...family('Knee extension', 'Legs', ['Quadriceps'], [], [
    ['Seated Banded Leg Extension', 'Bands', 'Beginner'],
  ]),
  ...family('Pull', 'Back', ['Lats'], ['Chest', 'Triceps', 'Abdominals'], [
    ['Banded Straight-Arm Pulldown', 'Bands', 'Beginner'],
  ]),
]

// Established accessory tasks with distinct bar paths; generic floor pressing
// already exists and receives aliases rather than another catalog definition.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_19 = [
  ...family('Pull', 'Back', ['Lats', 'Upper back'], ['Biceps', 'Rear delts', 'Forearms', 'Abdominals', 'Spinal erectors'], [
    ['Meadows Row', 'Landmine'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], ['Front delts'], [
    ['Barbell JM Press', 'Barbell', 'Advanced'],
  ]),
]

// Controlled shoulder pull and unsupported floor-seated overhead press.
// Neither is an explosive high pull or a supine floor bench press.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_20 = [
  ...family('Pull', 'Shoulders', ['Side delts'], ['Trapezius', 'Biceps', 'Forearms', 'Abdominals'], [
    ['Barbell Upright Row', 'Barbell'],
  ]),
  ...family('Overhead press', 'Shoulders', ['Front delts', 'Side delts', 'Triceps'], ['Abdominals', 'Spinal erectors', 'Trapezius', 'Serratus anterior'], [
    ['Barbell Z Press', 'Barbell', 'Advanced'],
  ]),
]

// Different jump initiation/landing tasks and a linked squat-to-target throw.
// Repetitions are supported; this does not add jump-height or circuit scoring.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_21 = [
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hamstrings', 'Abdominals'], [
    ['Squat Jump (Static Start)', 'Bodyweight'],
    ['Depth Jump', 'Box', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Front delts', 'Triceps'], ['Abdominals', 'Spinal erectors', 'Calves', 'Trapezius', 'Serratus anterior'], [
    ['Wall-Ball Shot', 'Medicine Ball'],
  ]),
]

// Stationary asymmetric lifting and a bear-hug squat, not more carry variants.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_22 = [
  ...family('Hinge', 'Hamstrings', ['Hamstrings', 'Glutes'], ['Quadriceps', 'Abdominals', 'Spinal erectors', 'Forearms', 'Hip abductors', 'Upper back'], [
    ['Single-Arm Kettlebell Suitcase Deadlift', 'Kettlebell'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Adductors', 'Abdominals', 'Spinal erectors', 'Upper back', 'Front delts', 'Forearms'], [
    ['Sandbag Bear Hug Squat', 'Sandbag'],
  ]),
]

// A timed support and a strict linked pull/transition/dip task. Neither aliases
// kipping skills, assisted transitions or the existing standalone ring dips.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_23 = [
  ...family('Support', 'Chest', ['Chest', 'Triceps'], ['Front delts', 'Lats', 'Rotator cuff', 'Serratus anterior', 'Abdominals'], [
    ['Ring Support Hold (Top)', 'Gymnastic Rings'],
  ]),
  ...family('Pull/Push', 'Full Body', ['Lats', 'Chest', 'Triceps'], ['Biceps', 'Upper back', 'Front delts', 'Forearms', 'Abdominals', 'Rotator cuff', 'Serratus anterior'], [
    ['Strict Ring Muscle-Up', 'Gymnastic Rings', 'Advanced'],
  ]),
]

// Band alternatives for seated outward hip work and anchored inward hip work.
// Neither represents lateral walking or a side-lying clamshell task.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_24 = [
  ...family('Hip abduction', 'Glutes', ['Hip abductors'], ['Glutes'], [
    ['Seated Banded Hip Abduction', 'Bands', 'Beginner'],
  ]),
  ...family('Hip adduction', 'Legs', ['Adductors'], ['Hip abductors', 'Abdominals'], [
    ['Standing Banded Hip Adduction', 'Bands', 'Beginner'],
  ]),
]

// Linked floor trunk/leg flexion and an isometric inward hip squeeze.
// The squeeze uses duration/effort, not the ball's mass as a resistance value.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_25 = [
  ...family('Core', 'Core', ['Abdominals', 'Hip flexors'], ['Quadriceps'], [
    ['V-Up', 'Bodyweight'],
  ]),
  ...family('Hip adduction', 'Legs', ['Adductors'], [], [
    ['Supine Adductor Squeeze (Ball)', 'Soft Ball', 'Beginner'],
  ]),
]

// Floor-start lifts with different implements and finishes. The bag is brought
// onto a shoulder, not thrown over it; the dumbbell entry is not a hang snatch.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_26 = [
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Trapezius'], ['Hamstrings', 'Spinal erectors', 'Abdominals', 'Forearms', 'Front delts', 'Triceps', 'Rotator cuff', 'Serratus anterior'], [
    ['Single-Arm Dumbbell Snatch (From Floor)', 'Dumbbell', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes'], ['Hamstrings', 'Spinal erectors', 'Abdominals', 'Upper back', 'Trapezius', 'Biceps', 'Forearms', 'Front delts'], [
    ['Sandbag Ground-to-Shoulder', 'Sandbag', 'Advanced'],
  ]),
]

// Dynamic plank travel and suspended hip/knee flexion are distinct core tasks.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_27 = [
  ...family('Core', 'Core', ['Abdominals'], ['Serratus anterior', 'Front delts', 'Glutes', 'Quadriceps'], [
    ['Plank Body Saw', 'Bodyweight'],
  ]),
  ...family('Core', 'Core', ['Abdominals', 'Hip flexors'], ['Front delts', 'Serratus anterior', 'Triceps', 'Quadriceps'], [
    ['Suspension Knee Tuck', 'Suspension Trainer'],
  ]),
]

// Arm isolation using body angle and straps, distinct from suspension rows,
// cable stacks and the fixed-bar bodyweight extension.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_28 = [
  ...family('Elbow flexion', 'Arms', ['Biceps'], ['Forearms', 'Abdominals', 'Front delts', 'Upper back'], [
    ['Suspension Biceps Curl', 'Suspension Trainer', 'Advanced'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], ['Abdominals', 'Front delts', 'Serratus anterior'], [
    ['Suspension Overhead Triceps Extension', 'Suspension Trainer', 'Advanced'],
  ]),
]

// Standing supported knee extension and a controlled around-head shoulder
// task, not a reverse Nordic, machine squat or around-the-waist kettlebell pass.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_29 = [
  ...family('Knee extension', 'Legs', ['Quadriceps'], ['Calves', 'Abdominals'], [
    ['Hand-Supported Sissy Squat', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Shoulder control', 'Shoulders', ['Front delts', 'Side delts'], ['Rotator cuff', 'Trapezius', 'Serratus anterior', 'Abdominals', 'Forearms'], [
    ['Kettlebell Halo', 'Kettlebell', 'Advanced'],
  ]),
]

// A drop-and-hold landing task, with no rebound jump. Power/Ballistic is the
// catalog's dynamic-drill grouping, not a measurement of force or power output.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_30 = [
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hamstrings', 'Hip abductors', 'Abdominals'], [
    ['Depth Drop (Stick Landing)', 'Box', 'Advanced'],
  ]),
]

// Distinct tasks: re-dip overhead receiving, dynamic hollow rocking, prone
// extension hold, strap-based chest isolation, crossing a box and a body lever.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_31 = [
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Front delts', 'Triceps'], ['Calves', 'Trapezius', 'Serratus anterior', 'Abdominals', 'Spinal erectors'], [
    ['Barbell Push Jerk', 'Barbell', 'Advanced'],
  ]),
  ...family('Core', 'Core', ['Abdominals'], ['Hip flexors', 'Quadriceps', 'Serratus anterior'], [
    ['Hollow Body Rock', 'Bodyweight'],
  ]),
  ...family('Trunk extension', 'Back', ['Spinal erectors', 'Glutes'], ['Hamstrings', 'Trapezius', 'Rear delts'], [
    ['Superman Hold (Floor)', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Chest isolation', 'Chest', ['Chest'], ['Front delts', 'Biceps', 'Triceps', 'Abdominals', 'Serratus anterior'], [
    ['Suspension Chest Fly', 'Suspension Trainer', 'Advanced'],
  ]),
  ...family('Squat', 'Legs', ['Quadriceps', 'Glutes'], ['Hamstrings', 'Hip abductors', 'Adductors', 'Abdominals', 'Forearms'], [
    ['Dumbbell Box Step-Over', 'Dumbbell'],
  ]),
  ...family('Core', 'Core', ['Abdominals'], ['Lats', 'Forearms', 'Glutes', 'Quadriceps', 'Triceps'], [
    ['Dragon Flag (Body Lever)', 'Fixed Anchor', 'Advanced'],
  ]),
]

// Distinct support/loading tasks; mobility-only drills live in the corrective
// catalog so they do not acquire working-muscle volume mappings.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_32 = [
  ...family('Elbow extension', 'Arms', ['Triceps'], ['Chest', 'Front delts'], [
    ['Bench Dip', 'Bench'],
  ]),
  ...family('Overhead support', 'Shoulders', ['Front delts', 'Side delts', 'Triceps', 'Serratus anterior'], ['Trapezius', 'Rotator cuff', 'Abdominals', 'Forearms'], [
    ['Wall-Facing Handstand Hold', 'Wall', 'Advanced'],
  ]),
  ...family('Shoulder isolation', 'Shoulders', ['Rear delts', 'Upper back'], ['Rotator cuff', 'Trapezius', 'Abdominals', 'Forearms'], [
    ['Suspension Reverse Fly (T)', 'Suspension Trainer'],
  ]),
]

// Hand opening, rolling a suspended load, and a stationary neck-flexion
// contraction fill different gaps from grippers, wrist curls and chin tucks.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_33 = [
  ...family('Finger extension', 'Arms', ['Forearms'], [], [
    ['Rubber-Band Finger Opening', 'Rubber Band', 'Beginner'],
  ]),
  ...family('Grip', 'Arms', ['Forearms'], ['Front delts', 'Abdominals'], [
    ['Wrist Roller (Handheld)', 'Wrist Roller'],
  ]),
  ...family('Neck flexion', 'Neck', ['Neck flexors'], [], [
    ['Neck Isometric Flexion (Hand Resistance)', 'Bodyweight', 'Beginner'],
  ]),
]

// Supported machine tasks, an explicitly overhead swing, and two different
// throw trajectories. None carries a free-weight max or power-output estimate.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_34 = [
  ...family('Trunk rotation', 'Core', ['Abdominals'], ['Spinal erectors'], [
    ['Rotary Torso Machine', 'Machine', 'Beginner'],
  ]),
  ...family('Trunk extension', 'Back', ['Spinal erectors'], [], [
    ['Seated Lumbar Extension Machine', 'Machine', 'Beginner'],
  ]),
  ...family('Elbow extension', 'Arms', ['Triceps'], ['Chest', 'Front delts'], [
    ['Seated Dip Machine (Plate-Loaded)', 'Machine', 'Beginner'],
  ]),
  ...family('Power', 'Full Body', ['Hamstrings', 'Glutes'], ['Spinal erectors', 'Abdominals', 'Forearms', 'Front delts', 'Serratus anterior', 'Trapezius', 'Rotator cuff'], [
    ['American Kettlebell Swing (Overhead)', 'Kettlebell', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Lats', 'Abdominals', 'Triceps'], ['Chest', 'Front delts', 'Glutes', 'Quadriceps'], [
    ['Medicine Ball Overhead Forward Throw', 'Medicine Ball'],
  ]),
  ...family('Power', 'Full Body', ['Glutes', 'Quadriceps', 'Hamstrings'], ['Calves', 'Spinal erectors', 'Abdominals', 'Front delts', 'Forearms', 'Trapezius'], [
    ['Medicine Ball Overhead Backward Throw', 'Medicine Ball', 'Advanced'],
  ]),
]

// Ankle resistance without weight-bearing, moving core tasks, and two distinct
// jump paths. No band-force, jump-height or free-weight max estimates are added.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_35 = [
  ...family('Ankle plantarflexion', 'Ankles', ['Calves'], [], [
    ['Seated Banded Ankle Plantarflexion', 'Resistance Band', 'Beginner'],
  ]),
  ...family('Ankle dorsiflexion', 'Ankles', ['Tibialis anterior'], [], [
    ['Seated Banded Ankle Dorsiflexion', 'Resistance Band', 'Beginner'],
  ]),
  ...family('Core', 'Core', ['Abdominals', 'Hip flexors'], ['Front delts', 'Serratus anterior', 'Triceps', 'Quadriceps'], [
    ['Stability Ball Pike', 'Fitness Ball', 'Advanced'],
  ]),
  ...family('Core', 'Core', ['Abdominals', 'Hip abductors'], ['Glutes', 'Serratus anterior', 'Rotator cuff'], [
    ['Side Plank Hip Dip', 'Bodyweight'],
  ]),
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hamstrings', 'Hip abductors', 'Adductors', 'Abdominals'], [
    ['Lateral Box Jump', 'Box', 'Advanced'],
  ]),
  ...family('Power', 'Legs', ['Quadriceps', 'Glutes', 'Calves'], ['Hip flexors', 'Hamstrings', 'Abdominals'], [
    ['Tuck Jump', 'Bodyweight', 'Advanced'],
  ]),
]

// Distinct support, pulling and conditioning tasks. Timed work uses existing
// duration fields; distance, calorie, effective-force and 1RM estimates are absent.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_36 = [
  ...family('Horizontal push', 'Chest', ['Chest', 'Triceps'], ['Front delts', 'Serratus anterior', 'Abdominals'], [
    ['Archer Push-Up (Floor)', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Horizontal pull', 'Back', ['Lats', 'Upper back', 'Biceps', 'Forearms'], ['Rear delts', 'Abdominals', 'Spinal erectors'], [
    ['Seated Sled Rope Pull', 'Sled and Rope'],
  ]),
  ...family('Sled drag', 'Legs', ['Quadriceps'], ['Glutes', 'Calves', 'Hamstrings', 'Abdominals', 'Forearms'], [
    ['Backward Sled Drag (Straps)', 'Sled and Straps'],
  ]),
  ...family('Power', 'Shoulders', ['Front delts', 'Side delts'], ['Trapezius', 'Forearms', 'Abdominals', 'Spinal erectors'], [
    ['Battle Rope Alternating Waves', 'Battle Ropes'],
  ]),
  ...family('Core', 'Core', ['Hip flexors', 'Abdominals'], ['Front delts', 'Serratus anterior', 'Triceps', 'Quadriceps'], [
    ['Mountain Climber', 'Bodyweight'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Calves', 'Chest', 'Triceps'], ['Front delts', 'Abdominals', 'Spinal erectors', 'Hamstrings'], [
    ['Burpee (Chest-to-Floor and Jump)', 'Bodyweight', 'Advanced'],
  ]),
  ...family('Power', 'Full Body', ['Calves', 'Hip abductors', 'Adductors', 'Side delts'], ['Quadriceps', 'Glutes', 'Abdominals', 'Trapezius'], [
    ['Jumping Jack', 'Bodyweight', 'Beginner'],
  ]),
  ...family('Power', 'Full Body', ['Quadriceps', 'Glutes', 'Trapezius'], ['Hamstrings', 'Calves', 'Spinal erectors', 'Upper back', 'Forearms', 'Abdominals'], [
    ['Dumbbell Hang Power Clean (Two-Arm)', 'Dumbbell', 'Advanced'],
  ]),
]

// Useful remaining coordination and core tasks, kept distinct from band walks,
// static holds and leg raises. No pace, rope-force or performance estimates.
export const EXERCISE_LIBRARY_ADDITIONS_BATCH_37 = [
  ...family('Power', 'Legs', ['Calves'], ['Quadriceps', 'Glutes', 'Abdominals', 'Forearms', 'Front delts'], [
    ['Jump Rope (Single-Under)', 'Jump Rope', 'Beginner'],
  ]),
  ...family('Locomotion', 'Full Body', ['Triceps', 'Glutes'], ['Hamstrings', 'Rear delts', 'Abdominals', 'Forearms'], [
    ['Crab Walk (Floor)', 'Bodyweight'],
  ]),
  ...family('Power', 'Full Body', ['Hip flexors', 'Calves'], ['Quadriceps', 'Hamstrings', 'Glutes', 'Abdominals', 'Front delts'], [
    ['High-Knee Run (In Place)', 'Bodyweight'],
  ]),
  ...family('Core', 'Core', ['Hip flexors', 'Abdominals'], ['Quadriceps'], [
    ['Flutter Kick (Supine)', 'Bodyweight'],
  ]),
  ...family('Trunk rotation', 'Core', ['Abdominals', 'Hip flexors'], ['Lats', 'Forearms', 'Rotator cuff', 'Upper back', 'Quadriceps'], [
    ['Hanging Windshield Wiper', 'Pull-Up Bar', 'Advanced'],
  ]),
]

export const EXERCISE_LIBRARY_EXPANSION = [...FIRST_EXPANSION, ...EXERCISE_LIBRARY_ADDITIONS_2026_10_24, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_3, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_4, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_5, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_6, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_7, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_17, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_18, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_19, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_20, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_21, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_22, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_23, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_24, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_25, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_26, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_27, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_28, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_29, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_30, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_31, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_32, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_33, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_34, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_35, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_36, ...EXERCISE_LIBRARY_ADDITIONS_BATCH_37]
