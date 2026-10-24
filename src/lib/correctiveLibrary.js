// Corrective-exercise library, following the NASM Corrective Exercise Continuum:
//   SMR (inhibit) + Stretch (lengthen) for OVER-active/tight muscles, and
//   Activation (isolated strengthening) for UNDER-active/lengthened muscles.
// Includes widely-taught correctives (NASM CES; Clark, Lucett), plus separately
// documented general flexibility options that coaches can select manually.
//
// Existing corrective `target` strings match lib/posture.js so a compensation's
// overactive/underactive lists map onto exercises. General flexibility labels
// need not match a posture finding. `mode` decides which
// side of a finding an exercise serves. Pure data; the merge assigns ids + media.
//
// Fields: name, muscle (region), equip, difficulty, mode('SMR'|'Stretch'|'Activation'), target[]
// General flexibility choices also appear in the library. Their target labels
// do not introduce new posture findings or automatic treatment rules.
export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_31 = [
  { name: 'Static Cross-Body Shoulder Stretch', muscle: 'Shoulders', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Posterior deltoid'] },
  { name: 'Static Overhead Triceps Stretch', muscle: 'Arms', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Triceps'] },
  { name: 'Static Wrist Flexor Stretch', muscle: 'Forearms', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Wrist flexors'] },
  { name: 'Static Wrist Extensor Stretch', muscle: 'Forearms', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Wrist extensors'] },
]

// Stretch mode also houses controlled range-of-motion drills. These general
// mobility targets deliberately do not create automatic posture prescriptions.
export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_32 = [
  { name: 'Cat-Cow', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Spinal mobility'] },
  { name: 'Side-Lying Thoracic Rotation (Open Book)', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Thoracic rotation mobility'] },
  { name: 'Half-Kneeling Ankle Dorsiflexion Rock', muscle: 'Ankles', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Ankle dorsiflexion mobility'] },
  { name: '90/90 Hip Switch', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Hip internal/external rotation mobility'] },
  { name: 'Supine Shoulder Flexion (Dowel-Assisted)', muscle: 'Shoulders', equip: 'Dowel', difficulty: 'Beginner', mode: 'Stretch', target: ['Assisted shoulder flexion mobility'] },
  { name: 'Supine Lower Trunk Rotation', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Trunk rotation mobility'] },
  { name: 'Static Biceps Stretch (Wall Support)', muscle: 'Arms', equip: 'Wall', difficulty: 'Beginner', mode: 'Stretch', target: ['Biceps'] },
]

export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_33 = [
  { name: 'Quadruped Adductor Rockback', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Adductor mobility'] },
  { name: 'Thoracic Extension (Foam Roller)', muscle: 'Back', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'Stretch', target: ['Thoracic extension mobility'] },
  { name: 'Supine Active Hamstring Stretch', muscle: 'Hamstrings', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Active hamstring mobility'] },
  { name: 'Standing Leg Swing (Front-to-Back)', muscle: 'Hips', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Sagittal hip mobility'] },
  { name: 'Standing Leg Swing (Side-to-Side)', muscle: 'Hips', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Frontal hip mobility'] },
  { name: 'Quadruped Wrist Extension Rock', muscle: 'Forearms', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Weight-bearing wrist extension mobility'] },
  { name: 'Supine Shoulder External Rotation (Dowel-Assisted)', muscle: 'Shoulders', equip: 'Dowel', difficulty: 'Beginner', mode: 'Stretch', target: ['Assisted shoulder external rotation mobility'] },
]

export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_34 = [
  { name: 'Supine Single-Knee-to-Chest Stretch', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Single-knee hip flexion mobility'] },
  { name: 'Prone Press-Up (Lumbar Mobility)', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Prone lumbar extension mobility'] },
  { name: 'Standing Shoulder CAR', muscle: 'Shoulders', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Controlled shoulder circumduction mobility'] },
  { name: 'Side-Lying Hip CAR', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Controlled hip circumduction mobility'] },
]

// General mobility choices, separate from resisted ankle/core work. Their
// labels do not add automatic posture findings or corrective prescriptions.
export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_35 = [
  { name: 'Static Seated Butterfly Stretch', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Seated bilateral groin mobility'] },
  { name: 'Dynamic Frog Stretch', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Bilateral kneeling groin mobility'] },
  { name: 'Seated Neck Rotation', muscle: 'Neck', equip: 'Chair', difficulty: 'Beginner', mode: 'Stretch', target: ['Active cervical rotation mobility'] },
  { name: 'Seated Ankle Circles', muscle: 'Ankles', equip: 'Chair', difficulty: 'Beginner', mode: 'Stretch', target: ['Unresisted ankle circumduction mobility'] },
]

// Unloaded knee range and a supported reach-under rotation. General mobility
// labels do not create diagnostic findings or automatic posture prescriptions.
export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_36 = [
  { name: 'Supine Heel Slide (Knee Mobility)', muscle: 'Knees', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Unloaded knee flexion and extension mobility'] },
  { name: 'Quadruped Thread the Needle', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Supported reach-under thoracic rotation mobility'] },
]

// General shoulder range tasks; these labels add no automatic posture rule.
export const CORRECTIVE_LIBRARY_ADDITIONS_BATCH_37 = [
  { name: 'Wall Angel (Back-to-Wall)', muscle: 'Shoulders', equip: 'Wall', difficulty: 'Beginner', mode: 'Stretch', target: ['Back-to-wall overhead shoulder mobility'] },
  { name: 'Side-Lying Sleeper Stretch', muscle: 'Shoulders', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Side-lying shoulder internal rotation mobility'] },
]

export const CORRECTIVE_LIBRARY = [
  // ---------------- SMR (inhibit) — foam roll / ball -------------------------
  { name: 'Foam Roll — Calves', muscle: 'Calves', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Gastrocnemius', 'Lateral gastrocnemius', 'Medial gastrocnemius', 'Soleus'] },
  { name: 'Foam Roll — Peroneals', muscle: 'Calves', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Peroneals'] },
  { name: 'Foam Roll — Adductors', muscle: 'Adductors', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Adductors', 'Gracilis'] },
  { name: 'Foam Roll — TFL / IT Band', muscle: 'Hips', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['TFL', 'Vastus lateralis'] },
  { name: 'Foam Roll — Quadriceps', muscle: 'Quads', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Rectus femoris', 'Hip flexors', 'Vastus lateralis'] },
  { name: 'Ball Release — Piriformis / Glutes', muscle: 'Glutes', equip: 'Massage Ball', difficulty: 'Beginner', mode: 'SMR', target: ['Piriformis', 'Hip external rotators'] },
  { name: 'Foam Roll — Hamstrings', muscle: 'Hamstrings', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Hamstrings', 'Biceps femoris', 'Biceps femoris (short head)'] },
  { name: 'Foam Roll — Latissimus Dorsi', muscle: 'Back', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Latissimus dorsi', 'Teres major'] },
  { name: 'Foam Roll — Thoracic Spine', muscle: 'Back', equip: 'Foam Roller', difficulty: 'Beginner', mode: 'SMR', target: ['Erector spinae'] },
  { name: 'Ball Release — Pectorals', muscle: 'Chest', equip: 'Massage Ball', difficulty: 'Beginner', mode: 'SMR', target: ['Pectorals'] },
  { name: 'Ball Release — Upper Trapezius / Levator', muscle: 'Neck', equip: 'Massage Ball', difficulty: 'Beginner', mode: 'SMR', target: ['Upper trapezius', 'Levator scapulae'] },

  // ---------------- Stretch (lengthen) — static -----------------------------
  { name: 'Static Gastrocnemius Stretch', muscle: 'Calves', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Gastrocnemius', 'Lateral gastrocnemius', 'Medial gastrocnemius', 'Peroneals'] },
  { name: 'Static Soleus Stretch', muscle: 'Calves', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Soleus'] },
  { name: 'Static Standing Adductor Stretch', muscle: 'Adductors', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Adductors', 'Gracilis'] },
  { name: 'Static TFL / IT-Band Stretch', muscle: 'Hips', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['TFL'] },
  { name: 'Static Supine Piriformis Stretch', muscle: 'Glutes', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Piriformis', 'Hip external rotators'] },
  { name: 'Static Kneeling Hip-Flexor Stretch', muscle: 'Hips', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Hip flexors', 'Rectus femoris'] },
  { name: 'Static Supine Hamstring Stretch', muscle: 'Hamstrings', equip: 'Resistance Band', difficulty: 'Beginner', mode: 'Stretch', target: ['Hamstrings', 'Biceps femoris', 'Biceps femoris (short head)'] },
  { name: 'Static Latissimus Dorsi Stretch', muscle: 'Back', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Latissimus dorsi', 'Teres major'] },
  { name: 'Static Doorway Pectoral Stretch', muscle: 'Chest', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Pectorals'] },
  { name: 'Static Levator Scapulae Stretch', muscle: 'Neck', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Levator scapulae', 'Upper trapezius'] },
  { name: 'Static Sternocleidomastoid Stretch', muscle: 'Neck', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Sternocleidomastoid', 'Upper trapezius'] },
  { name: 'Child’s Pose — Erector Spinae Stretch', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Stretch', target: ['Erector spinae'] },
  { name: 'Static Quadriceps Stretch', muscle: 'Quads', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Stretch', target: ['Rectus femoris', 'Vastus lateralis'] },

  // ---------------- Activation (strengthen) — isolated ----------------------
  { name: 'Ankle Dorsiflexion (Toe Raises)', muscle: 'Ankles', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Anterior tibialis'] },
  { name: 'Resisted Ankle Inversion', muscle: 'Ankles', equip: 'Resistance Band', difficulty: 'Beginner', mode: 'Activation', target: ['Posterior tibialis'] },
  { name: 'Straight-Foot Calf Raise', muscle: 'Calves', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Medial gastrocnemius'] },
  { name: 'Side-Lying Hip Abduction', muscle: 'Glutes', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Gluteus medius'] },
  { name: 'Floor Glute Bridge', muscle: 'Glutes', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Gluteus maximus', 'Hamstrings'] },
  { name: 'Quadruped Hip Extension', muscle: 'Glutes', equip: 'Mat', difficulty: 'Beginner', mode: 'Activation', target: ['Gluteus maximus'] },
  { name: 'Terminal Knee Extension (Band)', muscle: 'Quads', equip: 'Resistance Band', difficulty: 'Beginner', mode: 'Activation', target: ['VMO'] },
  { name: 'Side-Lying Hip Adduction', muscle: 'Adductors', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Adductors', 'Gracilis'] },
  { name: 'Standing Hip Flexion (Band)', muscle: 'Hips', equip: 'Resistance Band', difficulty: 'Beginner', mode: 'Activation', target: ['Hip flexors', 'Sartorius'] },
  { name: 'Prone Cobra', muscle: 'Back', equip: 'Mat', difficulty: 'Beginner', mode: 'Activation', target: ['Mid/lower trapezius', 'Erector spinae', 'Rhomboids'] },
  { name: 'Floor Y-T-W Raises', muscle: 'Shoulders', equip: 'Mat', difficulty: 'Beginner', mode: 'Activation', target: ['Mid/lower trapezius', 'Rhomboids', 'Serratus anterior'] },
  { name: 'Prone Row', muscle: 'Back', equip: 'Dumbbell', difficulty: 'Beginner', mode: 'Activation', target: ['Rhomboids', 'Mid/lower trapezius'] },
  { name: 'Serratus Wall Slide', muscle: 'Shoulders', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Serratus anterior'] },
  { name: 'Side-Lying External Rotation', muscle: 'Shoulders', equip: 'Dumbbell', difficulty: 'Beginner', mode: 'Activation', target: ['Rotator cuff'] },
  { name: 'Chin Tuck (Cervical Retraction)', muscle: 'Neck', equip: 'Bodyweight', difficulty: 'Beginner', mode: 'Activation', target: ['Deep neck flexors'] },
  { name: 'Dead Bug', muscle: 'Core', equip: 'Mat', difficulty: 'Beginner', mode: 'Activation', target: ['Deep core', 'Rectus abdominis', 'Abdominals'] },
  { name: 'Ball Back Extension', muscle: 'Back', equip: 'Fitness Ball', difficulty: 'Beginner', mode: 'Activation', target: ['Erector spinae'] },
  { name: 'Ball Hamstring Curl', muscle: 'Hamstrings', equip: 'Fitness Ball', difficulty: 'Beginner', mode: 'Activation', target: ['Hamstrings', 'Popliteus'] },
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_31,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_32,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_33,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_34,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_35,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_36,
  ...CORRECTIVE_LIBRARY_ADDITIONS_BATCH_37,
]
