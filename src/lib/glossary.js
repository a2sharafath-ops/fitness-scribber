// Plain-language definitions for the sports-science jargon shown on primary
// screens. Used by the InfoTip atom so a floor trainer can decode a metric
// without drilling into the metric-detail page.
export const GLOSSARY = {
  acwr: { term: 'ACWR', text: 'ACWR = 7-day average daily session load ÷ 28-day average. Missing logs affect both averages. There is no universal injury-risk threshold.' },
  monotony: { term: 'Monotony', text: 'Monotony = 7-day mean daily load ÷ its standard deviation. It describes load variation. Missing logs limit interpretation.' },
  strain: { term: 'Strain', text: 'Strain = total 7-day session load × 7-day monotony. It describes training load and does not provide diagnosis or clearance.' },
  srpeTl: { term: 'sRPE-TL', text: 'Session load = RPE (0–10) × session minutes, in arbitrary units (AU).' },
  readiness: { term: 'Readiness', text: 'Daily score out of 100 from available wellness and HRV inputs. HRV is compared with its prior 30-day baseline. Inputs can be incomplete. This score does not provide exercise or medical clearance.' },
  wellness: { term: 'Wellness (Hooper)', text: 'Daily self-report of sleep quality, stress, fatigue and soreness (each rated /7). The app reverses stress, fatigue and soreness before summing, so a higher total /28 reflects more favorable responses.' },
  trimp: { term: 'TRIMP', text: 'Training Impulse — cardio load from heart-rate zones × duration.' },
  tiz: { term: 'TiZ', text: 'Time-in-Zone — minutes spent in each heart-rate zone during a session.' },
  tss: { term: 'TSS', text: 'Training Stress Score — a session’s intensity normalized to the athlete’s threshold.' },
  hsd: { term: 'HSD', text: 'High-Speed Distance — kilometres covered above the speed threshold used by the recording method.' },
  rmssd: { term: 'RMSSD (HRV)', text: 'Morning heart-rate variability in milliseconds. Higher vs the athlete’s own baseline signals better recovery.' },
  vl: { term: 'Volume Load', text: 'Sets × reps × weight — total mechanical work moved (tonnage).' },
}
