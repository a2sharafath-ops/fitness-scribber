// PAR-Q+ 2024 — The Physical Activity Readiness Questionnaire for Everyone.
// VERBATIM instrument text — licensing requires the entire questionnaire be used
// with NO changes: do not paraphrase, shorten, reorder, or drop any question.
// Pure module: instrument data + outcome engine. No React, no fetch.

export const PARQ_NAME = 'PAR-Q+ 2024'
export const PARQ_COPYRIGHT = 'Copyright © 2024 PAR-Q+ Collaboration'
export const PARQ_ATTRIBUTION =
  'Reprinted with permission from the PAR-Q+ Collaboration (www.eparmedx.com)'
export const PARQ_CITATION =
  'Warburton DER, Jamnik VK, Bredin SSD, and Gledhill N on behalf of the PAR-Q+ Collaboration. ' +
  'The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+) and Electronic Physical Activity ' +
  'Readiness Medical Examination (ePARmed-X+). Health & Fitness Journal of Canada 4(2):3-23, 2011.'
export const PARQ_DISCLAIMER =
  'The authors, the PAR-Q+ Collaboration, partner organizations, and their agents assume no liability ' +
  'for persons who undertake physical activity and/or make use of the PAR-Q+ or ePARmed-X+.'

// ---- 1A. General Health Questions (YES/NO) ----
export const GENERAL_QUESTIONS = [
  { id: 'G1', text: 'Has your doctor ever said that you have a heart condition OR high blood pressure?' },
  { id: 'G2', text: 'Do you feel pain in your chest at rest, during your daily activities of living, OR when you do physical activity?' },
  { id: 'G3', text: 'Do you lose balance because of dizziness OR have you lost consciousness in the last 12 months?', note: 'Please answer NO if your dizziness was associated with over-breathing (including during vigorous exercise).' },
  { id: 'G4', text: 'Have you ever been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?', list: 'PLEASE LIST CONDITION(S) HERE:' },
  { id: 'G5', text: 'Are you currently taking prescribed medications for a chronic medical condition?' },
  { id: 'G6', text: 'Do you currently have (or have had within the past 12 months) a bone, joint, or soft tissue (muscle, ligament, or tendon) problem that could be made worse by becoming more physically active?', note: 'Please answer NO if you had a problem in the past, but it does not limit your current ability to be physically active.', list: 'PLEASE LIST CONDITION(S) HERE:' },
  { id: 'G7', text: 'Has your doctor ever said that you should only do medically supervised physical activity?' },
]

// ---- 1B. Delay conditions (evaluated alongside the general questions) ----
export const DELAY_FLAGS = [
  { id: 'illness', text: 'You are currently experiencing a temporary illness, such as a cold or fever — wait until you feel better.' },
  { id: 'pregnant', text: 'You are pregnant — talk with your health-care practitioner, physician, qualified exercise professional, and/or complete the ePARmed-X+ at www.eparmedx.com before becoming more physically active.' },
]
export const DELAY_HEALTH_CHANGE =
  'Your health changes — answer these questions again and/or talk to your health-care practitioner, physician, or qualified exercise professional before proceeding.'

// ---- 1C. Follow-up Questions About Your Medical Condition(s) ----
const CTRL = 'Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)'

