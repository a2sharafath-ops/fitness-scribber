// NASM-style postural & Overhead Squat Assessment (OHSA) definitions.
//
// One pure table drives the form, the summary, the detail view and the
// corrective-exercise generator. Each item names the compensation and the
// muscles NASM's model associates with it — overactive (tight → release/stretch)
// and underactive (weak/lengthened → activate/strengthen). These mappings are a
// widely-taught clinical model, not ground truth, so downstream suggestions are
// framed as suggestions the coach approves.
//
// Record shape (stored in assessments.data, no DB migration):
//   { protocol: 'nasm',
//     findings: { <itemId>: { l, r, mid, severity, pain, note } },
//     notes: ['', ...] }        // free-text lines
// Legacy records (0–3 per pattern) have no `protocol` and keep working.

// Muscle vocabulary — canonical strings the corrective generator matches on.
export const SEVERITY = [['mild', 'Mild'], ['moderate', 'Moderate'], ['marked', 'Marked']]
export const SEVERITY_WEIGHT = { mild: 1, moderate: 2, marked: 3 }

// section: 'static' | 'ohsa' | 'special'
// kind:    'bilateral' (Left/Right) | 'midline' (present/absent) | 'test' (positive L/R)
const I = (o) => o

export const POSTURE_ITEMS = [
  // ---------------- Static posture (distortion syndromes) ----------------
  I({ id: 'pesPlanus', section: 'static', view: 'Anterior', group: 'Foot/Ankle', kind: 'bilateral',
    label: 'Pes planus (flat feet)',
    overactive: ['Peroneals', 'Lateral gastrocnemius', 'Biceps femoris (short head)'],
    underactive: ['Anterior tibialis', 'Posterior tibialis', 'Medial gastrocnemius'] }),
  I({ id: 'lowerCrossed', section: 'static', view: 'Lateral', group: 'LPHC', kind: 'midline',
    label: 'Lower crossed syndrome (anterior pelvic tilt)',
    overactive: ['Hip flexors', 'Erector spinae', 'Latissimus dorsi'],
    underactive: ['Gluteus maximus', 'Hamstrings', 'Deep core'] }),
  I({ id: 'upperCrossed', section: 'static', view: 'Lateral', group: 'Shoulder/Neck', kind: 'midline',
    label: 'Upper crossed syndrome (forward head / rounded shoulders)',
    overactive: ['Upper trapezius', 'Levator scapulae', 'Pectorals', 'Sternocleidomastoid'],
    underactive: ['Deep neck flexors', 'Mid/lower trapezius', 'Serratus anterior', 'Rhomboids'] }),

  // ---------------- Dynamic — Overhead Squat Assessment ------------------
  // Anterior view
  I({ id: 'feetTurnOut', section: 'ohsa', view: 'Anterior', group: 'Foot/Ankle', kind: 'bilateral',
    label: 'Feet turn out',
    overactive: ['Soleus', 'Lateral gastrocnemius', 'Biceps femoris (short head)'],
    underactive: ['Medial gastrocnemius', 'Gracilis', 'Sartorius', 'Popliteus'] }),
  I({ id: 'footEversion', section: 'ohsa', view: 'Anterior', group: 'Foot/Ankle', kind: 'bilateral',
    label: 'Foot eversion / arch collapse',
    overactive: ['Peroneals'],
    underactive: ['Posterior tibialis', 'Anterior tibialis'] }),
  I({ id: 'kneesValgus', section: 'ohsa', view: 'Anterior', group: 'Knee', kind: 'bilateral',
    label: 'Knees buckle in (valgus)',
    overactive: ['Adductors', 'TFL', 'Biceps femoris (short head)', 'Vastus lateralis'],
    underactive: ['Gluteus medius', 'Gluteus maximus', 'VMO'] }),
  I({ id: 'kneesVarus', section: 'ohsa', view: 'Anterior', group: 'Knee', kind: 'bilateral',
    label: 'Knees bow out (varus)',
    overactive: ['Piriformis', 'Biceps femoris', 'TFL'],
    underactive: ['Adductors', 'Gluteus maximus'] }),
  I({ id: 'armsAdductAnt', section: 'ohsa', view: 'Anterior', group: 'Shoulder', kind: 'bilateral',
    label: 'Arms adduct / fall in',
    overactive: ['Latissimus dorsi', 'Teres major', 'Pectorals'],
    underactive: ['Mid/lower trapezius', 'Rhomboids', 'Rotator cuff'] }),
  // Lateral view
  I({ id: 'forwardLean', section: 'ohsa', view: 'Lateral', group: 'LPHC', kind: 'midline',
    label: 'Excessive forward lean',
    overactive: ['Soleus', 'Gastrocnemius', 'Hip flexors', 'Abdominals'],
    underactive: ['Anterior tibialis', 'Gluteus maximus', 'Erector spinae'] }),
  I({ id: 'lowBackArches', section: 'ohsa', view: 'Lateral', group: 'LPHC', kind: 'midline',
    label: 'Low back arches',
    overactive: ['Hip flexors', 'Erector spinae', 'Latissimus dorsi'],
    underactive: ['Gluteus maximus', 'Hamstrings', 'Deep core'] }),
  I({ id: 'posteriorPelvicTilt', section: 'ohsa', view: 'Lateral', group: 'LPHC', kind: 'midline',
    label: 'Low back rounds (posterior pelvic tilt)',
    overactive: ['Hamstrings', 'Rectus abdominis', 'External obliques'],
    underactive: ['Hip flexors', 'Erector spinae', 'Latissimus dorsi'] }),
  I({ id: 'armsFallForward', section: 'ohsa', view: 'Lateral', group: 'Shoulder', kind: 'midline',
    label: 'Arms fall forward',
    overactive: ['Latissimus dorsi', 'Teres major', 'Pectorals'],
    underactive: ['Mid/lower trapezius', 'Rhomboids', 'Rotator cuff'] }),
  // Posterior view
  I({ id: 'weightShift', section: 'ohsa', view: 'Posterior', group: 'LPHC', kind: 'bilateral',
    label: 'Asymmetrical weight shift (toward side)',
    overactive: ['Adductors (shift side)', 'TFL/Gluteus medius (opposite)'],
    underactive: ['Gluteus medius (shift side)', 'Adductors (opposite)'] }),
  I({ id: 'shoulderElevation', section: 'ohsa', view: 'Posterior', group: 'Shoulder Girdle', kind: 'bilateral',
    label: 'Shoulder elevation',
    overactive: ['Upper trapezius', 'Levator scapulae'],
    underactive: ['Mid/lower trapezius', 'Serratus anterior'] }),

  // ---------------- Special / mobility tests -----------------------------
  I({ id: 'hamstringLength', section: 'special', view: 'Test', group: 'Hamstring length test', kind: 'test',
    label: 'Positive (limited hamstring length)',
    overactive: ['Hamstrings'],
    underactive: ['Hip flexors'] }),
  I({ id: 'thomasTest', section: 'special', view: 'Test', group: 'Thomas test', kind: 'test',
    label: 'Positive (hip-flexor / rectus femoris tightness)',
    overactive: ['Hip flexors', 'Rectus femoris'],
    underactive: ['Gluteus maximus'] }),
  I({ id: 'faberTest', section: 'special', view: 'Test', group: 'FABER test', kind: 'test',
    label: 'Positive (hip / SI restriction)',
    overactive: ['Piriformis', 'Hip external rotators'],
    underactive: ['Adductors'] }),
  I({ id: 'shoulderMobility', section: 'special', view: 'Test', group: 'Seated shoulder flexion', kind: 'test',
    label: 'Positive (shoulder flexion intolerance)',
    overactive: ['Latissimus dorsi', 'Pectorals', 'Teres major'],
    underactive: ['Mid/lower trapezius', 'Serratus anterior', 'Rotator cuff'] }),
]

