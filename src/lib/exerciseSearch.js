// Search aliases point to existing entries; they never rename saved workout data.
export const EXERCISE_ALIASES = {
  'Back Squat': ['Barbell Back Squat', 'BB Squat'],
  'Bench Press': ['Barbell Bench Press', 'Flat Barbell Press', 'BB Bench'],
  'Military Press': ['Barbell Overhead Press', 'Barbell Shoulder Press', 'Strict Press', 'OHP'],
  'Ketilebell Front Squat': ['Kettlebell Front Squat', 'KB Front Squat'],
  'Barbel Lateral Lunges': ['Barbell Lateral Lunge'],
  'Sled Diagonal Bakcward Pushes': ['Sled Diagonal Backward Push'],
  'DB Bench Press 2-Arm': ['Dumbbell Bench Press', 'Flat Dumbbell Press'],
  'DB Incline Bench Press 2-Arm': ['Incline Dumbbell Press', 'Dumbbell Incline Press'],
  'DB Curls': ['Dumbbell Biceps Curl', 'Dumbbell Curl'],
  'Barbell Curls': ['Barbell Biceps Curl'],
  'DB Bench Row 1-Arm': ['Single-Arm Dumbbell Row', 'One-Arm Dumbbell Row'],
  'DB Romanian Deadlift': ['Dumbbell RDL'],
  'Romanian Deadlift': ['RDL', 'Barbell RDL', 'Romanian Dead Lift'],
  'DB Bulgarian Split Squat': ['Dumbbell Rear-Foot-Elevated Split Squat', 'Dumbbell RFESS'],
  'Barbell Bulgarian Split Squat': ['Barbell Rear-Foot-Elevated Split Squat', 'Barbell RFESS'],
  'Pull Down (Neutral)': ['Neutral-Grip Lat Pulldown', 'Close-Grip Lat Pulldown'],
  'Pull Down (Wide)': ['Wide-Grip Lat Pulldown'],
  'Pull Down (Pronated)': ['Overhand Lat Pulldown'],
  'Pull Down (Supinated)': ['Underhand Lat Pulldown'],
  'Cable Row (Neutral)': ['Seated Cable Row', 'Neutral-Grip Cable Row'],
  'Bar Pull Ups (Pronated)': ['Pull-Up', 'Pullup', 'Overhand Pull-Up'],
  'Bar Pull Ups (Supinated)': ['Chin-Up', 'Chinup', 'Underhand Pull-Up'],
  'Bar Pull Ups (Neutral)': ['Neutral-Grip Pull-Up'],
  'Push Ups (Normal)': ['Push-Up', 'Pushup', 'Standard Push-Up'],
  'Push Ups (Narrow)': ['Diamond Push-Up', 'Close-Grip Push-Up'],
  'Bridge Lift and Curl (Slide Board)': ['Slider Hamstring Curl', 'Sliding Leg Curl'],
  'Glute Ham Raise (GHR)': ['Glute Ham Raise'],
  'Hyper 45 degree': ['45-Degree Back Extension', 'Roman Chair Back Extension'],
  'Floor Glute Bridge': ['Bodyweight Glute Bridge'],
  'Ball Hamstring Curl': ['Stability Ball Leg Curl', 'Swiss Ball Hamstring Curl'],
  'Dead Bug': ['Deadbug'],
  'Half-Kneeling Pallof Press': ['Half Kneeling Anti-Rotation Press'],
  'Pallof Press': ['Cable Anti-Rotation Press'],
  'Farmer Carry': ["Farmer's Walk", 'Farmers Carry', 'Farmer Walk'],
  'Suitcase Carry': ['Suitcase Walk'],
  'Rope Triceps Pushdown': ['Rope Tricep Pressdown', 'Rope Push Down'],
  'Overhead Cable Triceps Extension': ['Overhead Rope Triceps Extension'],
  'EZ-Bar Skull Crusher': ['EZ-Bar Lying Triceps Extension', 'Skullcrusher'],
  'Pec Deck Fly': ['Machine Chest Fly', 'Pec Fly'],
  'Reverse Pec Deck': ['Machine Rear Delt Fly', 'Rear Deltoid Fly Machine'],
  'Seated Leg Curl': ['Seated Hamstring Curl'],
  'Lying Leg Curl': ['Prone Leg Curl', 'Lying Hamstring Curl'],
  'Leg Extension': ['Knee Extension Machine'],
  'Seated Hip Abduction': ['Hip Abductor Machine'],
  'Seated Hip Adduction': ['Hip Adductor Machine'],
  'Machine Hip Thrust': ['Glute Drive Machine'],
  'Wall Tibialis Raise': ['Tibialis Anterior Wall Raise'],
  'Trap Bar Deadlift': ['Hex Bar Deadlift'],
  'Kettlebell Swing': ['Russian Kettlebell Swing', 'Two-Hand Kettlebell Swing'],
  'Front Squat': ['Barbell Front Squat', 'Front-Rack Squat'],
  'Goblet Squat': ['Dumbbell Goblet Squat', 'Kettlebell Goblet Squat'],
  'Heels-Elevated Goblet Squat': ['Heel-Raised Goblet Squat', 'Cyclist Goblet Squat'],
  'Bodyweight Squat': ['Air Squat', 'Unweighted Squat'],
  'Sit-to-Stand': ['Chair Squat', 'Chair Stand', 'Sit to Stand Squat'],
  'Supported Squat': ['Suspension-Assisted Squat', 'TRX-Assisted Squat'],
  'Hack Squat': ['Machine Hack Squat'],
  'Safety Bar Squat': ['Safety Squat Bar Squat', 'SSB Squat'],
  'Belt Squat': ['Hip Belt Squat'],
  'Bodyweight Reverse Lunge': ['Step-Back Lunge', 'Backward Lunge'],
  'Bodyweight Forward Lunge': ['Forward Lunge', 'Front Lunge'],
  'Bodyweight Lateral Lunge': ['Side Lunge', 'Lateral Lunge'],
  'Cossack Squat': ['Cossack Lunge'],
  'Front-Foot-Elevated Split Squat': ['FFESS', 'Front-Foot-Raised Split Squat'],
  'Bodyweight Step-Up': ['Box Step-Up', 'Bodyweight Step Up'],
  'Wall Sit': ['Isometric Wall Squat'],
  'Deadlift': ['Conventional Deadlift', 'Barbell Deadlift'],
  'Block Deadlift': ['Deadlift from Blocks', 'Elevated Barbell Deadlift'],
  'DB Romanian Deadlift 2-Arm/1-Leg': ['Single-Leg Dumbbell RDL', 'Two-Arm Single-Leg Romanian Deadlift'],
  'Romanian Deadlift 1-Leg': ['Single-Leg Barbell RDL', 'Single-Leg Romanian Deadlift'],
  'Dumbbell Kickstand Romanian Deadlift': ['Dumbbell B-Stance RDL', 'Staggered-Stance Dumbbell RDL'],
  'Barbell Kickstand Romanian Deadlift': ['Barbell B-Stance RDL', 'Staggered-Stance Barbell RDL'],
  'Pull Through': ['Cable Pull-Through', 'Cable Hip Hinge'],
  'Nordic Curl': ['Nordic Hamstring Curl', 'Nordic Hamstring Lower', 'Russian Leg Curl'],
  'Assisted Nordic Curl': ['Band-Assisted Nordic Hamstring Curl'],
  'Glute Bridge (Floor)': ['Barbell Glute Bridge'],
  'Hip Thrust (Bench)': ['Bench Hip Thrust'],
  'Hip Thrust 1-Leg (Bench)': ['Single-Leg Bench Hip Thrust'],
  'Cable Glute Kickback': ['Cable Hip Extension', 'Cable Donkey Kick'],
  'Machine Glute Kickback': ['Machine Hip Extension', 'Glute Kickback Machine'],
  'Banded Lateral Walk': ['Lateral Band Walk', 'Side-Step Band Walk', 'Crab Walk with Band'],
  'Clamshell': ['Side-Lying Clam', 'Clam Shell'],
  'Standing Calf Raise': ['Standing Machine Calf Raise'],
  'Seated Calf Raise': ['Seated Machine Calf Raise', 'Seated Soleus Raise'],
  'Single-Leg Calf Raise': ['Single-Leg Heel Raise'],
  'Tibialis Raise': ['Tib Bar Raise', 'Tib Raise'],
  'Machine Chest Press': ['Seated Chest Press', 'Seated Machine Bench Press'],
  'Cable Chest Fly': ['Cable Crossover', 'Cable Fly', 'Cable Chest Flye'],
  'Dumbbell Chest Fly': ['Dumbbell Fly', 'Flat Dumbbell Flye'],
  'Incline Dumbbell Fly': ['Incline Dumbbell Flye'],
  'Incline Push-Up': ['Hands-Elevated Push-Up', 'Bench Push-Up'],
  'Decline Push-Up': ['Feet-Elevated Push-Up'],
  'Press Up': ['Press-Up', 'Bodyweight Push-Up'],
  'Close-Grip Bench Press': ['Narrow-Grip Barbell Bench Press', 'CGBP'],
  'Assisted Dip': ['Assisted Dips', 'Machine-Assisted Dip'],
  'Seated Dumbbell Shoulder Press': ['Seated Dumbbell Overhead Press', 'Seated DB OHP'],
  'Standing Dumbbell Shoulder Press': ['Standing Dumbbell Overhead Press', 'Standing DB OHP'],
  'Machine Shoulder Press': ['Machine Overhead Press', 'Seated Machine Shoulder Press'],
  'Smith Machine Shoulder Press': ['Smith Machine Overhead Press'],
  'Dumbbell Lateral Raise': ['Dumbbell Side Raise', 'DB Side Lateral Raise'],
  'Seated Dumbbell Lateral Raise': ['Seated Dumbbell Side Raise'],
  'Cable Lateral Raise': ['Cable Side Raise', 'Single-Arm Cable Lateral Raise'],
  'Machine Lateral Raise': ['Lateral Raise Machine', 'Lateral Deltoid Machine'],
  'Banded Lateral Raise': ['Resistance Band Side Raise'],
  'Dumbbell Rear Delt Fly': ['Bent-Over Dumbbell Reverse Fly', 'Dumbbell Rear Deltoid Raise'],
  'Cable Rear Delt Fly': ['Cable Reverse Fly', 'Cable Rear Deltoid Fly'],
  'Face Pull': ['Rope Face Pull', 'Cable Facepull'],
  'Band Pull-Apart': ['Band Reverse Fly', 'Resistance Band Pull Apart'],
  'Seated Machine Row': ['Chest-Supported Machine Row', 'Machine Seated Row'],
  'Bent Over Row': ['Barbell Bent-Over Row', 'Bent-Over Barbell Row'],
  'Bench Pull': ['Seal Row', 'Prone Barbell Bench Row'],
  'T-Bar Row': ['Landmine T-Bar Row'],
  'Single-Arm Cable Row': ['One-Arm Cable Row', 'Unilateral Cable Row'],
  'Inverted Row': ['Body Row', 'Australian Pull-Up', 'Bar Inverted Row'],
  'Suspension Row': ['TRX Row', 'Suspension Trainer Row'],
  'Assisted Pull-Up': ['Machine-Assisted Pull-Up', 'Assisted Pullup Machine'],
  'Band-Assisted Pull-Up': ['Resistance Band Pull-Up', 'Banded Assisted Pull-Up'],
  'Straight-Arm Cable Pulldown': ['Cable Lat Prayer', 'Straight-Arm Lat Pulldown'],
  'Dumbbell Shrug': ['DB Shoulder Shrug'],
  'Hammer Curl': ['Neutral-Grip Dumbbell Curl', 'Dumbbell Hammer Curl'],
  'EZ-Bar Curl': ['EZ Curl', 'EZ-Bar Biceps Curl'],
  'Cable Biceps Curl': ['Standing Cable Curl'],
  'Preacher Curl': ['Scott Curl', 'EZ-Bar Preacher Curl'],
  'Machine Preacher Curl': ['Preacher Curl Machine', 'Machine Scott Curl'],
  'Bayesian Cable Curl': ['Behind-the-Body Cable Curl'],
  'EZ-Bar Reverse Curl': ['Pronated-Grip EZ-Bar Curl'],
  'Straight-Bar Triceps Pushdown': ['Cable Triceps Pressdown', 'Straight-Bar Tricep Push Down'],
  'Dumbbell Overhead Triceps Extension': ['Dumbbell French Press', 'Overhead Dumbbell Tricep Extension'],
  'Dumbbell Lying Triceps Extension': ['Dumbbell Skull Crusher', 'Lying Dumbbell Tricep Extension'],
  'Dumbbell Triceps Kickback': ['DB Tricep Kick Back'],
  'Dumbbell Wrist Curl': ['Dumbbell Wrist Flexion'],
  'Dumbbell Reverse Wrist Curl': ['Dumbbell Wrist Extension'],
  'Plank': ['Forearm Plank', 'Prone Bridge'],
  'Side Plank': ['Side Bridge', 'Lateral Plank'],
  'Bird Dog': ['Quadruped Opposite Arm Leg Raise', 'Quadruped Alternate Arm Leg Extension'],
  'Banded Pallof Press': ['Band Anti-Rotation Press'],
  'Cable Wood Chop': ['Cable Woodchop', 'High-to-Low Cable Chop'],
  'Cable Lift': ['Low-to-High Cable Chop', 'Reverse Woodchop'],
  'Ab Wheel Rollout': ['Ab Roller', 'Abdominal Wheel Roll Out'],
  'Stability Ball Rollout': ['Swiss Ball Rollout', 'Fitness Ball Roll Out'],
  'Cable Crunch': ['Kneeling Cable Crunch', 'Rope Crunch'],
  'Machine Abdominal Crunch': ['Ab Crunch Machine', 'Machine Ab Crunch'],
  'Abdominal Crunch': ['Floor Crunch', 'Ab Crunch'],
  'Hanging Knee Raise': ['Hanging Tuck Raise'],
  'Captain Chair Knee Raise': ["Captain's Chair Knee Raise", 'Vertical Knee Raise', 'VKR'],
  'Lying Leg Raise': ['Supine Leg Raise'],
  'Hollow Body Hold': ['Hollow Hold', 'Dish Hold'],
  'Front Rack Carry': ['Kettlebell Rack Walk', 'Racked Carry'],
  'Overhead Carry': ['Kettlebell Overhead Walk', 'Waiter Carry', "Waiter's Walk"],
  'Countermovement Jump': ['CMJ', 'Vertical Countermovement Jump'],
  'Broad Jump': ['Standing Long Jump', 'Standing Broad Jump'],
  'Lateral Bound': ['Side-to-Side Bound', 'Skater Bound'],
  'Pogo Jump': ['Ankle Hops', 'Pogo Hops'],
  'Plyometric Push-Up': ['Explosive Push-Up', 'Plyo Push-Up'],
  'Medicine Ball Chest Pass': ['Med Ball Chest Throw'],
  'Medicine Ball Slam': ['Med Ball Slam', 'Overhead Medicine Ball Slam'],
  'Medicine Ball Rotational Throw': ['Rotational Med Ball Wall Throw'],
  'Supported Single-Leg Dumbbell Romanian Deadlift': ['Supported Single-Leg DB RDL', 'Hand-Supported Single-Leg RDL'],
  'Dumbbell Single-Leg Hip Thrust': ['Single-Leg DB Hip Thrust'],
  'Lateral Step-Down': ['Side Step Down', 'Lateral Heel Tap'],
  'Forward Step-Down': ['Anterior Step Down', 'Forward Heel Tap'],
  'Dumbbell Lateral Step-Up': ['DB Side Step Up'],
  'Standing Cable Hip Flexion': ['Cable Knee Drive', 'Cable Hip Flexor Raise'],
  'Hip Airplane': ['Single-Leg Hip Airplane'],
  'Scapular Push-Up': ['Scap Push Up', 'Straight-Arm Scapular Push-Up'],
  'Weighted Push-Up': ['Loaded Push Up', 'Weighted Vest Push-Up'],
  'Single-Arm Dumbbell Floor Press': ['One-Arm DB Floor Press'],
  'Dumbbell Squeeze Press': ['DB Crush Press', 'Hex Press'],
  'Half-Kneeling Single-Arm Cable Chest Press': ['Half-Kneeling Cable Press'],
  'Standing Cable Row': ['Standing Pulley Row'],
  'Scapular Pull-Up': ['Scap Pull Up', 'Hanging Scapular Depression'],
  'Dumbbell Preacher Curl': ['DB Preacher Curl'],
  'Cable Hammer Curl': ['Rope Hammer Curl', 'Neutral-Grip Cable Curl'],
  'Zottman Curl': ['Zottman Dumbbell Curl'],
  'Cross-Body Cable Triceps Extension': ['Cross Body Tricep Extension'],
  'Dumbbell Forearm Pronation': ['DB Wrist Pronation', 'Palm-Down Forearm Rotation'],
  'Dumbbell Forearm Supination': ['DB Wrist Supination', 'Palm-Up Forearm Rotation'],
  'Bear Plank': ['Bear Hold', 'Knees-Hovering Quadruped Hold'],
  'Bear Crawl': ['Quadruped Bear Crawl'],
  'Plank Walk-Up': ['Up Down Plank', 'Plank Up Down', 'Commando Plank'],
  'Suitcase March': ['Single-Arm Loaded March', 'Suitcase March in Place'],
  'Kettlebell Turkish Get-Up': ['Turkish Get Up', 'KB TGU'],
  'Kettlebell Windmill': ['KB Windmill'],
  'Single-Leg Pogo Jump': ['Single-Leg Ankle Hops'],
  'Single-Leg Hop and Stick': ['Single-Leg Hop to Balance', 'Single-Leg Hop and Hold'],
  'Hand-Assisted Pistol Squat': ['Supported Pistol Squat', 'Hand-Supported Single-Leg Pistol'],
  'Dumbbell Deficit Reverse Lunge': ['DB Reverse Lunge from a Step', 'DB Elevated Reverse Lunge'],
  'Seated Barbell Good Morning': ['Seated BB Good Morning'],
  'Single-Leg Cable Romanian Deadlift': ['Cable Single-Leg RDL', 'Single-Leg Pulley RDL'],
  'Standing Split-Stance Single-Arm Landmine Press': ['Standing One-Arm Landmine Press', 'Split Stance Land Mine Press'],
  'Dumbbell Scaption Raise (Thumbs Up)': ['DB Scapular Plane Raise', 'Thumbs-Up Scaption'],
  'Cable Serratus Punch': ['Cable Scapular Protraction', 'Standing Cable Serratus Press'],
  'Chest-Supported Dumbbell Y Raise': ['Prone Incline DB Y Raise', 'Chest Supported Y Raise'],
  'Hamstring Walkout': ['Bridge Heel Walkout', 'Hamstring Heel Walk Out'],
  'Bodyweight Triceps Extension (Fixed Bar)': ['Fixed-Bar Bodyweight Skull Crusher', 'Bar Bodyweight Tricep Extension'],
  'Band-Assisted Push-Up': ['Assisted Band Push Up', 'Elastic-Assisted Push-Up'],
  'Banded Push-Up': ['Band-Resisted Push-Up', 'Band-Loaded Push-Up'],
  'Standing Banded Overhead Press': ['Resistance Band Shoulder Press', 'Standing Band Military Press'],
  'Supported Kneeling-to-Standing': ['Chair-Supported Floor to Stand', 'Supported Kneeling Get Up'],
  'Inchworm': ['Walking Inchworm', 'Inch Worm Walkout'],
  'Landmine Rotation': ['Landmine 180', 'Land Mine Twist', 'Standing Landmine Rotation'],
  'Banded Face Pull': ['Resistance Band Face Pull', 'Band Face Pull'],
  'Banded Overhead Triceps Extension': ['Overhead Band Tricep Extension', 'Resistance Band French Press'],
  'Dumbbell Wrist Radial and Ulnar Deviation': ['DB Wrist Side Bend', 'Dumbbell Wrist Radial Deviation', 'Dumbbell Wrist Ulnar Deviation'],
  'Hip Hike (Step)': ['Pelvic Drop and Hike', 'Step Hip Hike'],
  'L-Sit Hold (Parallel Bars)': ['Parallette L-Sit', 'Supported L Sit Hold'],
  'Seated Pike Leg Lift': ['Seated Pike Compression Lift', 'Seated Straight-Leg Lift'],
  'Floor Sit-Up': ['Full Sit-Up', 'Bent-Knee Sit-Up'],
  'Dumbbell Side Bend': ['Standing Dumbbell Trunk Side Bend', 'Dumbbell Lateral Trunk Flexion'],
  'Single-Arm Kettlebell Clean': ['One-Arm KB Clean', 'Single Kettlebell Clean'],
  'Barbell Thruster': ['Barbell Squat to Press', 'BB Thruster'],
}

