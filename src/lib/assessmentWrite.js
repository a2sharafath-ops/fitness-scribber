import { uid } from './format'

export function saveAssessmentRecord(draft, { clientId, type, form, data, record }) {
  if (record) {
    const saved = draft.assessments.find((row) => row.id === record.id && row.clientId === clientId)
    if (!saved) return null
    saved.date = form.date
    saved.phase = form.phase
    saved.notes = (form.notes || '').trim()
    saved.data = { ...data, source: saved.data?.source || (saved.data?.self ? 'Athlete self-report' : 'Source not recorded') }
    return saved
  }
  const saved = {
    id: uid(), clientId, type, date: form.date, phase: form.phase,
    notes: (form.notes || '').trim(), data: { ...data, source: 'Coach entry' },
    createdAt: new Date().toISOString(),
  }
  draft.assessments.push(saved)
  return saved
}
