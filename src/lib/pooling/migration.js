import { canonical } from './context.js'

// A sidecar migration: Classic rows, names, media and occurrence IDs stay intact.
export function migratePoolingSidecar(database, existing = null) {
  if (existing && existing.schemaVersion !== 1) throw new Error('unsupported_pooling_schema')
  const sidecar = structuredClone(existing || { schemaVersion: 1, legacyMappings: [], observations: [], importedDrafts: [] })
  const mappings = new Set(sidecar.legacyMappings.map(row => row.legacyId))
  for (const exercise of database.exercises || []) {
    if (!exercise.id) throw new Error('legacy_identity_missing')
    if (mappings.has(exercise.id)) continue
    sidecar.legacyMappings.push({ legacyId: exercise.id, catalogueId: null, revision: null, state: 'unresolved',
      reason: 'explicit_variant_review_required', preserved: canonical(exercise) })
    mappings.add(exercise.id)
  }
  const observations = new Set(sidecar.observations.map(row => row.originId))
  for (const assessment of database.assessments || []) {
    if (!assessment.id) throw new Error('legacy_identity_missing')
    if (observations.has(assessment.id)) continue
    sidecar.observations.push({ originId: assessment.id, clientId: assessment.clientId || null,
      quality: 'legacy_ambiguous', state: 'unknown', confirmation: null, preserved: canonical(assessment) })
    observations.add(assessment.id)
  }
  const drafts = new Set(sidecar.importedDrafts.map(row => row.originId))
  for (const prescription of database.prescriptions || []) {
    if (!prescription.id) throw new Error('legacy_identity_missing')
    if (drafts.has(prescription.id)) continue
    sidecar.importedDrafts.push({ originId: prescription.id, clientId: prescription.clientId || null,
      state: 'unapproved_legacy_import', approval: null, preserved: canonical(prescription) })
    drafts.add(prescription.id)
  }
  return sidecar
}