export const POSTURE_BY_ID = Object.fromEntries(POSTURE_ITEMS.map((x) => [x.id, x]))
export const SECTIONS = [
  ['ohsa', 'Overhead Squat Assessment'],
  ['static', 'Static posture'],
  ['special', 'Special / mobility tests'],
]
export const itemsInSection = (section) => POSTURE_ITEMS.filter((x) => x.section === section)

// Which sides of an item are marked present. Midline/test items use `mid`/`l`+`r`.
export function presentSides(f, item) {
  if (!f) return []
  if (item.kind === 'midline') return f.mid ? ['mid'] : []
  return [f.l ? 'L' : null, f.r ? 'R' : null].filter(Boolean)
}
export const isPresent = (f, item) => presentSides(f, item).length > 0

// Normalised list of the findings that are actually present in a record.
export function postureFindings(data) {
  const F = data?.findings || {}
  const out = []
  for (const item of POSTURE_ITEMS) {
    const f = F[item.id]
    const sides = presentSides(f, item)
    if (!sides.length) continue
    out.push({ id: item.id, item, sides, severity: f.severity || 'moderate', pain: !!f.pain, note: (f.note || '').trim() })
  }
  return out
}

// Unique overactive / underactive muscles across the present findings — the
// input to corrective generation (phase 2). Order preserved, de-duped.
export function muscleTargets(data) {
  const over = [], under = []
  for (const finding of postureFindings(data)) {
    for (const m of finding.item.overactive) if (!over.includes(m)) over.push(m)
    for (const m of finding.item.underactive) if (!under.includes(m)) under.push(m)
  }
  return { overactive: over, underactive: under }
}
