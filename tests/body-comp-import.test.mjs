import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const { delimitedRows, bodyCompTable, readBodyCompTable, bodyCompFileKind, fillBodyCompImport, BODY_COMP_TEMPLATE } = await vite.ssrLoadModule('/src/lib/bodyCompImport.js')
const { parseBodyComp } = await vite.ssrLoadModule('/src/lib/bodyCompPdf.js')

test('CSV template imports six measurements with an explicit date and method', async () => {
  const rows = await readBodyCompTable(new File([BODY_COMP_TEMPLATE], 'template.csv'))
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].values, { massKg: 80, bodyFatPct: 20, leanMassKg: 64, skeletalMuscleKg: 32, visceralFat: 8, hydrationL: 42 })
  assert.equal(rows[0].method, 'InBody')
  assert.equal(rows[0].date, '2026-10-16')
})

test('quoted CSV names, embedded newlines, escaped quotes and BOM do not mix clients', async () => {
  const csv = '\uFEFFName,Date,Weight (kg),Body fat (%)\r\n"Demo, A",2026-10-01,80,20\r\n"Demo ""B""\nSecond line",2026-10-02,60,25\r\n'
  const rows = await readBodyCompTable(new File([csv], 'demo.csv'))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].values.massKg, 80)
  assert.equal(rows[1].values.massKg, 60)
  assert.match(rows[0].label, /Demo, A/)
  assert.match(rows[1].label, /Demo "B"/)
  assert.equal(rows[1].date, '2026-10-02')
})

test('TSV and semicolon CSV accept decimal commas and convert pounds explicitly', async () => {
  for (const [name, text] of [['demo.tsv', 'Date\tWeight (lb)\tBody fat (%)\n2026-10-01\t176.37\t20'], ['demo.csv', 'Date;Weight (lb);Body fat (%)\n2026-10-01;176,37;20']]) {
    const [row] = await readBodyCompTable(new File([text], name))
    assert.equal(row.values.massKg, 80)
    assert.equal(row.values.bodyFatPct, 20)
  }
})

test('vertical measurement tables work and repeated observations cannot silently merge', () => {
  const rows = [['Metric', 'Value', 'Unit'], ['Weight', 80, 'kg'], ['Body fat', 20, '%'], ['Total body water', 42, 'L']]
  assert.deepEqual(bodyCompTable(rows)[0].values, { massKg: 80, bodyFatPct: 20, hydrationL: 42 })
  assert.throws(() => bodyCompTable([...rows, ['Weight', 70, 'kg']]), /Several columns/)
})

test('invalid units, formulas and out-of-range measurements remain missing with warnings', () => {
  const [row] = bodyCompTable([['Weight (kg)', 'Body fat (%)', 'Total body water (%)', 'Lean mass (kg)', 'Date'], [80, '=10+10', 50, 999, '2026-02-30']])
  assert.deepEqual(row.values, { massKg: 80 })
  assert.equal(row.date, null)
  assert.equal(row.warnings.length, 4)
  const [conflict] = bodyCompTable([['Weight (lb)', 'Body fat (%)'], ['80 kg', 20]])
  assert.deepEqual(conflict.values, { bodyFatPct: 20 })
  assert.throws(() => bodyCompTable([['Weight (kg)', 'Body mass (kg)'], [80, 60]]), /Several columns/)
})

test('unsupported, oversized, malformed and unrelated files fail clearly', async () => {
  assert.throws(() => bodyCompFileKind({ name: 'old.xls', size: 10 }), /Save older Excel/)
  assert.throws(() => bodyCompFileKind({ name: 'report.csv', size: 11 * 1024 * 1024 }), /10 MB/)
  assert.throws(() => delimitedRows('Name,Weight\n"unfinished,80', ','), /unfinished/)
  await assert.rejects(readBodyCompTable(new File(['Id,Comment\n1,Hello'], 'wrong.csv')), /No usable measurements/)
  assert.throws(() => bodyCompTable(Array.from({ length: 5001 }, () => [])), /5,000/)
})

test('applying a selected row preserves manual fields and existing record dates, removes stale imported values', () => {
  const before = { date: '2026-10-01', method: 'BIA', massKg: 90, bodyFatPct: 25, hydrationL: 45, notes: 'Coach note' }
  const selected = { values: { massKg: 80 }, found: ['massKg'], date: '2026-10-16', method: 'DEXA' }
  const filled = fillBodyCompImport(before, selected, ['massKg', 'bodyFatPct'])
  assert.equal(filled.date, '2026-10-16')
  assert.equal(filled.massKg, 80)
  assert.equal(filled.bodyFatPct, '')
  assert.equal(filled.hydrationL, 45)
  assert.equal(filled.notes, 'Coach note')
  assert.equal(fillBodyCompImport(before, selected, [], true).date, '2026-10-01')
  assert.equal(before.massKg, 90)
})

test('plain-text and PDF report parsing continue to use the existing label recognition', () => {
  const parsed = parseBodyComp('InBody\n2026-10-16\nWeight 80 kg\nPercent Body Fat 20 %\nSkeletal Muscle Mass 32 kg\nTotal Body Water 42 L')
  assert.equal(parsed.values.massKg, 80)
  assert.equal(parsed.values.bodyFatPct, 20)
  assert.equal(parsed.method, 'InBody')
  assert.equal(parsed.date, '2026-10-16')
})

test('real XLSX decoding separates measurement rows and ignores unrelated sheets', async () => {
  const bytes = await readFile(new URL('./fixtures/body-comp-demo.xlsx', import.meta.url))
  const { default: readExcel } = await import('read-excel-file/universal')
  const sheets = await readExcel(new Blob([bytes]))
  const candidates = sheets.flatMap(({ sheet, data }) => bodyCompTable(data, sheet))
  assert.equal(candidates.length, 2)
  assert.equal(candidates[0].values.massKg, 80)
  assert.equal(candidates[1].values.massKg, 70)
  assert.equal(candidates[1].values.hydrationL, 36)
  assert.equal(candidates[1].date, '2026-10-16')
  assert.match(candidates[1].label, /Measurements.*Demo B/)
})