export const normalizeExerciseSearch = value => String(value || '').toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '')
  .replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ')
  .replace(/\bdb\b/g, 'dumbbell').replace(/\bbb\b/g, 'barbell').replace(/\bkb\b/g, 'kettlebell')
  .replace(/\b(?:rfess|bss)\b/g, 'bulgarian split squat')
  .replace(/\b(?:rear|back)[- ]foot[- ](?:elevated|raised)[- ]split[- ]squats?\b/g, 'bulgarian split squat')
  .replace(/\b(?:rear|back)[- ]foot[- ](?:elevated|raised)[- ]lunges?\b/g, 'bulgarian split squat')
  .replace(/\brfe[- ]split[- ]squats?\b/g, 'bulgarian split squat')
  .replace(/\bslrdl\b/g, 'single leg romanian deadlift').replace(/\bohp\b/g, 'overhead press')
  .replace(/\brdl\b/g, 'romanian deadlift')
  .replace(/\b1\s*\/\s*2\b/g, 'half').replace(/\b(?:1|one)[- ]arm\b/g, 'single arm').replace(/\b(?:1|one)[- ]leg\b/g, 'single leg')
  .replace(/\bdead[- ]lift\b/g, 'deadlift').replace(/\bhamstring[- ]curls?\b/g, 'leg curl')
  .replace(/\b(?:press[- ]down|push[- ]down)s?\b/g, 'pushdown').replace(/\bpull[- ]downs?\b/g, 'pulldown')
  .replace(/pull[- ]?ups?\b/g, 'pullup').replace(/push[- ]?ups?\b/g, 'pushup').replace(/chin[- ]?ups?\b/g, 'chinup')
  .replace(/[^a-z0-9]+/g, ' ').trim()

