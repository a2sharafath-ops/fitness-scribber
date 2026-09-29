// Reviewed movement-family defaults for the canonical exercise catalog.
// Direct = a principal mover targeted by the named variation; indirect = a
// meaningful assistant/stabilizer. These are categorical, never EMG percentages.
// Unknown/ambiguous names deliberately remain unassigned for coach review.
const profile = (direct, indirect = []) => ({ direct, indirect: indirect.filter((m) => !direct.includes(m)), source: 'catalog' })
const SQ = profile(['Quadriceps', 'Glutes'], ['Adductors', 'Spinal erectors'])
const LUNGE = profile(['Quadriceps', 'Glutes'], ['Adductors', 'Hamstrings'])
const LATERAL = profile(['Quadriceps', 'Glutes', 'Adductors'], ['Hamstrings'])
const HINGE = profile(['Hamstrings', 'Glutes'], ['Spinal erectors'])
const DEADLIFT = profile(['Quadriceps', 'Glutes', 'Spinal erectors'], ['Hamstrings', 'Upper back'])
const SUMO = profile(['Quadriceps', 'Glutes', 'Adductors'], ['Spinal erectors', 'Hamstrings'])
const BRIDGE = profile(['Glutes'], ['Hamstrings', 'Abdominals'])
const CURL_BRIDGE = profile(['Hamstrings', 'Glutes'], ['Abdominals'])
const CLEAN = profile(['Quadriceps', 'Glutes', 'Trapezius'], ['Hamstrings', 'Calves', 'Spinal erectors', 'Upper back'])
const SNATCH = profile(['Quadriceps', 'Glutes', 'Trapezius'], ['Hamstrings', 'Calves', 'Spinal erectors', 'Upper back', 'Front delts'])
const ROW = profile(['Lats', 'Upper back'], ['Biceps', 'Rear delts', 'Forearms'])
const WIDE_ROW = profile(['Upper back', 'Rear delts'], ['Lats', 'Biceps', 'Forearms'])
const VERTICAL_PULL = profile(['Lats'], ['Biceps', 'Upper back', 'Forearms'])
const BENCH = profile(['Chest'], ['Front delts', 'Triceps'])
const INCLINE = profile(['Chest', 'Front delts'], ['Triceps'])
const OVERHEAD = profile(['Front delts', 'Side delts', 'Triceps'], ['Trapezius', 'Abdominals'])

