// Stable client preferences can be updated without rewriting a signed health
// screening. Unedited fields continue to reflect the latest completed intake.
export const PREFERENCE_FIELDS = [
  ['enjoys', 'Enjoys'], ['dislikes', 'Dislikes'], ['intensity', 'Intensity preference'],
  ['daysPerWeek', 'Days per week'], ['sessionMinutes', 'Session length (min)'],
  ['timeOfDay', 'Preferred times'], ['unavailable', 'Unavailable'],
  ['locations', 'Locations'], ['equipment', 'Equipment'],
  ['space', 'Space constraints'], ['groupPref', 'Session format'],
]

const asText = (value) => Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value)

export function preferenceDetails(client, screening) {
  const goals = screening?.goals || {}
  const fallback = {
    enjoys: goals.prefs?.enjoys, dislikes: goals.prefs?.dislikes, intensity: goals.prefs?.intensity,
    daysPerWeek: goals.availability?.daysPerWeek, sessionMinutes: goals.availability?.sessionMinutes,
    timeOfDay: goals.availability?.timeOfDay, unavailable: goals.availability?.unavailable,
    locations: goals.environment?.locations, equipment: goals.environment?.equipment,
    space: goals.environment?.space, groupPref: goals.environment?.groupPref,
  }
  const saved = client.intake?.profilePreferences || {}
  return Object.fromEntries(PREFERENCE_FIELDS.map(([key]) => {
    if (Object.hasOwn(saved.values || {}, key)) return [key, {
      value: asText(saved.values[key]), source: 'Profile update', date: saved.dates?.[key] || null,
    }]
    const value = asText(fallback[key])
    return [key, { value, source: value ? 'Health screening' : 'Not recorded', date: value ? screening?.completedOn || null : null }]
  }))
}
