// Plain-language definitions for the sports-science jargon shown on primary
// screens. Used by the InfoTip atom so a floor trainer can decode a metric
// without drilling into the metric-detail page.
export const GLOSSARY = {
  acwr: { term: 'ACWR', text: 'Acute:Chronic Workload Ratio — the 7-day average daily sRPE load divided by the 28-day average. Missing session logs affect both windows. This ratio has no universal injury-risk threshold.' },
  monotony: { term: 'Monotony', text: 'Mean daily sRPE load divided by its day-to-day standard deviation across 7 days. It describes how similar recorded daily loads are; missing logs limit interpretation.' },
  strain: { term: 'Strain', text: 'The sum of 7 days of sRPE load multiplied by 7-day monotony. It is a descriptive load measure, not a diagnosis or clearance decision.' },
  srpeTl: { term: 'sRPE-TL', text: 'Session load = session RPE (0–10) × minutes, in arbitrary units (AU). The core “internal load” measure.' },
  readiness: { term: 'Readiness', text: 'Dated app score /100 from recorded wellness and HRV relative to a prior 30-day personal average. It summarizes available inputs, which may be incomplete; it is not medical or exercise clearance.' },
  wellness: { term: 'Wellness (Hooper)', text: 'Daily self-report of sleep quality, stress, fatigue and soreness (each rated /7). The app reverses stress, fatigue and soreness before summing, so a higher total /28 reflects more favorable responses.' },
  trimp: { term: 'TRIMP', text: 'Training Impulse — cardio load from heart-rate zones × duration.' },
  tiz: { term: 'TiZ', text: 'Time-in-Zone — minutes spent in each heart-rate zone during a session.' },
  tss: { term: 'TSS', text: 'Training Stress Score — a session’s intensity normalized to the athlete’s threshold.' },
  hsd: { term: 'HSD', text: 'High-Speed Distance — kilometres covered above the speed threshold used by the recording method.' },
  rmssd: { term: 'RMSSD (HRV)', text: 'Morning heart-rate variability in milliseconds. Higher vs the athlete’s own baseline signals better recovery.' },
  vl: { term: 'Volume Load', text: 'Sets × reps × weight — total mechanical work moved (tonnage).' },
}
