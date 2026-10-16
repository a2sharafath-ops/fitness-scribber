import { detectMethod, FIELD_LABELS } from './bodyCompPdf'

export const BODY_COMP_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.csv,.tsv,.xlsx,.txt'
export const BODY_COMP_TEMPLATE = 'Name,Date,Method,Weight (kg),Body fat (%),Lean mass (kg),Skeletal muscle (kg),Visceral fat level,Total body water (L)\r\nDemo client,2026-10-16,InBody,80,20,64,32,8,42\r\n'
const MAX_ROWS = 5000
const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9%]/g, '')
const specs = [
  ['massKg', ['masskg', 'bodymass', 'bodymasskg', 'weight', 'bodyweight', 'totalmass', 'mass'], 20, 350, 'kg'],
  ['bodyFatPct', ['bodyfatpct', 'bodyfat', 'bodyfatpercentage', 'percentbodyfat', 'bodyfat%', 'pbf', 'fat%'], 1, 75, '%'],
  ['leanMassKg', ['leanmasskg', 'leanmass', 'leanbodymass', 'fatfreemass', 'ffm', 'lbm'], 10, 200, 'kg'],
  ['skeletalMuscleKg', ['skeletalmusclekg', 'skeletalmuscle', 'skeletalmusclemass', 'musclemass', 'smm'], 5, 100, 'kg'],
  ['visceralFat', ['visceralfat', 'visceralfatlevel', 'visceralfatrating', 'vfl'], 1, 60, ''],
  ['hydrationL', ['hydrationl', 'totalbodywater', 'bodywater', 'tbw'], 5, 100, 'l'],
]

function columnFor(header) {
  const text = String(header ?? '').trim()
  const unit = /(?:\(|\[)\s*(kg|lbs?|%|l|ml)\s*(?:\)|\])/i.exec(text)?.[1]?.toLowerCase()
    || /\b(kg|lbs?|ml|l)\s*$/i.exec(text)?.[1]?.toLowerCase()
  const key = norm(text.replace(/(?:\(|\[)[^\])]*(?:\)|\])/g, '').replace(/\b(kg|lbs?|ml|l)\s*$/i, ''))
  const spec = specs.find(([, aliases]) => aliases.includes(key) || aliases.includes(norm(text)))
  return spec ? { key: spec[0], lo: spec[2], hi: spec[3], expected: spec[4], unit } : null
}

function measurement(value, column) {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(kg|lbs?|%|ml|l)?\s*$/i.exec(String(value ?? ''))
  if (!match) return null
  const cellUnit = match[2]?.toLowerCase()
  const unit = cellUnit || column.unit || column.expected
  if (cellUnit && column.unit && cellUnit.replace('lbs', 'lb') !== column.unit.replace('lbs', 'lb')) return null
  let number = Number(match[1].replace(',', '.'))
  if (column.expected === 'kg') {
    if (unit === 'lb' || unit === 'lbs') number *= 0.45359237
    else if (unit !== 'kg') return null
  } else if (unit !== column.expected) return null
  return number >= column.lo && number <= column.hi ? Math.round(number * 10) / 10 : null
}

export function bodyCompFileKind(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a report smaller than 10 MB.')
  const extension = file.name?.split('.').pop()?.toLowerCase()
  if (['csv', 'tsv', 'xlsx', 'txt', 'pdf'].includes(extension)) return extension
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(extension)) return 'image'
  throw new Error('Use PDF, PNG, JPG, WebP, BMP, CSV, TSV, XLSX or TXT. Save older Excel (.xls) files as XLSX or CSV first.')
}

// Quoted delimiters, escaped quotes, CRLF, embedded newlines and BOMs are supported.
export function delimitedRows(text, delimiter) {
  text = text.replace(/^\uFEFF/, '')
  const rows = [], row = []
  let value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ }
      else if (!value || quoted) quoted = !quoted
      else value += char
    } else if (!quoted && (char === delimiter || char === '\n' || char === '\r')) {
      row.push(value.trim()); value = ''
      if (char !== delimiter) {
        rows.push([...row]); row.length = 0
        if (char === '\r' && text[i + 1] === '\n') i++
        if (rows.length > MAX_ROWS) throw new Error('Use a file with at most 5,000 rows.')
      }
    } else value += char
  }
  if (quoted) throw new Error('A quoted CSV value is unfinished. Check the file and try again.')
  if (value || row.length) { row.push(value.trim()); rows.push(row) }
  return rows
}

