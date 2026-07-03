// localStorage persistence with forward-compatible migration of older saved data.
import { seed } from './seed'

const KEY = 'fitscribe_v1'

function migrate(db) {
  if (!db.concerns) db.concerns = []
  ;['wellness', 'srpe', 'resistance', 'cardio', 'wearable'].forEach((k) => {
    if (!db[k]) db[k] = []
  })
  if (!db.prescriptions) db.prescriptions = []
  if (!db.templates) db.templates = []
  if (!db.assessments) db.assessments = []
  if (!db.screenings) db.screenings = []
  db.settings = db.settings || {}
  if (!db.settings.units) db.settings.units = 'kg'
  if (db.settings.tz === undefined) db.settings.tz = ''
  ;(db.clients || []).forEach((c) => {
    if (!c.anthro) c.anthro = { age: null, heightCm: null, massKg: null, bodyFatPct: null, leanMassKg: null }
    if (!c.intake) c.intake = { questionnaire: '', medical: '', injury: '', diet: '' }
    if (c.monitorOptIn === undefined) c.monitorOptIn = false
  })
  return db
}

export function loadDB() {
  let db
  try {
    const raw = localStorage.getItem(KEY)
    db = raw ? JSON.parse(raw) : seed()
  } catch {
    db = seed()
  }
  return migrate(db)
}

export function saveDB(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable — degrade to in-memory only */
  }
}
