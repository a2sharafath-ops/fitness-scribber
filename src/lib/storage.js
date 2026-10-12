// localStorage persistence with forward-compatible migration of older saved data.
import { ensureLibrary } from './programLibrary'
import { seed } from './seed'
import { ensureProgramShape } from './program'
import { seedBuilderQA } from './builderQA'
import { isLocalBuilderQA } from './supabase'

const KEY = isLocalBuilderQA ? 'fitscribe_builder_qa_v1' : 'fitscribe_v1'
export const localStorageKey = KEY

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
    if (c.monitorOptIn === undefined) c.monitorOptIn = false
  })
  // Advanced Programming Platform: maxes/synonyms collections + lazy
  // items→blocks upgrade of prescriptions and templates.
  ensureProgramShape(db)
  ensureLibrary(db)
  return db
}

export function loadDB() {
  let db
  try {
    const raw = localStorage.getItem(KEY)
    db = raw ? JSON.parse(raw) : isLocalBuilderQA ? seedBuilderQA() : seed()
  } catch {
    db = isLocalBuilderQA ? seedBuilderQA() : seed()
  }
  return migrate(db)
}

// Calendar writes must read the latest browser snapshot rather than overwrite
// another open tab's newly saved clients or plans with an older in-memory copy.
export function readStoredDB() {
  const raw = localStorage.getItem(KEY)
  if (!raw) throw new Error('Local data is unavailable. Reload the app before changing the schedule.')
  return migrate(JSON.parse(raw))
}

export function saveDB(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}