export const FOLLOWUP_CONDITIONS = [
  { id: 'C1', gate: 'Do you have Arthritis, Osteoporosis, or Back Problems?', sub: [
    { id: 'C1a', text: CTRL },
    { id: 'C1b', text: 'Do you have joint problems causing pain, a recent fracture or fracture caused by osteoporosis or cancer, displaced vertebra (e.g., spondylolisthesis), and/or spondylolysis/pars defect (a crack in the bony ring on the back of the spinal column)?' },
    { id: 'C1c', text: 'Have you had steroid injections or taken steroid tablets regularly for more than 3 months?' },
  ] },
  { id: 'C2', gate: 'Do you currently have Cancer of any kind?', sub: [
    { id: 'C2a', text: 'Does your cancer diagnosis include any of the following types: lung/bronchogenic, multiple myeloma (cancer of plasma cells), head, and/or neck?' },
    { id: 'C2b', text: 'Are you currently receiving cancer therapy (such as chemotherapy or radiotherapy)?' },
  ] },
  { id: 'C3', gate: 'Do you have a Heart or Cardiovascular Condition? This includes Coronary Artery Disease, Heart Failure, Diagnosed Abnormality of Heart Rhythm.', sub: [
    { id: 'C3a', text: CTRL },
    { id: 'C3b', text: 'Do you have an irregular heart beat that requires medical management? (e.g., atrial fibrillation, premature ventricular contraction)' },
    { id: 'C3c', text: 'Do you have chronic heart failure?' },
    { id: 'C3d', text: 'Do you have diagnosed coronary artery (cardiovascular) disease and have not participated in regular physical activity in the last 2 months?' },
  ] },
  { id: 'C4', gate: 'Do you currently have High Blood Pressure?', sub: [
    { id: 'C4a', text: CTRL },
    { id: 'C4b', text: 'Do you have a resting blood pressure equal to or greater than 160/90 mmHg with or without medication? (Answer YES if you do not know your resting blood pressure)' },
  ] },
  { id: 'C5', gate: 'Do you have any Metabolic Conditions? This includes Type 1 Diabetes, Type 2 Diabetes, Pre-Diabetes.', sub: [
    { id: 'C5a', text: 'Do you often have difficulty controlling your blood sugar levels with foods, medications, or other physician-prescribed therapies?' },
    { id: 'C5b', text: 'Do you often suffer from signs and symptoms of low blood sugar (hypoglycemia) following exercise and/or during activities of daily living? Signs of hypoglycemia may include shakiness, nervousness, unusual irritability, abnormal sweating, dizziness or light-headedness, mental confusion, difficulty speaking, weakness, or sleepiness.' },
    { id: 'C5c', text: 'Do you have any signs or symptoms of diabetes complications such as heart or vascular disease and/or complications affecting your eyes, kidneys, OR the sensation in your toes and feet?' },
    { id: 'C5d', text: 'Do you have other metabolic conditions (such as current pregnancy-related diabetes, chronic kidney disease, or liver problems)?' },
    { id: 'C5e', text: 'Are you planning to engage in what for you is unusually high (or vigorous) intensity exercise in the near future?' },
  ] },
  { id: 'C6', gate: "Do you have any Mental Health Problems or Learning Difficulties? This includes Alzheimer's, Dementia, Depression, Anxiety Disorder, Eating Disorder, Psychotic Disorder, Intellectual Disability, Down Syndrome.", sub: [
    { id: 'C6a', text: CTRL },
    { id: 'C6b', text: 'Do you have Down Syndrome AND back problems affecting nerves or muscles?' },
  ] },
  { id: 'C7', gate: 'Do you have a Respiratory Disease? This includes Chronic Obstructive Pulmonary Disease, Asthma, Pulmonary High Blood Pressure.', sub: [
    { id: 'C7a', text: CTRL },
    { id: 'C7b', text: 'Has your doctor ever said your blood oxygen level is low at rest or during exercise and/or that you require supplemental oxygen therapy?' },
    { id: 'C7c', text: 'If asthmatic, do you currently have symptoms of chest tightness, wheezing, laboured breathing, consistent cough (more than 2 days/week), or have you used your rescue medication more than twice in the last week?' },
    { id: 'C7d', text: 'Has your doctor ever said you have high blood pressure in the blood vessels of your lungs?' },
  ] },
  { id: 'C8', gate: 'Do you have a Spinal Cord Injury? This includes Tetraplegia and Paraplegia.', sub: [
    { id: 'C8a', text: CTRL },
    { id: 'C8b', text: 'Do you commonly exhibit low resting blood pressure significant enough to cause dizziness, light-headedness, and/or fainting?' },
    { id: 'C8c', text: 'Has your physician indicated that you exhibit sudden bouts of high blood pressure (known as Autonomic Dysreflexia)?' },
  ] },
  { id: 'C9', gate: 'Have you had a Stroke? This includes Transient Ischemic Attack (TIA) or Cerebrovascular Event.', sub: [
    { id: 'C9a', text: CTRL },
    { id: 'C9b', text: 'Do you have any impairment in walking or mobility?' },
    { id: 'C9c', text: 'Have you experienced a stroke or impairment in nerves or muscles in the past 6 months?' },
  ] },
  { id: 'C10', gate: 'Do you have any other medical condition not listed above or do you have two or more medical conditions?', sub: [
    { id: 'C10a', text: 'Have you experienced a blackout, fainted, or lost consciousness as a result of a head injury within the last 12 months OR have you had a diagnosed concussion within the last 12 months?' },
    { id: 'C10b', text: 'Do you have a medical condition that is not listed (such as epilepsy, neurological conditions, kidney problems)?' },
    { id: 'C10c', text: 'Do you currently live with two or more medical conditions?' },
  ] },
]
export const FOLLOWUP_LIST_PROMPT =
  'PLEASE LIST YOUR MEDICAL CONDITION(S) AND ANY RELATED MEDICATIONS HERE:'