const isoDate = value => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null
  const text = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const date = new Date(text + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null
}

function candidate(entries, label, identity = '') {
  const values = {}, warnings = []
  let method = null, date = null
  for (const [header, value] of entries) {
    if (value == null || String(value).trim() === '') continue
    const key = norm(header)
    if (['date', 'testdate', 'assessmentdate', 'measurementdate'].includes(key)) {
      date = isoDate(value)
      if (!date) warnings.push('Date not imported: use YYYY-MM-DD.')
      continue
    }
    if (['method', 'device', 'devicebrand'].includes(key)) { method = detectMethod(String(value)); continue }
    const column = columnFor(header)
    if (!column) continue
    const number = measurement(value, column)
    if (Object.hasOwn(values, column.key)) throw new Error(`Several columns contain ${FIELD_LABELS[column.key]}. Keep one measurement column per field.`)
    if (number != null) values[column.key] = number
    else warnings.push(`${FIELD_LABELS[column.key]} not imported: check its value and unit.`)
  }
  return { label: [label, identity, date].filter(Boolean).join(' · '), values, found: Object.keys(values), method, date, warnings }
}

// Each exported observation stays separate. Never combine different people/dates.
export function bodyCompTable(rows, sheet = '') {
  if (rows.length > MAX_ROWS || rows.some(row => row.length > 100)) throw new Error('Use a file with at most 5,000 rows and 100 columns.')
  const vertical = rows.filter(row => columnFor(row[0]) && row[1] != null && measurement(row[1], columnFor(`${row[0]} ${row[2] || ''}`) || columnFor(row[0])) != null)
  if (vertical.length >= 2) {
    const entries = rows.map(row => [row[2] ? `${row[0]} (${row[2]})` : row[0], row[1]])
    const result = candidate(entries, sheet || 'Measurements')
    return result.found.length ? [result] : []
  }
  const headerIndex = rows.findIndex(row => row.some(header => columnFor(header)))
  if (headerIndex < 0) return []
  const headers = rows[headerIndex]
  const candidates = []
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    const identityIndex = headers.findIndex(header => ['name', 'client', 'clientname', 'patientname', 'id', 'clientid'].includes(norm(header)))
    const result = candidate(headers.map((header, index) => [header, row[index]]), `${sheet ? sheet + ' · ' : ''}Row ${i + 1}`, identityIndex >= 0 ? String(row[identityIndex] ?? '') : '')
    if (result.found.length) candidates.push(result)
  }
  return candidates
}

export async function readBodyCompTable(file) {
  const kind = bodyCompFileKind(file)
  let candidates
  if (kind === 'xlsx') {
    const { default: readExcel } = await import('read-excel-file/browser')
    const sheets = await readExcel(file)
    candidates = sheets.flatMap(({ sheet, data }) => bodyCompTable(data, sheet))
  } else {
    const text = await file.text()
    if (kind === 'tsv') candidates = bodyCompTable(delimitedRows(text, '\t'))
    else {
      const choices = [',', ';', '\t'].map(delimiter => delimitedRows(text, delimiter))
      const rows = choices.sort((a, b) => Math.max(...b.slice(0, 20).map(row => row.filter(header => columnFor(header)).length)) - Math.max(...a.slice(0, 20).map(row => row.filter(header => columnFor(header)).length)))[0]
      candidates = bodyCompTable(rows)
    }
  }
  if (!candidates.length) throw new Error('No usable measurements found. Use column headers such as Weight (kg), Body fat (%) and Total body water (L), or use the CSV template.')
  return candidates
}

export function fillBodyCompImport(previous, selected, imported = [], editingRecord = false) {
  return {
    ...previous,
    ...Object.fromEntries(imported.filter(key => !selected.found.includes(key)).map(key => [key, ''])),
    ...Object.fromEntries(selected.found.map(key => [key, selected.values[key]])),
    ...(selected.method ? { method: selected.method } : {}),
    ...(selected.date && !editingRecord ? { date: selected.date } : {}),
  }
}
