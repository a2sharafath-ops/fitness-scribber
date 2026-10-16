// Pure scheduling rules shared by browser cards and server reminders.
export const DEFAULT_REASSESS_DAYS = 84

export function isAssessmentDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T00:00:00Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function reassessmentDateError(date, nextDate) {
  if (!isAssessmentDate(date)) return 'Choose a valid assessment date.'
  if (nextDate == null || nextDate === '') return ''
  if (!isAssessmentDate(nextDate)) return 'Choose a valid next reassessment date.'
  return nextDate <= date ? 'Next reassessment must be after the assessment date.' : ''
}

export function assessmentReview(record, intervalDays = DEFAULT_REASSESS_DAYS) {
  const data = record?.data || {}
  if (Object.hasOwn(data, 'nextReassessmentDate')) {
    const date = data.nextReassessmentDate
    return date && !reassessmentDateError(record.date, date)
      ? { dueDate: date, kind: 'scheduled' }
      : { dueDate: null, kind: 'none' }
  }
  if (!isAssessmentDate(record?.date)) return { dueDate: null, kind: 'none' }
  const days = Number(intervalDays)
  const interval = Number.isSafeInteger(days) && days > 0 ? days : DEFAULT_REASSESS_DAYS
  const date = new Date(record.date + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + interval)
  return { dueDate: date.toISOString().slice(0, 10), kind: 'suggested', intervalDays: interval }
}

export function isFormalReviewAssessment(record) {
  return ['fitness', 'movement', 'body_comp'].includes(record?.type) && !(record.type === 'fitness' && (
    record.data?.sourceMaxId || record.data?.sourceWorkoutId || record.phase === 'progress' ||
    /^(Auto-update: new estimated 1RM peak|Trainer-recorded 1RM:)/.test(record.notes || '')
  ))
}
