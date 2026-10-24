import test from 'node:test'
import assert from 'node:assert/strict'
import { blankFitnessTest, gripStrengthTests, fitnessTestsError, cleanFitnessTests, compareFitnessTests } from '../src/lib/fitnessTests.js'

const grip = values => gripStrengthTests().map((row, i) => ({ ...row, value: values[i], protocol: 'Device A; seated; best of 3' }))

test('grip shortcut keeps sides and measured force separate; zero and signed custom results are valid', () => {
  assert.equal(fitnessTestsError(gripStrengthTests()), 'Test 1: enter a numeric result.')
  const rows = cleanFitnessTests([...grip(['32.5', '36']), { ...blankFitnessTest(), name: 'Sit and reach', value: '-4', unit: 'cm' }, { ...blankFitnessTest(), name: 'Balance errors', value: '0', unit: 'errors' }, blankFitnessTest()])
  assert.equal(rows.length, 4)
  assert.deepEqual(rows.slice(0, 2).map(row => [row.side, row.value, row.unit]), [['Left', 32.5, 'kgf'], ['Right', 36, 'kgf']])
  assert.equal(rows[2].value, -4)
  assert.equal(rows[3].value, 0)
  assert.equal(Object.hasOwn(rows[0], 'valueKg'), false)
  assert.equal(Object.hasOwn(rows[0], 'reps'), false)
})

test('incomplete, non-finite and duplicate measurements block saving rather than disappear', () => {
  const row = grip([30, 35])[0]
  for (const value of ['', ' ', 'abc', Infinity, -Infinity, NaN]) assert.match(fitnessTestsError([{ ...row, value }]), /numeric result/)
  assert.match(fitnessTestsError([{ ...row, name: '' }]), /test name/)
  assert.match(fitnessTestsError([{ ...row, unit: '' }]), /result unit/)
  assert.match(fitnessTestsError([row, { ...row, name: '  HANDGRIP   DYNAMOMETER ' }]), /already have a result/)
  assert.throws(() => cleanFitnessTests([row, row]), /already have a result/)
  assert.equal(fitnessTestsError([row, { ...row, protocol: 'Different device' }]), '')
})

test('reassessment matches each side, unit and protocol, never converts units or mixes devices', () => {
  const before = grip([30, 35]), after = grip([32.5, 34])
  const rows = compareFitnessTests(before, after.reverse())
  assert.deepEqual(rows.map(row => [row.from, row.to, row.delta, row.better]), [[30, 32.5, 2.5, true], [35, 34, -1, false]])
  assert.match(rows[0].label, /Left/)
  for (const change of [{ unit: 'N' }, { protocol: 'Device B' }, { side: 'Both' }, { name: 'Different strength test' }]) {
    const mismatched = compareFitnessTests([before[0]], [{ ...before[0], ...change, value: 90 }])
    assert.equal(mismatched.length, 2)
    assert.ok(mismatched.every(row => row.delta === null && row.better === null))
  }
  assert.equal(compareFitnessTests([before[0]], [{ ...before[0], name: 'handgrip dynamometer', protocol: ' device A; seated; best of 3 ', value: 33 }])[0].delta, 3)
})

test('trend preference is coach-selected; changed direction or missing results has no favorable label', () => {
  const row = { ...blankFitnessTest(), name: 'Sprint', value: 8, unit: 's', direction: 'down' }
  assert.equal(compareFitnessTests([row], [{ ...row, value: 7.125 }])[0].better, true)
  assert.equal(compareFitnessTests([row], [{ ...row, value: 7, direction: 'none' }])[0].better, null)
  assert.equal(compareFitnessTests([{ ...row, direction: 'none' }], [{ ...row, value: 9, direction: 'none' }])[0].better, null)
  assert.equal(compareFitnessTests([row], [{ ...row, value: '' }])[0].delta, null)
  assert.equal(compareFitnessTests([row], [{ ...row, value: 8 }])[0].better, null)
})
