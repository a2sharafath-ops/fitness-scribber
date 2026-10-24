// Measured fitness tests are separate from lifting 1RMs / Training Max.
const text = value => String(value ?? '').trim()
const normalized = value => text(value).replace(/\s+/g, ' ').toLowerCase()
const numeric = value => text(value) !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const identity = test => JSON.stringify([test.name, test.side, test.unit, test.protocol].map(normalized))
const isEntered = test => [test.name, test.value, test.unit, test.protocol, test.side].some(value => text(value) !== '')

export const blankFitnessTest = () => ({ name: '', side: '', value: '', unit: '', protocol: '', direction: 'none' })
export const gripStrengthTests = () => ['Left', 'Right'].map(side => ({ ...blankFitnessTest(), name: 'Handgrip dynamometer', side, unit: 'kgf', direction: 'up' }))

export function fitnessTestsError(tests) {
  const seen = new Set()
  for (const [index, test] of tests.entries()) {
    if (!isEntered(test)) continue
    const prefix = `Test ${index + 1}`
    if (!text(test.name)) return `${prefix}: enter a test name.`
    if (numeric(test.value) == null) return `${prefix}: enter a numeric result.`
    if (!text(test.unit)) return `${prefix}: enter the result unit.`
    const key = identity(test)
    if (seen.has(key)) return `${prefix}: this test, side, unit and protocol already have a result. Use the protocol field to distinguish different methods.`
    seen.add(key)
  }
  return ''
}

export function cleanFitnessTests(tests) {
  const error = fitnessTestsError(tests)
  if (error) throw new Error(error)
  return tests.filter(isEntered).map(test => ({
    name: text(test.name), side: text(test.side), value: numeric(test.value), unit: text(test.unit), protocol: text(test.protocol),
    direction: ['up', 'down'].includes(test.direction) ? test.direction : 'none',
  }))
}

export const fitnessTestLabel = test => [test.name, test.side, test.protocol].filter(Boolean).join(' · ')
export const fitnessTestValue = test => `${test.value} ${test.unit}`

export function compareFitnessTests(before = [], after = []) {
  const valid = tests => tests.filter(test => text(test.name) && text(test.unit) && numeric(test.value) != null)
  const b = new Map(valid(before).map(test => [identity(test), test]))
  const a = new Map(valid(after).map(test => [identity(test), test]))
  return [...new Set([...b.keys(), ...a.keys()])].map(key => {
    const previous = b.get(key), current = a.get(key), test = current || previous
    const from = previous ? numeric(previous.value) : null, to = current ? numeric(current.value) : null
    const delta = from != null && to != null ? +(to - from).toFixed(3) : null
    const direction = previous?.direction === current?.direction ? current?.direction : 'none'
    const better = delta == null || delta === 0 || !['up', 'down'].includes(direction) ? null : direction === 'up' ? delta > 0 : delta < 0
    return { label: fitnessTestLabel(test), from, to, delta, better, unit: ` ${test.unit}` }
  })
}
