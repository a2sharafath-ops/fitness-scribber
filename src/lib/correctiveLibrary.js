// Corrective-exercise library, following the NASM Corrective Exercise Continuum:
//   SMR (inhibit) + Stretch (lengthen) for OVER-active/tight muscles, and
//   Activation (isolated strengthening) for UNDER-active/lengthened muscles.
// These are the standard, widely-taught correctives (NASM CES; Clark, Lucett).
//
// `target` uses the exact muscle strings from lib/posture.js, so a compensation's
// overactive/underactive lists map straight onto exercises. `mode` decides which
// side of a finding an exercise serves. Pure data; the merge assigns ids + media.
//
// Fields: name, muscle (region), equip, difficulty, mode('SMR'|'Stretch'|'Activation'), target[]
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
]