const aliasesByName = new Map(Object.entries(EXERCISE_ALIASES).map(([name, aliases]) => [normalizeExerciseSearch(name), aliases]))
// Keep literal forms too: partial typing such as "rear foot e" or "rd" must
// still match an alias before the complete phrase/abbreviation is recognized.
const searchForms = value => [normalizeExerciseSearch(value), String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()]
export function exerciseAliases(exercise) {
  const name = typeof exercise === 'string' ? exercise : exercise.name
  const full = String(name || '').replace(/\bDB\b/g, 'Dumbbell').replace(/\bKB\b/g, 'Kettlebell')
    .replace(/\b1\/2\b/g, 'Half').replace(/\b1-Arm\b/g, 'Single-Arm').replace(/\b2-Arm\b/g, 'Two-Arm').replace(/\b1-Leg\b/g, 'Single-Leg')
  const aliases = [...(aliasesByName.get(normalizeExerciseSearch(name)) || []), full]
  if (/bulgarian split squat/i.test(full)) aliases.push(...['Rear-Foot-Elevated Split Squat', 'Back-Foot-Elevated Split Squat', 'Rear-Foot-Raised Split Squat', 'RFESS', 'BSS', 'Bulgarian Lunge'].map(phrase => full.replace(/bulgarian split squat/i, phrase)))
  if (/romanian deadlift/i.test(full)) aliases.push(full.replace(/romanian deadlift/i, 'RDL'))
  if (/\(alternating\)/i.test(full)) aliases.push('Alternating ' + full.replace(/\s*\(alternating\)/i, ''))
  return [...new Set(aliases)].filter(alias => alias.toLowerCase() !== String(name).toLowerCase())
}