// ---- 1E. Participant Declaration ----
export const DECLARATION_TEXT =
  'I, the undersigned, have read, understood to my full satisfaction and completed this questionnaire. ' +
  'I acknowledge that this physical activity clearance is valid for a maximum of 12 months from the date ' +
  'it is completed and becomes invalid if my condition changes. I also acknowledge that the community/fitness ' +
  'center may retain a copy of this form for its records. In these instances, it will maintain the ' +
  'confidentiality of the same, complying with applicable law.'

// ---- Trainer-facing recommendation text (1D — internal, never shown to the client) ----
export const TRAINER_ADVICE_CLEARED =
  'Client is ready to become more physically active. No clearance action needed; proceed to program design.'
export const TRAINER_ADVICE_REVIEW =
  'Further information is needed before the client becomes more physically active or does a fitness appraisal. ' +
  'Recommended pathway: complete the ePARmed-X+ at www.eparmedx.com and/or have the client see a qualified ' +
  'exercise professional or physician. General guidance to convey: start slowly and build up gradually — ' +
  '20 to 60 minutes of low-to-moderate intensity exercise, 3–5 days per week including aerobic and ' +
  'muscle-strengthening exercises; aim to accumulate 150 minutes or more of moderate-intensity physical ' +
  'activity per week. If the client is over 45 yr and NOT accustomed to regular vigorous to maximal effort ' +
  'exercise, they should consult a qualified exercise professional before this intensity of exercise.'

// ---- Neutral client-facing result copy (all outcomes) ----
export const CLIENT_RESULT_MESSAGE =
  "Thanks — your health screening is complete. Let's continue with a few more questions so your trainer can build the right plan for you."

// ---- Engine ----
export const CLEARANCE_MONTHS = 12

export const generalAnswered = (general = {}) =>
  GENERAL_QUESTIONS.every((q) => general[q.id] === true || general[q.id] === false)

export const anyGeneralYes = (general = {}) =>
  GENERAL_QUESTIONS.some((q) => general[q.id] === true)

// Which follow-up sub-questions still need an answer: every gate must be answered;
// a YES gate requires all of its sub-questions answered.
export const followupAnswered = (followup = {}) =>
  FOLLOWUP_CONDITIONS.every((c) =>
    followup[c.id] === false ||
    (followup[c.id] === true && c.sub.every((s) => followup[s.id] === true || followup[s.id] === false)))

export const anyFollowupYes = (followup = {}) =>
  FOLLOWUP_CONDITIONS.some((c) => followup[c.id] === true && c.sub.some((s) => followup[s.id] === true))

// Outcome A: NO to all 7 general. Any YES → the WHOLE follow-up section applies:
// all sub-answers NO → B, any sub-answer YES → C. Incomplete → null.
export function parqOutcome(parq = {}) {
  const { general = {}, followup = {} } = parq
  if (!generalAnswered(general)) return null
  if (!anyGeneralYes(general)) return 'A'
  if (!followupAnswered(followup)) return null
  return anyFollowupYes(followup) ? 'C' : 'B'
}

export const generalYesIds = (general = {}) =>
  GENERAL_QUESTIONS.filter((q) => general[q.id] === true).map((q) => q.id)

export const followupYesIds = (followup = {}) =>
  FOLLOWUP_CONDITIONS.flatMap((c) =>
    c.sub.filter((s) => followup[c.id] === true && followup[s.id] === true).map((s) => s.id))

export const questionText = (id) => {
  const g = GENERAL_QUESTIONS.find((q) => q.id === id)
  if (g) return g.text
  for (const c of FOLLOWUP_CONDITIONS) {
    if (c.id === id) return c.gate
    const s = c.sub.find((x) => x.id === id)
    if (s) return s.text
  }
  return id
}
