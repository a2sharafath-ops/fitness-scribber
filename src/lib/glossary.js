// Plain-language definitions for the sports-science jargon shown on primary
// screens. Used by the InfoTip atom so a floor trainer can decode a metric
// without drilling into the metric-detail page.
export const GLOSSARY = {
  acwr: { term: 'ACWR', text: 'Acute:Chronic Workload Ratio — this week’s training load vs the 4-week average. 0.8–1.3 is the sweet spot; much above ~1.5 flags a spike that raises injury risk.' },
  monotony: { term: 'Monotony', text: 'How similar the daily loads are across the week (Foster). Above ~2 means little day-to-day variation — a fatigue / overtraining risk.' },
  strain: { term: 'Strain', text: 'Weekly load × monotony (Foster). Climbs when total load and day-to-day sameness are both high.' },
  srpeTl: { term: 'sRPE-TL', text: 'Session load = session RPE (0–10) × minutes, in arbitrary units (AU). The core “internal load” measure.' },
  readiness: { term: 'Readiness', text: 'Composite score /100 from wellness (sleep, soreness, stress, fatigue) and HRV vs baseline. Higher = more recovered.' },
  wellness: { term: 'Wellness (Hooper)', text: 'Daily self-report of sleep, stress, fatigue and soreness (each rated /7). Tracked out of 28; lower total = better.' },
  trimp: { term: 'TRIMP', text: 'Training Impulse — cardio load from heart-rate zones × duration.' },
  tiz: { term: 'TiZ', text: 'Time-in-Zone — minutes spent in each heart-rate zone during a session.' },
  tss: { term: 'TSS', text: 'Training Stress Score — a session’s intensity normalized to the athlete’s threshold.' },
  hsd: { term: 'HSD', text: 'High-Speed Distance — metres covered above a set speed threshold.' },
  rmssd: { term: 'RMSSD (HRV)', text: 'Morning heart-rate variability in milliseconds. Higher vs the athlete’s own baseline signals better recovery.' },
  vl: { term: 'Volume Load', text: 'Sets × reps × weight — total mechanical work moved (tonnage).' },
}