const matchesWords = (text, query) => normalizeExerciseSearch(query).split(' ').filter(Boolean).every(word => text.includes(word) || (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && text.includes(word.slice(0, -1))))
export function exerciseSearchRank(exercise, query) {
  const entry = typeof exercise === 'string' ? { name: exercise } : exercise
  const q = normalizeExerciseSearch(query)
  if (!q) return 0
  const names = searchForms(entry.name)
  const aliases = exerciseAliases(entry).flatMap(searchForms)
  if (names.some(name => name === q)) return 0
  if (names.some(name => name.startsWith(q))) return 1
  if (aliases.some(alias => alias === q || alias.startsWith(q))) return 2
  if (names.some(name => matchesWords(name, q))) return 3
  if (aliases.some(alias => matchesWords(alias, q))) return 4
  const targets = entry.muscleTargets || {}
  const haystack = [entry.name, ...exerciseAliases(entry), entry.equip, entry.muscle, entry.pattern,
    ...(targets.direct || []), ...(targets.indirect || [])].filter(Boolean).flatMap(searchForms).join(' ')
  return matchesWords(haystack, q) ? 5 : Infinity
}
export const matchesExerciseSearch = (exercise, query) => Number.isFinite(exerciseSearchRank(exercise, query))
export function exerciseSuggestionDescription(exercise, query = '') {
  const aliases = exerciseAliases(exercise)
  const matched = query ? aliases.filter(alias => matchesWords(searchForms(alias).join(' '), query)) : []
  const shown = [...new Set([...matched, ...aliases])].slice(0, 2)
  return shown.length ? `Also called: ${shown.join(' · ')}` : ''
}