export function recommendedMuscleTargets(name, mode = '') {
  const n = String(name || '').toLowerCase()
  // SMR and static stretching have anatomical targets but no working sets.
  if (mode === 'SMR' || mode === 'Stretch') return null
  if (mode === 'Activation') {
    if (/toe raises/.test(n)) return profile(['Tibialis anterior'])
    if (/inversion/.test(n)) return profile(['Tibialis posterior'])
    if (/calf raise/.test(n)) return profile(['Calves'])
    if (/hip abduction/.test(n)) return profile(['Hip abductors'])
    if (/glute bridge|hip extension/.test(n)) return BRIDGE
    if (/knee extension/.test(n)) return profile(['Quadriceps'])
    if (/hip adduction/.test(n)) return profile(['Adductors'])
    if (/hip flexion/.test(n)) return profile(['Hip flexors'])
    if (/back extension/.test(n)) return profile(['Spinal erectors'], ['Glutes'])
    if (/cobra/.test(n)) return profile(['Spinal erectors', 'Upper back'])
    if (/y-t-w|prone row/.test(n)) return profile(['Upper back', 'Rear delts'])
    if (/wall slide/.test(n)) return profile(['Serratus anterior'])
    if (/external rotation/.test(n)) return profile(['Rotator cuff'])
    if (/chin tuck/.test(n)) return profile(['Neck flexors'])
    if (/dead bug/.test(n)) return profile(['Abdominals'])
    if (/hamstring curl/.test(n)) return profile(['Hamstrings'])
    return null
  }
  if (/^bridge drop downs/.test(n)) return null // movement unclear from catalog label
  if (/^lateral bridge/.test(n)) return profile(['Abdominals', 'Hip abductors'], ['Glutes'])
  if (/^bridge lift and curl/.test(n)) return CURL_BRIDGE
  if (/^bridge.*straight leg/.test(n)) return CURL_BRIDGE
  if (/^bridge|^glute bridge|^hip thrust/.test(n)) return BRIDGE
  if (/^glute ham raise|^nordic curl/.test(n)) return profile(['Hamstrings'], ['Glutes', 'Calves'])
  if (/^hyper 45|^hyper 90/.test(n)) return profile(['Spinal erectors', 'Glutes'], ['Hamstrings'])
  if (/^reverse hyper/.test(n)) return profile(['Glutes'], ['Hamstrings', 'Spinal erectors'])
  if (/^pull through|^sumo pull through/.test(n)) return HINGE
  if (/^rack pull/.test(n)) return profile(['Glutes', 'Spinal erectors'], ['Hamstrings', 'Upper back'])
  if (/^sumo deadlift/.test(n)) return SUMO
  if (/^deadlift|^snatch grip deadlift/.test(n)) return DEADLIFT
  if (/romanian deadlift|good morning/.test(n)) return HINGE
  if (/^snatch balance/.test(n)) return profile(['Quadriceps', 'Glutes'], ['Trapezius', 'Front delts', 'Upper back'])
  if (/snatch \(muscle\)/.test(n)) return profile(['Quadriceps', 'Glutes', 'Trapezius', 'Front delts'], ['Hamstrings', 'Calves', 'Spinal erectors', 'Upper back'])
  if (/snatch/.test(n)) return SNATCH
  if (/^clean & jerk/.test(n)) return profile(['Quadriceps', 'Glutes', 'Trapezius', 'Front delts', 'Triceps'], ['Hamstrings', 'Calves', 'Spinal erectors', 'Upper back'])
  if (/clean/.test(n)) return CLEAN
  if (/^barbell curls|^db curls/.test(n)) return profile(['Biceps'], ['Forearms'])
  if (/^rope climbs|^towel pull/.test(n)) return profile(['Lats', 'Biceps', 'Forearms'], ['Upper back'])
  if (/pull ups|pull-ups|pull-up|pull down/.test(n)) return VERTICAL_PULL
  if (/\brow\b|^bench pull/.test(n)) return /wide/.test(n) ? WIDE_ROW : ROW
  if (/^sled cross over|^sled diagonal|^sled lateral/.test(n)) return profile(['Glutes', 'Adductors'], ['Quadriceps', 'Calves'])
  if (/^sled walking lunges/.test(n)) return LUNGE
  if (/^sled/.test(n)) return profile(['Quadriceps', 'Glutes'], ['Calves', 'Abdominals'])
  if (/^1\/2 kneeling/.test(n)) return profile(['Front delts', 'Chest'], ['Triceps', 'Abdominals'])
  if (/^db press/.test(n)) return null // bench or overhead is unspecified
  if (/incline bench press/.test(n)) return INCLINE
  if (/floor press/.test(n)) return profile(['Chest', 'Triceps'], ['Front delts'])
  if (/bench press|push ?ups|press up|ring pushups/.test(n)) return /narrow/.test(n) ? profile(['Triceps', 'Chest'], ['Front delts']) : BENCH
  if (/^dips|^ring dips/.test(n)) return profile(['Chest', 'Triceps'], ['Front delts'])
  if (/^1\/2 kneeling|^db push press|^kb press|^kb push press|^log press|^military press|^push press|^trap bar press/.test(n)) return OVERHEAD
  if (/^yoga push up/.test(n)) return profile(['Chest', 'Front delts', 'Triceps'], ['Serratus anterior'])
  if (/^overhead press/.test(n)) return OVERHEAD
  if (/^plank/.test(n)) return profile(['Abdominals'], ['Spinal erectors'])
  if (/^speed skater/.test(n)) return profile(['Glutes', 'Quadriceps', 'Hip abductors'], ['Calves'])
  if (/^leg press|^belt squat|^wall squat/.test(n)) return profile(['Quadriceps', 'Glutes'], ['Adductors'])
  if (/^sumo back squat/.test(n)) return profile(['Quadriceps', 'Glutes', 'Adductors'], ['Spinal erectors'])
  if (/^overhead squat/.test(n)) return profile(['Quadriceps', 'Glutes'], ['Adductors', 'Spinal erectors', 'Upper back', 'Front delts'])
  if (/^overhead.*lunge|^overhead.*split squat/.test(n)) return profile(['Quadriceps', 'Glutes'], ['Adductors', 'Upper back', 'Front delts'])
  if (/lateral/.test(n) && /lunge|split squat/.test(n)) return LATERAL
  if (/^inclined step down|^off box pistol|^pistol squat|^wall squat|^prisoner squat|^box squat|^leg press/.test(n)) return SQ
  if (/lunge|split squat|step up/.test(n)) return LUNGE
  if (/squat/.test(n)) return SQ
  return null
}
