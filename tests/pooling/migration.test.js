import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migratePoolingSidecar } from '../../src/lib/pooling/migration.js'
test('migration is additive and idempotent; duplicate names are not identity', () => {
  const db = { exercises: [{ id: 'a', name: 'Same name', media: 'custom' }, { id: 'b', name: 'Same name' }],
    assessments: [{ id: 'as1', clientId: 'synthetic', left: null, right: false }],
    prescriptions: [{ id: 'p1', items: [{ id: 'occ1', exerciseId: 'b', actual: 0, side: 'left' }] }] }
  const before = structuredClone(db), first = migratePoolingSidecar(db)
  assert.deepEqual(db, before)
  assert.deepEqual(migratePoolingSidecar(db, first), first)
  assert.equal(first.legacyMappings.length, 2)
  assert(first.legacyMappings.every(row => row.catalogueId === null))
  assert.equal(first.importedDrafts[0].approval, null)
  assert.equal(JSON.parse(first.importedDrafts[0].preserved).items[0].actual, 0)
})
test('unknown sidecar version cannot overwrite records', () => assert.throws(() => migratePoolingSidecar({}, { schemaVersion: 99 }), /unsupported/))
